import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Lock,
  ChevronLeft,
  Sparkles,
  Award,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { SubjectIcon } from '../../components/SubjectIcon';

interface SubjectsViewProps {
  onSelectSubject: (subjectId: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ onSelectSubject }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const subjects = db.getSubjects();
  const progress = user ? db.getLessonProgress(user.id) : [];

  const filteredSubjects = subjects.filter((s) =>
    s.nameAr.includes(searchTerm) || s.description.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white font-alexandria">
              المواد الدراسية — الشهادة الإعدادية
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            منهج وزارة التربية والتعليم المصرية للعام الدراسي 2026/2027 مقسم إلى وحدات ودروس تفاعلية
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن مادة..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2 pr-9 pl-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Grid of the 8 School Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredSubjects.map((sub, idx) => {
          const subjectLessons = db.getLessons(sub.id);
          const completedCount = subjectLessons.filter((l) =>
            progress.some((p) => p.lessonId === l.id && p.completed)
          ).length;
          const pct = subjectLessons.length > 0 ? Math.round((completedCount / subjectLessons.length) * 100) : 0;

          return (
            <div
              key={sub.id}
              onClick={() => onSelectSubject(sub.id)}
              className="group relative rounded-2xl glass-card p-5 border border-cyan-500/10 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:scale-110 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/50 transition-all">
                    <SubjectIcon subject={sub} className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    #{idx + 1}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                    {sub.nameAr}
                  </h3>
                </div>
              </div>

              {/* Progress & Lessons Info */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">الإنجاز: {completedCount}/{subjectLessons.length} درس</span>
                  <span className="text-cyan-400 font-bold font-mono">{pct}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: sub.colorPrimary,
                    }}
                  />
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-cyan-400 font-medium">
                  <span>استكشاف المحتوى والامتحانات</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
