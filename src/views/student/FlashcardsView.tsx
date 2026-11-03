import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';
import { db } from '../../services/storage';
import { Flashcard, Lesson } from '../../types';

interface FlashcardsViewProps {
  onNavigate: (tab: string) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ onNavigate: _onNavigate }) => {
  const { user } = useAuth();
  const subjects = db.getSubjects();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub-arabic');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('all');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newLessonId, setNewLessonId] = useState<string>('');
  const [tab, setTab] = useState<'session' | 'manage'>('session');

  // Lessons for the active subject
  const subjectLessons = useMemo<Lesson[]>(() => {
    return selectedSubjectId ? db.getLessons(selectedSubjectId) : [];
  }, [selectedSubjectId]);

  // All cards for the active subject (for counting per lesson)
  const allSubjectCards = useMemo<Flashcard[]>(() => {
    return selectedSubjectId ? db.getFlashcards(selectedSubjectId) : [];
  }, [selectedSubjectId, cards.length]);

  const loadCards = useCallback(
    (subjectId: string, lessonId: string = 'all') => {
      const loaded = db.getFlashcards(subjectId, lessonId);
      setCards(loaded);
      setCurrentIndex(0);
      setIsFlipped(false);
      setKnownIds(new Set());
      setUnknownIds(new Set());
      setSessionComplete(false);
    },
    []
  );

  useEffect(() => {
    if (selectedSubjectId) {
      loadCards(selectedSubjectId, selectedLessonId);
    }
  }, [selectedSubjectId, selectedLessonId, loadCards]);

  const handleKnow = () => {
    const card = cards[currentIndex];
    if (card) {
      setKnownIds((prev) => new Set([...prev, card.id]));
    }
    goNext();
  };

  const handleDontKnow = () => {
    const card = cards[currentIndex];
    if (card) {
      setUnknownIds((prev) => new Set([...prev, card.id]));
    }
    goNext();
  };

  const goNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 >= cards.length) {
        setSessionComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 150);
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev - 1), 150);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setSessionComplete(false);
  };

  const handleReviewUnknown = () => {
    const unknownCards = cards.filter((c) => unknownIds.has(c.id));
    setCards(unknownCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setSessionComplete(false);
  };

  const handleAddCard = () => {
    if (!newFront.trim() || !newBack.trim() || !selectedSubjectId) return;
    const card: Flashcard = {
      id: `fc-${Date.now()}`,
      subjectId: selectedSubjectId,
      lessonId: newLessonId ? newLessonId : undefined,
      front: newFront.trim(),
      back: newBack.trim(),
      createdBy: 'student',
      createdAt: new Date().toISOString(),
    };
    db.saveFlashcard(card);
    loadCards(selectedSubjectId, selectedLessonId);
    setNewFront('');
    setNewBack('');
    setShowAddForm(false);
  };

  const handleDeleteCard = (cardId: string) => {
    db.deleteFlashcard(cardId);
    loadCards(selectedSubjectId, selectedLessonId);
  };

  const currentCard = cards[currentIndex];
  const currentCardLesson = currentCard?.lessonId
    ? subjectLessons.find((l) => l.id === currentCard.lessonId)
    : null;

  const progressPercent =
    cards.length > 0 ? Math.round(((knownIds.size + unknownIds.size) / cards.length) * 100) : 0;

  if (!user) return null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0c1427]/90 border border-violet-500/25 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0 text-white">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-alexandria flex items-center gap-2">
              <span>بطاقات المراجعة الذكية</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                مقسمة حسب الدروس 📖
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              راجع أهم المفاهيم والمصطلحات والقواعد لكل درس بأسلوب التكرار المتباعد الفعال
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold font-mono">
            {cards.length} بطاقة متاحة
          </span>
        </div>
      </div>

      {/* 2. Subject Selector Pills */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 block px-1">اختر المادة الدراسية:</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSubjectId(s.id);
                  setSelectedLessonId('all');
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 border border-violet-400/40'
                    : 'bg-[#0c1427] text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{s.nameAr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Lesson Selector Tabs (مقسمة لدروس لسهولة الوصول) */}
      <div className="p-4 rounded-3xl bg-[#090e1d] border border-cyan-500/20 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>اختر الدرس لمراجعة بطاقاته الخاصة:</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {subjectLessons.length} دروس في المنهج
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* All Lessons Option */}
          <button
            onClick={() => setSelectedLessonId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedLessonId === 'all'
                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/30'
                : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span>🌟 كافة دروس المادة</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedLessonId === 'all'
                  ? 'bg-slate-950/30 text-slate-950 font-mono font-bold'
                  : 'bg-slate-800 text-slate-400 font-mono'
              }`}
            >
              {allSubjectCards.length}
            </span>
          </button>

          {/* Lessons list */}
          {subjectLessons.map((les) => {
            const isLesSelected = selectedLessonId === les.id;
            const lessonCardCount = allSubjectCards.filter((c) => c.lessonId === les.id).length;

            return (
              <button
                key={les.id}
                onClick={() => setSelectedLessonId(les.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                  isLesSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="truncate max-w-[200px]">{les.title}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isLesSelected
                      ? 'bg-white/20 text-white'
                      : lessonCardCount > 0
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {lessonCardCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Bar (جلسة المراجعة / إدارة البطاقات) */}
      <div className="flex border-b border-slate-800 gap-2">
        {[
          { key: 'session', label: '▶ جلسة المراجعة التفاعلية' },
          { key: 'manage', label: '📝 إدارة وإضافة البطاقات' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'session' | 'manage')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold transition-all relative ${
              tab === t.key
                ? 'text-violet-300 border-b-2 border-violet-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SESSION TAB ── */}
      {tab === 'session' && (
        <div className="space-y-4">
          {/* Empty state when no cards */}
          {cards.length === 0 && (
            <div className="text-center py-12 px-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mx-auto text-xl">
                📑
              </div>
              <div className="space-y-1">
                <p className="text-white text-sm font-bold">لا توجد بطاقات مراجعة لهذا الدرس حالياً</p>
                <p className="text-slate-400 text-xs">
                  يمكنك إضافة بطاقاتك وملاحظاتك الخاصة لهذا الدرس للمراجعة قبل الامتحانات.
                </p>
              </div>
              <button
                onClick={() => {
                  setTab('manage');
                  setShowAddForm(true);
                  if (selectedLessonId !== 'all') {
                    setNewLessonId(selectedLessonId);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 mx-auto transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة بطاقة جديدة لهذا الدرس</span>
              </button>
            </div>
          )}

          {cards.length > 0 && !sessionComplete && currentCard && (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3 bg-[#0c1427] p-3 rounded-2xl border border-slate-800">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-violet-300 font-mono shrink-0">
                  {currentIndex + 1} / {cards.length}
                </span>
              </div>

              {/* Flashcard Component */}
              <div
                className="cursor-pointer select-none"
                onClick={() => setIsFlipped((f) => !f)}
                style={{ perspective: '1200px' }}
              >
                <div
                  className="relative min-h-[240px] sm:min-h-[270px] rounded-3xl transition-all duration-500 shadow-2xl"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front Side */}
                  <div
                    className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#121028] via-[#1a1438] to-[#121028] border-2 border-violet-500/40 flex flex-col items-center justify-between p-6 sm:p-8 text-center shadow-xl"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[11px] text-violet-400 font-extrabold uppercase tracking-wider bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full">
                        ❓ السؤال / المفهوم
                      </span>

                      {currentCardLesson && (
                        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{currentCardLesson.title}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-base sm:text-xl font-bold text-white leading-relaxed my-auto max-w-xl">
                      {currentCard.front}
                    </p>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>انقر للكشف عن الإجابة والشرح</span>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div
                    className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#071e22] via-[#0b2830] to-[#071e22] border-2 border-cyan-500/50 flex flex-col items-center justify-between p-6 sm:p-8 text-center shadow-xl"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[11px] text-cyan-400 font-extrabold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-full">
                        💡 الإجابة النموذجية
                      </span>

                      {currentCardLesson && (
                        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{currentCardLesson.title}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-base sm:text-lg font-bold text-cyan-100 leading-relaxed my-auto max-w-xl whitespace-pre-line">
                      {currentCard.back}
                    </p>

                    <div className="text-[11px] text-slate-400">
                      قيّم حفظك وافهم المفهوم بدقة 🌟
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all shrink-0"
                  title="البطاقة السابقة"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {isFlipped ? (
                  <div className="flex-1 grid grid-cols-2 gap-2.5">
                    <button
                      onClick={handleDontKnow}
                      className="py-3 px-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <X className="w-4 h-4" />
                      <span>محتاج مراجعة</span>
                    </button>
                    <button
                      onClick={handleKnow}
                      className="py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>عارفها ومتقنها!</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600/30 to-purple-600/30 hover:from-violet-600/40 hover:to-purple-600/40 border border-violet-500/40 text-violet-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>كشف الإجابة</span>
                  </button>
                )}

                <button
                  onClick={goNext}
                  disabled={currentIndex >= cards.length - 1}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all shrink-0"
                  title="البطاقة التالية"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Live Counters */}
              <div className="flex justify-center items-center gap-6 text-xs text-slate-400 pt-1 font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  ✓ {knownIds.size} بطاقة متقنة
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  ✗ {unknownIds.size} بحاجة لإعادة
                </span>
              </div>
            </>
          )}

          {/* Session Complete Screen */}
          {sessionComplete && (
            <div className="text-center py-10 px-6 rounded-3xl bg-[#0c1427] border border-violet-500/30 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/25">
                🎉
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white font-alexandria">
                  أحسنت! أنهيت مراجعة بطاقات هذا القسم
                </h3>
                <p className="text-xs text-slate-400">
                  التكرار هو مفتاح تثبيت المعلومة في الذاكرة طويلة المدى
                </p>
              </div>

              <div className="flex justify-center gap-8 py-3">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 min-w-[110px]">
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {knownIds.size}
                  </div>
                  <div className="text-xs text-emerald-300 font-bold mt-1">متقنة بالكامل</div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 min-w-[110px]">
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {unknownIds.size}
                  </div>
                  <div className="text-xs text-rose-300 font-bold mt-1">بحاجة لمراجعة</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 justify-center">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة مراجعة الكل</span>
                </button>
                {unknownIds.size > 0 && (
                  <button
                    onClick={handleReviewUnknown}
                    className="px-5 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                  >
                    <span>مراجعة البطاقات غير المتقنة فقط ({unknownIds.size})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MANAGE TAB ── */}
      {tab === 'manage' && (
        <div className="space-y-4">
          {/* Add Card Form */}
          {showAddForm ? (
            <div className="p-5 rounded-3xl bg-[#0c1427] border border-violet-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <p className="text-sm font-bold text-violet-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>إضافة بطاقة مراجعة جديدة</span>
                </p>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕ إغلاق
                </button>
              </div>

              {/* Lesson selection dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  الدرس التابع له البطاقة:
                </label>
                <select
                  value={newLessonId}
                  onChange={(e) => setNewLessonId(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-violet-500 outline-none"
                >
                  <option value="">🌟 عام لمادة {subjects.find((s) => s.id === selectedSubjectId)?.nameAr}</option>
                  {subjectLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      📖 {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  السؤال أو المصطلح (الوجه الأمامي):
                </label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  rows={2}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white resize-none focus:border-violet-500 outline-none"
                  placeholder="مثال: ما هو قانون السرعة؟ أو ما شروط إعمال اسم الفاعل؟"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  الإجابة النموذجية أو الشرح (الوجه الخلفي):
                </label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  rows={3}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white resize-none focus:border-violet-500 outline-none"
                  placeholder="اكتب الإجابة الدقيقة والمختصرة هنا..."
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleAddCard}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ البطاقة في المنهج</span>
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddForm(true);
                if (selectedLessonId !== 'all') {
                  setNewLessonId(selectedLessonId);
                }
              }}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-500/40 text-violet-300 hover:bg-violet-500/10 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة بطاقة مراجعة جديدة لهذا القسم</span>
            </button>
          )}

          {/* Cards List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {cards.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">
                لا توجد بطاقات مسجلة حالياً في هذا القسم
              </p>
            ) : (
              cards.map((card) => {
                const cardLesson = subjectLessons.find((l) => l.id === card.lessonId);
                return (
                  <div
                    key={card.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#0c1427] border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cardLesson ? (
                          <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                            📖 {cardLesson.title}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                            عام للمادة
                          </span>
                        )}
                        <span className="text-[9px] bg-violet-500/15 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                          {card.createdBy === 'teacher' ? '👨‍🏫 المعلم' : '✏️ شخصي'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white">{card.front}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{card.back}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0"
                      title="حذف البطاقة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
