import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Video,
  Download,
  Save,
  Clock,
  Sparkles,
  BookOpen,
  StickyNote,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';

interface LessonViewProps {
  lessonId: string;
  onBack: () => void;
  onUpgradeClick?: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ lessonId, onBack, onUpgradeClick }) => {
  const { user } = useAuth();
  const lesson = db.getLessonById(lessonId);
  const subject = lesson ? db.getSubjectById(lesson.subjectId) : null;
  const isCompletedInitially = user ? db.isLessonCompleted(lessonId, user.id) : false;

  const isFreeTier = user?.role === 'student' && user?.subscriptionTier === 'free';
  const allSubjectLessons = lesson ? db.getLessons(lesson.subjectId) : [];
  const isFirstLesson = allSubjectLessons.length > 0 && allSubjectLessons[0].id === lessonId;
  const isLocked = isFreeTier && !isFirstLesson;

  const [isCompleted, setIsCompleted] = useState(isCompletedInitially);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(isCompletedInitially);
  const [noteContent, setNoteContent] = useState('');
  const [noteSavedMessage, setNoteSavedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'summary' | 'video' | 'notes'>('content');
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user && lessonId) {
      const completed = db.isLessonCompleted(lessonId, user.id);
      setIsCompleted(completed);
      if (completed) {
        setHasScrolledToBottom(true);
      }
      const existingNote = db.getLessonNote(lessonId, user.id);
      if (existingNote) {
        setNoteContent(existingNote.content);
      }
    }
  }, [lessonId, user]);

  // Track scrolling to the bottom of the lesson to guarantee full reading
  useEffect(() => {
    if (isCompleted) {
      setHasScrolledToBottom(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasScrolledToBottom(true);
        }
      },
      { threshold: 0.1 }
    );

    if (bottomSentinelRef.current) {
      observer.observe(bottomSentinelRef.current);
    }

    const handleWindowScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const windowH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      if (scrollY + windowH >= docH - 120) {
        setHasScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [isCompleted, lessonId]);

  if (!lesson) {
    return (
      <div className="text-center py-12 text-slate-400">
        الدرس غير موجود
        <button onClick={onBack} className="block mx-auto mt-4 text-cyan-400">
          العودة
        </button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-16 px-4">
        <div className="p-8 bg-[#0c1427]/95 border border-amber-500/40 rounded-3xl shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
            🔒
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-alexandria">
            هذا الدرس مقفل على الخطة المجانية
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            على الخطة المجانية، يمكنك دراسة <strong>الدرس الأول فقط</strong> في كل مادة. قم بالترقية الآن للوصول إلى كافة شروح وفيديوهات وملخصات المنهج كاملة!
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

  const handleCompleteLesson = () => {
    if (!user || !hasScrolledToBottom) return;
    db.completeLesson(lessonId, user.id);
    setIsCompleted(true);
  };

  const handleSaveNote = () => {
    if (!user) return;
    db.saveLessonNote(lessonId, user.id, noteContent);
    setNoteSavedMessage(true);
    setTimeout(() => setNoteSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Breadcrumb & Return */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          الرجوع إلى دروس المادة
        </button>

        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            تم الانتهاء بالفعل
          </span>
        )}
      </div>

      {/* Lesson Header */}
      <div className="rounded-3xl glass-card p-6 border border-cyan-500/20 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            {subject?.nameAr || 'المادة الدراسية'}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {lesson.durationMinutes} دقيقة مذاكرة
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white font-alexandria">
          {lesson.title}
        </h1>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            الشرح التفصيلي
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900/40'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            فيديو الشرح المرئي
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            ملخص الدرس
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900/40'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            ملاحظاتي الخاصة
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Center: Content Tabs (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: Written Explanation */}
          {activeTab === 'content' && (
            <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-6">
              <div
                className="prose prose-invert max-w-none text-slate-200"
                dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
              />

              {lesson.images && lesson.images.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-cyan-300">رسومات ومخططات توضيحية:</h4>
                    <span className="text-[10px] text-slate-400">اضغط على أي صورة لتكبيرها بالحجم الكامل</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lesson.images.map((imgUrl, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedImagePreview(imgUrl)}
                        className="group relative rounded-xl overflow-hidden border border-slate-700 hover:border-cyan-500/50 cursor-pointer shadow-lg transition-all"
                      >
                        <img
                          src={imgUrl}
                          alt="توضيح الدرس"
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <span>تكبير 🔍</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Video Player */}
          {activeTab === 'video' && (
            <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                فيديو الشرح المرئي
              </h3>

              {lesson.videoUrl ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  {lesson.videoType === 'direct' ||
                  lesson.videoUrl.endsWith('.mp4') ||
                  lesson.videoUrl.endsWith('.webm') ? (
                    <video
                      controls
                      src={lesson.videoUrl}
                      className="w-full h-full object-cover"
                      poster={lesson.images?.[0]}
                    />
                  ) : (
                    <iframe
                      className="w-full h-full"
                      src={
                        lesson.videoUrl.includes('youtube.com/watch?v=')
                          ? `https://www.youtube-nocookie.com/embed/${lesson.videoUrl.split('v=')[1]?.split('&')[0]}`
                          : lesson.videoUrl.includes('youtu.be/')
                          ? `https://www.youtube-nocookie.com/embed/${lesson.videoUrl.split('youtu.be/')[1]?.split('?')[0]}`
                          : lesson.videoUrl
                      }
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              ) : (
                <div className="py-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <Video className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">لم يتم رفع فيديو شرح لهذا الدرس بعد</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    يمكنك متابعة الشرح المكتوب المرفق، وتحميل ملزمة الـ PDF، وحل تدريبات بنك الأسئلة.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400">
                شرح مبسط ومركز مع حل أسئلة الكتاب المدرسي ونماذج امتحانات الشهادة الإعدادية.
              </p>
            </div>
          )}

          {/* TAB 3: Summary */}
          {activeTab === 'summary' && (
            <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">الخلاصة وأهم نقاط الدرس</h3>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-sm leading-relaxed">
                {lesson.summary || 'ملخص سريع للنقاط الرئيسية في الدرس.'}
              </div>

              {lesson.pdfUrl && (
                <div className="pt-2">
                  <a
                    href={lesson.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    تحميل ملخص الدرس بتنسيق PDF
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Private Notes */}
          {activeTab === 'notes' && (
            <div className="rounded-2xl glass-card p-6 border border-cyan-500/15 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">دفتر ملاحظاتي الخاص</h3>
                </div>
                {noteSavedMessage && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم حفظ الملاحظة بنجاح
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400">
                ملاحظاتك هنا سرية تماماً ومحفوظة في حسابك، ولن يتمكن أي طالب آخر من قراءتها.
              </p>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="اكتب النقاط الصعبة أو القوانين التي ترغب في تذكرها لاحقاً قبل الامتحان..."
                rows={6}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  حفظ الملاحظة
                </button>
              </div>
            </div>
          )}

          {/* Completion Section with Scroll-To-Bottom Enforcement */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-center sm:text-right">
              <h4 className="font-bold text-white text-sm sm:text-base flex items-center justify-center sm:justify-start gap-2">
                {isCompleted ? '🎉 مبروك! لقد أتممت هذا الدرس بنجاح' : 'هل أتممت قراءة وفهم هذا الدرس؟'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isCompleted
                  ? 'تم تسجيل إنجازك لهذا الدرس في ملفك الأكاديمي ولوحة الترتيب العام.'
                  : hasScrolledToBottom
                  ? 'أحسنت! وصلت إلى نهاية الدرس. اضغط الآن لتأكيد إنهاء الدرس.'
                  : '📜 يُشترط تمرير الدرس وقراءته بالكامل حتى نهايته لتفعيل زر الإنهاء.'}
              </p>
            </div>

            {isCompleted ? (
              <div className="px-6 py-3 rounded-2xl bg-emerald-500/20 text-emerald-300 text-sm font-extrabold border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 flex items-center gap-2 animate-in fade-in shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>تم الانهاء بالفعل</span>
              </div>
            ) : (
              <button
                onClick={handleCompleteLesson}
                disabled={!hasScrolledToBottom}
                className={`px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 shrink-0 ${
                  hasScrolledToBottom
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50 cursor-pointer animate-pulse'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{hasScrolledToBottom ? 'تأكيد إنهاء الدرس' : 'مرر لنهاية الدرس 📜'}</span>
              </button>
            )}
          </div>

          {/* Bottom sentinel for scroll detection */}
          <div ref={bottomSentinelRef} className="h-4" />

        </div>

        {/* Right Sidebar: Downloads & Quick Actions */}
        <div className="space-y-5">
          
          {/* PDF Download Card */}
          {lesson.pdfUrl && (
            <div className="rounded-2xl glass-card p-5 border border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-sm text-white">ملزمة الدرس</h4>
              </div>
              <p className="text-xs text-slate-400">
                نسخة إلكترونية منسقة جاهزة للطباعة تتضمن خرائط ذهنية وتدريبات مجابة.
              </p>
              <a
                href={lesson.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-medium border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل الملزمة (PDF)
              </a>
            </div>
          )}

          {/* Quick Notes Sidebox if not on notes tab */}
          {activeTab !== 'notes' && (
            <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-xs text-white">ملاحظتك السريعة</h4>
                </div>
                <button
                  onClick={() => setActiveTab('notes')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  فتح الدفتر
                </button>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                {noteContent || 'لا توجد ملاحظات مدونة بعد... اضغط لتدوين ملاحظة.'}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Lightbox / Full-screen Image Preview Modal for Diagrams & Maps */}
      {selectedImagePreview && (
        <div
          onClick={() => setSelectedImagePreview(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute -top-12 left-0 text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>إغلاق</span>
              <span>✕</span>
            </button>
            <img
              src={selectedImagePreview}
              alt="توضيح كامل"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-cyan-500/30"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
};
