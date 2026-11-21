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

    // Parse attachment if present
    let attachmentPart: { inlineData: { mimeType: string; data: string } } | undefined;
    if (hasAttachment && typeof body.attachmentBase64 === 'string') {
      const match = body.attachmentBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/s);
      if (match) {
        const mimeType = match[1].toLowerCase();
        const data = match[2];
        if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
          attachmentPart = { inlineData: { mimeType, data } };
        }
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
      '\u0623\u0646\u062a \u0631\u0648\u0628\u0648 \u{1F916}\u060c \u0627\u0644\u0645\u0639\u0644\u0645 \u0627\u0644\u0630\u0643\u064a \u0644\u0645\u0646\u0635\u0629 \u0643\u0648\u0643\u0628 \u062a\u0627\u0644\u062a\u0629 \u0625\u0639\u062f\u0627\u062f\u064a.\n' +
      '\u0645\u0647\u0645\u062a\u0643: \u0634\u0631\u062d \u0645\u0646\u0647\u062c \u0627\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u064a \u0641\u064a \u0645\u0635\u0631 \u062e\u0637\u0648\u0629 \u0628\u062e\u0637\u0648\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0648\u062f\u0648\u062f \u0648\u0645\u0634\u062c\u0639.\n' +
      '\u0627\u0644\u0642\u0648\u0627\u0639\u062f:\n' +
      '1. \u0623\u062c\u0628 \u062f\u0627\u0626\u0645\u064b\u0627 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0641\u0635\u062d\u0649 \u0627\u0644\u0633\u0647\u0644\u0629.\n' +
      '2. \u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0647\u062c \u0627\u0644\u0645\u0635\u0631\u064a \u0644\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u064a.\n' +
      '3. \u0627\u0633\u062a\u062e\u062f\u0645 \u0623\u0645\u062b\u0644\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u062a\u0634\u062c\u064a\u0639 \u0627\u0644\u0637\u0627\u0644\u0628.\n' +
      '4. \u0625\u0630\u0627 \u0623\u0631\u0641\u0642 \u0627\u0644\u0637\u0627\u0644\u0628 \u0635\u0648\u0631\u0629 \u0623\u0648 \u0645\u0633\u062a\u0646\u062f\u0627\u064b\u060c \u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0633\u0623\u0644\u0629 \u0623\u0648 \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u062f\u0642\u0629 \u0648\u0627\u0634\u0631\u062d \u0627\u0644\u062d\u0644 \u0628\u0627\u0644\u062e\u0637\u0648\u0627\u062a.\n' +
      '5. \u0644\u0627 \u062a\u062e\u062a\u0631\u0639 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u060c \u0648\u0625\u0630\u0627 \u0644\u0645 \u062a\u0639\u0631\u0641 \u0627\u0644\u062c\u0648\u0627\u0628 \u0642\u0644 \u0630\u0644\u0643 \u0628\u0635\u0631\u0627\u062d\u0629.';

    type GeminiPart =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };

    type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };
    const contents: GeminiContent[] = [];

    // Add history turns
    for (const turn of history) {
      contents.push({
        role: turn.sender === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      });
    }

    // Add current message with system context prepended to first user turn
    const userPromptText =
      contents.length === 0
        ? `${systemPrompt}\n\n\u0633\u0624\u0627\u0644 \u0627\u0644\u0637\u0627\u0644\u0628: ${messageText}`
        : messageText;

    const currentParts: GeminiPart[] = [{ text: userPromptText }];
    if (attachmentPart) {
      currentParts.push(attachmentPart);
    }

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
        const timer = setTimeout(() => controller.abort(), 12000);
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: contents.length > 1
                ? { parts: [{ text: systemPrompt }] }
                : undefined,
              generationConfig: {
                maxOutputTokens: 800,
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
