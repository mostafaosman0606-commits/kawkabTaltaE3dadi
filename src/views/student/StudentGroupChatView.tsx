import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Upload,
  Mic,
  MicOff,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  Shield,
  Briefcase,
  Search,
  X,
  Smile,
  Download,
  ZoomIn,
  CheckCheck,
  Sparkles,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { StudentGroupMessage, UserProfile } from '../../types';

interface StudentGroupChatViewProps {
  onBack?: () => void;
}

export const StudentGroupChatView: React.FC<StudentGroupChatViewProps> = ({ onBack: _onBack }) => {
  const { user } = useAuth();
  const isStaff = user?.role === 'teacher' || user?.role === 'admin';

  // Load all registered students so teachers/supervisors can switch rooms
  const allStudents = useMemo(() => {
    return db.getProfiles().filter((p) => p.role === 'student' && !p.isSuspended);
  }, []);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (user?.role === 'teacher' || user?.role === 'admin') {
      const students = db.getProfiles().filter((p) => p.role === 'student' && !p.isSuspended);
      return students[0]?.id || user?.id || '';
    }
    return user?.id || '';
  });

  const activeStudentId = isStaff
    ? selectedStudentId || allStudents[0]?.id || user?.id || ''
    : user?.id || '';

  const targetStudent = useMemo(() => {
    if (!activeStudentId) return null;
    return db.getProfileById(activeStudentId) || allStudents.find((s) => s.id === activeStudentId) || null;
  }, [activeStudentId, allStudents]);

  const activeStudentName = targetStudent?.fullName || (isStaff ? 'طالب مختار' : user?.fullName || 'الطالب');

  const [messages, setMessages] = useState<StudentGroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingChatImage, setViewingChatImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message Reactions state persisted per student conversation
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem(`kawkab_chat_reactions_${activeStudentId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      const currentCount = msgReactions[emoji] || 0;
      if (currentCount > 0) {
        delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = 1;
      }
      const updated = { ...prev, [messageId]: msgReactions };
      try {
        localStorage.setItem(`kawkab_chat_reactions_${activeStudentId}`, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  };

  // Quick chips templates for high quality communication
  const quickChips = useMemo(() => {
    if (isStaff) {
      return [
        'أحسنت يا بطل، إجابة نموذجية 👏',
        'راجع الخطوة الأولى بدقة 🧐',
        'ممتاز استمر في الحل ⭐',
        'بالتوفيق يا دكتور المستقبل 🚀',
        'تم تسجيل سؤالك وسأشرحه لك بالخطوات 📝',
      ];
    }
    return [
      'شكراً جزيلاً يا معلمي 🌸',
      'عندي استفسار في النحو والإعراب 📝',
      'مسألة في العلوم محتاج توضيحها 🔬',
      'تم فهم النقطة دي بنجاح 👍',
      'محتاج مثال إضافي لتثبيت المعلومة 💡',
    ];
  }, [isStaff]);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        (m.senderBadge && m.senderBadge.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  // Load real registered teachers and supervisors from database
  const realSupervisorsAndTeachers = useMemo(() => {
    const list = db
      .getProfiles()
      .filter((p) => (p.role === 'teacher' || p.role === 'admin') && !p.isSuspended);

    return list.map((teacher) => {
      const assignments = db.getTeacherAssignments(teacher.id);
      const subjectNames = assignments.map((a) => a.subjectName).join(' ، ');
      const isSupervisor = teacher.role === 'admin';

      return {
        id: teacher.id,
        name: teacher.fullName,
        role: isSupervisor
          ? 'المشرف الأكاديمي العام'
          : subjectNames
          ? `معلم ${subjectNames}`
          : 'معلم وموجه معتمد',
        badge: isSupervisor ? '👑 مشرف عام' : '👨‍🏫 معلم معتمد',
        color: isSupervisor
          ? 'from-amber-500 to-yellow-600'
          : 'from-purple-500 to-indigo-600',
        avatarUrl: teacher.avatarUrl,
      };
    });
  }, []);

  const groupMembers = useMemo(() => {
    return [
      ...realSupervisorsAndTeachers,
      {
        id: activeStudentId,
        name: activeStudentName,
        role: 'طالب بالشهادة الإعدادية',
        badge: isStaff ? '🎓 الطالب' : '🎓 أنت',
        color: 'from-cyan-500 to-blue-500',
        avatarUrl: targetStudent?.avatarUrl,
      },
    ];
  }, [realSupervisorsAndTeachers, activeStudentId, activeStudentName, isStaff, targetStudent?.avatarUrl]);

  // Load messages from local storage
  const reloadMessages = () => {
    const list = db.getStudentGroupMessages(activeStudentId);
    setMessages([...list]);
  };

  useEffect(() => {
    reloadMessages();
    // Live polling to receive actual teacher/student responses in real time
    const timer = setInterval(() => {
      reloadMessages();
    }, 2500);
    return () => clearInterval(timer);
  }, [activeStudentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Voice recording (Speech-to-text) writing directly to input
  const handleVoiceRecord = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم ميزة التعرف على الصوت. يرجى تجربة متصفح Google Chrome.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send message — purely real human interaction (NO fake auto-replies)
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    const textToSend = inputText.trim();
    const imageToSend = attachedImage || undefined;

    const senderRole = user?.role || 'student';
    let senderBadge = '🎓 أنت (الطالب)';
    if (senderRole === 'admin') senderBadge = '👑 أنت (المشرف العام)';
    else if (senderRole === 'teacher') senderBadge = '👨‍🏫 أنت (معلم معتمد)';

    db.sendStudentGroupMessage(activeStudentId, {
      studentId: activeStudentId,
      senderId: user?.id || activeStudentId,
      senderName: user?.fullName || (isStaff ? 'المعلم' : 'الطالب'),
      senderRole: senderRole,
      senderBadge: senderBadge,
      text: textToSend,
      attachmentUrl: imageToSend,
    });

    if (isStaff && targetStudent) {
      db.createNotification({
        userId: activeStudentId,
        title: 'رد جديد في جروب المتابعة 💬',
        message: `أرسل ${user?.fullName || 'المعلم'} رداً وتوجيهاً جديداً لك في غرفة المتابعة الأكاديمية.`,
        type: 'info',
        linkUrl: '/group-chat',
      });
    }

    setInputText('');
    setAttachedImage(null);
    reloadMessages();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 w-full">
      {/* 1. Header Card */}
      <div className="bg-[#0c1427]/95 border border-purple-500/30 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shadow-purple-500/25 shrink-0">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-white font-alexandria">
                  مجتمع المتابعة الأكاديمية المباشرة
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {isStaff ? `غرفة الطالب: ${activeStudentName}` : 'غرفة خاصة بك'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isStaff
                  ? 'متابعة أسئلة واستفسارات الطلاب والرد عليهم صوتياً وكتابياً مع إمكانية إرفاق الشروح'
                  : 'تواصل فعلي ومباشر بينك وبين مشرفي ومعلمي المنصة المعتمدين لمتابعة تقدمك الدراسي 🌟'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-bold">
              غرفة المتابعة متصلة ومباشرة 🚀
            </span>
          </div>
        </div>

        {/* Staff Switcher: Choose which student room to inspect and reply to */}
        {isStaff && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">اختر غرفة الطالب للرد والتوجيه:</span>
            </div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-[#070b14] border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400 font-bold max-w-xs"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} {s.governorate ? `(${s.governorate})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Social Links Bar */}
        <div className="pt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-bold ml-1">تابعنا على:</span>
          <a
            href="https://whatsapp.com/channel/0029Vb79XC0EKyZFm37c5P0R"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-colors shadow-sm"
          >
            <span>📱</span>
            <span>واتساب</span>
          </a>
          <a
            href="https://www.facebook.com/share/1DQc2gf9fs/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-bold hover:bg-blue-500/25 transition-colors shadow-sm"
          >
            <span>📘</span>
            <span>فيسبوك</span>
          </a>
          <a
            href="https://t.me/planet_of_3rd_prep"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-bold hover:bg-sky-500/25 transition-colors shadow-sm"
          >
            <span>✈️</span>
            <span>تيليجرام</span>
          </a>
        </div>
      </div>

      {/* 2. Chat Container Box */}
      <div className="bg-[#080d1a]/95 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[540px] sm:h-[600px] overflow-hidden">
        {/* Chat Control & Search Bar */}
        <div className="px-3.5 sm:px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/90 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الرسائل والمسائل والشروح..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-xl pr-8 pl-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium shrink-0">
            <span className="hidden sm:inline">الرسائل:</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold font-mono text-[10px]">
              {filteredMessages.length} رسالة
            </span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
          <div className="text-center my-1">
            <span className="px-3.5 py-1 rounded-full text-[11px] bg-slate-900/90 text-slate-400 border border-slate-800 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {isStaff
                  ? `أنت في محادثة الطالب (${activeStudentName}) — ردودك تصله فوراً بإشعار مباشر`
                  : 'هذه الغرفة خاصة ومخصصة لك — الردود تتم فعلياً من المشرفين والمعلمين المعتمدين فقط'}
              </span>
            </span>
          </div>

          {filteredMessages.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">
              {searchQuery ? 'لم يتم العثور على رسائل مطابقة للبحث' : 'لا توجد رسائل سابقة في هذه الغرفة بعد'}
            </div>
          )}

          {filteredMessages.map((msg) => {
            const isMe = msg.senderId === user?.id || (user?.role === 'student' && msg.senderRole === 'student');
            const isSupervisor = msg.senderRole === 'admin';
            const isTeacher = msg.senderRole === 'teacher';
            const msgReactions = reactions[msg.id] || {};

            return (
              <div
                key={msg.id}
                className={`group flex gap-2.5 sm:gap-3 max-w-[92%] sm:max-w-[82%] ${
                  isMe ? 'mr-auto flex-row-reverse' : 'ml-auto flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 text-sm shadow-md ${
                    isSupervisor
                      ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-slate-950 font-bold'
                      : isTeacher
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold'
                      : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold'
                  }`}
                >
                  {isSupervisor ? '👑' : isTeacher ? '👨‍🏫' : '🎓'}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div
                    className={`flex items-center gap-2 text-[11px] ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="font-bold text-white truncate max-w-[140px] sm:max-w-none">
                      {msg.senderName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                        isSupervisor
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isTeacher
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {msg.senderBadge}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-1">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg relative ${
                      isMe
                        ? 'bg-gradient-to-br from-cyan-600/30 via-blue-600/20 to-slate-900 border border-cyan-500/40 text-slate-100 rounded-tr-none'
                        : isSupervisor
                        ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 text-slate-200 rounded-tl-none'
                        : isTeacher
                        ? 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/40 text-slate-200 rounded-tl-none'
                        : 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/40 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                    {/* Attached Image if any */}
                    {msg.attachmentUrl && (
                      <div
                        onClick={() => setViewingChatImage(msg.attachmentUrl!)}
                        className="mt-2.5 rounded-xl overflow-hidden border border-slate-700 bg-black/60 p-1 max-w-sm cursor-pointer group/img relative"
                        title="اضغط لتكبير الصورة بحجم الشاشة"
                      >
                        <img
                          src={msg.attachmentUrl}
                          alt="مرفق صورة"
                          className="max-h-60 w-auto rounded-lg object-contain transition-transform duration-200 group-hover/img:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-lg">
                          <ZoomIn className="w-4 h-4 text-cyan-400" />
                          <span>عرض الصورة مكبرة</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reaction Bar & Quick Emoji Selector */}
                  <div className={`flex items-center gap-1.5 flex-wrap pt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {/* Render Existing Reactions */}
                    {Object.entries(msgReactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className="px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-purple-500/50 text-[11px] flex items-center gap-1 text-slate-200 transition-colors shadow-sm"
                      >
                        <span>{emoji}</span>
                        <span className="font-mono text-[10px] font-bold text-purple-300">{count}</span>
                      </button>
                    ))}

                    {/* Hover Reaction Emojis Menu */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900/95 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-md">
                      {['👍', '❤️', '👏', '💡', '❓'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => toggleReaction(msg.id, em)}
                          className="text-xs hover:scale-125 transition-transform p-0.5"
                          title={`تفاعل بـ ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-1">رد سريع:</span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText((prev) => (prev ? `${prev} ${chip}` : chip))}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-purple-950/40 text-slate-300 hover:text-white border border-slate-800 hover:border-purple-500/40 whitespace-nowrap transition-colors shrink-0 font-medium"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* 3. Chat Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 border-t border-slate-800 bg-[#0c1427]/95 space-y-2 shrink-0"
        >
          {attachedImage && (
            <div className="relative inline-block rounded-xl border border-purple-500/40 bg-black/60 p-1.5">
              <img src={attachedImage} alt="مرفق" className="h-16 w-auto rounded-lg object-contain" />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <label
              className="p-2.5 sm:p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors shrink-0"
              title="إرفاق صورة مسألة أو سؤال"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceRecord}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all shrink-0 ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
              }`}
              title={isRecording ? 'جاري الاستماع...' : 'تحدث صوتياً لكتابة الرسالة'}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-purple-400" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isStaff
                  ? `اكتب ردك وتوجيهك للطالب (${activeStudentName}) هنا...`
                  : 'اكتب استفسارك أو مسألتك للمعلمين والمشرفين هنا...'
              }
              className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedImage}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{isStaff ? 'إرسال الرد للطالب' : 'إرسال'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Full-Screen Chat Image Lightbox Modal */}
      {viewingChatImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingChatImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={viewingChatImage}
              target="_blank"
              rel="noreferrer"
              download="community-image.jpg"
              className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-emerald-600 text-white border border-slate-700 hover:border-emerald-500 transition-colors shadow-lg flex items-center gap-2 text-xs font-bold"
              title="تحميل الصورة"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الصورة</span>
            </a>
            <button
              onClick={() => setViewingChatImage(null)}
              className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-rose-600 text-white border border-slate-700 hover:border-rose-500 transition-colors shadow-lg"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden border border-purple-500/30 shadow-2xl bg-slate-950 flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingChatImage}
              alt="صورة مكبرة"
              className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-inner"
            />
          </div>
        </div>
      )}
    </div>
  );
};
