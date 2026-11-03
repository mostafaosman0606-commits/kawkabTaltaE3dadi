import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Sparkles,
  X,
  Lock,
  FileText,
  Lightbulb,
  Plus,
  Trash2,
  MessageSquare,
  Edit2,
  Check,
  Clock,
  History,
  ChevronDown,
  Mic,
  MicOff,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { askRoboServer } from '../../services/aiService';
import { RoboMessage, RoboConversation } from '../../types';

interface RoboAiViewProps {
  onUpgradeClick?: () => void;
}

export const RoboAiView: React.FC<RoboAiViewProps> = ({ onUpgradeClick }) => {
  const { user } = useAuth();

  // Conversations State
  const [conversations, setConversations] = useState<RoboConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isConvMenuOpen, setIsConvMenuOpen] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Input & Messaging State
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [showQuotaWarning, setShowQuotaWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const convMenuRef = useRef<HTMLDivElement | null>(null);
  const inputFieldRef = useRef<HTMLInputElement | null>(null);
  const baseTextRef = useRef<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string>('');

  // Check speech recognition support (always show button, gracefully handle if unsupported)
  const getSpeechRec = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

  const startListening = () => {
    setVoiceError('');
    const SpeechRec = getSpeechRec();
    if (!SpeechRec) {
      setVoiceError('متصفحك لا يدعم الإدخال الصوتي. جرّب متصفح Chrome أو Edge.');
      return;
    }
    try {
      // Stop any existing session
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition: any = new SpeechRec();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Remember current text so voice adds directly into input field
      baseTextRef.current = inputText;

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const spoken = (finalText + interimText).trim();
        const base = baseTextRef.current.trim();
        const combined = base ? `${base} ${spoken}` : spoken;

        setInputText(combined);
        inputFieldRef.current?.focus();
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return; // Silence is normal
        const errorMsg: Record<string, string> = {
          'not-allowed':  '❌ لم يتم السماح بالميكروفون. افتح إعدادات المتصفح واسمح بالوصول.',
          'network':      '🌐 خطأ في اتصال الإنترنت أثناء التعرف على الصوت.',
          'audio-capture':'🎤 لم يتم رصد الميكروفون. تأكد من توصيله.',
        };
        setVoiceError(errorMsg[event.error] || `خطأ صوتي: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      inputFieldRef.current?.focus();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      setVoiceError('فشل تشغيل الميكروفون. تأكد من إذن الوصول.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
    inputFieldRef.current?.focus();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (convMenuRef.current && !convMenuRef.current.contains(event.target as Node)) {
        setIsConvMenuOpen(false);
      }
    };
    if (isConvMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isConvMenuOpen]);

  // Load conversations on mount & user change
  useEffect(() => {
    if (user) {
      const convs = db.getRoboConversations(user.id);
      setConversations(convs);

      // Restore active conversation from localStorage or default to first
      const savedActiveId = localStorage.getItem(`kawkab_active_robo_conv_${user.id}`);
      const found = convs.find((c) => c.id === savedActiveId);
      if (found) {
        setActiveConversationId(found.id);
      } else if (convs.length > 0) {
        setActiveConversationId(convs[0].id);
      }
    }
  }, [user]);

  // Persist active conversation id
  useEffect(() => {
    if (user && activeConversationId) {
      localStorage.setItem(`kawkab_active_robo_conv_${user.id}`, activeConversationId);
    }
  }, [user, activeConversationId]);

  // Find active conversation
  const activeConversation: RoboConversation | undefined =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const messages: RoboMessage[] = activeConversation?.messages || [];

  // Scroll to bottom whenever messages or typing change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Quota
  const quota = user ? db.getRoboDailyUsage(user.id) : { limit: 20, used: 0, remaining: 20 };
  const limit = quota.limit;
  const used = quota.used;
  const remaining = quota.remaining;

  // Refresh conversations helper
  const reloadConversations = (preferredActiveId?: string) => {
    if (!user) return;
    const fresh = db.getRoboConversations(user.id);
    setConversations(fresh);
    if (preferredActiveId) {
      setActiveConversationId(preferredActiveId);
    } else if (!fresh.some((c) => c.id === activeConversationId)) {
      setActiveConversationId(fresh[0]?.id || '');
    }
  };

  // Create new conversation
  const handleNewConversation = () => {
    if (!user) return;
    const newConv = db.createRoboConversation(user.id);
    reloadConversations(newConv.id);
    setIsConvMenuOpen(false);
  };

  // Delete conversation
  const handleDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!user) return;
    const target = conversations.find((c) => c.id === convId);
    const title = target?.title || 'هذه المحادثة';
    if (window.confirm(`هل أنت متأكد من حذف "${title}"؟`)) {
      const remainingList = db.deleteRoboConversation(user.id, convId);
      setConversations(remainingList);
      if (activeConversationId === convId) {
        setActiveConversationId(remainingList[0]?.id || '');
      }
    }
  };

  // Start renaming
  const handleStartRename = (e: React.MouseEvent, conv: RoboConversation) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  // Save rename
  const handleSaveRename = (convId: string) => {
    if (!user) return;
    db.updateRoboConversationTitle(user.id, convId, editingTitle);
    setEditingConvId(null);
    reloadConversations(convId);
  };

  // Send message with Memory (passing previous messages)
  const handleSendMessage = async () => {
    if (!user || (!inputText.trim() && !attachmentPreview) || isTyping) return;

    const isPdfAttachment = Boolean(
      attachmentName?.toLowerCase().endsWith('.pdf') ||
      (attachmentPreview && attachmentPreview.startsWith('data:application/pdf'))
    );

    const userText =
      inputText.trim() ||
      (isPdfAttachment
        ? `📄 أرفقت ملف PDF: "${attachmentName || 'مستند دراسي'}". يرجى مراجعته وتلخيصه وشرح أهم نقاطه وحل أي أسئلة فيه.`
        : 'يرجى مراجعة وشرح السؤال المرفق في الصورة بالتفصيل.');

    const savedAttach = attachmentPreview || undefined;
    const savedAttachName = attachmentName || undefined;

    setInputText('');
    setAttachmentPreview(null);
    setAttachmentName('');

    // Ensure we have an active conversation
    let targetConvId = activeConversation?.id;
    if (!targetConvId) {
      const created = db.createRoboConversation(user.id);
      targetConvId = created.id;
    }

    // 1. Immediately save user message to active conversation
    const { quotaExceeded } = db.addUserMessageToConversation(
      user.id,
      targetConvId,
      userText,
      savedAttach,
      savedAttachName
    );

    // Refresh state immediately so the student's message renders right away
    reloadConversations(targetConvId);

    if (quotaExceeded) {
      setShowQuotaWarning(true);
      db.addAssistantMessageToConversation(
        user.id,
        targetConvId,
        'عذراً يا بطل! لقد استهلكت رصيدك اليومي من أسئلة روبو. يتجدد الرصيد تلقائياً كل يوم لدعمك المستمر في المذاكرة! 🚀'
      );
      reloadConversations(targetConvId);
      return;
    }

    // 2. Start typing animation
    setIsTyping(true);

    try {
      // 3. Ask Gemini AI with FULL conversation history memory!
      const currentHistory = activeConversation?.messages || [];
      const serverRes = await askRoboServer(
        user.id,
        userText,
        user.subscriptionTier,
        savedAttach,
        currentHistory
      );

      if (serverRes?.quotaExceeded) {
        setShowQuotaWarning(true);
      }

      const reply =
        serverRes?.reply ||
        'أهلاً بك يا بطل! أنا معك دائماً لشرح وفهم منهج الشهادة الإعدادية خطوة بخطوة 🌟.';
      db.addAssistantMessageToConversation(user.id, targetConvId, reply);
    } catch (err) {
      console.warn('Gemini chat error:', err);
      db.addAssistantMessageToConversation(
        user.id,
        targetConvId,
        'أهلاً بك يا بطل! استخرج المعطيات والمفهوم الرئيسي واكتب لي الخطوة الأولى وسنراجعها سوياً خطوة بخطوة! 🌟'
      );
    } finally {
      // 4. Update UI and always dismiss typing state
      reloadConversations(targetConvId);
      setIsTyping(false);
      inputFieldRef.current?.focus();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. يرجى اختيار ملف أقل من 20 ميجابايت.');
      return;
    }

    setAttachmentName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentPreview(reader.result as string);
      inputFieldRef.current?.focus();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Banner with Quota Info */}
      <div className="rounded-2xl glass-card p-4 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center border border-cyan-400/40 shadow-lg shadow-cyan-500/20 text-2xl shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-white text-base font-alexandria">
                المعلم الذكي «روبو»
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <span>🧠</span>
                <span>ذاكرة المحادثات مفعّلة</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              يتذكر سياق حديثك وأسئلتك السابقة في كل محادثة ويشرح بالخطوات والنماذج الوزارية
            </p>
          </div>
        </div>

        {/* Quota Indicator */}
        <div className="flex items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block">الرصيد اليومي للأسئلة</span>
            <span className="text-xs font-bold text-cyan-300 font-mono">
              متبقي {remaining} من {limit} سؤال اليوم
            </span>
          </div>

          {remaining <= 2 && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              ترقية الباقة
            </button>
          )}
        </div>
      </div>

      {/* Main Spacious Chat Panel */}
      <div className="rounded-2xl glass-card border border-cyan-500/15 h-[650px] flex flex-col overflow-hidden bg-[#070c18]/95 shadow-2xl">
        {/* Chat Header: Conversation Selector Dropdown + New Conversation Button */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 relative">
          {/* Conversation Switcher Dropdown */}
          <div className="relative" ref={convMenuRef}>
            <button
              onClick={() => setIsConvMenuOpen(!isConvMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-xs transition-all shadow-sm"
              title="عرض وتبديل المحادثات السابقة"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">المحادثة الحالية:</span>
                <span className="font-bold text-white max-w-[160px] sm:max-w-[260px] truncate block">
                  {activeConversation?.title || 'محادثة نشطة'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform mr-1 ${
                  isConvMenuOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isConvMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <History className="w-4 h-4 text-cyan-400" />
                    <span>سجل محادثاتك ({conversations.length})</span>
                  </div>
                  <button
                    onClick={handleNewConversation}
                    className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded-lg hover:bg-cyan-500/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>جديدة</span>
                  </button>
                </div>

                {/* List of Conversations */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversation?.id;
                    const isEditing = editingConvId === conv.id;
                    const msgCount = conv.messages.filter(
                      (m) => !m.id.startsWith('msg-seed')
                    ).length;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setActiveConversationId(conv.id);
                          setIsConvMenuOpen(false);
                        }}
                        className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                          isActive
                            ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 shadow-sm'
                            : 'bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-cyan-400' : 'text-slate-500'
                            }`}
                          />

                          {isEditing ? (
                            <div
                              className="flex items-center gap-1 flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && handleSaveRename(conv.id)
                                }
                                className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRename(conv.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate text-xs">{conv.title}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(conv.updatedAt).toLocaleDateString('ar-EG', {
                                    month: 'numeric',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span>•</span>
                                <span>{msgCount} رسالة</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Inline Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleStartRename(e, conv)}
                              className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800"
                              title="تعديل اسم المحادثة"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {conversations.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                                title="حذف المحادثة"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
                  💡 يتذكر روبو الأسئلة داخل المحادثة الواحدة لمساعدتك في المتابعة
                </div>
              </div>
            )}
          </div>

          {/* Right Header Actions: New Chat + Quick Edit */}
          <div className="flex items-center gap-2">
            {activeConversation && (
              <button
                onClick={(e) => handleStartRename(e, activeConversation)}
                className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-cyan-300 text-xs px-2.5 py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                title="تعديل عنوان المحادثة الحالية"
              >
                <Edit2 className="w-3 h-3" />
                <span>إعادة تسمية</span>
              </button>
            )}

            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all shrink-0"
              title="بدء محادثة جديدة لموضوع جديد"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>محادثة جديدة</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                    isUser
                      ? 'bg-cyan-600 text-white border border-cyan-400/30'
                      : 'bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 text-white border border-cyan-400/30'
                  }`}
                >
                  {isUser ? 'أنا' : '🤖'}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2.5 shadow-md ${
                    isUser
                      ? 'bg-cyan-600/20 border border-cyan-500/40 text-slate-100 rounded-tr-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Image or PDF attachment preview in message */}
                  {msg.attachmentUrl && (msg.attachmentUrl.startsWith('data:application/pdf') || msg.attachmentName?.toLowerCase().endsWith('.pdf')) ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-rose-300 max-w-sm">
                      <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-right flex-1 min-w-0">
                        <span className="font-bold text-xs text-white block truncate">{msg.attachmentName || 'مستند دراسي PDF'}</span>
                        <span className="text-[10px] text-slate-400 block">ملف PDF مرفق</span>
                      </div>
                    </div>
                  ) : msg.attachmentUrl ? (
                    <div className="rounded-xl overflow-hidden border border-slate-700 max-w-sm">
                      <img
                        src={msg.attachmentUrl}
                        alt="صورة السؤال"
                        className="w-full h-auto object-cover max-h-72"
                      />
                    </div>
                  ) : msg.attachmentName ? (
                    <div className="flex items-center gap-1.5 text-xs text-cyan-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                      {msg.attachmentName.toLowerCase().endsWith('.pdf') ? (
                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      <span>مرفق: {msg.attachmentName}</span>
                    </div>
                  ) : null}

                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  <span className="text-[10px] text-slate-500 block text-left pt-1">
                    {new Date(msg.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center text-xs shadow-md border border-cyan-400/30">
                🤖
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                <span className="mr-2 text-cyan-300 font-bold">
                  روبو يفكر ويتذكر سياق المحادثة...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Attachment Preview Bar */}
        {attachmentPreview && (
          <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              {attachmentName.toLowerCase().endsWith('.pdf') || attachmentPreview.startsWith('data:application/pdf') ? (
                <>
                  <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-rose-300">مستند PDF: {attachmentName || 'ملف PDF'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                    جاهز للشرح والتلخيص وحل الأسئلة 📄
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-bold text-cyan-300">مرفق: {attachmentName || 'صورة السؤال'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                    تحسب سؤالاً واحداً فقط 🎯
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setAttachmentPreview(null);
                setAttachmentName('');
              }}
              className="text-slate-400 hover:text-rose-400 transition-colors p-1"
              title="إلغاء المرفق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800">

          {/* Voice error message */}
          {voiceError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
              <span>{voiceError}</span>
              <button onClick={() => setVoiceError('')} className="text-red-400 hover:text-red-200 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                <span className="font-bold">🎙️ جاري الاستماع وتحويل صوتك إلى نص مكتوب... تكلم الآن</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[10px] font-bold"
              >
                إيقاف التسجيل
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-slate-800 transition-colors shrink-0 flex items-center gap-1.5"
            title="إرفاق صورة مسألة أو ملف PDF للشرح"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[11px] font-bold hidden sm:inline">صورة / PDF</span>
          </button>

          {/* Socratic Hint Quick Button */}
          <button
            type="button"
            onClick={() => {
              setInputText((prev) =>
                prev
                  ? `💡 أعطني تلميحاً فقط في هذا السؤال دون حرق الحل: ${prev}`
                  : '💡 أعطني تلميحاً ذكياً يشجعني على التفكير خطوة بخطوة في هذا السؤال: '
              );
              inputFieldRef.current?.focus();
            }}
            className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            title="طلب تلميح تشجيعي على التفكير بدل إعطاء الحل المباشر"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">طلب تلميح</span>
          </button>

          <input
            ref={inputFieldRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? 'جاري تحويل صوتك لنص هنا...' : 'اسأل روبو أو أرفق ملف PDF / صورة...'}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />

          {/* Voice Input Button — always shown */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border-slate-800'
            }`}
            title={isListening ? 'إيقاف الاستماع' : 'إدخال صوتي بالعربي 🎙️'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && !attachmentPreview) || isTyping}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white transition-all shadow-md shrink-0"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
          </div>{/* end flex row */}
        </div>{/* end Input Bar */}
      </div>

      {/* Quota Exhausted Modal */}
      {showQuotaWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Lock className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">استنفاد الحصة اليومية لروبو</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              لقد استهلكت رصيد أسئلتك اليومي بالكامل ({used}/{limit} سؤال). يتجدد الرصيد تلقائياً كل
              يوم لدعمك المستمر في تفوقك الدراسي!
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowQuotaWarning(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl"
              >
                حسناً
              </button>
              {onUpgradeClick && (
                <button
                  onClick={() => {
                    setShowQuotaWarning(false);
                    onUpgradeClick();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold text-xs rounded-xl"
                >
                  ترقية الباقة الآن
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
