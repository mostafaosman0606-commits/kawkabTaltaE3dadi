import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Target, Plus, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { db } from '../services/storage';
import { DailyStreak, StudentBadge, StudentGoal, BadgeType } from '../types';

const BADGE_INFO: Record<BadgeType, { emoji: string; label: string; desc: string }> = {
  first_exam:    { emoji: '🎯', label: 'أول اختبار',       desc: 'أكملت أول اختبار لك!' },
  ten_lessons:   { emoji: '📚', label: '10 دروس',          desc: 'أكملت 10 دروس!' },
  five_wins:     { emoji: '🏆', label: 'خمسة انتصارات',   desc: 'نجحت في 5 اختبارات متتالية!' },
  streak_7:      { emoji: '🔥', label: 'أسبوع نار',        desc: '7 أيام مذاكرة متتالية!' },
  streak_30:     { emoji: '⚡', label: 'شهر نار',          desc: '30 يوم مذاكرة متتالية!' },
  first_cert:    { emoji: '🎓', label: 'أول شهادة',       desc: 'حصلت على أول شهادة!' },
  robo_5:        { emoji: '🤖', label: 'صديق روبو',       desc: 'أجريت 5 محادثات مع روبو!' },
  perfect_score: { emoji: '💯', label: 'درجة كاملة',      desc: 'حصلت على 100% في اختبار!' },
  all_subjects:  { emoji: '🌟', label: 'متعدد المواهب',   desc: 'درست في كل المواد!' },
};

interface Props {
  onNavigate?: (tab: string) => void;
}

export const StreakBadgesPanel: React.FC<Props> = ({ onNavigate: _onNavigate }) => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalSubjectId, setNewGoalSubjectId] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(80);
  const [activeTab, setActiveTab] = useState<'streak' | 'badges' | 'goals'>('streak');

  const subjects = db.getSubjects();

  const checkAndAwardBadges = (studentId: string, currentStreak: DailyStreak) => {
    const attempts = db.getExamAttempts(studentId);
    const progress = db.getLessonProgress(studentId);
    const certs = db.getCertificates(studentId);
    const convs = db.getRoboConversations(studentId);

    const graded = attempts.filter((a) => a.status === 'graded');
    const passed = graded.filter((a) => a.percentage >= 50);
    const completed = progress.filter((p) => p.completed);

    if (graded.length >= 1) db.awardBadge(studentId, 'first_exam');
    if (completed.length >= 10) db.awardBadge(studentId, 'ten_lessons');
    if (passed.length >= 5) db.awardBadge(studentId, 'five_wins');
    if (currentStreak.currentStreak >= 7) db.awardBadge(studentId, 'streak_7');
    if (currentStreak.currentStreak >= 30) db.awardBadge(studentId, 'streak_30');
    if (certs.length >= 1) db.awardBadge(studentId, 'first_cert');
    if (convs.length >= 5) db.awardBadge(studentId, 'robo_5');
    if (graded.some((a) => a.percentage === 100)) db.awardBadge(studentId, 'perfect_score');

    const lessons = db.getLessons();
    const studiedSubjects = new Set(
      completed.map((p) => lessons.find((l) => l.id === p.lessonId)?.subjectId).filter(Boolean)
    );
    if (studiedSubjects.size >= subjects.length && subjects.length > 0) {
      db.awardBadge(studentId, 'all_subjects');
    }

    setBadges(db.getBadges(studentId));
  };

  useEffect(() => {
    if (!user) return;
    const updatedStreak = db.updateStreak(user.id);
    setStreak(updatedStreak);
    setBadges(db.getBadges(user.id));

    const rawGoals = db.getGoals(user.id);
    const attempts = db.getExamAttempts(user.id);
    const updatedGoals = rawGoals.map((g) => {
      const subAttempts = attempts.filter((a) => a.subjectName === g.subjectName && a.status === 'graded');
      const avg =
        subAttempts.length > 0
          ? Math.round(subAttempts.reduce((acc, a) => acc + a.percentage, 0) / subAttempts.length)
          : 0;
      return { ...g, currentPercentage: avg };
    });
    setGoals(updatedGoals);

    checkAndAwardBadges(user.id, updatedStreak);
  }, [user]);

  const handleAddGoal = () => {
    if (!user || !newGoalSubjectId) return;
    const subject = subjects.find((s) => s.id === newGoalSubjectId);
    if (!subject) return;
    const goal: StudentGoal = {
      id: `goal-${Date.now()}`,
      studentId: user.id,
      subjectId: newGoalSubjectId,
      subjectName: subject.nameAr,
      targetPercentage: newGoalTarget,
      currentPercentage: 0,
      createdAt: new Date().toISOString(),
    };
    db.saveGoal(goal);
    setGoals((prev) => [...prev, goal]);
    setShowGoalForm(false);
    setNewGoalSubjectId('');
    setNewGoalTarget(80);
  };

  const handleDeleteGoal = (goalId: string) => {
    db.deleteGoal(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  if (!user) return null;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-700/50">
        {([
          { key: 'streak', label: '🔥 السلسلة' },
          { key: 'badges', label: '🏅 الإنجازات' },
          { key: 'goals',  label: '🎯 أهدافي' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-cyan-500/15 text-cyan-300 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── STREAK TAB ── */}
        {activeTab === 'streak' && streak && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 py-2">
              <Flame
                className={`w-14 h-14 ${
                  streak.currentStreak > 0 ? 'text-orange-400 animate-pulse' : 'text-slate-600'
                }`}
              />
              <div className="text-center">
                <div className="text-6xl font-black text-orange-400 font-mono leading-none">
                  {streak.currentStreak}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">يوم متتالي</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: streak.longestStreak, label: 'أطول سلسلة', color: 'text-amber-300' },
                { value: streak.totalActiveDays, label: 'إجمالي الأيام', color: 'text-cyan-300' },
                { value: streak.currentStreak >= 30 ? '🔥🔥' : streak.currentStreak >= 7 ? '🔥' : streak.currentStreak >= 3 ? '⚡' : '💤', label: 'المستوى', color: 'text-green-300' },
              ].map((item, i) => (
                <div key={i} className="text-center p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            {streak.currentStreak === 0 && (
              <p className="text-center text-xs text-slate-400">ابدأ المذاكرة اليوم لبدء سلسلتك! 🚀</p>
            )}
            {streak.currentStreak > 0 && streak.currentStreak < 7 && (
              <p className="text-center text-xs text-amber-300">
                🎯 {7 - streak.currentStreak} أيام للحصول على شارة "أسبوع نار"!
              </p>
            )}
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === 'badges' && (
          <div>
            {badges.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <Trophy className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p>لا توجد إنجازات بعد</p>
                <p className="mt-1 text-slate-500">اكمل دروسك واختباراتك لكسب الشارات!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {badges.map((badge) => {
                  const info = BADGE_INFO[badge.badgeType];
                  return (
                    <div
                      key={badge.id}
                      onClick={() => badge.isNew && db.markBadgeSeen(badge.id)}
                      title={info.desc}
                      className={`relative p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        badge.isNew
                          ? 'bg-amber-500/15 border-amber-400/50 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-800/50 border-slate-700/40'
                      }`}
                    >
                      {badge.isNew && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
                      )}
                      <div className="text-2xl mb-1">{info.emoji}</div>
                      <div className="text-[10px] font-bold text-slate-200 leading-tight">{info.label}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Locked badges */}
            {Object.entries(BADGE_INFO).filter(([type]) => !badges.some((b) => b.badgeType === type)).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/40">
                <p className="text-[10px] text-slate-500 mb-2">الشارات المتبقية:</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(BADGE_INFO)
                    .filter(([type]) => !badges.some((b) => b.badgeType === type))
                    .map(([type, info]) => (
                      <div
                        key={type}
                        title={info.desc}
                        className="p-3 rounded-xl border border-slate-700/30 bg-slate-900/40 text-center opacity-35"
                      >
                        <div className="text-2xl mb-1 grayscale">{info.emoji}</div>
                        <div className="text-[10px] text-slate-500 leading-tight">{info.label}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GOALS TAB ── */}
        {activeTab === 'goals' && (
          <div className="space-y-3">
            {goals.length === 0 && !showGoalForm && (
              <div className="text-center py-4 text-xs text-slate-400">
                <Target className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p>لا توجد أهداف بعد</p>
              </div>
            )}

            {goals.map((goal) => {
              const pct = Math.min(100, goal.currentPercentage);
              const achieved = pct >= goal.targetPercentage;
              const progress = Math.min(100, (pct / (goal.targetPercentage || 1)) * 100);
              return (
                <div key={goal.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span>{achieved ? '✅' : '🎯'}</span>
                      <span className="text-xs font-bold text-slate-200">{goal.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{pct}% / {goal.targetPercentage}%</span>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700/30">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        achieved ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {achieved && <p className="text-[10px] text-green-400 mt-1">🎉 تحقق الهدف! رائع!</p>}
                </div>
              );
            })}

            {showGoalForm ? (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                <p className="text-xs font-bold text-cyan-300">هدف جديد</p>
                <select
                  value={newGoalSubjectId}
                  onChange={(e) => setNewGoalSubjectId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameAr}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-400 shrink-0">الهدف:</label>
                  <input
                    type="range" min={50} max={100} step={5}
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(+e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-xs font-bold text-cyan-300 w-8">{newGoalTarget}%</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddGoal}
                    className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> حفظ
                  </button>
                  <button
                    onClick={() => setShowGoalForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowGoalForm(true)}
                className="w-full py-2 rounded-xl border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة هدف جديد
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
