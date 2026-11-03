// ==============================================================================
// KAWKAB TALTA E3DADI — SUPABASE EDGE FUNCTION: ROBO AI TUTOR
// Path: supabase/functions/robo-tutor/index.ts
// Authoritative Server-Side AI Execution & Server Quota Enforcement
// NO client-side secret keys exposed!
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate user from Bearer Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Atomic Server-Side Quota Enforcement via Database RPC
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: quotaResult, error: quotaError } = await userClient.rpc("check_and_consume_ai_quota");

    if (quotaError) {
      console.warn("[QuotaRPC Error]", quotaError);
    } else if (quotaResult && !quotaResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Quota exceeded",
          message: "عذراً يا بطل! لقد استنفدت رصيدك اليومي المخصص لأسئلة روبو. يتجدد الرصيد تلقائياً كل يوم لدعمك المستمر في المذاكرة! 🚀",
          quotaExceeded: true,
          usedQuota: quotaResult.used,
          quotaLimit: quotaResult.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse Request Body
    const { message, attachmentBase64, history } = await req.json();
    if (!message && !attachmentBase64) {
      return new Response(
        JSON.stringify({ error: "Message or attachment is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Server-Side Call to AI Provider (Gemini API)
    let replyText = "";

    if (geminiApiKey) {
      const isHintRequested = message?.includes("تلميح") || message?.includes("hint");
      const isPdf = Boolean(attachmentBase64 && attachmentBase64.includes("application/pdf"));

      const systemInstruction =
        'أنت "روبو" المساعد الذكي والمعلم الخاص لطلاب الصف الثالث الإعدادي في منصة كوكب تالتة إعدادي.\n' +
        'قواعد الإجابة:\n' +
        '1. أجب عن أي سؤال يسأله الطالب باللغة العربية الفصحى المبسطة بأسلوب تربوي مشجع ومنظم.\n' +
        '2. إذا كان السؤال في المنهج الدراسي: التزم بمنهج وزارة التربية والتعليم المصرية لشهادة الإتمام الإعدادية.\n' +
        '3. تذكر سياق الحديث والرسائل السابقة وأجب بترابط تام.\n' +
        '4. إذا كان السؤال مسألة رياضية أو فيزيائية: اكتب المعطيات، القانون، خطوات التعويض، والناتج النهائي مع الوحدة.\n' +
        '5. إذا كان في النحو: قدم الإعراب الكامل والدقيق مع ذكر نوع الكلمة وعلامة الإعراب والسبب.\n' +
        (isHintRequested
          ? '6. الطالب طلب تلميحاً فقط: قدّم مفتاح الحل والخطوة الأولى دون إعطاء الإجابة النهائية.\n'
          : '6. قدم الإجابة النموذجية الكاملة مع الشرح الوافي.\n') +
        (isPdf
          ? '7. [ملف PDF مرفق]: افحص المستند المرفق بدقة وأجب عن استفسارات الطالب ولخص أهم النقاط.\n'
          : attachmentBase64
          ? '7. [صورة مرفقة]: الصورة لمسألة أو سؤال كتابي. استخرج النص بدقة وقدم الحل المنظم.\n'
          : '');

      const contents = [];

      // Add recent history if provided
      if (Array.isArray(history) && history.length > 0) {
        const recent = history.slice(-8);
        for (let i = 0; i < recent.length; i++) {
          const item = recent[i];
          let txt = item.text || "";
          if (i === 0 && item.sender === "user") {
            txt = systemInstruction + "\n\n" + txt;
          }
          contents.push({
            role: item.sender === "user" ? "user" : "model",
            parts: [{ text: txt }],
          });
        }
      }

      // Current User Turn
      const currentParts: any[] = [
        { text: contents.length === 0 ? `${systemInstruction}\n\nسؤال الطالب: ${message}` : message },
      ];

      if (attachmentBase64) {
        const match = attachmentBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          currentParts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      contents.push({
        role: "user",
        parts: currentParts,
      });

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          }),
        }
      );

      const aiData = await aiResponse.json();
      replyText =
        aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "أهلاً بك يا بطل! لم أتمكن من استلام إجابة النموذج حالياً، ولكن يسعدني مراجعة سؤالك مجدداً.";
    } else {
      // Safe fallback if API key is not yet configured in Supabase secrets
      replyText = `أهلاً بك يا بطل كوكب تالتة! 🤖
تلقيت سؤالك بخصوص منهج الشهادة الإعدادية. 
لتفوقك في هذا الجزء، دعنا نقسمه إلى خطوات بسيطة:
1. حدد المعطيات والقانون الأساسي في كتاب الوزارة.
2. انتبه للكلمات المفتاحية في رأس السؤال وطبق القاعدة خطوة بخطوة.
(ملاحظة: يمكنك إعداد مفتاح GEMINI_API_KEY في إعدادات Supabase Secrets لتفعيل إجابات الذكاء الاصطناعي التوليدي الحي).`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply: replyText,
        usedQuota: quotaResult?.used,
        quotaLimit: quotaResult?.limit,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
