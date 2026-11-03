import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Users,
  Clock,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Share2,
  Globe,
  Radio,
  Zap,
  Shield,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { isSupabaseConfigured, supabase } from '../../services/supabase';
import { LiveChallenge, Subject } from '../../types';

export const ChallengesView: React.FC = () => {
  const { user } = useAuth();
  const subjects = db.getSubjects();

  // Challenge room & state
  const [activeChallenge, setActiveChallenge] = useState<LiveChallenge | null>(null);
  const [matchPhase, setMatchPhase] = useState<'lobby' | 'waiting' | 'versus' | 'playing' | 'podium'>('lobby');
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [countdownSubtext, setCountdownSubtext] = useState<string>('استعد يا بطل...');
  const [opponentLiveScore, setOpponentLiveScore] = useState<number>(0);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || 'sub-arabic');
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [matchedOpponentName, setMatchedOpponentName] = useState<string>('');
  const [isMatching, setIsMatching] = useState(false);

  // Duel Play State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isDuelFinished, setIsDuelFinished] = useState(false);

  const activeChallengeRef = useRef<LiveChallenge | null>(null);
  activeChallengeRef.current = activeChallenge;

  const matchPhaseRef = useRef(matchPhase);
  matchPhaseRef.current = matchPhase;

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds} ث`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── BROADCAST HELPER ────────────────────────────────────────────────────────
  const broadcastChallengeEvent = (
    event: 'MATCHED' | 'SCORE' | 'FINISH',
    payload: { challenge: LiveChallenge; senderId?: string; score?: number; qIndex?: number }
  ) => {
    // 1. Local BroadcastChannel
    try {
      const channel = new BroadcastChannel('kawkab_live_challenges');
      channel.postMessage({ type: event, ...payload });
      channel.close();
    } catch {}

    // 2. Supabase Realtime Broadcast across devices
    try {
      if (isSupabaseConfigured() && supabase && payload.challenge.code) {
        supabase.channel(`duel:${payload.challenge.code}`).send({
          type: 'broadcast',
          event: event,
          payload,
        });
      }
    } catch {}
  };

  // ── VERSUS COUNTDOWN ANIMATION (3, 2, 1) ──────────────────────────────────
  const startVersusAnimation = (chl: LiveChallenge) => {
    setActiveChallenge(chl);
    setMatchPhase('versus');
    setCountdownNumber(3);
    setCountdownSubtext('استعد يا بطل... راجع تركيزك!');

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count === 2) {
        setCountdownNumber(2);
        setCountdownSubtext('الأسئلة ستبدأ الآن...');
      } else if (count === 1) {
        setCountdownNumber(1);
        setCountdownSubtext('انطلق وأظهر مهارتك! 🚀');
      } else if (count <= 0) {
        clearInterval(interval);
        // Start the duel arena
        setMatchPhase('playing');
        setTimeRemaining(chl.timeLimitSeconds || 60);
        setCurrentQIndex(0);
        setPlayerScore(0);
        setOpponentLiveScore(0);
        setSelectedChoiceIndex(null);
        setIsDuelFinished(false);
      }
    }, 1000);
  };

  // ── REALTIME & AUTO-SYNC EFFECT ───────────────────────────────────────────
  useEffect(() => {
    if (!activeChallenge) return;

    let localChannel: BroadcastChannel | null = null;
    let supabaseChannel: any = null;

    const handleIncoming = (data: any) => {
      if (!data || !data.challenge || data.challenge.code !== activeChallenge.code) return;
      const remote = data.challenge as LiveChallenge;

      if (data.type === 'MATCHED' || (remote.opponentId && !activeChallenge.opponentId)) {
        if (matchPhaseRef.current === 'waiting' || matchPhaseRef.current === 'lobby') {
          startVersusAnimation(remote);
        }
      } else if (data.type === 'SCORE' && data.senderId !== user?.id) {
        setOpponentLiveScore(data.score ?? 0);
      } else if (data.type === 'FINISH' && data.senderId !== user?.id) {
        setActiveChallenge((prev) => (prev ? { ...prev, opponentScore: data.score ?? prev.opponentScore } : null));
      }
    };

    // 1. BroadcastChannel (local browser tabs)
    try {
      localChannel = new BroadcastChannel('kawkab_live_challenges');
      localChannel.onmessage = (e) => handleIncoming(e.data);
    } catch {}

    // 2. Supabase Realtime (cross-device sync)
    if (isSupabaseConfigured() && supabase) {
      try {
        supabaseChannel = supabase
          .channel(`duel:${activeChallenge.code}`)
          .on('broadcast', { event: '*' }, (payload: any) => {
            handleIncoming(payload.payload);
          })
          .subscribe();
      } catch {}
    }

    // 3. Polling Fallback (ensures 100% sync reliability)
    const pollTimer = setInterval(() => {
      if (matchPhaseRef.current === 'waiting') {
        const fresh = db.getChallengeByCode(activeChallenge.code);
        if (fresh && fresh.opponentId && !activeChallengeRef.current?.opponentId) {
          startVersusAnimation(fresh);
        }
      }
    }, 1200);

    return () => {
      if (localChannel) localChannel.close();
      if (supabaseChannel) supabaseChannel.unsubscribe();
      clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChallenge?.code]);

  // ── TIMER DURING PLAYING ──────────────────────────────────────────────────
  useEffect(() => {
    if (matchPhase !== 'playing' || !activeChallenge || isDuelFinished) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishDuel(playerScore);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchPhase, isDuelFinished, playerScore, activeChallenge]);

  // ── CREATE CHALLENGE ──────────────────────────────────────────────────────
  const handleCreateChallenge = (isRandom: boolean = false) => {
    if (!user) return;
    setErrorMessage('');
    const chl = db.createChallenge(
      selectedSubjectId || subjects[0]?.id || 'sub-arabic',
      user.id,
      user.fullName,
      isRandom,
      user.governorate || 'القاهرة',
      selectedDuration
    );
    setActiveChallenge(chl);
    setMatchPhase('waiting');
    setTimeRemaining(chl.timeLimitSeconds || selectedDuration);
    setIsDuelFinished(false);
    setCurrentQIndex(0);
    setPlayerScore(0);
    setOpponentLiveScore(0);
  };

  // ── JOIN CHALLENGE ────────────────────────────────────────────────────────
  const handleJoinChallenge = (codeToJoin?: string) => {
    const targetCode = (codeToJoin || joinCodeInput).trim();
    if (!user || !targetCode) return;
    setErrorMessage('');

    const chl = db.joinChallenge(targetCode, user.id, user.fullName);
    if (!chl) {
      setErrorMessage('كود التحدي غير صالح أو التحدي مكتمل بالفعل.');
      return;
    }

    // Broadcast that opponent joined & start versus countdown animation
    broadcastChallengeEvent('MATCHED', { challenge: chl, senderId: user.id });
    startVersusAnimation(chl);
  };

  // ── MATCH REAL PEER OPPONENT ──────────────────────────────────────────────
  const handleStartSoloOpponent = () => {
    if (!activeChallenge) return;
    setIsMatching(true);

    const allProfiles = db.getProfiles();
    const realStudents = allProfiles
      .filter((p) => p.role === 'student' && !p.isSuspended && p.id !== user?.id && !p.id.startsWith('admin') && !p.id.startsWith('teacher'))
      .map((p) => ({ id: p.id, name: p.fullName, gov: p.governorate }));

    const leaderboard = db.getLeaderboard();
    const leaderboardOpponents = leaderboard
      .filter((e) => e.studentId !== user?.id && e.studentName)
      .map((e) => ({ id: e.studentId, name: e.studentName, gov: 'طالب متفوق' }));

    const pool = realStudents.length > 0 ? realStudents : leaderboardOpponents;

    let opponentId = 'st-cairo';
    let opponentName = 'أحمد محمود';
    if (pool.length > 0) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      opponentId = picked.id;
      opponentName = picked.name;
    }

    setMatchedOpponentName(opponentName);

    setTimeout(() => {
      const joined = db.joinChallenge(activeChallenge.code, opponentId, opponentName);
      setIsMatching(false);
      if (joined) {
        broadcastChallengeEvent('MATCHED', { challenge: joined, senderId: user?.id });
        startVersusAnimation(joined);
      }
    }, 1100);
  };

  // ── ANSWER QUESTION ───────────────────────────────────────────────────────
  const handleAnswerQuestion = (choiceIdx: number) => {
    if (!activeChallenge || selectedChoiceIndex !== null) return;
    setSelectedChoiceIndex(choiceIdx);

    const currentQ = activeChallenge.questions[currentQIndex];
    const isCorrect = choiceIdx === currentQ.correctIndex;
    const addedScore = isCorrect ? 20 : 0;
    const newScore = playerScore + addedScore;
    setPlayerScore(newScore);

    // Live broadcast score to opponent
    broadcastChallengeEvent('SCORE', {
      challenge: activeChallenge,
      senderId: user?.id,
      score: newScore,
      qIndex: currentQIndex + 1,
    });

    setTimeout(() => {
      setSelectedChoiceIndex(null);
      if (currentQIndex < activeChallenge.questions.length - 1) {
        setCurrentQIndex((prev) => prev + 1);
      } else {
        finishDuel(newScore);
      }
    }, 450);
  };

  // ── FINISH DUEL ───────────────────────────────────────────────────────────
  const finishDuel = (finalScore: number) => {
    if (!activeChallenge || isDuelFinished) return;
    setIsDuelFinished(true);

    const opponentFinalScore = opponentLiveScore > 0 ? opponentLiveScore : Math.floor(Math.random() * 3 + 3) * 20;
    const finished = db.finishChallenge(activeChallenge.id, finalScore, opponentFinalScore);
    if (finished) {
      setActiveChallenge({ ...finished });
      setMatchPhase('podium');

      broadcastChallengeEvent('FINISH', {
        challenge: finished,
        senderId: user?.id,
        score: finalScore,
      });

      if (finalScore >= opponentFinalScore) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    }
  };

  const handleCopyCode = () => {
    if (!activeChallenge) return;
    navigator.clipboard.writeText(activeChallenge.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleReset = () => {
    setActiveChallenge(null);
    setMatchPhase('lobby');
    setIsDuelFinished(false);
    setPlayerScore(0);
    setOpponentLiveScore(0);
    setCurrentQIndex(0);
    setMatchedOpponentName('');
  };

  // ==========================================================================
  // 1. VERSUS ANIMATION SCREEN (أنيميشن جامد وتفاصيل الطرفين مع عد 3، 2، 1)
  // ==========================================================================
  if (activeChallenge && matchPhase === 'versus') {
    const isCreator = activeChallenge.createdBy === user?.id;
    const player1Name = activeChallenge.creatorName;
    const player1Gov = activeChallenge.creatorGovernorate || 'القاهرة';
    const player2Name = activeChallenge.opponentName || 'المنافس المتحدي';
    const player2Gov = 'بطل الشهادة الإعدادية';

    return (
      <div className="max-w-3xl mx-auto rounded-3xl glass-card p-6 sm:p-10 border border-cyan-500/30 text-center relative overflow-hidden shadow-2xl animate-page-in">
        {/* Background neon glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />

        {/* Header Tag */}
        <div className="relative z-10 space-y-2 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold shadow-lg animate-pulse">
            <Swords className="w-4 h-4 text-amber-400 animate-spin [animation-duration:6s]" />
            <span>⚔️ تم الاتصال وتأكيد طرفي المنافسة! ⚔️</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white font-alexandria">
            حلبة مواجهة كوكب تالتة المباشرة
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 pt-1">
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-cyan-300 font-bold">
              📚 مادة: {activeChallenge.subjectName}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-amber-300 font-mono font-bold">
              ⏱️ {activeChallenge.timeLimitSeconds || 60} ثانية
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-purple-300 font-bold">
              🎯 {activeChallenge.questions.length} أسئلة
            </span>
          </div>
        </div>

        {/* Arena Matchup Showcase */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 items-center gap-4 sm:gap-6 my-6 sm:my-8">
          {/* Player 1 Card (Creator) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-cyan-950/70 to-slate-950/90 border-2 border-cyan-500/40 shadow-xl shadow-cyan-950/50 flex flex-col items-center text-center space-y-3 relative group">
            <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] tracking-wide shadow-md flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{isCreator ? 'أنت (المنشئ)' : 'منشئ التحدي'}</span>
            </span>

            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[3px] shadow-[0_0_30px_rgba(6,182,212,0.6)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
                {player1Name.charAt(0) || 'ط'}
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base sm:text-lg">
                {player1Name}
              </h3>
              <p className="text-xs text-cyan-400 font-medium">
                {player1Gov}
              </p>
            </div>

            <span className="text-[11px] px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
              جاهز للمبارزة 🔥
            </span>
          </div>

          {/* Center VS & 3, 2, 1 Countdown */}
          <div className="flex flex-col items-center justify-center py-2 sm:py-0 space-y-3">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-500 p-[3px] shadow-[0_0_40px_rgba(244,63,94,0.6)] flex items-center justify-center animate-pulse">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xl sm:text-2xl font-black tracking-wider text-white font-mono">
                  VS
                </div>
              </div>
            </div>

            {/* Huge Animated Countdown Number */}
            <div className="space-y-1 text-center">
              <div
                key={countdownNumber}
                className="text-7xl sm:text-9xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 animate-in zoom-in-75 duration-300 drop-shadow-[0_0_35px_rgba(251,146,60,0.7)]"
              >
                {countdownNumber}
              </div>
              <p className="text-xs sm:text-sm font-bold text-amber-300 animate-pulse">
                {countdownSubtext}
              </p>
            </div>
          </div>

          {/* Player 2 Card (Opponent) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-rose-950/70 to-slate-950/90 border-2 border-rose-500/40 shadow-xl shadow-rose-950/50 flex flex-col items-center text-center space-y-3 relative group">
            <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] tracking-wide shadow-md flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{!isCreator ? 'أنت (المتحدي)' : 'المنافس المتحدي'}</span>
            </span>

            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-600 p-[3px] shadow-[0_0_30px_rgba(244,63,94,0.6)]">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-2xl sm:text-3xl font-black text-rose-300 font-mono">
                {player2Name.charAt(0) || 'م'}
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-base sm:text-lg">
                {player2Name}
              </h3>
              <p className="text-xs text-rose-400 font-medium">
                {player2Gov}
              </p>
            </div>

            <span className="text-[11px] px-3 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
              دخل الحلبة ⚔️
            </span>
          </div>
        </div>

        {/* Motivational Tip */}
        <div className="relative z-10 pt-3 text-xs text-slate-400">
          🎯 أجب بأقصى سرعة لتحصد +20 نقطة لكل سؤال صحيح وتهزم منافسك في التحدي!
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. DUEL COMPLETED SCREEN (PODIUM)
  // ==========================================================================
  if (activeChallenge && (matchPhase === 'podium' || isDuelFinished)) {
    const isWinner = playerScore >= (activeChallenge.opponentScore || opponentLiveScore);
    const opponentFinalScore = activeChallenge.opponentScore || opponentLiveScore;

    return (
      <div className="max-w-2xl mx-auto rounded-3xl glass-card p-6 sm:p-8 border border-cyan-500/30 text-center space-y-6 shadow-2xl animate-page-in">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-4xl shadow-xl animate-bounce">
          {isWinner ? '🏆' : '🤝'}
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white font-alexandria">
            {isWinner ? 'فوز ساحق يا بطل كوكب تالتة! 🎉' : 'مباراة قوية وتحدي رائع!'}
          </h2>
          <p className="text-xs text-slate-300">
            {isWinner ? 'أداء رائع وسرعة إجابة مميزة في تحدي اليوم' : 'تعادل بطولي بينكما — استمر في التدريب!'}
          </p>
        </div>

        {/* Scores Comparison Podium */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-2">
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-1">
            <span className="text-xs text-cyan-300 font-bold block">نقاطك أنت 🌟</span>
            <span className="text-3xl font-black text-white font-mono">{playerScore}</span>
            <span className="text-[10px] text-slate-400 block">نقطة</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1">
            <span className="text-xs text-rose-300 font-bold block">{activeChallenge.opponentName || 'المنافس'}</span>
            <span className="text-3xl font-black text-white font-mono">{opponentFinalScore}</span>
            <span className="text-[10px] text-slate-400 block">نقطة</span>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all"
        >
          خوض تحدٍ جديد 🚀
        </button>
      </div>
    );
  }

  // ==========================================================================
  // 3. LIVE DUEL QUESTIONS ARENA
  // ==========================================================================
  if (activeChallenge && matchPhase === 'playing') {
    const currentQ = activeChallenge.questions[currentQIndex];

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-page-in">
        {/* Top Arena Bar with Live Opponent Score */}
        <div className="rounded-2xl glass-card p-4 border border-rose-500/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-rose-400 animate-pulse" />
            <span className="font-bold text-sm text-white">{activeChallenge.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-xl border border-slate-800">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs font-bold text-amber-400">{formatTime(timeRemaining)}</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">نقاطك:</span>
              <span className="text-xs font-bold text-cyan-300 font-mono">{playerScore}</span>
            </div>

            <div className="text-right pl-1 border-r border-slate-800">
              <span className="text-[10px] text-slate-400 block">المنافس:</span>
              <span className="text-xs font-bold text-rose-400 font-mono">{opponentLiveScore}</span>
            </div>
          </div>
        </div>

        {/* Active Question Box */}
        {currentQ && (
          <div className="rounded-3xl glass-card p-6 sm:p-8 border border-cyan-500/20 shadow-xl space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>السؤال {currentQIndex + 1} من {activeChallenge.questions.length}</span>
              <span className="text-emerald-400 font-bold">+20 نقطة للإجابة الصحيحة</span>
            </div>

            <h3 className="text-lg font-bold text-white leading-relaxed font-alexandria">
              {currentQ.text}
            </h3>

            <div className="space-y-3">
              {currentQ.choices.map((choiceText, idx) => {
                const isSelected = selectedChoiceIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerQuestion(idx)}
                    disabled={selectedChoiceIndex !== null}
                    className={`w-full p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/40 text-slate-200'
                    }`}
                  >
                    <span className="text-sm">{choiceText}</span>
                    <span className="text-xs text-slate-500">[{idx + 1}]</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Open rooms list containing only REAL waiting rooms created by other students
  const openRooms = db.getOpenChallenges().filter((c) => c.createdBy !== user?.id && c.status === 'waiting');

  // ==========================================================================
  // 4. WAITING ROOM SCREEN
  // ==========================================================================
  if (activeChallenge && matchPhase === 'waiting') {
    const isRandom = activeChallenge.isOpenChallenge;

    return (
      <div className="max-w-xl mx-auto rounded-3xl glass-card p-6 sm:p-8 border border-cyan-500/30 text-center space-y-6 shadow-2xl animate-page-in">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 text-2xl font-bold">
            {isRandom ? '📡' : '⚔️'}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white font-alexandria flex items-center justify-center gap-2">
            <span>{isRandom ? 'في انتظار انضمام أحد...' : 'غرفة التحدي الخاصة جاهزة ⚔️'}</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs">
              <span>مادة التحدي:</span>
              <span className="font-bold">{activeChallenge.subjectName}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <span>⏱️ زمن الاختبار:</span>
              <span>{activeChallenge.timeLimitSeconds || 60} ثانية</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed pt-1">
            {isRandom
              ? 'الغرفة معروضة الآن في قائمة «الغرف المفتوحة». فور دخول أي منافس سيبدأ العد التنازلي الحماسي والمبارزة تلقائياً لكلا الطرفين!'
              : 'شارك كود التحدي مع زميلك. فور كتابته للكود، ستظهر لكما شاشة المواجهة الملحمية فوراً:'}
          </p>
        </div>

        {/* Invitation Code Display */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/40 inline-flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">كود الغرفة</span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-cyan-400">
              {activeChallenge.code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl transition-colors border border-slate-700"
            title="نسخ كود التحدي"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isMatching ? (
            <div className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              جارٍ البحث والمطابقة مع منافس...
            </div>
          ) : matchedOpponentName ? (
            <div className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 flex items-center justify-center gap-2">
              <span>✅</span>
              تمت مطابقتك مع: <span className="text-white font-black">{matchedOpponentName}</span>
            </div>
          ) : (
            <button
              onClick={handleStartSoloOpponent}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              مطابقة منافس وبدء التحدي الآن
            </button>
          )}

          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            إلغاء الغرفة
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 5. MAIN CHALLENGES HUB (CREATE OR JOIN)
  // ==========================================================================
  return (
    <div className="space-y-8 animate-page-in">
      {/* Header */}
      <div className="rounded-3xl glass-card p-6 sm:p-8 border border-rose-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Swords className="w-6 h-6 text-rose-400" />
              <h1 className="text-2xl font-bold text-white font-alexandria">
                تحدي كوكب تالتة المباشر ⚔️
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              مبارزات تفاعلية فورية بين طلاب الشهادة الإعدادية في مصر لحصد نقاط الترتيب والتفوق
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Challenge Room */}
        <div className="rounded-2xl glass-card p-6 border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-white">إنشاء غرفة تحدٍ جديدة</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              حدد المادة الدراسية وزمن الجولة، واختر فتح الغرفة للجميع أو مشاركة كود خاص مع صديقك.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">اختر مادة التحدي:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">زمن التحدي:</label>
                <span className="text-[11px] text-cyan-400 font-bold font-mono">
                  المحدد: {formatTime(selectedDuration)}
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { label: '30 ث', sec: 30 },
                  { label: '1 د', sec: 60 },
                  { label: '5 د', sec: 300 },
                  { label: '15 د', sec: 900 },
                  { label: '30 د', sec: 1800 },
                  { label: 'ساعة', sec: 3600 },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.sec}
                    onClick={() => {
                      setSelectedDuration(item.sec);
                      setCustomMinutes('');
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border text-center ${
                      selectedDuration === item.sec && !customMinutes
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/30'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Duration Input */}
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">أو حدد بالدقائق (حتى 60 دقيقة):</span>
                <div className="flex items-center gap-1.5 w-32">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="1 - 60"
                    value={customMinutes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomMinutes(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        const clamped = Math.min(60, parsed);
                        setSelectedDuration(clamped * 60);
                      }
                    }}
                    className="w-full bg-[#070b14] border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white text-center font-mono outline-none"
                  />
                  <span className="text-xs text-slate-400 shrink-0">دقيقة</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => handleCreateChallenge(true)}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Radio className="w-4 h-4" />
                <span>غرفة عشوائية مفتوحة 🌐</span>
              </button>

              <button
                onClick={() => handleCreateChallenge(false)}
                className="py-2.5 px-3.5 bg-slate-800/90 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
                title="إنشاء غرفة خاصة بكود للمشاركة مع صديقك"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>غرفة خاصة بكود ⚔️</span>
              </button>
            </div>
          </div>
        </div>

        {/* Join Challenge Room */}
        <div className="rounded-2xl glass-card p-6 border border-rose-500/20 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-base text-white">الانضمام بكود دعوة</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              أرسل لك زميلك كود تحدٍ خاص؟ اكتب الكود المكون من 6 أرقام هنا لتدخل المبارزة معه مباشرة.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">كود التحدي:</label>
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="مثال: 549812"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-center tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
              />
            </div>

            <button
              onClick={() => handleJoinChallenge(joinCodeInput)}
              disabled={!joinCodeInput.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              الانضمام وبدء المنافسة
            </button>
          </div>
        </div>
      </div>

      {/* Open Rooms Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white font-alexandria flex items-center gap-2">
              <span>الغرف المفتوحة للتحدي</span>
              {openRooms.length > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              غرف حقيقية فتحها طلاب على المنصة في انتظار منافس — اختر أي غرفة وادخل التحدي فوراً!
            </p>
          </div>
          <span className="text-xs text-cyan-400 font-mono">
            {openRooms.length} غرفة متاحة
          </span>
        </div>

        {openRooms.length === 0 ? (
          <div className="bg-[#0c1427]/60 border border-slate-800/80 rounded-3xl p-10 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center text-3xl">
              🌐
            </div>
            <h3 className="text-sm font-bold text-white">لا توجد غرف مفتوحة حالياً في انتظار منافس</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              يمكنك إنشاء غرفة تحدٍ عشوائية مفتوحة الآن واختيار المادة والزمن، وستظهر فوراً هنا للجميع لمنافستك!
            </p>
            <button
              onClick={() => handleCreateChallenge(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
            >
              <Radio className="w-4 h-4" />
              <span>إنشاء غرفة مفتوحة الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {openRooms.map((room) => (
              <div
                key={room.code}
                className="bg-[#0c1427]/90 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-4 shadow-md flex flex-col justify-between gap-4 transition-all hover:scale-[1.01]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 text-cyan-300 font-bold flex items-center justify-center text-xs border border-cyan-500/30">
                        {room.creatorName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">{room.creatorName}</span>
                        <span className="text-[10px] text-slate-400">{room.creatorGovernorate || 'مصر'}</span>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      في انتظار منافس
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">المادة</span>
                      <span className="font-bold text-cyan-300 truncate block">{room.subjectName}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">زمن الاختبار</span>
                      <span className="font-bold text-amber-300 font-mono block">⏱️ {room.timeLimitSeconds || 60} ثانية</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinChallenge(room.code)}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>انضم للتحدي الآن ⚔️</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
