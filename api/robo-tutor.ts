// ==============================================================================
// KAWKAB TALTA E3DADI — SERVERLESS API ENDPOINT: /api/robo-tutor
// Path: api/robo-tutor.ts
// Compatible with Vercel Serverless Functions, Netlify, and Node Express
// ==============================================================================

import type { IncomingMessage, ServerResponse } from 'http';

interface RequestBody {
  userId: string;
  message: string;
  userTier?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { message, userId, userTier } = req.body as RequestBody;

    if (!message) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Secret server-side environment variable (NEVER exposed in VITE_)
    const serverApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    if (!serverApiKey) {
      // Graceful fallback response when server AI key is not yet set
      return res.status(200).json({
        reply: `أهلاً بك يا بطل كوكب تالتة! 🤖
تلقيت سؤالك بخصوص منهج الشهادة الإعدادية. 
لتفوقك في هذا الجزء، دعنا نقسمه إلى خطوات بسيطة:
1. حدد المعطيات والقانون الأساسي في كتاب الوزارة.
2. انتبه للكلمات المفتاحية في رأس السؤال.
(ملاحظة: يمكنك إعداد مفتاح GEMINI_API_KEY في متغيرات خادم الإنتاج لتفعيل الذكاء الاصطناعي التوليدي الحي).`,
        isFallback: true,
      });
    }

    // Call Google Gemini API securely on server
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${serverApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `أنت "روبو" 🤖، المعلم الذكي التفاعلي لمنصة "كوكب تالتة إعدادي" في مصر.
ساعد الطالب في فهم منهج الصف الثالث الإعدادي خطوة بخطوة باللغة العربية بأسلوب مشجع وممتع.
سؤال الطالب: ${message}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
        }),
      }
    );

    const data = await aiResponse.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'أهلاً بك يا بطل! يسعدني مراجعة سؤالك مجدداً بالخطوات.';

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
