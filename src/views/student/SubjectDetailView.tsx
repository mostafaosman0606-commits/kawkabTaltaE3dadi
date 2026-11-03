import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  Clock,
  ClipboardList,
  Sparkles,
  ChevronLeft,
  Award,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { SubjectIcon } from '../../components/SubjectIcon';

interface SubjectDetailViewProps {
  subjectId: string;
  onBack: () => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectExam: (examId: string) => void;
  onUpgradeClick?: () => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subjectId,
  onBack,
  onSelectLesson,
  onSelectExam,
  onUpgradeClick,
}) => {
  const { user } = useAuth();
  const subject = db.getSubjectById(subjectId);
  const units = db.getUnits(subjectId);
  const lessons = db.getLessons(subjectId);
  const exams = db.getExaminations(subjectId);
  const progress = user ? db.getLessonProgress(user.id) : [];

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<'lesson' | 'exam'>('lesson');

  if (!subject) {
    return (
      <div className="text-center py-12 text-slate-400">
        المادة غير موجودة
        <button onClick={onBack} className="block mx-auto mt-4 text-cyan-400">
          العودة للمواد
        </button>
      </div>
    );
  }

  const isFreeTier = user?.subscriptionTier === 'free';

  return (
    <div className="space-y-6">
      
      {/* Top Breadcrumb & Return */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        الرجوع إلى قائمة المواد
      </button>

      {/* Subject Header Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 border border-cyan-500/20 relative overflow-hidden shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${subject.colorPrimary}18 0%, #091022 100%)`,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20 shrink-0">
              <SubjectIcon subject={subject} className="w-8 h-8 text-cyan-300" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-alexandria">
                {subject.nameAr}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {subject.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">الدروس</span>
              <span className="text-lg font-bold text-white font-mono">{lessons.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[11px] text-slate-400 block">الامتحانات</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{exams.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Units & Lessons Accordion/List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white font-alexandria flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          الدروس الدراسية المتاحة
        </h2>

        {(() => {
          const allSubjectLessons = db.getLessons(subjectId);

          if (allSubjectLessons.length === 0) {
            return (
              <div className="p-10 text-center rounded-2xl bg-[#0c1427]/80 border border-slate-800 space-y-3 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">
                  لا توجد دروس مضافة في هذه المادة بعد.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  يقوم معلم المادة أو المشرف بإضافة الدروس ومذكرات PDF وفيديوهات الشرح من لوحة الإدارة.
                </p>
              </div>
            );
          }

          return (
            <div className="rounded-2xl glass-card p-5 border border-cyan-500/15 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">قائمة الدروس المعتمدة</h3>
                <span className="text-xs text-cyan-400 font-medium">
                  {allSubjectLessons.length} دروس
                </span>
              </div>

              <div className="space-y-2.5">
                {allSubjectLessons.map((lesson, idx) => {
                  const isCompleted = progress.some(
                    (p) => p.lessonId === lesson.id && p.completed
                  );
                  // Free Plan Rule: Only the FIRST lesson in each subject is unlocked!
                  const isLocked = isFreeTier && idx > 0;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        if (isLocked) {
                          setUpgradeModalReason('lesson');
                          setShowUpgradeModal(true);
                        } else {
                          onSelectLesson(lesson.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isLocked
                          ? 'bg-slate-950/40 border-slate-900 hover:border-amber-500/40 opacity-80 cursor-pointer'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/60 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-amber-400" />
                          ) : (
                            <PlayCircle className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{lesson.title}</h4>
                            {idx === 0 && isFreeTier && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                متاح مجاناً (الدرس الأول) ⭐
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {lesson.durationMinutes || 20} دقيقة
                            </span>
                            {lesson.teacherName && (
                              <span className="text-slate-400">
                                المعلم: {lesson.teacherName}
                              </span>
                            )}
                            {lesson.pdfUrl && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <FileText className="w-3 h-3 text-cyan-400" />
                                ملخص PDF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Label */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            تم الانتهاء بالفعل
                          </span>
                        ) : isLocked ? (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            يتطلب باقة قياسية أو مميزة
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-cyan-500/30 flex items-center gap-1">
                            ابدأ الدرس
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Subject Examinations Section */}
      <div className="rounded-2xl glass-card p-6 border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-alexandria">
              امتحانات مادة {subject.nameAr}
            </h2>
          </div>
          <span className="text-xs text-slate-400">{exams.length} امتحانات متاحة</span>
        </div>

        {exams.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            لا توجد امتحانات منشورة حالياً لهذه المادة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam, idx) => {
              const attempts = user ? db.getExamAttempts(user.id, exam.id) : [];
              const latestAttempt = attempts[0];
              // Free Plan Rule: Only the FIRST exam in each subject is unlocked!
              const isExamLocked = isFreeTier && idx > 0;

              return (
                <div
                  key={exam.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                    isExamLocked
                      ? 'bg-slate-950/40 border-slate-900 opacity-80'
                      : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {exam.examType === 'official' ? 'امتحان رسمي شامل' : 'امتحان تدريبي'}
                        </span>
                        {idx === 0 && isFreeTier && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            متاح مجاناً (أول اختبار) ⭐
                          </span>
                        )}
                      </div>
                      {exam.allowsCertificate && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          يمنح شهادة تفوق
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-sm text-white">{exam.title}</h3>
                    <p className="text-xs text-slate-400">{exam.description}</p>
                    
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>المدة: {exam.timeLimitMinutes} دقيقة</span>
                      <span>•</span>
                      <span>نسبة النجاح: {exam.passingPercentage}%</span>
                      <span>•</span>
                      <span>المحاولات: {attempts.length}/{exam.maxAttempts}</span>
                      {latestAttempt && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-300 font-bold font-mono">
                            آخر نتيجة: {latestAttempt.percentage}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {(() => {
                    if (isExamLocked) {
                      return (
                        <button
                          onClick={() => {
                            setUpgradeModalReason('exam');
                            setShowUpgradeModal(true);
                          }}
                          className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-center text-xs font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>مقفل — يتطلب ترقية الباقة لخوض باقي الاختبارات</span>
                        </button>
                      );
                    }

                    const maxAttemptsReached = attempts.length >= exam.maxAttempts;

                    if (maxAttemptsReached) {
                      return (
                        <div className="w-full py-2 bg-slate-800/80 text-slate-400 text-center text-xs font-medium rounded-xl border border-slate-700">
                          استنفدت الحد الأقصى للمحاولات ({exam.maxAttempts} محاولات)
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={() => onSelectExam(exam.id)}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <ClipboardList className="w-4 h-4" />
                        {latestAttempt ? 'إعادة خوض الامتحان' : 'بدء الامتحان الآن'}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Required Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0b1329] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-4 relative">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
              🔒
            </div>

            <h3 className="text-xl font-bold text-white font-alexandria">
              {upgradeModalReason === 'lesson'
                ? 'هذا الدرس متاح لمشتركي الباقات المدفوعة'
                : 'هذا الاختبار متاح لمشتركي الباقات المدفوعة'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              على الباقة المجانية، يمكنك دراسة <strong>أول درس فقط</strong> وخوض <strong>أول اختبار فقط</strong> في كل مادة. قم بالترقية الآن لفتح كامل المنهج التعليمي وبنك الأسئلة والامتحانات الشاملة!
            </p>

            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-around text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">الباقة القياسية</span>
                <span className="font-extrabold text-white text-sm">90 ج.م</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-purple-300 block text-[10px]">الباقة المميزة</span>
                <span className="font-extrabold text-purple-300 text-sm">150 ج.م</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  if (onUpgradeClick) onUpgradeClick();
                  else onBack();
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>ترقية باقتي الآن 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
