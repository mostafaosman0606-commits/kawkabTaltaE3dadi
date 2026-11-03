import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  X,
  BookOpen,
  Filter,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { TeacherHomework } from '../../types';

interface StudentHomeworkViewProps {
  onBack?: () => void;
}

export const StudentHomeworkView: React.FC<StudentHomeworkViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const subjects = db.getSubjects();
  const allHomeworks = db.getTeacherHomeworks();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedHwForAnswer, setSelectedHwForAnswer] = useState<TeacherHomework | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = () => setRefreshKey((k) => k + 1);

  const filteredHomeworks = allHomeworks.filter((hw) => {
    if (selectedSubjectId === 'all') return true;
    return hw.subjectId === selectedSubjectId;
  });

  const studentSubmissions = user
    ? allHomeworks.flatMap((hw) =>
        hw.submissions.filter((s) => s.studentId === user.id)
      )
    : [];

  const gradedCount = studentSubmissions.filter((s) => s.score !== undefined).length;
  const pendingGradeCount = studentSubmissions.filter((s) => s.score === undefined).length;

  const handleOpenAnswerModal = (hw: TeacherHomework) => {
    const existing = user ? hw.submissions.find((s) => s.studentId === user.id) : null;
    setSelectedHwForAnswer(hw);
    setAnswerText(existing?.answerText || '');
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHwForAnswer || !answerText.trim() || !user) return;

    setIsSubmitting(true);
    db.submitHomeworkAnswer(
      selectedHwForAnswer.id,
      user.id,
      user.fullName,
      answerText.trim()
    );
    setIsSubmitting(false);
    setSelectedHwForAnswer(null);
    setAnswerText('');
    forceRefresh();
    alert('تم إرسال إجابة الواجب لمعلم المادة بنجاح! سيتم مراجعتها وتصحيحها قريباً. ✨');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-purple-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>متابعة التكليفات والواجبات المدرسية المباشرة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-alexandria">
              الواجبات والتكليفات المدرسية 📝
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              حل الواجبات المرفوعة من معلمي كوكب تالتة، احصل على درجات تفصيلية وملاحظات مباشرة لتحسين مستواك الدراسي.
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 self-start transition-all"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للرئيسية
            </button>
          )}
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">إجمالي الواجبات</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">
              {allHomeworks.length} واجب
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-amber-400 block">تم تسليمها وبانتظار التصحيح</span>
            <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
              {pendingGradeCount} واجب
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-emerald-400 block">تم تصحيحها واعتمادها</span>
            <span className="text-lg font-bold text-emerald-300 font-mono mt-0.5 block">
              {gradedCount} واجب
            </span>
          </div>
        </div>
      </div>

      {/* 2. Subject Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedSubjectId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedSubjectId === 'all'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          جميع المواد ({allHomeworks.length})
        </button>
        {subjects.map((sub) => {
          const count = allHomeworks.filter((h) => h.subjectId === sub.id).length;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedSubjectId === sub.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {sub.nameAr} ({count})
            </button>
          );
        })}
      </div>

      {/* 3. Homework Cards Grid */}
      {filteredHomeworks.length === 0 ? (
        <div className="text-center py-16 bg-[#080d1a]/80 border border-slate-800 rounded-3xl p-8 space-y-3">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">لا توجد واجبات مطلوبة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            معلمو المادة لم يضيفوا تكليفات جديدة بعد. يمكنك استغلال الوقت في متابعة الدروس أو خوض التحديات المباشرة!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHomeworks.map((hw) => {
            const submission = user ? hw.submissions.find((s) => s.studentId === user.id) : null;
            const isGraded = submission && submission.score !== undefined;
            const isSubmitted = !!submission;
            const isPastDeadline = hw.deadlineAt ? new Date(hw.deadlineAt) < new Date() : false;

            return (
              <div
                key={hw.id}
                className="bg-[#0c1427]/90 border border-slate-800 hover:border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-xl transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {hw.subjectName}
                      </span>
                      <h3 className="font-bold text-white text-base font-alexandria">
                        {hw.title}
                      </h3>
                      {isGraded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          تم التصحيح ({submission.score} / {hw.maxScore || 10})
                        </span>
                      ) : isSubmitted ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          تم التسليم - بانتظار تصحيح المعلم
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          مطلوب التسليم
                        </span>
                      )}
                    </div>

                    {hw.description && (
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed mt-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                        {hw.description}
                      </p>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenAnswerModal(hw)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md ${
                        isGraded
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : isSubmitted
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/40'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>
                        {isGraded
                          ? 'عرض إجابتي وتصحيح المعلم'
                          : isSubmitted
                          ? 'تعديل الإجابة المرسلة'
                          : 'حل الواجب الآن'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submissions & Feedback Details Preview */}
                {submission && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>إجابتك المسلّمة:</span>
                      <span>
                        تاريخ التسليم:{' '}
                        {new Date(submission.submittedAt).toLocaleString('ar-EG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-200 bg-[#070b14] p-3 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed">
                      {submission.answerText}
                    </p>

                    {isGraded && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400 text-xs">
                            درجة المعلم: {submission.score} من {hw.maxScore || 10}
                          </span>
                        </div>
                        {submission.teacherFeedback && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs">
                            <span className="font-bold ml-1">تعليق وتوجيه المعلم:</span>
                            <span>{submission.teacherFeedback}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    {hw.deadlineAt && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        آخر موعد:{' '}
                        {new Date(hw.deadlineAt).toLocaleString('ar-EG', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                    <span>الدرجة العظمى: {hw.maxScore || 10} درجات</span>
                  </div>
                  <span>{hw.submissions.length} طالب قاموا بالتسليم</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Answer / Solve Homework Modal */}
      {selectedHwForAnswer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-purple-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/20">
                  {selectedHwForAnswer.subjectName}
                </span>
                <h3 className="font-bold text-white text-base mt-1 font-alexandria">
                  {selectedHwForAnswer.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedHwForAnswer(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedHwForAnswer.description && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold block text-purple-300 mb-1">تفاصيل التكليف المطلوب:</span>
                <p className="whitespace-pre-wrap">{selectedHwForAnswer.description}</p>
              </div>
            )}

            <form onSubmit={handleSubmitAnswer} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-200 font-bold block">
                  اكتب حل الواجب هنا بالتفصيل:
                </label>
                <textarea
                  rows={6}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="اكتب خطوات الحل أو الإجابة النموذجية كما يطلب المعلم..."
                  required
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-xs leading-relaxed"
                />
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>سيتم إرسال إجابتك فوراً إلى لوحة المعلم للتصحيح ورصد درجتك.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedHwForAnswer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !answerText.trim()}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/25"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الإجابة للمعلم'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
