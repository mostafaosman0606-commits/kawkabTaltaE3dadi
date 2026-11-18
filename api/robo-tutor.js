// Vercel serverless function: fallback /api/robo-tutor
// This endpoint proxies to the Supabase Edge Function "robo-tutor" when it exists.
// It performs minimal environment checks (presence only) and origin validation.
// No secrets are logged or exposed.

export default async function handler(req, res) {
  // Allowed origins – read from env if defined, otherwise allow any (fallback safety).
  const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
  const origin = req.headers.origin || '';
  if (allowed.length && !allowed.includes(origin)) {
    res.status(403).json({ error: 'Origin not permitted' });
    return;
  }

  // Ensure required Supabase env vars are present (presence‑only check).
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'Supabase configuration missing' });
    return;
  }

  // Forward the request body to the Supabase Edge Function.
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/robo-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(req.body),
    });

    if (response.ok) {
      const data = await response.json();
      res.status(200).json(data);
    } else {
      const errText = await response.text();
      console.warn('Supabase robo‑tutor error:', response.status, errText);
      res.status(503).json({ error: 'Robo service temporarily unavailable' });
    }
  } catch (e) {
    console.error('Proxy to robo‑tutor failed:', e);
    res.status(503).json({ error: 'Robo service temporarily unavailable' });
  }
}
