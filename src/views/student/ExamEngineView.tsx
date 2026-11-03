import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Bot,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { gradeEssayWithAi } from '../../services/aiService';
import { Examination, Question, ExamAttempt } from '../../types';

interface ExamEngineViewProps {
  examId: string;
  onBack: () => void;
  onViewCertificates?: () => void;
  onUpgradeClick?: () => void;
}

export const ExamEngineView: React.FC<ExamEngineViewProps> = ({
  examId,
  onBack,
  onViewCertificates,
  onUpgradeClick,
}) => {
  const { user } = useAuth();
  const exam = db.getExaminationById(examId);

  const isFreeTier = user?.role === 'student' && user?.subscriptionTier === 'free';
  const allSubjectExams = exam ? db.getExaminations(exam.subjectId) : [];
  const isFirstExam = allSubjectExams.length > 0 && allSubjectExams[0].id === examId;
  const isExamLocked = isFreeTier && !isFirstExam;

  // Examination State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>>({});
  const [timeLeftSeconds, setTimeLimitSeconds] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<ExamAttempt | null>(null);
  const [startTime] = useState<number>(Date.now());

  // Anti-Cheating Safeguards
  const [violationCount, setViolationCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState<Array<{ timestamp: string; type: string; details: string }>>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // AI Auto-Grading State
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [aiGradingProgress, setAiGradingProgress] = useState({ current: 0, total: 0 });

  // Essay Grading Choice: AI vs Teacher
  const [showGradingChoiceModal, setShowGradingChoiceModal] = useState(false);
  const [chosenGradingMode, setChosenGradingMode] = useState<'ai' | 'teacher' | null>(null);

  // Randomized Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selfEvaluations, setSelfEvaluations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!exam) return;
    let qs = exam.questions || [];
    if (exam.randomizeQuestions) {
      qs = [...qs].sort(() => Math.random() - 0.5);
    }
    setQuestions(qs);
    setTimeLimitSeconds(exam.timeLimitMinutes * 60);

    // Restore draft from sessionStorage if previously interrupted
    try {
      const savedDraft = sessionStorage.getItem(`kawkab_exam_draft_${exam.id}`);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          setAnswers(parsed.answers);
        }
        if (parsed.timeLeftSeconds && parsed.timeLeftSeconds > 10) {
          setTimeLimitSeconds(parsed.timeLeftSeconds);
        }
      }
    } catch {}
  }, [examId]);

  // Save in-progress draft to prevent work loss on reload
  useEffect(() => {
    if (!exam || isSubmitted) return;
    try {
      sessionStorage.setItem(
        `kawkab_exam_draft_${exam.id}`,
        JSON.stringify({ answers, timeLeftSeconds })
      );
    } catch {}
  }, [answers, timeLeftSeconds, isSubmitted, exam?.id]);

  // Stable AutoSubmit reference for timer
  const handleAutoSubmitRef = useRef<() => void>(() => {});

  // Timer Countdown Effect (stable continuous interval)
  useEffect(() => {
    if (isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLimitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => handleAutoSubmitRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  // Anti-Cheating Tab Switch / Window Blur Detection
  useEffect(() => {
    if (isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'tab_switch',
          details: 'قام الطالب بمغادرة شاشة الامتحان أو التبديل إلى تبويب آخر.',
        };
        setViolationCount((c) => c + 1);
        setViolationLogs((logs) => [...logs, logEntry]);

        // Anti-Cheating Enforcement: Reshuffle questions, clear student answers, and reset index
        setQuestions((prev) => [...prev].sort(() => Math.random() - 0.5));
        setAnswers({});
        setCurrentQuestionIndex(0);

        setWarningMessage(
          '⚠️ تنبيه أمني لمكافحة الغش: تم رصد مغادرتك لشاشة الاختبار أو فتح تبويب آخر! وفقاً للائحة الاختبارات، تم تسجيل المخالفة رسمياً، وإعادة خلط وترتيب الأسئلة عشوائياً، وتصفير جميع الإجابات التي قمت بتحديدها.'
        );
        setShowWarningModal(true);
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        // user clicked outside the window
        setViolationCount((c) => c + 1);
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'window_blur',
          details: 'قام الطالب بالنقر خارج نافذة الامتحان.',
        };
        setViolationLogs((logs) => [...logs, logEntry]);
        setWarningMessage('تحذير مراقبة: يرجى إبقاء التركيز داخل نافذة الامتحان لتجنب تسجيل مخالفات غش.');
        setShowWarningModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isSubmitted]);

  if (!exam) {
    return (
      <div className="text-center py-12 text-slate-400">
        الامتحان غير متوفر
        <button onClick={onBack} className="block mx-auto mt-4 text-cyan-400">
          العودة
        </button>
      </div>
    );
  }

  if (isExamLocked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-16 px-4">
        <div className="p-8 bg-[#0c1427]/95 border border-amber-500/40 rounded-3xl shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
            🔒
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-alexandria">
            هذا الاختبار مقفل على الخطة المجانية
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            على الخطة المجانية، يحق للطالب خوض <strong>أول اختبار فقط</strong> في كل مادة. قم بالترقية الآن لخوض جميع الاختبارات والامتحانات الرسمية الشاملة وحصد شهادات التفوق المعتمدة!
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all w-full sm:w-auto"
            >
              الرجوع للمادة
            </button>
            <button
              onClick={() => {
                if (onUpgradeClick) onUpgradeClick();
                else onBack();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all w-full sm:w-auto"
            >
              ترقية باقتي الآن 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedChoiceId: choiceId,
      },
    }));
  };

  const handleEssayInput = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        essayAnswerText: text,
      },
    }));
  };

  const handleAutoSubmitOnTimeout = () => {
    handleSubmitExam(true, 'ai');
  };
  handleAutoSubmitRef.current = handleAutoSubmitOnTimeout;

  const handlePreSubmit = () => {
    if (isSubmitting || isSubmitted) return;
    const hasEssayQs = questions.some((q) => q.questionType === 'essay');
    if (hasEssayQs) {
      setShowGradingChoiceModal(true);
    } else {
      handleSubmitExam(false, 'ai');
    }
  };

  const handleSubmitExam = async (isTimeout = false, gradingMode: 'ai' | 'teacher' = 'ai') => {
    if (!user || !exam || isSubmitted || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowGradingChoiceModal(false);
    setChosenGradingMode(gradingMode);

    const timeSpent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    
    // 1. Authoritative Exam Submission & Objective MCQ Grading
    const attempt = await db.submitExamAttemptAuthoritative(
      exam.id,
      user.id,
      answers,
      timeSpent,
      violationCount,
      violationLogs
    );

    // 2. AI Auto-Grading for Essay questions ONLY if student chose AI
    const essayQs = questions.filter((q) => q.questionType === 'essay');
    if (gradingMode === 'ai' && essayQs.length > 0) {
      setIsAiGrading(true);
      setAiGradingProgress({ current: 0, total: essayQs.length });
      try {
        for (let i = 0; i < essayQs.length; i++) {
          const eq = essayQs[i];
          setAiGradingProgress({ current: i + 1, total: essayQs.length });
          const studentText = answers[eq.id]?.essayAnswerText || '';
          
          const gradeResult = await gradeEssayWithAi(
            eq.questionText,
            eq.modelAnswer || 'نموذج الإجابة الوزاري القياسي',
            studentText,
            eq.points
          );

          db.gradeEssaySubmission(
            attempt.id,
            eq.id,
            gradeResult.score,
            gradeResult.feedback,
            'المصحح الذكي (Gemini AI)'
          );
        }
      } catch (err) {
        console.warn('AI auto-grading failed gracefully:', err);
      } finally {
        setIsAiGrading(false);
      }
    }

    // 3. Retrieve final updated attempt with calculated scores & feedbacks
    const finalAttempt = db.getAttemptById(attempt.id) || attempt;
    
    // Clear draft from sessionStorage
    try {
      sessionStorage.removeItem(`kawkab_exam_draft_${exam.id}`);
    } catch {}

    setSubmittedAttempt(finalAttempt);
    setIsSubmitted(true);
    setIsSubmitting(false);

    if (finalAttempt.passed) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  // Render Result Screen after Submission
  if (isSubmitted && submittedAttempt) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Result Header Card */}
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-2xl text-center space-y-4 ${
            submittedAttempt.passed
              ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
              : submittedAttempt.isProvisional
              ? 'bg-gradient-to-b from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/40'
              : 'bg-gradient-to-b from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40'
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl shadow-xl">
            {submittedAttempt.passed ? '🏆' : submittedAttempt.isProvisional ? '⏳' : '📊'}
          </div>

          <h2 className="text-2xl font-bold text-white font-alexandria">
            {submittedAttempt.passed
              ? 'ألف مبروك! لقد اجتزت الامتحان بنجاح'
              : submittedAttempt.isProvisional
              ? 'تم إرسال الامتحان — الأسئلة المقالية قيد المراجعة من المعلم'
              : 'تم الانتهاء من الامتحان'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            {submittedAttempt.isProvisional
              ? 'تم تحويل أسئلتك المقالية بنجاح إلى صفحة التصحيح لدى معلم المادة والمشرف لمراجعتها ورصد الدرجة وإضافة الملاحظات، وسيصلك إشعار فوري عند اكتمال التصحيح.'
              : `حصلت على مجموع ${submittedAttempt.totalScore} من أصل ${submittedAttempt.maxScore} درجة.`}
          </p>

          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">النسبة المئوية</span>
              <span
                className={`text-2xl font-extrabold font-mono ${
                  submittedAttempt.passed ? 'text-emerald-400' : 'text-cyan-400'
                }`}
              >
                {submittedAttempt.percentage}%
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">درجة النجاح المطلوبة</span>
              <span className="text-2xl font-extrabold text-slate-300 font-mono">
                {exam.passingPercentage}%
              </span>
            </div>

            {submittedAttempt.violationCount > 0 && (
              <div className="p-3 bg-rose-950/40 rounded-2xl border border-rose-500/30">
                <span className="text-[11px] text-rose-300 block">مخالفات الشاشة</span>
                <span className="text-2xl font-extrabold text-rose-400 font-mono">
                  {submittedAttempt.violationCount}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {submittedAttempt.passed && exam.allowsCertificate && onViewCertificates && (
              <button
                onClick={onViewCertificates}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                عرض وتحميل شهادة التفوق الرسمية
              </button>
            )}

            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all"
            >
              العودة إلى دروس المادة
            </button>
          </div>
        </div>

        {/* Detailed Question-by-Question Review */}
        <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            مراجعة الإجابات والتفسيرات النموذجية
          </h3>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const studentAns = submittedAttempt.answers?.[q.id];
              const isMcq = q.questionType === 'mcq' || q.questionType === 'true_false';
              const isFillBlank = q.questionType === 'fill_blank';
              const correctChoice = q.choices?.find((c) => c.isCorrect);
              const isCorrectMcq = isMcq && studentAns?.selectedChoiceId === correctChoice?.id;
              const isCorrectBlank = isFillBlank && (studentAns?.scoreAwarded || 0) > 0;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    isMcq
                      ? isCorrectMcq
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                      : isFillBlank
                      ? isCorrectBlank
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">السؤال {idx + 1} ({q.points} درجات)</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isMcq
                          ? isCorrectMcq
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                          : isFillBlank
                          ? isCorrectBlank
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                          : studentAns?.scoreAwarded !== undefined
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {isMcq
                        ? isCorrectMcq
                          ? 'إجابة صحيحة'
                          : 'إجابة خاطئة'
                        : isFillBlank
                        ? isCorrectBlank
                          ? 'إجابة صحيحة (أكمل)'
                          : 'إجابة غير صحيحة (أكمل)'
                        : studentAns?.scoreAwarded !== undefined
                        ? `سؤال مقالي — ${studentAns.scoreAwarded} من ${q.points}`
                        : 'سؤال مقالي (تحت المراجعة)'}
                    </span>
                  </div>

                  {/* Question Image if present */}
                  {q.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-black/40 p-1.5 text-center my-2 max-w-md mx-auto">
                      <img
                        src={q.imageUrl}
                        alt="رسم توضيحي للسؤال"
                        className="max-h-56 mx-auto rounded-lg object-contain"
                      />
                    </div>
                  )}

                  <p className="text-sm font-semibold text-white leading-relaxed">{q.questionText}</p>

                  {/* Fill in the blank breakdown */}
                  {isFillBlank && (
                    <div className="space-y-2 pt-1">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-slate-400 block mb-1">إجابتك المسجلة:</strong>
                        <p className={`font-semibold ${isCorrectBlank ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {studentAns?.essayAnswerText || '(لم يتم إدخال إجابة)'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                        <strong className="block mb-1 text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          الإجابة النموذجية المعتمدة:
                        </strong>
                        <p className="font-semibold">{q.correctBlankAnswer || q.modelAnswer || 'غير محدد'}</p>
                      </div>
                    </div>
                  )}

                  {/* MCQ choices breakdown */}
                  {isMcq && q.choices && (
                    <div className="space-y-1.5 pt-1">
                      {q.choices.map((c) => {
                        const isStudentChoice = studentAns?.selectedChoiceId === c.id;
                        const isRightChoice = c.isCorrect;

                        return (
                          <div
                            key={c.id}
                            className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                              isRightChoice
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'
                                : isStudentChoice
                                ? 'bg-rose-500/10 border-rose-500/50 text-rose-200'
                                : 'bg-slate-900/40 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{c.choiceText}</span>
                            {isRightChoice && <span className="text-[10px] font-bold">✓ الإجابة الصحيحة</span>}
                            {isStudentChoice && !isRightChoice && (
                              <span className="text-[10px] font-bold">✗ إجابتك</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay Answer breakdown */}
                  {q.questionType === 'essay' && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                        <strong className="text-slate-400 block mb-1">إجابتك المسجلة:</strong>
                        <p className="whitespace-pre-wrap">{studentAns?.essayAnswerText || '(لم يتم تقديم إجابة)'}</p>
                      </div>

                      {/* AI Auto-Grading Feedback */}
                      {(studentAns?.scoreAwarded !== undefined || studentAns?.aiFeedback || studentAns?.teacherFeedback) && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/40 space-y-2.5 shadow-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">
                                🤖
                              </div>
                              <span className="font-bold text-white text-xs">
                                تقييم المصحح الذكي (AI Auto-Grading):
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              {studentAns.scoreAwarded ?? studentAns.aiSuggestedScore ?? 0} / {q.points} درجات
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed bg-black/40 p-3 rounded-xl border border-purple-500/20">
                            💡 {studentAns.aiFeedback || studentAns.teacherFeedback}
                          </p>
                        </div>
                      )}

                      {q.modelAnswer && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                          <strong className="block mb-1 text-emerald-400 flex items-center gap-1.5 font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            نموذج الإجابة الوزاري المعتمد للمقارنة:
                          </strong>
                          <p className="whitespace-pre-wrap text-xs text-emerald-200/90">{q.modelAnswer}</p>
                        </div>
                      )}

                      {/* Interactive Self-Assessment */}
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                            🎯 التقييم الذاتي (قارن إجابتك بالنموذج):
                          </span>
                          {selfEvaluations[q.id] !== undefined && (
                            <span className="text-[11px] font-bold text-emerald-400">
                              تقييمك: {selfEvaluations[q.id]} من {q.points}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setSelfEvaluations((prev) => ({ ...prev, [q.id]: q.points }))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              selfEvaluations[q.id] === q.points
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            تطابق ممتاز (الدرجة كاملة)
                          </button>
                          <button
                            onClick={() => setSelfEvaluations((prev) => ({ ...prev, [q.id]: Math.round(q.points * 0.6 * 2) / 2 }))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              selfEvaluations[q.id] === Math.round(q.points * 0.6 * 2) / 2
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            تطابق جزئي (نصف الدرجة)
                          </button>
                          <button
                            onClick={() => setSelfEvaluations((prev) => ({ ...prev, [q.id]: 0 }))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              selfEvaluations[q.id] === 0
                                ? 'bg-rose-500 text-white border-rose-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            غير متطابق (تحتاج مراجعة)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-400 text-[11px] leading-relaxed">
                      💡 <strong>التوضيح:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // Active Examination View
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Top Bar: Timer, Anti-cheat alert, Question counter */}
      <div className="rounded-2xl glass-card p-4 border border-cyan-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Clock className={`w-4 h-4 ${timeLeftSeconds < 180 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
            <span
              className={`font-mono text-sm font-bold ${
                timeLeftSeconds < 180 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            سؤال {currentQuestionIndex + 1} من {questions.length}
          </span>
        </div>

        {/* Anti-cheat status badge */}
        <div className="flex items-center gap-2">
          {violationCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs border border-rose-500/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              تنبيهات المراقب: {violationCount}
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] border border-emerald-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              مراقبة متصلة
            </span>
          )}

          <button
            onClick={() => handleSubmitExam(false)}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            تسليم الامتحان
          </button>
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="rounded-3xl glass-card p-6 sm:p-8 border border-cyan-500/20 shadow-xl space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="font-bold text-cyan-400">
              {currentQ.questionType === 'mcq'
                ? 'اختيار من متعدد'
                : currentQ.questionType === 'fill_blank'
                ? 'أكمل العبارة'
                : currentQ.questionType === 'true_false'
                ? 'صواب أو خطأ'
                : 'سؤال مقالي تفصيلي'}
            </span>
            <span>الدرجة: {currentQ.points} درجات</span>
          </div>

          {/* Question Image (e.g. electrical circuit diagram, map, science figure) */}
          {currentQ.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/70 p-2 text-center max-w-xl mx-auto shadow-lg">
              <img
                src={currentQ.imageUrl}
                alt="رسم توضيحي للسؤال"
                className="max-h-72 w-auto max-w-full mx-auto rounded-xl object-contain shadow-inner"
              />
              <span className="text-[10px] text-slate-400 mt-1.5 block">🔍 شكل / رسم توضيحي للسؤال</span>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed font-alexandria">
            {currentQ.questionText}
          </h3>

          {/* MCQ / True-False Choices */}
          {(currentQ.questionType === 'mcq' || currentQ.questionType === 'true_false') && (
            <div className="space-y-3">
              {currentQ.choices?.map((choice) => {
                const isSelected = answers[currentQ.id]?.selectedChoiceId === choice.id;

                return (
                  <div
                    key={choice.id}
                    onClick={() => handleSelectChoice(currentQ.id, choice.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                      <span className="text-sm text-slate-200">{choice.choiceText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fill-in-the-blank Answer Input */}
          {currentQ.questionType === 'fill_blank' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-purple-950/25 border border-purple-500/30 text-xs text-purple-200">
                ✍️ <strong>سؤال أكمل:</strong> اكتب الكلمة أو العبارة المناسبة بدقة لإكمال الجملة أو حل المسألة.
              </div>
              <input
                type="text"
                value={answers[currentQ.id]?.essayAnswerText || ''}
                onChange={(e) => handleEssayInput(currentQ.id, e.target.value)}
                placeholder="اكتب إجابتك هنا..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-semibold"
              />
            </div>
          )}

          {/* Essay Answer Input */}
          {currentQ.questionType === 'essay' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                اكتب إجابتك بتنسيق واضح. سيتم مراجعة إجابتك بواسطة المعلم المختص ومقارنتها بنموذج الإجابة الوزاري:
              </p>
              <textarea
                value={answers[currentQ.id]?.essayAnswerText || ''}
                onChange={(e) => handleEssayInput(currentQ.id, e.target.value)}
                placeholder="اكتب إجابتك بالتفصيل هنا..."
                rows={6}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 leading-relaxed"
              />
              <span className="text-[10px] text-slate-500 block text-left">
                عدد الحروف: {(answers[currentQ.id]?.essayAnswerText || '').length}
              </span>
            </div>
          )}

          {/* Navigation Between Questions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentQuestionIndex === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : 'text-slate-300 hover:text-white bg-slate-800/60'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              السؤال السابق
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                السؤال التالي
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePreSubmit}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                تأكيد وتسليم الامتحان
              </button>
            )}
          </div>
        </div>
      )}

      {/* Essay Grading Mode Choice Modal */}
      {showGradingChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c1427] border border-cyan-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 relative">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20">
                📝
              </div>
              <h3 className="text-xl font-bold text-white font-alexandria">
                طريقة تصحيح الأسئلة المقالية
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                يحتوي هذا الاختبار على أسئلة مقالية. كيف تود أن يتم تصحيحها واعتماد نتيجتك؟
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-1">
              {/* Option 1: AI Instant Grading */}
              <button
                type="button"
                onClick={() => {
                  setShowGradingChoiceModal(false);
                  handleSubmitExam(false, 'ai');
                }}
                className="group p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/40 border border-cyan-500/40 hover:border-cyan-400 text-right transition-all hover:scale-[1.02] shadow-lg flex items-start gap-3.5"
              >
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-300 group-hover:text-cyan-200">
                      تصحيح فوري بالذكاء الاصطناعي
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      فوري في ثوانٍ ⚡
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    مقارنة إجابتك بنموذج إجابة وزارة التربية والتعليم ورصد الدرجة وملاحظات التقييم والشهادة فوراً.
                  </p>
                </div>
              </button>

              {/* Option 2: Teacher Manual Review */}
              <button
                type="button"
                onClick={() => {
                  setShowGradingChoiceModal(false);
                  handleSubmitExam(false, 'teacher');
                }}
                className="group p-4 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/40 border border-purple-500/40 hover:border-purple-400 text-right transition-all hover:scale-[1.02] shadow-lg flex items-start gap-3.5"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  👨‍🏫
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-purple-300 group-hover:text-purple-200">
                      إرسال للمعلم والمشرف للتصحيح
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      مراجعة بشرية ⏳
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تحويل إجاباتك إلى صفحة التصحيح لدى معلم المادة والمشرف لكتابة الملاحظات ورصد الدرجة بنفسه، وسيصلك إشعار فور اعتمادها.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setShowGradingChoiceModal(false)}
                className="text-xs text-slate-400 hover:text-white px-4 py-1.5 rounded-xl transition-colors"
              >
                رجوع للاختبار لمراجعة الإجابات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Cheating Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">تنبيه أمني ومراقبة</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {warningMessage}
            </p>
            <p className="text-[11px] text-slate-500">
              تم تسجيل هذا الحدث وتوقيته في سجل محاولة الامتحان للمراجعة الأكاديمية.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
              >
                متابعة الامتحان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Auto-Grading Modal */}
      {isAiGrading && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/30">
              <Bot className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-alexandria">التصحيح الذكي للإجابات المقالية ✨</h3>
              <p className="text-xs text-purple-200 mt-2 leading-relaxed">
                يقوم المصحح الذكي (Gemini AI) الآن بمقارنة إجابتك بنموذج الإجابة الوزاري ووضع التقييم والتعليق...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-purple-300 pt-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>جاري تقييم السؤال المقالي {aiGradingProgress.current} من {aiGradingProgress.total}...</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
