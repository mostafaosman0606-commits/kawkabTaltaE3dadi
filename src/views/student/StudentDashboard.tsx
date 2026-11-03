import React from 'react';
import {
  Sparkles,
  BookOpen,
  Award,
  Trophy,
  Swords,
  Bot,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Clock,
  ChevronLeft,
  GraduationCap,
  PlayCircle,
  HelpCircle,
  Users,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/storage';
import { SubjectIcon } from '../../components/SubjectIcon';
import { StreakBadgesPanel } from '../../components/StreakBadgesPanel';
import { WeeklyReportPanel } from '../../components/WeeklyReportPanel';

interface StudentDashboardProps {
  onNavigate: (tab: string, context?: any) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const subjects = db.getSubjects();
  const progress = user ? db.getLessonProgress(user.id) : [];
  const attempts = user ? db.getExamAttempts(user.id) : [];
  const certs = user ? db.getCertificates(user.id) : [];
  const leaderboard = db.getLeaderboard();
  const announcements = db.getAnnouncements();
  const allHomeworks = db.getTeacherHomeworks();
  const studentSchedule = user ? db.getStudentSchedule(user.id) : [];
  const todaySlots = studentSchedule.filter((s) => s.dayOfWeek === new Date().getDay());
  const studentTasks = user ? db.getStudentTasks(user.id) : [];
  const pendingTasks = studentTasks.filter((t) => !t.completed);

  // Metrics calculated from ACTUAL database records
  const completedLessonsCount = progress.filter((p) => p.completed).length;
  const gradedAttempts = attempts.filter((a) => a.status === 'graded');
  const avgExamScore =
    gradedAttempts.length > 0
      ? Math.round(gradedAttempts.reduce((acc, a) => acc + a.percentage, 0) / gradedAttempts.length)
      : 0;

  const isStaff = user?.role === 'admin' || user?.role === 'teacher';
  const userLeaderboardEntry = leaderboard.find((l) => l.studentId === user?.id);
  const studentRank = userLeaderboardEntry ? userLeaderboardEntry.rank : null;
  const totalLessons = db.getLessons().length;
  const progressPercent = Math.min(100, Math.round((completedLessonsCount / (totalLessons || 1)) * 100));

  return (
    <div className="space-y-6">
      
      {/* 1. Welcome & Space Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-cyan-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>مرحباً بك في عالم الشهادة الإعدادية المتفوق</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-alexandria leading-snug">
              أهلاً بك يا {user?.fullName?.split(' ')[0] || 'بطل'} في كوكب تالتة 🚀
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              محطتك الفضائية لاجتياز الشهادة الإعدادية بتفوق. تابع شروح المواد الثمانية، نافس زملاءك في التحديات المباشرة، وحقق حلم مجموع الشهادة الإعدادية المتميز!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('subjects')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              ابدأ المذاكرة الآن
            </button>

            <button
              onClick={() => onNavigate('challenges')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Swords className="w-4 h-4 text-cyan-400" />
              تحدي مباشر
            </button>

            <button
              onClick={() => onNavigate('schedule')}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md"
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              جدولي وتنظيم الوقت
            </button>

            <button
              onClick={() => onNavigate('homework')}
              className="px-4 py-2.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md"
            >
              <CheckSquare className="w-4 h-4 text-purple-400" />
              واجباتي المدرسية
            </button>

            <button
              onClick={() => onNavigate('group-chat')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              المجتمع والمشرفين
            </button>
          </div>
        </div>
      </div>

      {/* 2. Educational Progress Section: "مسارك التعليمي نحو التفوق" */}
      <div className="rounded-2xl glass-card p-6 border border-cyan-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-alexandria">
                مسارك التعليمي نحو التفوق
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              متابعة دقيقة لكل درس واختبار تؤديه عبر نظام كوكب تالتة المتكامل
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">نسبة الإنجاز الكلي</span>
              <span className="text-xl font-extrabold text-cyan-400 font-mono">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-3 p-0.5 overflow-hidden border border-slate-700">
          <div
            className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 h-full rounded-full transition-all duration-1000 shadow-sm shadow-cyan-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">الدروس المنجزة</span>
            <span className="text-lg font-bold text-white font-mono mt-1 block">
              {completedLessonsCount} / {totalLessons}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> تم تأكيد إنهائها
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">متوسط الامتحانات</span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-1 block">
              {avgExamScore}%
            </span>
            <span className="text-[10px] text-cyan-300 block mt-1">
              {gradedAttempts.length} امتحانات مكتملة
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">الترتيب العام</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-1 block">
              {isStaff ? 'حساب إدارة' : studentRank ? `المركز ${studentRank} 🏆` : 'غير مصنف بعد'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {isStaff ? 'غير مدرج في قائمة الأوائل' : studentRank ? `على مستوى ${user?.governorate || 'المحافظة'}` : 'ابدأ بالحل لدخول الترتيب'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">الشهادات المكتسبة</span>
            <span className="text-lg font-bold text-purple-400 font-mono mt-1 block">
              {certs.length} شهادات 📜
            </span>
            <span className="text-[10px] text-purple-300 block mt-1">
              رسمية ومؤكدة بـ QR
            </span>
          </div>
        </div>
      </div>

      {/* 2.5. Homework & Assignments Quick Card */}
      <div className="rounded-2xl glass-card p-6 border border-purple-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-white font-alexandria">
                الواجبات والتكليفات المدرسية 📝
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تكليفات ومسائل مرفوعة من معلمي المواد مع إمكانية إرسال إجابتك فوراً
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('homework')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors self-start sm:self-center"
          >
            <span>عرض ومتابعة كل الواجبات ({allHomeworks.length})</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {allHomeworks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            لا توجد واجبات مطلوبة حالياً — واصل تفوقك في إتمام الدروس! ✨
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allHomeworks.slice(0, 4).map((hw) => {
              const submission = user ? hw.submissions.find((s) => s.studentId === user.id) : null;
              const isGraded = submission && submission.score !== undefined;
              const isSubmitted = !!submission;

              return (
                <div
                  key={hw.id}
                  onClick={() => onNavigate('homework')}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group hover:-translate-y-0.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {hw.subjectName}
                      </span>
                      {isGraded ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          تم التصحيح ({submission.score}/{hw.maxScore || 10})
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          تم التسليم
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          مطلوب التسليم
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                      {hw.title}
                    </h3>
                    {hw.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {hw.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>الدرجة: {hw.maxScore || 10} درجات</span>
                    <span className="text-purple-400 font-bold flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                      {isSubmitted ? 'عرض الإجابة' : 'حل الواجب ✏️'}
                      <ChevronLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2.6. Daily Schedule & Tasks Widget */}
      <div className="rounded-2xl glass-card p-6 border border-cyan-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white font-alexandria">
                جدولي الدراسي ومهام اليوم 📅
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                مواعيد مذاكرة اليوم والمهام المعلقة لإنجازها
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('schedule')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors self-start sm:self-center"
          >
            <span>فتح الجدول الكامل والمهام ↩</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's slots */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                حصص ومذاكرة اليوم ({todaySlots.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                اليوم
              </span>
            </div>

            {todaySlots.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                لا توجد حصص مسجلة لليوم — اضغط لتنظيم جدولك
              </div>
            ) : (
              <div className="space-y-2">
                {todaySlots.slice(0, 3).map((slot) => (
                  <div
                    key={slot.id}
                    className="p-2.5 rounded-lg bg-[#070b14] border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white block">{slot.title}</span>
                      <span className="text-[10px] text-cyan-300">{slot.subjectName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Tasks */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                مهام المذاكرة المعلقة ({pendingTasks.length})
              </span>
              <span className="text-[10px] text-slate-400">
                {studentTasks.filter((t) => t.completed).length} منجزة
              </span>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="py-4 text-center text-xs text-emerald-400/80">
                🎉 رائع! تم إنجاز جميع مهام المذاكرة اليوم
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-lg bg-[#070b14] border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white truncate flex-1 ml-2">
                      {task.title}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                      {task.priority === 'high' ? 'أولوية قصوى' : 'مطلوبة'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. The Eight School Subjects Quick Access Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white font-alexandria">المواد الدراسية الثمانية</h2>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            عرض الكل
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {subjects.map((sub) => {
            return (
              <div
                key={sub.id}
                onClick={() => onNavigate('subject-detail', { subjectId: sub.id })}
                className="group relative rounded-2xl glass-card p-4 border border-cyan-500/10 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-3 shadow-md shadow-cyan-500/10 group-hover:scale-110 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/50 transition-all">
                  <SubjectIcon subject={sub} className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </div>

                <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                  {sub.nameAr}
                </h3>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{sub.lessonsCount || 0} درس</span>
                  <span className="text-cyan-400 flex items-center gap-0.5">
                    دخول
                    <ArrowLeft className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Challenges & Robo AI Promo Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Live Challenges Card */}
        <div className="rounded-2xl glass-card p-5 border border-cyan-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                <Flame className="w-3 h-3 text-rose-400" />
                مباشر وتنافسي
              </div>
              <h3 className="text-base font-bold text-white font-alexandria">
                تحدي كوكب تالتة ⚔️
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ادخل في مبارزة سريعة من 5 أسئلة مع زملائك على مستوى مصر واربح نقاطاً إضافية في قائمة الأوائل.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 flex items-center justify-center border border-rose-500/30 shrink-0">
              <Swords className="w-6 h-6 text-rose-400" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => onNavigate('challenges')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              بدء تحدي جديد
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">متاح لجميع المواد</span>
          </div>
        </div>

        {/* Robo AI Tutor Card */}
        <div className="rounded-2xl glass-card p-5 border border-cyan-500/20 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                <Bot className="w-3 h-3 text-cyan-400" />
                مساعد الذكاء الاصطناعي
              </div>
              <h3 className="text-base font-bold text-white font-alexandria">
                المعلم الذكي «روبو» 🤖
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                اسأل روبو في أي مسألة رياضية أو قاعدة نحوية، أو ارفع صورة مسألة من كتابك ليقودك للحل خطوة بخطوة.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <Bot className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => onNavigate('robo')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              تحدث مع روبو
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-cyan-300 font-mono">
              متبقي: {user?.subscriptionTier === 'premium' ? 'غير محدود' : 'أسئلة شهرية'}
            </span>
          </div>
        </div>

      </div>

      {/* Gamification Row: Streak + Badges + Goals & Weekly Report */}
      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StreakBadgesPanel onNavigate={onNavigate} />
          <WeeklyReportPanel />
        </div>
      )}

      {/* 5. Announcements Banner */}
      {announcements.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-cyan-950/40 p-4 border border-blue-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              📢
            </div>
            <div>
              <p className="text-xs font-bold text-white">{announcements[0].title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{announcements[0].content}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
