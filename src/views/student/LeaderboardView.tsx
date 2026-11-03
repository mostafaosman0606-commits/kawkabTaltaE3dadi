import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  Filter,
  CheckCircle2,
  Swords,
  GraduationCap,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { EGYPT_GOVERNORATES } from '../../constants/governorates';

export const LeaderboardView: React.FC = () => {
  const { user } = useAuth();
  const [selectedGov, setSelectedGov] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const entries = db.getLeaderboard();

  const filteredEntries = entries.filter((e) => {
    const matchesGov = selectedGov === 'all' || e.governorate === selectedGov;
    const matchesSearch = e.studentName.includes(searchTerm) || e.schoolName.includes(searchTerm);
    return matchesGov && matchesSearch;
  });

  const governorates = EGYPT_GOVERNORATES;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h1 className="text-2xl font-bold text-white font-alexandria">
                لوحة شرف أوائل كوكب تالتة إعدادي 🏆
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              ترتيب رسمي محسوب بناءً على درجات الامتحانات والدروس المكتملة ونتائج التحديات
            </p>
          </div>
        </div>
      </div>

      {/* Admin Notice */}
      {(user?.role === 'admin' || user?.role === 'teacher') && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2.5">
          <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>تنبيه الإدارة:</strong> حسابات الإدارة والمعلمين مستثناة تماماً من الحساب أو الظهور في لوحة الشرف لضمان الشفافية وتخصيص الترتيب للطلاب الفعليين فقط.
          </span>
        </div>
      )}

      {/* Top Podium (Gold, Silver, Bronze) */}
      {filteredEntries.length > 0 && (
        <div className={`grid gap-4 pt-2 ${
          filteredEntries.length === 1
            ? 'grid-cols-1 max-w-sm mx-auto'
            : filteredEntries.length === 2
            ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
            : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {/* 2nd Place: Silver 🥈 */}
          {filteredEntries.length >= 2 && (
            <div className="order-2 md:order-1 rounded-2xl glass-card p-5 border border-slate-400/30 text-center space-y-3 relative overflow-hidden">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center justify-center text-2xl font-bold shadow-lg">
                🥈
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold">المركز الثاني</span>
                <h3 className="font-bold text-sm text-white mt-0.5">{filteredEntries[1]?.studentName}</h3>
                <p className="text-[11px] text-slate-400">{filteredEntries[1]?.governorate}</p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-xs">
                <span className="text-slate-300 font-mono">{filteredEntries[1]?.points} نقطة</span>
                <span className="text-cyan-400 font-mono">{filteredEntries[1]?.examAverage}%</span>
              </div>
            </div>
          )}

          {/* 1st Place: Gold 🥇 */}
          <div className={`order-1 md:order-2 rounded-2xl glass-card p-6 border-2 border-amber-500/50 text-center space-y-3 relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 shadow-2xl ${filteredEntries.length >= 2 ? '-translate-y-2' : ''}`}>
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-300 border-2 border-amber-500/60 flex items-center justify-center text-3xl font-bold shadow-xl shadow-amber-500/20">
              🥇
            </div>
            <div>
              <span className="text-xs text-amber-400 font-bold flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 fill-amber-400" />
                المركز الأول (بطل الكوكب)
              </span>
              <h3 className="font-extrabold text-base text-white mt-1">{filteredEntries[0]?.studentName}</h3>
              <p className="text-xs text-slate-400">{filteredEntries[0]?.schoolName} — {filteredEntries[0]?.governorate}</p>
            </div>
            <div className="pt-3 border-t border-amber-500/20 flex items-center justify-around text-xs font-bold">
              <span className="text-amber-300 font-mono text-sm">{filteredEntries[0]?.points} نقطة</span>
              <span className="text-cyan-400 font-mono text-sm">{filteredEntries[0]?.examAverage}%</span>
            </div>
          </div>

          {/* 3rd Place: Bronze 🥉 */}
          {filteredEntries.length >= 3 && (
            <div className="order-3 md:order-3 rounded-2xl glass-card p-5 border border-amber-700/30 text-center space-y-3 relative overflow-hidden">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center text-2xl font-bold shadow-lg">
                🥉
              </div>
              <div>
                <span className="text-[10px] text-amber-500 font-bold">المركز الثالث</span>
                <h3 className="font-bold text-sm text-white mt-0.5">{filteredEntries[2]?.studentName}</h3>
                <p className="text-[11px] text-slate-400">{filteredEntries[2]?.governorate}</p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-around text-xs">
                <span className="text-slate-300 font-mono">{filteredEntries[2]?.points} نقطة</span>
                <span className="text-cyan-400 font-mono">{filteredEntries[2]?.examAverage}%</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Filters & Search */}
      <div className="rounded-2xl glass-card p-4 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedGov}
            onChange={(e) => setSelectedGov(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">جميع محافظات مصر</option>
            {governorates.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1 rounded-lg ${
                selectedPeriod === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              الترتيب التراكمي
            </button>
            <button
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-3 py-1 rounded-lg ${
                selectedPeriod === 'monthly' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              هذا الشهر
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الطالب..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pr-9 pl-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl glass-card border border-cyan-500/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-medium">
              <tr>
                <th className="p-4">الترتيب</th>
                <th className="p-4">الطالب</th>
                <th className="p-4">المحافظة والمدرسة</th>
                <th className="p-4">متوسط الامتحانات</th>
                <th className="p-4">الدروس المنجزة</th>
                <th className="p-4">تحديات فائزة</th>
                <th className="p-4">مجموع النقاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <Trophy className="w-8 h-8 text-amber-500/50" />
                      <span className="font-bold text-sm text-slate-200">
                        لا توجد نتائج مسجلة في لوحة الشرف حالياً
                      </span>
                      <span className="text-xs text-slate-400">
                        ابدأ بحل الاختبارات وإتمام الدروس لتحصل على نقاط وتتصدر ترتيب أوائل الكوكب! 🚀
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((student) => {
                  const isCurrentUser = user?.id === student.studentId;

                  return (
                    <tr
                      key={student.studentId}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-cyan-950/30 text-white font-bold'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <td className="p-4 font-bold font-mono">
                        {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{student.studentName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-400">
                        {student.governorate} — {student.schoolName}
                      </td>
                      <td className="p-4 font-mono text-cyan-300 font-bold">
                        {student.examAverage}%
                      </td>
                      <td className="p-4 font-mono">{student.completedLessonsCount} درس</td>
                      <td className="p-4 font-mono">{student.challengesWon}</td>
                      <td className="p-4 font-mono font-black text-amber-400 text-sm">
                        {student.points}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
