// ==============================================================================
// KAWKAB TALTA E3DADI — SOCIAL & GAMIFICATION SERVICE
// Challenges, Robo AI Assistant, Notifications, Announcements, Private Student
// Group Chats, Streaks, Badges, Study Goals, Flashcards, Schedule & Tasks.
// ==============================================================================

import type {
  LiveChallenge,
  RoboConversation,
  RoboMessage,
  Notification,
  Announcement,
  StudentGroupMessage,
  DailyStreak,
  StudentBadge,
  BadgeType,
  StudentGoal,
  Flashcard,
  StudentScheduleSlot,
  StudentTask,
  TeacherMessage,
  Question,
} from '../../types';
import { storageEngine, STORAGE_KEYS, generateUUID } from './storageEngine';
import { isSupabaseConfigured } from '../supabase';
import {
  sbUpsertChallenge,
  sbSaveConversation,
  sbInsertNotification,
  sbMarkNotificationRead,
  sbSendStudentGroupMessage,
  sbUpsertStreak,
  sbAwardBadge,
  sbSaveGoal,
  sbSaveFlashcards,
  sbDeleteFlashcard,
  sbSaveStudentSchedule,
  sbSaveStudentTasks,
} from '../supabaseDb';
import { profileService } from './profileService';
import { curriculumService } from './curriculumService';
import { examService } from './examService';
import { INITIAL_FLASHCARDS } from './initialFlashcards';

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '🚀 أهلاً بكم في كوكب تالتة إعدادي!',
    content: 'المنصة التعليمية المتكاملة لطلاب الشهادة الإعدادية في مصر 2026.',
    targetAudience: 'all',
    priority: 'normal',
    isPublished: true,
    createdAt: '2026-09-01T10:00:00Z',
  },
];

function syncRoboConversationToCloud(conversation: RoboConversation): void {
  if (!isSupabaseConfigured()) return;
  void sbSaveConversation(conversation)
    .then((saved) => {
      if (!saved) console.warn('[Robo] Conversation remains local; Supabase rejected the write.');
    })
    .catch((error) => console.warn('[Robo] Conversation sync failed:', error));
}

export class SocialService {
  // ============================================================
  // 1. LIVE CHALLENGES
  // ============================================================

  public getChallenges(): LiveChallenge[] {
    return storageEngine.get<LiveChallenge[]>(STORAGE_KEYS.CHALLENGES, []);
  }

  public getChallengeByCode(code: string): LiveChallenge | null {
    const challenges = this.getChallenges();
    return challenges.find((c) => c.code.toUpperCase() === code.trim().toUpperCase()) || null;
  }

  public createChallenge(
    subjectId: string,
    creatorId: string,
    creatorName: string,
    isOpenChallenge: boolean = false,
    creatorGovernorate?: string,
    timeLimitSeconds: number = 60
  ): LiveChallenge {
    const challenges = this.getChallenges();
    const sub = curriculumService.getSubjectById(subjectId);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const exams = examService.getExaminations().filter((e) => !subjectId || e.subjectId === subjectId);
    const examIds = new Set(exams.map((e) => e.id));

    const subjectQuestions = storageEngine.get<Question[]>(STORAGE_KEYS.QUESTIONS, [])
      .filter((q) => q.choices && q.choices.length > 0 && (!subjectId || examIds.has(q.examId)));

    let duelQuestions = subjectQuestions.slice(0, 5).map((q) => {
      const correctIdx = q.choices!.findIndex((c) => c.isCorrect);
      return {
        id: q.id,
        text: q.questionText,
        choices: q.choices!.map((c) => c.choiceText),
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
      };
    });

    if (duelQuestions.length < 3) {
      duelQuestions = this.getFallbackChallengeQuestions(sub?.slug || sub?.nameAr || 'general');
    }

    const newChallenge: LiveChallenge = {
      id: generateUUID(),
      subjectId,
      subjectName: sub?.nameAr || 'المادة الدراسية',
      code,
      title: `تحدي كوكب تالتة: ${sub?.nameAr || 'عام'} 🚀`,
      createdBy: creatorId,
      creatorName,
      creatorGovernorate: creatorGovernorate || 'القاهرة',
      isOpenChallenge,
      status: 'waiting',
      timeLimitSeconds: timeLimitSeconds || 60,
      questions: duelQuestions,
      creatorScore: 0,
      opponentScore: 0,
      createdAt: new Date().toISOString(),
    };

    challenges.unshift(newChallenge);
    storageEngine.set(STORAGE_KEYS.CHALLENGES, challenges);
    sbUpsertChallenge(newChallenge).catch(() => {});
    storageEngine.notifyDataChanged();
    return newChallenge;
  }

  public getOpenChallenges(): LiveChallenge[] {
    return this.getChallenges().filter((c) => c.status === 'waiting');
  }

  public joinChallenge(code: string, opponentId: string, opponentName: string): LiveChallenge | null {
    const challenges = this.getChallenges();
    const idx = challenges.findIndex((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (idx === -1) return null;

    const chl = challenges[idx];
    if (chl.status !== 'waiting') return null;
    if (chl.createdBy === opponentId) return chl;

    chl.opponentId = opponentId;
    chl.opponentName = opponentName;
    chl.status = 'in_progress';

    challenges[idx] = chl;
    storageEngine.set(STORAGE_KEYS.CHALLENGES, challenges);
    sbUpsertChallenge(chl).catch(() => {});
    storageEngine.notifyDataChanged();
    return chl;
  }

  public finishChallenge(
    challengeId: string,
    creatorScore: number,
    opponentScore: number
  ): LiveChallenge | null {
    const challenges = this.getChallenges();
    const idx = challenges.findIndex((c) => c.id === challengeId);
    if (idx === -1) return null;

    const chl = challenges[idx];
    chl.creatorScore = creatorScore;
    chl.opponentScore = opponentScore;
    chl.status = 'completed';
    chl.finishedAt = new Date().toISOString();

    if (creatorScore > opponentScore) {
      chl.winnerId = chl.createdBy;
      chl.winnerName = chl.creatorName;
    } else if (opponentScore > creatorScore) {
      chl.winnerId = chl.opponentId;
      chl.winnerName = chl.opponentName;
    } else {
      chl.winnerName = 'تعادل بطولي 🤝';
    }

    challenges[idx] = chl;
    storageEngine.set(STORAGE_KEYS.CHALLENGES, challenges);
    sbUpsertChallenge(chl).catch(() => {});
    storageEngine.notifyDataChanged();
    return chl;
  }

  private getFallbackChallengeQuestions(subjectKey: string): LiveChallenge['questions'] {
    const key = subjectKey.toLowerCase();
    if (key.includes('arab') || key.includes('عرب')) {
      return [
        {
          id: 'q-ar-1',
          text: 'نوع المنادى في جملة: (يا طالبَ العلمِ اجتهد) هو:',
          choices: ['منادى مضاف', 'منادى شبيه بالمضاف', 'منادى نكرة غير مقصودة', 'منادى علم مفرد'],
          correctIndex: 0,
        },
        {
          id: 'q-ar-2',
          text: 'المنادى المبني يبنى على:',
          choices: ['ما يرفع به في محل نصب', 'الفتحة دائماً', 'الكسرة نيابة عن الفتحة', 'السكون فقط'],
          correctIndex: 0,
        },
        {
          id: 'q-ar-3',
          text: 'علامة إعراب الممنوع من الصرف المجرور بالفتحة بشرط:',
          choices: ['ألا يُعرَّف بأل ولا يُضاف', 'أن يكون معرفاً بأل', 'أن يكون مضافاً لمعرفة', 'أن يكون نعت'],
          correctIndex: 0,
        },
        {
          id: 'q-ar-4',
          text: 'من مؤلفات الشاعر إيليا أبو ماضي المقررة في النصوص:',
          choices: ['ديوان تبر وتراب (كن جميلاً)', 'ديوان الشوقيات', 'ديوان همس الجفون', 'الأيام'],
          correctIndex: 0,
        },
        {
          id: 'q-ar-5',
          text: 'حكم البدل في الإعراب أنه:',
          choices: ['يتبع المبدل منه في الإعراب', 'منصوب دائماً', 'مرفوع دائماً', 'مبني على الضم'],
          correctIndex: 0,
        },
      ];
    }
    if (key.includes('math') || key.includes('رياض')) {
      return [
        {
          id: 'q-ma-1',
          text: 'إذا كان س = {١} ، ص = {٢} فإن حاصل الضرب الديكارتي س × ص =',
          choices: ['{(١ ، ٢)}', '{٢ ، ١}', '{٣}', '{(٢ ، ٢)}'],
          correctIndex: 0,
        },
        {
          id: 'q-ma-2',
          text: 'النقطة (-٣ ، ٤) تقع في الربع:',
          choices: ['الثاني', 'الأول', 'الثالث', 'الرابع'],
          correctIndex: 0,
        },
        {
          id: 'q-ma-3',
          text: 'إذا كانت جا س = ٠.٥ حيث س زاوية حادة فإن قياس زاوية س =',
          choices: ['٣٠°', '٤٥°', '٦٠°', '٩٠°'],
          correctIndex: 0,
        },
        {
          id: 'q-ma-4',
          text: 'ميل المستقيم الموازي لمحور السينات يساوي:',
          choices: ['صفر', 'غير معرّف', '١', '-١'],
          correctIndex: 0,
        },
        {
          id: 'q-ma-5',
          text: 'البعد بين النقطة (٣ ، ٤) ونقطة الأصل يساوي:',
          choices: ['٥ وحدات طول', '٧ وحدات طول', '١ وحدة طول', '٢٥ وحدة طول'],
          correctIndex: 0,
        },
      ];
    }
    if (key.includes('scien') || key.includes('علوم')) {
      return [
        {
          id: 'q-sc-1',
          text: 'وحدة قياس العجلة في النظام الدولي هي:',
          choices: ['م/ث²', 'م/ث', 'كم/س', 'م.ث'],
          correctIndex: 0,
        },
        {
          id: 'q-sc-2',
          text: 'حاصل ضرب سرعة الجسم المتحرك في الزمن يساوي:',
          choices: ['المسافة', 'العجلة', 'الكثافة', 'القوة'],
          correctIndex: 0,
        },
        {
          id: 'q-sc-3',
          text: 'المرآة التي تكون دائماً صوراً تقديرية مصغرة ومعتدلة هي:',
          choices: ['المرآة المحدبة', 'المرآة المقعرة', 'المرآة المستوية', 'العدسة المحدبة'],
          correctIndex: 0,
        },
        {
          id: 'q-sc-4',
          text: 'الغازان اللذان أنتجا المجرات والنجوم عبر ملايين السنين هما:',
          choices: ['الهيدروجين والهيليوم', 'الأكسجين والنيتروجين', 'الهيليوم والأرجون', 'ثاني أكسيد الكربون'],
          correctIndex: 0,
        },
        {
          id: 'q-sc-5',
          text: 'يحدث الانقسام الميوزي في الكائنات الحية في خلايا:',
          choices: ['المناسل لإنتاج الأمشاج', 'الجلد لتعويض التالف', 'الكبد', 'العظام'],
          correctIndex: 0,
        },
      ];
    }
    if (key.includes('eng') || key.includes('إنجليز')) {
      return [
        {
          id: 'q-en-1',
          text: 'We use the preposition "____" with specific times like 7:00 AM.',
          choices: ['at', 'in', 'on', 'by'],
          correctIndex: 0,
        },
        {
          id: 'q-en-2',
          text: 'The train to Alexandria ____ at 8:30 tomorrow morning.',
          choices: ['leaves', 'leave', 'is leaving', 'left'],
          correctIndex: 0,
        },
        {
          id: 'q-en-3',
          text: 'A ____ is a large area of water surrounded by land.',
          choices: ['lake', 'mountain', 'monument', 'station'],
          correctIndex: 0,
        },
        {
          id: 'q-en-4',
          text: 'Neither Ali nor his friends ____ ready for the exam.',
          choices: ['are', 'is', 'was', 'be'],
          correctIndex: 0,
        },
        {
          id: 'q-en-5',
          text: 'The exhibition was so ____ that everyone enjoyed it.',
          choices: ['interesting', 'interested', 'bored', 'interest'],
          correctIndex: 0,
        },
      ];
    }
    return [
      {
        id: 'q-gen-1',
        text: 'أعلى قمة جبلية في قارة إفريقيا هي قمة جبل:',
        choices: ['كليمنجارو', 'كينيا', 'أطلس', 'البحر الأحمر'],
        correctIndex: 0,
      },
      {
        id: 'q-gen-2',
        text: 'اندلعت ثورة القاهرة الأولى في أكتوبر عام ١٧٩٨ ضد الاحتلال الفرنسي من مقر:',
        choices: ['الأزهر الشريف', 'قلعة صلاح الدين', 'مسجد الحسين', 'بولاق'],
        correctIndex: 0,
      },
      {
        id: 'q-gen-3',
        text: 'الرمز المستخدم في خرائط التدفق للتعبير عن اتخاذ القرار (Decision) هو:',
        choices: ['المعين', 'المستطيل', 'المتوازي', 'الشكل البيضاوي'],
        correctIndex: 0,
      },
      {
        id: 'q-gen-4',
        text: 'من صفات المؤمنين التي نزلت في سورة المؤمنون:',
        choices: ['الخشوع في الصلاة وأداء الزكاة', 'الكبر والغرور', 'التكاسل عن الطاعات', 'إضاعة الأمانات'],
        correctIndex: 0,
      },
      {
        id: 'q-gen-5',
        text: 'يتميز الفن القبطي والإسلامي بتوظيف العناصر:',
        choices: ['الزخرفية والهندسية والنباتية البديعة', 'الألوان القاتمة فقط', 'عدم استخدام التماثل', 'التجريد التام بلا تفاصيل'],
        correctIndex: 0,
      },
    ];
  }

  // ============================================================
  // 2. ROBO AI ASSISTANT & CONVERSATIONS
  // ============================================================

  private getRoboConversationsStorage(): Record<string, RoboConversation[]> {
    let all = storageEngine.get<Record<string, RoboConversation[]>>(STORAGE_KEYS.ROBO_CONVERSATIONS, {});
    if (!all || Array.isArray(all) || typeof all !== 'object') {
      all = {};
    }

    // Auto-migration from legacy single-thread ROBO_MESSAGES
    try {
      const legacyStorage = storageEngine.get<any>(STORAGE_KEYS.ROBO_MESSAGES, {});
      if (legacyStorage && typeof legacyStorage === 'object') {
        Object.keys(legacyStorage).forEach((uid) => {
          if (!all[uid] || all[uid].length === 0) {
            const msgs = legacyStorage[uid];
            if (Array.isArray(msgs) && msgs.length > 0) {
              const firstUserMsg = msgs.find((m: RoboMessage) => m.sender === 'user');
              const title = firstUserMsg?.text
                ? (firstUserMsg.text.length > 30 ? firstUserMsg.text.substring(0, 30) + '...' : firstUserMsg.text)
                : 'محادثة سابقة';

              all[uid] = [
                {
                  id: generateUUID(),
                  userId: uid,
                  title,
                  createdAt: msgs[0]?.createdAt || new Date().toISOString(),
                  updatedAt: msgs[msgs.length - 1]?.createdAt || new Date().toISOString(),
                  messages: msgs,
                },
              ];
            }
          }
        });
      }
    } catch (e) {
      console.warn('Robo conversation migration error:', e);
    }

    return all;
  }

  public getRoboConversations(userId: string): RoboConversation[] {
    const all = this.getRoboConversationsStorage();
    if (!all[userId] || all[userId].length === 0) {
      const initialConv: RoboConversation = {
        id: generateUUID(),
        userId,
        title: 'محادثة جديدة',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: generateUUID(),
            sender: 'assistant',
            text: 'أهلاً بك يا بطل! أنا "روبو" 🤖 معلمك الذكي في كوكب تالتة إعدادي. كيف يمكنني مساعدتك اليوم في شرح درس أو حل مسألة؟ يمكنك أيضاً إرسال صورة السؤال وسأرشدك خطوة بخطوة!',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      all[userId] = [initialConv];
      storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
      return [initialConv];
    }
    return [...all[userId]].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public createRoboConversation(userId: string, title: string = 'محادثة جديدة'): RoboConversation {
    const all = this.getRoboConversationsStorage();
    if (!all[userId]) all[userId] = [];
    const newConv: RoboConversation = {
      id: generateUUID(),
      userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: generateUUID(),
          sender: 'assistant',
          text: 'أهلاً بك في محادثة جديدة! 🤖 أنا جاهز لمساعدتك في أي سؤال أو مسألة في منهج الشهادة الإعدادية. اسألني وسأتذكر سياق حديثنا طوال هذه المحادثة!',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    all[userId].unshift(newConv);
    storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    storageEngine.notifyDataChanged();
    return newConv;
  }

  public deleteRoboConversation(userId: string, conversationId: string): RoboConversation[] {
    const all = this.getRoboConversationsStorage();
    if (!all[userId]) return [];
    all[userId] = all[userId].filter((c) => c.id !== conversationId);
    if (all[userId].length === 0) {
      const fresh = this.createRoboConversation(userId);
      return [fresh];
    }
    storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    storageEngine.notifyDataChanged();
    return this.getRoboConversations(userId);
  }

  public updateRoboConversationTitle(userId: string, conversationId: string, newTitle: string): void {
    const all = this.getRoboConversationsStorage();
    if (!all[userId]) return;
    const conv = all[userId].find((c) => c.id === conversationId);
    if (conv) {
      conv.title = newTitle.trim() || 'محادثة';
      conv.updatedAt = new Date().toISOString();
      storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
      storageEngine.notifyDataChanged();
    }
  }

  public addUserMessageToConversation(
    userId: string,
    conversationId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; quotaExceeded: boolean } {
    const { remaining } = this.getRoboDailyUsage(userId);
    const userMsg: RoboMessage = {
      id: generateUUID(),
      sender: 'user',
      text,
      attachmentUrl,
      attachmentName,
      createdAt: new Date().toISOString(),
    };

    if (remaining <= 0) {
      return { userMsg, quotaExceeded: true };
    }

    this.incrementRoboDailyUsage(userId);

    const all = this.getRoboConversationsStorage();
    let convList = all[userId] || [];
    let conv = convList.find((c) => c.id === conversationId);
    if (!conv) {
      conv = this.createRoboConversation(userId);
      convList = all[userId];
    }

    const storedUserMsg: RoboMessage = {
      ...userMsg,
      attachmentUrl: (attachmentUrl && attachmentUrl.length > 2048) ? undefined : attachmentUrl,
    };
    conv.messages.push(storedUserMsg);
    conv.updatedAt = new Date().toISOString();

    if (conv.title === 'محادثة جديدة' && text.trim().length > 0) {
      const cleanText = text.replace(/💡|📝|📐|🔬|🌍|🇬🇧|💻/g, '').trim();
      conv.title = cleanText.length > 32 ? cleanText.substring(0, 32) + '...' : cleanText;
    }

    storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    syncRoboConversationToCloud(conv);
    storageEngine.notifyDataChanged();
    return { userMsg, quotaExceeded: false };
  }

  public addAssistantMessageToConversation(
    userId: string,
    conversationId: string,
    text: string
  ): RoboMessage {
    const replyMsg: RoboMessage = {
      id: generateUUID(),
      sender: 'assistant',
      text,
      createdAt: new Date().toISOString(),
    };

    const all = this.getRoboConversationsStorage();
    let convList = all[userId] || [];
    let conv = convList.find((c) => c.id === conversationId);
    if (!conv) {
      conv = this.createRoboConversation(userId);
    }

    conv.messages.push(replyMsg);
    conv.updatedAt = new Date().toISOString();
    storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    syncRoboConversationToCloud(conv);
    storageEngine.notifyDataChanged();
    return replyMsg;
  }

  public getRoboMessages(userId: string): RoboMessage[] {
    const convs = this.getRoboConversations(userId);
    return convs[0]?.messages || [];
  }

  public addUserRoboMessage(
    userId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; quotaExceeded: boolean } {
    const convs = this.getRoboConversations(userId);
    return this.addUserMessageToConversation(userId, convs[0].id, text, attachmentUrl, attachmentName);
  }

  public addAssistantRoboMessage(userId: string, text: string): RoboMessage {
    const convs = this.getRoboConversations(userId);
    return this.addAssistantMessageToConversation(userId, convs[0].id, text);
  }

  public getRoboDailyUsage(userId: string): { limit: number; used: number; remaining: number } {
    const user = profileService.getProfileById(userId);
    const isStaff = user?.role === 'admin' || user?.role === 'teacher';
    let limit = 10;
    if (isStaff || user?.subscriptionTier === 'premium') {
      limit = 150;
    } else if (user?.subscriptionTier === 'standard') {
      limit = 60;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const usageMap = storageEngine.get<Record<string, { date: string; count: number }>>('kawkab_robo_daily_usage', {});
    const userUsage = usageMap[userId];

    const used = (userUsage && userUsage.date === todayStr) ? userUsage.count : 0;
    const remaining = Math.max(0, limit - used);

    return { limit, used, remaining };
  }

  public incrementRoboDailyUsage(userId: string): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const usageMap = storageEngine.get<Record<string, { date: string; count: number }>>('kawkab_robo_daily_usage', {});
    const current = (usageMap[userId] && usageMap[userId].date === todayStr) ? usageMap[userId].count : 0;
    const nextCount = current + 1;
    usageMap[userId] = { date: todayStr, count: nextCount };
    storageEngine.set('kawkab_robo_daily_usage', usageMap);

    const user = profileService.getProfileById(userId);
    if (user) {
      const monthCount = (user.aiQuestionsUsedThisMonth || 0) + 1;
      profileService.updateProfile(userId, { aiQuestionsUsedThisMonth: monthCount });
    }

    return nextCount;
  }

  public sendRoboMessage(
    userId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; replyMsg: RoboMessage; quotaExceeded: boolean } {
    const { userMsg, quotaExceeded } = this.addUserRoboMessage(userId, text, attachmentUrl, attachmentName);
    const replyMsg = this.addAssistantRoboMessage(
      userId,
      quotaExceeded
        ? 'عذراً يا بطل! لقد استهلكت رصيدك اليومي من أسئلة روبو. يتجدد الرصيد تلقائياً كل يوم!'
        : 'جاري التفكير... 🤖'
    );
    return { userMsg, replyMsg, quotaExceeded };
  }

  public updateRoboReply(userId: string, replyMsgId: string, newText: string): void {
    const all = this.getRoboConversationsStorage();
    if (!all[userId]) return;
    let targetConv: RoboConversation | null = null;
    all[userId].forEach((conv) => {
      const msg = conv.messages.find((m) => m.id === replyMsgId);
      if (msg) {
        msg.text = newText;
        conv.updatedAt = new Date().toISOString();
        targetConv = conv;
      }
    });
    storageEngine.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    if (targetConv) {
      syncRoboConversationToCloud(targetConv);
    }
    storageEngine.notifyDataChanged();
  }

  // ============================================================
  // 3. NOTIFICATIONS & ANNOUNCEMENTS
  // ============================================================

  public getNotifications(userId: string): Notification[] {
    const notifs = storageEngine.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return notifs
      .filter((n) => n.userId === userId || !n.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const notifs = storageEngine.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newN: Notification = {
      ...notif,
      id: generateUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifs.unshift(newN);
    storageEngine.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
    if (newN.userId) {
      sbInsertNotification(newN).catch(() => {});
    }
    storageEngine.notifyDataChanged();
    return newN;
  }

  public markNotificationRead(id: string): void {
    const notifs = storageEngine.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const n = notifs.find((x) => x.id === id);
    if (n) {
      n.isRead = true;
      storageEngine.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
      sbMarkNotificationRead(id).catch(() => {});
      storageEngine.notifyDataChanged();
    }
  }

  public getAnnouncements(): Announcement[] {
    const anns = storageEngine.get<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    return anns.filter((a) => a.isPublished).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveAnnouncement(ann: Partial<Announcement>): Announcement {
    const anns = storageEngine.get<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    if (ann.id) {
      const idx = anns.findIndex((a) => a.id === ann.id);
      if (idx !== -1) {
        anns[idx] = { ...anns[idx], ...ann } as Announcement;
        storageEngine.set(STORAGE_KEYS.ANNOUNCEMENTS, anns);
        storageEngine.notifyDataChanged();
        return anns[idx];
      }
    }
    const newA: Announcement = {
      id: `ann-${Date.now()}`,
      title: ann.title || 'إعلان جديد',
      content: ann.content || '',
      priority: ann.priority || 'normal',
      targetAudience: ann.targetAudience || 'all',
      isPublished: ann.isPublished ?? true,
      createdAt: new Date().toISOString(),
    };
    anns.unshift(newA);
    storageEngine.set(STORAGE_KEYS.ANNOUNCEMENTS, anns);
    storageEngine.notifyDataChanged();
    return newA;
  }

  // ============================================================
  // 4. STUDENT PRIVATE GROUP CHATS
  // ============================================================

  public getStudentGroupMessages(studentId: string): StudentGroupMessage[] {
    const all = storageEngine.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    if (all[studentId] && all[studentId].length > 0) {
      return all[studentId];
    }

    const student = profileService.getProfileById(studentId);
    const studentName = student?.fullName?.split(' ')[0] || 'يا بطل';
    const adminUser = profileService.getProfiles().find((p) => p.role === 'admin');
    const adminName = adminUser?.fullName || 'المشرف الأكاديمي العام';
    const adminId = adminUser?.id || 'usr-admin-1';

    const initialWelcome: StudentGroupMessage[] = [
      {
        id: `gm-init-1-${studentId}`,
        studentId,
        senderId: adminId,
        senderName: adminName,
        senderRole: 'admin',
        senderBadge: 'المشرف الأكاديمي العام',
        text: `مرحباً بك يا ${studentName} في غرفة المتابعة والتوجيه الأكاديمي الخاصة بك! 🌟\nهذه الغرفة تجمعك مباشرة بمعلمي ومشرفي المنصة المعتمدين لمتابعة مستواك الدراسي، الإجابة عن أي استفسار يصعب عليك في أي مادة، ومساعدتك لتحقيق المركز الأول في الشهادة الإعدادية بإذن الله. اكتب سؤالك هنا وسيقوم المعلمون والمشرفون بالرد عليك فعلياً.`,
        createdAt: new Date().toISOString(),
        isRead: true,
      },
    ];

    all[studentId] = initialWelcome;
    storageEngine.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, all);
    return initialWelcome;
  }

  public sendStudentGroupMessage(
    studentId: string,
    msg: Omit<StudentGroupMessage, 'id' | 'createdAt'>
  ): StudentGroupMessage {
    const all = storageEngine.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    const room = all[studentId] || this.getStudentGroupMessages(studentId);

    const newMsg: StudentGroupMessage = {
      ...msg,
      id: `gm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    room.push(newMsg);
    all[studentId] = room;
    storageEngine.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, all);

    sbSendStudentGroupMessage(studentId, msg.text, msg.attachmentUrl).catch(() => {});

    // Also sync to TeacherMessage inbox so supervisor/teachers see it
    if (msg.senderRole === 'student') {
      const allMsgs = storageEngine.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
      const teacherMsg: TeacherMessage = {
        id: `tmsg-${newMsg.id}`,
        fromId: studentId,
        fromName: msg.senderName,
        fromRole: 'student',
        toId: 'usr-admin-1',
        toName: 'المشرف الأكاديمي',
        text: `[جروب المتابعة الأكاديمية] ${msg.text}`,
        isRead: false,
        createdAt: newMsg.createdAt,
      };
      allMsgs.unshift(teacherMsg);
      if (allMsgs.length > 500) allMsgs.splice(500);
      storageEngine.set(STORAGE_KEYS.TEACHER_MESSAGES, allMsgs);
    }

    storageEngine.notifyDataChanged();
    return newMsg;
  }

  // ============================================================
  // 5. GAMIFICATION & PERSONAL PRODUCTIVITY
  // ============================================================

  public getStreak(studentId: string): DailyStreak {
    const all = storageEngine.get<DailyStreak[]>(STORAGE_KEYS.DAILY_STREAK, []);
    return all.find((s) => s.studentId === studentId) ?? {
      studentId, currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalActiveDays: 0,
    };
  }

  public updateStreak(studentId: string): DailyStreak {
    const all = storageEngine.get<DailyStreak[]>(STORAGE_KEYS.DAILY_STREAK, []);
    const today = new Date().toISOString().split('T')[0];
    const existing = all.find((s) => s.studentId === studentId);
    if (!existing) {
      const newS: DailyStreak = { studentId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, totalActiveDays: 1 };
      storageEngine.set(STORAGE_KEYS.DAILY_STREAK, [...all, newS]);
      sbUpsertStreak(newS).catch(() => {});
      storageEngine.notifyDataChanged();
      return newS;
    }
    if (existing.lastActiveDate === today) return existing;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const consecutive = existing.lastActiveDate === yStr;
    const newCurrent = consecutive ? existing.currentStreak + 1 : 1;
    const updated: DailyStreak = { ...existing, currentStreak: newCurrent, longestStreak: Math.max(existing.longestStreak, newCurrent), lastActiveDate: today, totalActiveDays: existing.totalActiveDays + 1 };
    storageEngine.set(STORAGE_KEYS.DAILY_STREAK, all.map((s) => s.studentId === studentId ? updated : s));
    sbUpsertStreak(updated).catch(() => {});
    storageEngine.notifyDataChanged();
    return updated;
  }

  public getBadges(studentId: string): StudentBadge[] {
    return storageEngine.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []).filter((b) => b.studentId === studentId);
  }

  public awardBadge(studentId: string, badgeType: BadgeType): StudentBadge | null {
    const all = storageEngine.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []);
    if (all.some((b) => b.studentId === studentId && b.badgeType === badgeType)) return null;
    const badge: StudentBadge = { id: generateUUID(), studentId, badgeType, earnedAt: new Date().toISOString(), isNew: true };
    storageEngine.set(STORAGE_KEYS.STUDENT_BADGES, [...all, badge]);
    sbAwardBadge(studentId, badgeType).catch(() => {});
    storageEngine.notifyDataChanged();
    return badge;
  }

  public markBadgeSeen(badgeId: string): void {
    const all = storageEngine.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []);
    storageEngine.set(STORAGE_KEYS.STUDENT_BADGES, all.map((b) => b.id === badgeId ? { ...b, isNew: false } : b));
    storageEngine.notifyDataChanged();
  }

  public getGoals(studentId: string): StudentGoal[] {
    return storageEngine.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []).filter((g) => g.studentId === studentId);
  }

  public saveGoal(goal: StudentGoal): void {
    const all = storageEngine.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []);
    const idx = all.findIndex((g) => g.id === goal.id);
    storageEngine.set(STORAGE_KEYS.STUDENT_GOALS, idx >= 0 ? all.map((g) => g.id === goal.id ? goal : g) : [...all, goal]);
    sbSaveGoal(goal).catch(() => {});
    storageEngine.notifyDataChanged();
  }

  public deleteGoal(goalId: string): void {
    storageEngine.set(STORAGE_KEYS.STUDENT_GOALS, storageEngine.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []).filter((g) => g.id !== goalId));
    storageEngine.notifyDataChanged();
  }

  public getFlashcards(subjectId?: string, lessonId?: string): Flashcard[] {
    const all = storageEngine.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, INITIAL_FLASHCARDS);
    let filtered = all;
    if (subjectId) filtered = filtered.filter((f) => f.subjectId === subjectId);
    if (lessonId && lessonId !== 'all') filtered = filtered.filter((f) => f.lessonId === lessonId);
    return filtered;
  }

  public saveFlashcard(card: Flashcard): void {
    const all = storageEngine.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []);
    const idx = all.findIndex((f) => f.id === card.id);
    storageEngine.set(STORAGE_KEYS.FLASHCARDS, idx >= 0 ? all.map((f) => f.id === card.id ? card : f) : [...all, card]);
    const currentUserId = typeof localStorage !== 'undefined' ? (localStorage.getItem('kawkab_current_user_id_v9') || '') : '';
    if (currentUserId) {
      sbSaveFlashcards(currentUserId, [card]).catch(() => {});
    }
    storageEngine.notifyDataChanged();
  }

  public saveFlashcards(cards: Flashcard[]): void {
    const all = storageEngine.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []);
    const newIds = new Set(cards.map((c) => c.id));
    const merged = [...all.filter((c) => !newIds.has(c.id)), ...cards];
    storageEngine.set(STORAGE_KEYS.FLASHCARDS, merged);
    const currentUserId = typeof localStorage !== 'undefined' ? (localStorage.getItem('kawkab_current_user_id_v9') || '') : '';
    if (currentUserId && cards.length > 0) {
      sbSaveFlashcards(currentUserId, cards).catch(() => {});
    }
    storageEngine.notifyDataChanged();
  }

  public deleteFlashcard(cardId: string): void {
    storageEngine.set(STORAGE_KEYS.FLASHCARDS, storageEngine.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []).filter((f) => f.id !== cardId));
    sbDeleteFlashcard(cardId).catch(() => {});
    storageEngine.notifyDataChanged();
  }

  public getStudentSchedule(studentId: string): StudentScheduleSlot[] {
    const all = storageEngine.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []);
    return all.filter((s) => s.studentId === studentId && s.studentId !== 'default');
  }

  public saveStudentScheduleSlot(slot: Omit<StudentScheduleSlot, 'id' | 'createdAt'> & { id?: string }): StudentScheduleSlot {
    const all = storageEngine.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []).filter((s) => s.studentId !== 'default');
    let savedSlot: StudentScheduleSlot;
    if (slot.id) {
      const idx = all.findIndex((s) => s.id === slot.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...slot } as StudentScheduleSlot;
        savedSlot = all[idx];
      } else {
        savedSlot = {
          ...slot,
          id: slot.id,
          createdAt: new Date().toISOString(),
        } as StudentScheduleSlot;
        all.push(savedSlot);
      }
    } else {
      savedSlot = {
        ...slot,
        id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      all.push(savedSlot);
    }
    storageEngine.set(STORAGE_KEYS.STUDENT_SCHEDULE, all);
    const studentSlots = all.filter((s) => s.studentId === savedSlot.studentId);
    sbSaveStudentSchedule(savedSlot.studentId, studentSlots).catch(() => {});
    storageEngine.notifyDataChanged();
    return savedSlot;
  }

  public deleteStudentScheduleSlot(slotId: string): void {
    const all = storageEngine.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []).filter((s) => s.studentId !== 'default');
    const target = all.find((s) => s.id === slotId);
    const filtered = all.filter((s) => s.id !== slotId);
    storageEngine.set(STORAGE_KEYS.STUDENT_SCHEDULE, filtered);
    if (target?.studentId) {
      const studentSlots = filtered.filter((s) => s.studentId === target.studentId);
      sbSaveStudentSchedule(target.studentId, studentSlots).catch(() => {});
    }
    storageEngine.notifyDataChanged();
  }

  public getStudentTasks(studentId: string): StudentTask[] {
    const all = storageEngine.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []);
    return all.filter((t) => t.studentId === studentId && t.studentId !== 'default');
  }

  public saveStudentTask(task: Omit<StudentTask, 'id' | 'createdAt' | 'completed'> & { id?: string; completed?: boolean }): StudentTask {
    const all = storageEngine.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.studentId !== 'default');
    let savedTask: StudentTask;
    if (task.id) {
      const idx = all.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...task } as StudentTask;
        savedTask = all[idx];
      } else {
        savedTask = {
          ...task,
          id: task.id,
          completed: task.completed ?? false,
          createdAt: new Date().toISOString(),
        } as StudentTask;
        all.unshift(savedTask);
      }
    } else {
      savedTask = {
        ...task,
        completed: task.completed ?? false,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      all.unshift(savedTask);
    }
    storageEngine.set(STORAGE_KEYS.STUDENT_TASKS, all);
    const studentTasks = all.filter((t) => t.studentId === savedTask.studentId);
    sbSaveStudentTasks(savedTask.studentId, studentTasks).catch(() => {});
    storageEngine.notifyDataChanged();
    return savedTask;
  }

  public toggleStudentTask(taskId: string): boolean {
    const all = storageEngine.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.studentId !== 'default');
    const task = all.find((t) => t.id === taskId);
    if (!task) return false;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : undefined;
    storageEngine.set(STORAGE_KEYS.STUDENT_TASKS, all);
    const studentTasks = all.filter((t) => t.studentId === task.studentId);
    sbSaveStudentTasks(task.studentId, studentTasks).catch(() => {});
    storageEngine.notifyDataChanged();
    return task.completed;
  }

  public deleteStudentTask(taskId: string): void {
    const all = storageEngine.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.studentId !== 'default');
    const target = all.find((t) => t.id === taskId);
    const filtered = all.filter((t) => t.id !== taskId);
    storageEngine.set(STORAGE_KEYS.STUDENT_TASKS, filtered);
    if (target?.studentId) {
      const studentTasks = filtered.filter((t) => t.studentId === target.studentId);
      sbSaveStudentTasks(target.studentId, studentTasks).catch(() => {});
    }
    storageEngine.notifyDataChanged();
  }
}

export const socialService = new SocialService();
