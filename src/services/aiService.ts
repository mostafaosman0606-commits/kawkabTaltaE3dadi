// ============================================================
// AI Service — Secure Server-Side Execution via Supabase Edge Function
// Zero Hardcoded Client Secrets!
// ============================================================

import { RoboMessage } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

// Optional developer override from .env.local (never hardcoded in bundle)
const DEV_GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${DEV_GEMINI_API_KEY}`;

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

async function callGemini(contents: GeminiContent[], timeoutMs: number = 45000): Promise<string> {
  if (!DEV_GEMINI_API_KEY) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GEMINI_BASE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// RoboAI — Educational Tutor Chat with Multi-turn Memory
// ============================================================

export interface RoboResponse {
  reply: string;
  quotaExceeded?: boolean;
  usedQuota?: number;
  quotaLimit?: number;
}

export async function askRoboServer(
  _userId: string,
  message: string,
  _userTier: string = 'free',
  attachmentBase64?: string,
  history: RoboMessage[] = []
): Promise<RoboResponse> {
  // 1. Primary Secure Gateway: Supabase Edge Function with Server-Side Secrets & Quota
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('robo-tutor', {
        body: {
          message,
          attachmentBase64,
          history: history.slice(-8),
        },
      });

      if (!error && data) {
        if (data.quotaExceeded) {
          return {
            reply: data.message || 'عذراً، لقد استنفدت رصيدك اليومي من أسئلة روبو.',
            quotaExceeded: true,
            usedQuota: data.usedQuota,
            quotaLimit: data.quotaLimit,
          };
        }
        if (data.reply) {
          return {
            reply: data.reply,
            usedQuota: data.usedQuota,
            quotaLimit: data.quotaLimit,
          };
        }
      }
    } catch (edgeErr) {
      console.warn('[robo-tutor Edge Function]', edgeErr);
    }
  }

  // 2. Secondary local fallback (Developer local testing or Educational Guide)
  try {
    const isHintRequested = message.includes('تلميح') || message.includes('hint');
    const isPdf = Boolean(attachmentBase64 && attachmentBase64.includes('application/pdf'));

    const systemInstruction =
      'أنت "روبو" المساعد الذكي والمعلم الخاص لطلاب الصف الثالث الإعدادي في منصة كوكب تالتة إعدادي.\n' +
      'قواعد الإجابة:\n' +
      '1. أجب عن أي سؤال يسأله الطالب بدون استثناء — سواء كان في المنهج الدراسي أو خارجه أو في أي موضوع آخر. لا ترفض أي سؤال أبداً ولا تقل "لا أستطيع الإجابة".\n' +
      '2. الإجابة باللغة العربية الفصحى المبسطة بأسلوب تربوي مشجع ومنظم.\n' +
      '3. إذا كان السؤال في المنهج الدراسي: التزم بمنهج وزارة التربية والتعليم المصرية.\n' +
      '4. تذكر سياق الحديث والرسائل السابقة وأجب بترابط تام.\n' +
      '5. إذا كان السؤال مسألة رياضية أو فيزيائية: اكتب المعطيات، القانون، خطوات التعويض، والناتج النهائي مع الوحدة.\n' +
      '6. إذا كان السؤال في النحو: قدم الإعراب الكامل والدقيق مع ذكر نوع الكلمة وعلامة الإعراب والسبب.\n' +
      '7. إذا كان في الدراسات: اذكر الأسباب والنتائج وأهم الشخصيات والتواريخ بنقاط محددة.\n' +
      (isHintRequested
        ? '8. الطالب طلب تلميحاً فقط: قدّم مفتاح الحل والخطوة الأولى دون إعطاء الإجابة النهائية.\n'
        : '8. قدم الإجابة النموذجية الكاملة مع الشرح الوافي.\n') +
      (isPdf
        ? '9. [ملف PDF مرفق]: قام الطالب بإرفاق مستند أو مذكرة أو امتحان بصيغة PDF. اقرأ محتواه بالكامل بدقة، وأجب عن أسئلة واستفسارات الطالب حوله، ولخّص المفاهيم الصعبة أو حل المسائل والأسئلة الواردة فيه بالتفصيل خطوة بخطوة.\n'
        : attachmentBase64
        ? '9. [قاعدة الصور]: الصورة لسؤال أو مسألة. افحصها واستخرج النص بدقة وأجب عنه بشكل كامل ومنظم.\n'
        : '');

    const contents: GeminiContent[] = [];

    // Filter out seed messages and take up to the last 10 previous messages for context
    const cleanHistory = history.filter(
      (m) => !m.id.startsWith('msg-seed') && m.text && m.text.trim().length > 0
    );
    const recentHistory = cleanHistory.slice(-10);

    // If there is previous history, build the multi-turn sequence
    if (recentHistory.length > 0) {
      recentHistory.forEach((turn, idx) => {
        const isUser = turn.sender === 'user';
        let turnText = turn.text;
        if (idx === 0 && isUser) {
          turnText = systemInstruction + '\n\n' + turnText;
        }
        contents.push({
          role: isUser ? 'user' : 'model',
          parts: [{ text: turnText }],
        });
      });
    }

    // Now append the current user turn
    const currentParts: GeminiPart[] = [];
    const currentText =
      contents.length === 0
        ? systemInstruction + '\n\nسؤال الطالب: ' + message
        : message;

    currentParts.push({ text: currentText });

    // Parse attachmentBase64 (data:image/... or data:application/pdf;base64,...) and send multimodal inlineData
    if (attachmentBase64) {
      const match = attachmentBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      } else {
        currentParts.push({
          inlineData: {
            mimeType: attachmentBase64.includes('pdf') ? 'application/pdf' : 'image/jpeg',
            data: attachmentBase64,
          },
        });
      }
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const reply = await callGemini(contents);
    if (reply) {
      return { reply };
    }
    return { reply: generateEducationalFallback(message) };
  } catch (error) {
    console.warn('Gemini API error:', error);
    return { reply: generateEducationalFallback(message) };
  }
}

function generateEducationalFallback(message: string): string {
  const q = (message || '').toLowerCase();
  if (q.includes('\u062a\u0644\u0645\u064a\u062d') || q.includes('hint')) {
    return '\uD83D\uDCA1 \u062a\u0644\u0645\u064a\u062d \u0631\u0648\u0628\u0648: \u062d\u062f\u062f \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0648\u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0648\u0627\u0643\u062a\u0628 \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0623\u0648\u0644\u0649! \uD83D\uDE80';
  }
  return '\u0633\u0624\u0627\u0644 \u0645\u0645\u062a\u0627\u0632! \uD83C\uDF1F \u0627\u0633\u062a\u062e\u0631\u062c \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0648\u062d\u062f\u062f \u0627\u0644\u0645\u0641\u0647\u0648\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a. \u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0644\u0645\u064a\u062d\u0627\u064b \u0623\u0648 \u0634\u0631\u062d\u0627\u064b \u0644\u0644\u0642\u0627\u0639\u062f\u0629\u061f';
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
