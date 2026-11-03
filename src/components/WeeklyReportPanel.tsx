import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, BookOpen, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { db } from '../services/storage';

export const WeeklyReportPanel: React.FC = () => {
  const { user } = useAuth();

  const report = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const attempts = db.getExamAttempts(user.id).filter((a) => new Date(a.submittedAt || a.startedAt) >= weekAgo);
    const progress = db.getLessonProgress(user.id).filter((p) => p.completed && p.completedAt && new Date(p.completedAt) >= weekAgo);

    const gradedAttempts = attempts.filter((a) => a.status === 'graded');
    const avgScore =
      gradedAttempts.length > 0
        ? Math.round(gradedAttempts.reduce((acc, a) => acc + a.percentage, 0) / gradedAttempts.length)
        : 0;

    // Find weakest and best subject - ExamAttempt has subjectName field
    const subjectScores: Record<string, number[]> = {};
    gradedAttempts.forEach((a) => {
      const key = a.subjectName || 'غير محدد';
      if (!subjectScores[key]) subjectScores[key] = [];
      subjectScores[key].push(a.percentage);
    });

    let weakestSubject = '';
    let bestSubject = '';
    let minAvg = Infinity;
    let maxAvg = -Infinity;

    Object.entries(subjectScores).forEach(([subName, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < minAvg) { minAvg = avg; weakestSubject = subName; }
      if (avg > maxAvg) { maxAvg = avg; bestSubject = subName; }
    });

    // Count unique study days
    const studyDays = new Set([
      ...attempts.map((a) => (a.submittedAt || a.startedAt).split('T')[0]),
      ...progress.map((p) => (p.completedAt || '').split('T')[0]).filter(Boolean),
    ]);

    return {
      lessonsCompleted: progress.length,
      examsAttempted: attempts.length,
      avgScore,
      weakestSubject: weakestSubject || 'لا توجد بيانات',
      bestSubject: bestSubject || 'لا توجد بيانات',
      totalStudyDays: studyDays.size,
    };
  }, [user]);

  if (!user || !report) return null;

  const stats = [
    { icon: <BookOpen className="w-4 h-4 text-cyan-400" />, label: 'دروس مكتملة', value: report.lessonsCompleted, color: 'text-cyan-300' },
    { icon: <FileText className="w-4 h-4 text-purple-400" />, label: 'اختبارات', value: report.examsAttempted, color: 'text-purple-300' },
    { icon: <TrendingUp className="w-4 h-4 text-green-400" />, label: 'متوسط الدرجات', value: `${report.avgScore}%`, color: 'text-green-300' },
    { icon: <BarChart2 className="w-4 h-4 text-amber-400" />, label: 'أيام المذاكرة', value: report.totalStudyDays, color: 'text-amber-300' },
  ];

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <BarChart2 className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-bold text-white">📊 التقرير الأسبوعي</h3>
        <span className="text-[10px] text-slate-400 mr-auto">آخر 7 أيام</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <div className={`text-xl font-black font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Subjects insight */}
        {report.examsAttempted > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-xs text-green-300 font-bold mb-0.5">⭐ الأفضل</div>
              <div className="text-[11px] text-slate-300">{report.bestSubject}</div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-xs text-red-300 font-bold mb-0.5">
                <AlertTriangle className="w-3 h-3 inline ml-1" />
                يحتاج مراجعة
              </div>
              <div className="text-[11px] text-slate-300">{report.weakestSubject}</div>
            </div>
          </div>
        )}

        {report.lessonsCompleted === 0 && report.examsAttempted === 0 && (
          <p className="text-center text-xs text-slate-500 py-2">
            لا توجد نشاطات هذا الأسبوع. ابدأ المذاكرة! 🚀
          </p>
        )}
      </div>
    </div>
  );
};
