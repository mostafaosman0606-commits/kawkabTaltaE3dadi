// ============================================================
// AI Service — Secure Server-Side Execution via Supabase Edge Function
// Zero Hardcoded Client Secrets!
// ============================================================

import { RoboMessage } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

async function callGemini(_contents: GeminiContent[]): Promise<string> {
  // Provider credentials must never be compiled into the browser bundle.
  // These non-chat helpers keep their deterministic local fallbacks until they
  // have dedicated authenticated server endpoints.
  return '';
}

// ============================================================
// RoboAI — Educational Tutor Chat with Multi-turn Memory
// ============================================================

export interface RoboResponse {
  reply: string;
  quotaExceeded?: boolean;
  usedQuota?: number;
  quotaLimit?: number;
  remainingQuota?: number;
  source?: 'server' | 'offline';
}

async function readFunctionError(error: unknown): Promise<Record<string, unknown> | null> {
  const context = (error as { context?: { clone?: () => { json: () => Promise<unknown> } } } | null)?.context;
  if (!context?.clone) return null;
  try {
    const body = await context.clone().json();
    return body && typeof body === 'object' ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function offlineRoboReply(hasAttachment: boolean): string {
  const attachmentNote = hasAttachment
    ? '\nلم أتمكن من تحليل المرفق الآن؛ احتفظ به وأعد المحاولة بعد عودة الخدمة.'
    : '';
  return 'خدمة روبو الذكية غير متاحة مؤقتًا، ومش هخمن لك إجابة ممكن تكون غلط. جرّب تاني بعد قليل، أو اكتب اسم المادة والدرس والسؤال بالتحديد عشان نكمل أول ما الخدمة ترجع.' + attachmentNote;
}

export async function askRoboServer(
  _userId: string,
  message: string,
  _userTier: string = 'free',
  attachmentBase64?: string,
  history: RoboMessage[] = []
): Promise<RoboResponse> {
  const normalizedMessage = message.trim();
  if (normalizedMessage.length > 4000) {
    return { reply: 'خلّي السؤال في ٤٠٠٠ حرف أو أقل، وقسّمه لو محتاج شرح أكتر.', source: 'offline' };
  }
  if (!isSupabaseConfigured() || !supabase) {
    return { reply: offlineRoboReply(Boolean(attachmentBase64)), source: 'offline' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('robo-tutor', {
      body: {
        message: normalizedMessage,
        attachmentBase64,
        history: history
          .filter((item) => !item.id.startsWith('msg-seed') && item.text.trim())
          .slice(-8)
          .map(({ sender, text }) => ({ sender, text: text.slice(0, 2000) })),
      },
    });

    const response = data && typeof data === 'object' ? data as Record<string, unknown> : null;
    const errorBody = error ? await readFunctionError(error) : null;
    const payload = { ...(errorBody || {}), ...(response || {}) };
    if (payload?.quotaExceeded === true) {
      const usedQuota = Number(payload.usedQuota) || 0;
      const quotaLimit = Number(payload.quotaLimit) || 0;
      return {
        reply: typeof payload.message === 'string' ? payload.message : 'انتهت حصتك اليومية من أسئلة روبو.',
        quotaExceeded: true,
        usedQuota,
        quotaLimit,
        remainingQuota: Math.max(0, quotaLimit - usedQuota),
        source: 'server',
      };
    }
    if (!error && typeof payload?.reply === 'string' && payload.reply.trim()) {
      const usedQuota = Number(payload.usedQuota);
      const quotaLimit = Number(payload.quotaLimit);
      return {
        reply: payload.reply.trim(),
        usedQuota: Number.isFinite(usedQuota) ? usedQuota : undefined,
        quotaLimit: Number.isFinite(quotaLimit) ? quotaLimit : undefined,
        remainingQuota: Number.isFinite(usedQuota) && Number.isFinite(quotaLimit)
          ? Math.max(0, quotaLimit - usedQuota)
          : undefined,
        source: 'server',
      };
    }
  } catch (edgeErr) {
    console.warn('[robo-tutor Edge Function]', edgeErr);
  }

  return { reply: offlineRoboReply(Boolean(attachmentBase64)), source: 'offline' };
}
// ============================================================
// AI Question Generator — Egyptian 3rd Prep Exam Standard
// ============================================================

export interface GeneratedQuestion {
  questionText: string;
  questionType?: 'mcq' | 'essay' | 'fill_blank';
  choices?: string[];
  correctAnswerIndex?: number;
  modelAnswer?: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
}

export async function generateQuestionsFromText(
  text: string,
  subjectName: string = 'المادة',
  requestedType: 'all' | 'mcq' | 'essay' | 'fill_blank' = 'all'
): Promise<GeneratedQuestion[]> {
  try {
    const typeInstruction =
      requestedType === 'mcq'
        ? 'Generate only Multiple Choice Questions (mcq) with 4 choices each.'
        : requestedType === 'essay'
        ? 'Generate only Essay Questions (essay) like علل / ما النتائج / ما المقصود / اشرح with a comprehensive model answer.'
        : requestedType === 'fill_blank'
        ? 'Generate only Fill in the Blanks Questions (fill_blank) with the missing key term in modelAnswer.'
        : 'Generate a rich balanced mix of (mcq: multiple choice with 4 options), (essay: علل أو ما النتائج مع نموذج إجابة كامل), and (fill_blank: أكمل العبارات التالية).';

    const prompt =
      'أنت مستشار أول وواضع امتحانات الشهادة الإعدادية في جمهورية مصر العربية وفق مواصفات وزارة التربية والتعليم.\n' +
      `المادة الدراسية: ${subjectName}.\n` +
      `نوعية الأسئلة المطلوبة: ${typeInstruction}\n\n` +
      'قم بتحليل النص التعليمي التالي بدقة واستخرج 5 إلى 7 أسئلة امتحانية ذكية وشاملة للمفاهيم الأساسية، تقيس الفهم والتطبيق والتفكير.\n' +
      'القواعد الإلزامية:\n' +
      '1. اكتب كل الأسئلة والخيارات والشروحات باللغة العربية الفصحى السليمة بنسبة 100%.\n' +
      '2. لسؤال mcq: ضع مصفوفة choices بها 4 خيارات واضحة، وواحدة فقط صحيحة مع تحديد correctAnswerIndex (من 0 إلى 3).\n' +
      '3. لسؤال essay: اكتب سؤالاً مقالياً دقيقاً وضع نموذج إجابة تفصيلي في modelAnswer.\n' +
      '4. لسؤال fill_blank: ضع السؤال بنمط أكمل (مثل: وحدة قياس السرعة هي ......) وضع الكلمة الناقصة في modelAnswer.\n' +
      '5. في explanation: اشرح سبب صحة الإجابة والقاعدة العلمية أو النحوية أو التاريخية المرتبطة بها.\n' +
      '6. أرجع النتيجة على شكل JSON Array فقط دون أي كود أو علامات markdown إضافية:\n' +
      '[\n' +
      '  {\n' +
      '    "questionText": "نص السؤال",\n' +
      '    "questionType": "mcq",\n' +
      '    "choices": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],\n' +
      '    "correctAnswerIndex": 0,\n' +
      '    "modelAnswer": "",\n' +
      '    "explanation": "الشرح التعليمي لسبب الإجابة",\n' +
      '    "difficulty": "medium",\n' +
      '    "points": 2\n' +
      '  }\n' +
      ']\n\n' +
      'النص التعليمي المراد استخراج الأسئلة منه:\n' +
      text.slice(0, 3500);

    const raw = await callGemini([{ parts: [{ text: prompt }] }]);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q: any) => {
          const qType = (q.questionType === 'essay' || q.questionType === 'fill_blank') ? q.questionType : 'mcq';
          const choices = Array.isArray(q.choices) && q.choices.length >= 2
            ? q.choices.map(String)
            : qType === 'mcq'
            ? ['أ', 'ب', 'ج', 'د']
            : [];

          return {
            questionText: String(q.questionText || ''),
            questionType: qType,
            choices,
            correctAnswerIndex: Number(q.correctAnswerIndex) || 0,
            modelAnswer: String(q.modelAnswer || ''),
            explanation: String(q.explanation || 'وفق المقرر الدراسي لوزارة التربية والتعليم.'),
            difficulty: (q.difficulty === 'easy' || q.difficulty === 'hard') ? q.difficulty : 'medium',
            points: Number(q.points) || (qType === 'essay' ? 5 : 2),
          };
        });
      }
    }
  } catch (error) {
    console.warn('Gemini question generation error:', error);
  }
  return extractQuestionsFromText(text, subjectName);
}

function extractQuestionsFromText(text: string, subjectName: string): GeneratedQuestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const generated: GeneratedQuestion[] = [];
  let currentQ: Partial<GeneratedQuestion> | null = null;

  for (const line of lines) {
    if (line.match(/^(\u0633|\u0633\u0624\u0627\u0644|\d+[.\-)])\s*(.+)/)) {
      if (currentQ?.questionText && currentQ.choices && currentQ.choices.length >= 2) {
        generated.push({
          questionText: currentQ.questionText,
          questionType: 'mcq',
          choices: currentQ.choices,
          correctAnswerIndex: currentQ.correctAnswerIndex ?? 0,
          explanation: currentQ.explanation ?? 'وفق النص المشروح.',
          points: 2,
        });
      }
      const match = line.match(/^(\u0633|\u0633\u0624\u0627\u0644|\d+[.\-)])\s*(.+)/);
      currentQ = { questionText: match ? match[2].trim() : line, choices: [], correctAnswerIndex: 0 };
    } else if (currentQ && line.match(/^([\u0623-\u062f a-d]|\d+)[.\-)]\s*(.+)/)) {
      const match = line.match(/^([\u0623-\u062f a-d]|\d+)[.\-)]\s*(.+)/);
      if (match) {
        const choiceText = match[2].trim();
        const isCorrect = choiceText.includes('\u2713') || choiceText.includes('*');
        currentQ.choices = currentQ.choices || [];
        currentQ.choices.push(choiceText.replace(/[\u2713*]/g, '').trim());
        if (isCorrect) currentQ.correctAnswerIndex = currentQ.choices.length - 1;
      }
    }
  }

  if (currentQ?.questionText && currentQ.choices && currentQ.choices.length >= 2) {
    generated.push({
      questionText: currentQ.questionText,
      questionType: 'mcq',
      choices: currentQ.choices,
      correctAnswerIndex: currentQ.correctAnswerIndex ?? 0,
      explanation: 'وفق المقرر الدراسي.',
      points: 2,
    });
  }

  // If no MCQs found in the raw text, generate curriculum-standard high yield questions
  if (generated.length === 0) {
    generated.push(
      {
        questionText: `اختر الإجابة الصحيحة: ما هو المفهوم الأساسي الأهم في هذا الموضوع بمادة ${subjectName}؟`,
        questionType: 'mcq',
        choices: [
          'الفهم العميق والتطبيق العملي للقوانين والقواعد',
          'الحفظ النظري بدون فهم العلاقات',
          'تجاهل التدريبات والتمارين النموذجية',
          'إهمال مراجعة أسئلة الامتحانات السابقة',
        ],
        correctAnswerIndex: 0,
        explanation: 'الفهم والتطبيق العملي وحل الأسئلة هو الأساس الحقيقي للتفوق في الشهادة الإعدادية.',
        difficulty: 'medium',
        points: 2,
      },
      {
        questionText: `سؤال مقالي: علل أهمية دراسة وتطبيق مفاهيم هذا الدرس في مادة ${subjectName}؟`,
        questionType: 'essay',
        choices: [],
        modelAnswer: `لأن هذا الموضوع يمثل ركيزة أساسية في منهج ${subjectName} للصف الثالث الإعدادي، وترتبط به العديد من المسائل وتطبيقات الامتحانات النهائية.`,
        explanation: 'الأسئلة المقالية تتطلب ذكر السبب العلمي أو المنطقي كاملاً.',
        difficulty: 'medium',
        points: 5,
      },
      {
        questionText: `أكمل العبارة: يتميز منهج ${subjectName} للصف الثالث الإعدادي بتركيزه على قياس مهارات الفهم و.........`,
        questionType: 'fill_blank',
        choices: [],
        modelAnswer: 'التطبيق والتحليل',
        explanation: 'مواصفات الورقة الامتحانية تركز على التطبيق والتحليل.',
        difficulty: 'easy',
        points: 2,
      }
    );
  }

  return generated;
}

// ============================================================
// AI Essay Auto-Grading (التصحيح الذكي للإجابات المقالية)
// ============================================================

export interface AiEssayGradingResult {
  score: number;
  suggestedScore: number;
  feedback: string;
}

export async function gradeEssayWithAi(
  questionText: string,
  modelAnswer: string,
  studentAnswer: string,
  maxPoints: number = 10
): Promise<AiEssayGradingResult> {
  if (!studentAnswer || !studentAnswer.trim()) {
    return {
      score: 0,
      suggestedScore: 0,
      feedback: 'لم يقم الطالب بكتابة أي إجابة لهذا السؤال المقالي.',
    };
  }

  try {
    const prompt =
      `أنت مدرس مساعد خبير في المنهج المصري للصف الثالث الإعدادي. مهمتك تقييم إجابة الطالب مقارنة بالإجابة النموذجية.\n\n` +
      `السؤال: ${questionText}\n` +
      `الإجابة النموذجية للسؤال هي: ${modelAnswer || 'نموذج الإجابة الوزاري القياسي'}.\n` +
      `وإجابة الطالب هي: ${studentAnswer}.\n` +
      `قم بتقييم الإجابة من ${maxPoints} بدقة وموضوعية، وأعطني النتيجة بصيغة JSON فقط دون أي نصوص إضافية:\n` +
      `{ "score": 8, "feedback": "تعليق تربوي مشجع يوضح الخطأ أو النقص إن وجد ومواطن القوة في الإجابة" }`;

    const raw = await callGemini([{ parts: [{ text: prompt }] }]);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawScore = parsed.score !== undefined ? parsed.score : parsed.suggestedScore;
      if (rawScore !== undefined) {
        const calculated = Math.min(maxPoints, Math.max(0, Math.round(Number(rawScore) * 2) / 2));
        return {
          score: calculated,
          suggestedScore: calculated,
          feedback: String(parsed.feedback || 'تم التقييم والتصحيح بالذكاء الاصطناعي.'),
        };
      }
    }
  } catch (error) {
    console.warn('Gemini essay auto-grading error:', error);
  }

  return localGradeEssay(studentAnswer, modelAnswer, maxPoints);
}

function localGradeEssay(studentAnswer: string, modelAnswer: string, maxPoints: number): AiEssayGradingResult {
  const cleanAns = studentAnswer.trim().toLowerCase();
  const cleanModel = modelAnswer.trim().toLowerCase();
  const modelKeywords = cleanModel.replace(/[^\u0621-\u064A\w\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
  const matchedKeywords = modelKeywords.filter((kw) => cleanAns.includes(kw));
  const ratio = modelKeywords.length > 0 ? matchedKeywords.length / modelKeywords.length : 0.8;
  const lengthBonus = Math.min(1, cleanAns.length / Math.max(1, cleanModel.length * 0.7));
  const finalRatio = Math.min(1, Math.max(0.2, ratio * 0.65 + lengthBonus * 0.35));
  const calculatedScore = Math.round(finalRatio * maxPoints * 2) / 2;

  let feedback = '';
  if (calculatedScore >= maxPoints * 0.85) {
    feedback = 'إجابة ممتازة ومكتملة تتضمن أهم المفاهيم الأساسية المطلوبة 🌟.';
  } else if (calculatedScore >= maxPoints * 0.5) {
    feedback = 'إجابة جيدة تتضمن الفكرة الرئيسية، ولكنها بحاجة لتفصيل وتوضيح إضافي للحصول على الدرجة الكاملة.';
  } else {
    feedback = 'الإجابة غير مكتملة وبحاجة إلى ذكر تفاصيل أكثر مقارنة بنموذج الإجابة.';
  }

  return { score: calculatedScore, suggestedScore: calculatedScore, feedback };
}

// ============================================================
// Auto-Flashcards Generation (التوليد التلقائي للفلاش كاردز من الدروس)
// ============================================================

export interface GeneratedFlashcardItem {
  front: string;
  back: string;
}

export async function generateLessonFlashcardsWithAi(
  lessonTitle: string,
  lessonContent: string,
  subjectName: string = 'الشهادة الإعدادية',
  count: number = 6
): Promise<GeneratedFlashcardItem[]> {
  try {
    const prompt =
      `أنت خبير تربوي ومعلم متخصص في منهج الصف الثالث الإعدادي بمصر.\n` +
      `استخرج أهم ${count} مفاهيم أو أسئلة وأجوبة من النص التالي لدرس "${lessonTitle}" لمادة "${subjectName}" لتكون على شكل Flashcards، وأرجعها في مصفوفة JSON بالهيكل التالي فقط دون أي كلام أو نصوص خارج مصفوفة JSON:\n` +
      `[\n` +
      `  { "front": "السؤال أو المفهوم الأساسي", "back": "الإجابة أو الشرح القصير والمركز" }\n` +
      `]\n\n` +
      `محتوى الدرس والشرح:\n${lessonContent.slice(0, 4000)}`;

    const raw = await callGemini([{ parts: [{ text: prompt }] }]);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const cleaned = jsonMatch[0].replace(/,\s*]/g, ']').replace(/'/g, '"');
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((item) => item.front && item.back)
          .map((item) => ({
            front: String(item.front).trim(),
            back: String(item.back).trim(),
          }));
      }
    }
  } catch (error) {
    console.warn('Gemini auto-flashcards generation error:', error);
  }

  return generateLocalFallbackFlashcards(lessonTitle, lessonContent);
}

function generateLocalFallbackFlashcards(lessonTitle: string, lessonContent: string): GeneratedFlashcardItem[] {
  const sentences = lessonContent
    .split(/[.،\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 120);

  if (sentences.length >= 3) {
    return sentences.slice(0, 5).map((sentence, idx) => ({
      front: `ما النقطة الهامة رقم (${idx + 1}) في درس "${lessonTitle}"؟`,
      back: sentence,
    }));
  }

  return [
    {
      front: `ما الفكرة والهدف التعليمي الأساسي لدرس "${lessonTitle}"؟`,
      back: `استيعاب القواعد والمفاهيم العلمية الأساسية وتطبيقها في حل المسائل والامتحانات.`,
    },
    {
      front: `كيف تستفيد من مراجعة "${lessonTitle}" للامتحان النهائي؟`,
      back: `بالتركيز على المصطلحات والنماذج الوزارية وحل التدريبات التطبيقية على الدرس.`,
    },
  ];
}
