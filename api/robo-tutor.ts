import { createClient } from '@supabase/supabase-js';

interface HistoryMessage {
  sender: 'user' | 'robo';
  text: string;
}

interface RequestBody {
  message?: unknown;
  history?: unknown;
  attachmentBase64?: unknown;
}

export default async function handler(req: any, res: any) {
  // CORS headers for preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // --- Auth ---
  const authorization =
    typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return res.status(401).json({ error: 'Authentication required.' });

  // --- Env vars presence check with fallbacks ---
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const geminiApiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.AI_API_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.warn('[Vercel Robo] Missing config:', {
      hasUrl: Boolean(supabaseUrl),
      hasKey: Boolean(supabaseKey),
      hasGemini: Boolean(geminiApiKey),
    });
    return res.status(503).json({ error: 'Robo service is not configured.' });
  }

  try {
    // --- Validate user via client ---
    const authClient = createClient(supabaseUrl, supabaseKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(tokenMatch[1]);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    // --- Parse and validate body ---
    const body = (req.body ?? {}) as RequestBody;
    const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const hasAttachment =
      typeof body.attachmentBase64 === 'string' &&
      body.attachmentBase64.includes('base64,');

    if (!rawMessage && !hasAttachment) {
      return res.status(400).json({ error: 'Message or attachment is required.' });
    }
    if (rawMessage.length > 5000) {
      return res.status(400).json({ error: 'Message must not exceed 5000 characters.' });
    }

    const messageText =
      rawMessage ||
      'يرجى مراجعة وشرح السؤال أو المسألة المرفقة في الصورة بالتفصيل خطوة بخطوة وفق منهج الصف الثالث الإعدادي.';

    // Parse attachment if present (safe extraction for data URL or raw base64)
    let attachmentPart: { inlineData: { mimeType: string; data: string } } | undefined;
    if (typeof body.attachmentBase64 === 'string' && body.attachmentBase64.length > 50) {
      const raw = body.attachmentBase64.trim();
      const commaIdx = raw.indexOf(',');
      if (commaIdx !== -1 && raw.startsWith('data:')) {
        const header = raw.slice(0, commaIdx);
        const base64Data = raw.slice(commaIdx + 1).replace(/\s/g, '');
        const mimeMatch = header.match(/^data:([^;]+)/i);
        const mimeType = (mimeMatch ? mimeMatch[1] : 'image/jpeg').trim().toLowerCase();
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
          attachmentPart = { inlineData: { mimeType, data: base64Data } };
        }
      } else if (!raw.startsWith('data:')) {
        attachmentPart = { inlineData: { mimeType: 'image/jpeg', data: raw.replace(/\s/g, '') } };
      }
    }

    // Parse conversation history (last 8 turns max)
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: HistoryMessage[] = rawHistory
      .filter(
        (m: any) =>
          m && typeof m.sender === 'string' && typeof m.text === 'string' && m.text.trim()
      )
      .slice(-8)
      .map((m: any) => ({ sender: m.sender as 'user' | 'robo', text: String(m.text).slice(0, 2000) }));

    // --- Check & consume quota ---
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${tokenMatch[1]}` } },
    });
    let quota = { allowed: true, used: 1, limit: 10 };
    try {
      const { data: quotaData, error: quotaError } = await userClient.rpc('check_and_consume_ai_quota');
      if (!quotaError && quotaData && typeof quotaData.allowed === 'boolean') {
        quota = quotaData;
      } else if (quotaError) {
        console.warn('[Vercel Robo] Quota service notice:', quotaError.message);
      }
    } catch (qErr) {
      console.warn('[Vercel Robo] Quota check notice:', qErr);
    }

    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Quota exceeded',
        quotaExceeded: true,
        usedQuota: quota.used,
        quotaLimit: quota.limit,
      });
    }

    // --- Build Gemini multi-turn contents ---
    const systemPrompt =
      'أنت «روبو» 🤖، المعلم والمدرب الذكي لمنصة كوكب تالتة إعدادي في مصر.\n' +
      'مهمتك: مساعدة وشرح منهج الصف الثالث الإعدادي خطوة بخطوة باللغة العربية بأسلوب تعليمي مبسط ومشجع.\n\n' +
      'القواعد الإلزامية:\n' +
      '1. اكتب دائماً إجابة كاملة وشاملة ومفصلة حتى النهاية دون أن تتوقف أو تقطع الرد في المنتصف.\n' +
      '2. إذا أرسل الطالب صورة أو مستنداً، افحص الصورة واستخرج المسألة أو السؤال المكتوب فيها فوراً، واشرح طريقة الحل خطوة بخطوة وصولاً إلى الناتج النهائي.\n' +
      '3. إذا كانت الصورة تحتوي على أكثر من مسألة، أجب عن المسألة الأولى واطلب من الطالب تأكيد رغبته في حل باقي المسائل.\n' +
      '4. استخدم أمثلة توضيحية تناسب مقرر وزارة التربية والتعليم المصرية لطلاب الشهادة الإعدادية.\n' +
      '5. نسق الإجابة بنقاط واضحة وخطوات مرتبة تريح الطالب أثناء القراءة والمذاكرة.';

    type GeminiPart =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };
    const contents: GeminiContent[] = [];

    // Add history turns (last turns)
    for (const turn of history) {
      contents.push({
        role: turn.sender === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      });
    }

    // Current user turn: attach image/doc first if present, then text
    const currentParts: GeminiPart[] = [];
    if (attachmentPart) {
      currentParts.push(attachmentPart);
    }
    currentParts.push({ text: messageText });

    contents.push({ role: 'user', parts: currentParts });

    // --- Call Gemini with automatic model fallback ---
    const CANDIDATE_MODELS = [
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    let reply: string | undefined;
    let lastError = '';

    for (const model of CANDIDATE_MODELS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 25000);
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                maxOutputTokens: 3500,
                temperature: 0.65,
              },
            }),
          }
        );
        clearTimeout(timer);

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof candidateText === 'string' && candidateText.trim()) {
            reply = candidateText.trim();
            break;
          }
        } else {
          lastError = `Status ${aiResponse.status} from ${model}`;
          console.warn(`[Vercel Robo] Model ${model} returned ${aiResponse.status}`);
        }
      } catch (err: any) {
        lastError = err?.message || 'timeout/fetch error';
        console.warn(`[Vercel Robo] Model ${model} error:`, lastError);
      }
    }

    if (!reply) {
      console.warn('[Vercel Robo] All candidate models failed. Last error:', lastError);
      return res.status(502).json({ error: 'Robo could not reach the AI provider.' });
    }

    return res.status(200).json({
      reply,
      usedQuota: quota.used,
      quotaLimit: quota.limit,
    });
  } catch (error) {
    console.warn(
      '[Vercel Robo] Request failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return res.status(500).json({ error: 'Robo request failed.' });
  }
}
