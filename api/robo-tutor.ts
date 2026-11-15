import { createClient } from '@supabase/supabase-js';

interface RequestBody {
  message?: unknown;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authorization = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return res.status(401).json({ error: 'Authentication required.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    return res.status(503).json({ error: 'Robo service is not configured.' });
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await adminClient.auth.getUser(tokenMatch[1]);
    if (authError || !user) return res.status(401).json({ error: 'Invalid or expired session.' });

    const body = (req.body ?? {}) as RequestBody;
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 5000) {
      return res.status(400).json({ error: 'Message must contain 1 to 5000 characters.' });
    }

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${tokenMatch[1]}` } },
    });
    const { data: quota, error: quotaError } = await userClient.rpc('check_and_consume_ai_quota');
    if (quotaError || !quota || typeof quota.allowed !== 'boolean') {
      console.warn('[Vercel Robo] Quota service unavailable:', quotaError?.message ?? 'Invalid quota response');
      return res.status(503).json({ error: 'Robo quota service is unavailable.' });
    }
    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Quota exceeded',
        quotaExceeded: true,
        usedQuota: quota.used,
        quotaLimit: quota.limit,
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `أنت روبو، مساعد تعليمي لطلاب الصف الثالث الإعدادي. أجب بالعربية وبشرح مناسب.\n\nسؤال الطالب: ${body.message.trim()}` }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
          }),
        }
      );
      if (!aiResponse.ok) {
        console.warn('[Vercel Robo] Provider request failed with status:', aiResponse.status);
        return res.status(502).json({ error: 'Robo could not reach the AI provider.' });
      }
      const data = await aiResponse.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof reply !== 'string' || !reply.trim()) {
        return res.status(502).json({ error: 'The AI provider returned no answer.' });
      }
      return res.status(200).json({ reply, usedQuota: quota.used, quotaLimit: quota.limit });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn('[Vercel Robo] Request failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Robo request failed.' });
  }
}
