import {
  UserProfile,
  Subject,
  Unit,
  Lesson,
  LessonNote,
  LessonProgress,
  Examination,
  Question,
  ExamAttempt,
  StudentAnswer,
  Certificate,
  SubscriptionPlan,
  SubscriptionRequest,
  LiveChallenge,
  Notification,
  Announcement,
  AuditLog,
  RoboMessage,
  RoboConversation,
  TeacherAssignment,
  LeaderboardEntry,
  ContactSettings,
  UserEducationalStats,
  TeacherHomework,
  TeacherMessage,
  TeacherScheduleSlot,
  AttendanceRecord,
  DailyStreak,
  BadgeType,
  StudentBadge,
  StudentGoal,
  Flashcard,
  StudentGroupMessage,
  StudentScheduleSlot,
  StudentTask,
} from '../types';

// Supabase sync — fire-and-forget helpers imported lazily to avoid circular deps
import {
  sbMarkLessonComplete,
  sbSaveAttempt,
  sbSubmitAndGradeExamAttempt,
  sbSaveCertificate,
  sbRevokeCertificate,
  sbUpsertChallenge,
  sbMarkNotificationRead,
  sbInsertNotification,
  sbSaveSubscriptionRequest,
  sbUpdateSubscriptionRequest,
  sbUpsertStreak,
  sbAwardBadge,
  sbSaveGoal,
  sbSaveFlashcards,
  sbDeleteFlashcard,
  sbSaveConversation,
  sbSendStudentGroupMessage,
  sbSaveLessonToCloud,
  sbDeleteLesson,
  sbSaveSubject,
  sbAdminUpdateProfile,
} from './supabaseDb';
import { syncQueue } from './syncQueue';

// ==============================================================================
// UUID GENERATOR — browser-native, no external dependency
// Always generates RFC-4122 v4 UUIDs compatible with Supabase UUID columns
// ==============================================================================
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID() as string;
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


// Storage keys - Version 9: Enhanced production database with complete teacher and curriculum seed data
const STORAGE_KEYS = {
  VERSION: 'kawkab_db_version_v9',
  USERS: 'kawkab_users_v9',
  SUBJECTS: 'kawkab_subjects_v9',
  UNITS: 'kawkab_units_v9',
  LESSONS: 'kawkab_lessons_v9',
  NOTES: 'kawkab_notes_v9',
  PROGRESS: 'kawkab_progress_v9',
  EXAMS: 'kawkab_exams_v9',
  QUESTIONS: 'kawkab_questions_v9',
  ATTEMPTS: 'kawkab_attempts_v9',
  CERTIFICATES: 'kawkab_certificates_v9',
  PLANS: 'kawkab_plans_v9',
  REQUESTS: 'kawkab_requests_v9',
  CHALLENGES: 'kawkab_challenges_v9',
  NOTIFICATIONS: 'kawkab_notifications_v9',
  ANNOUNCEMENTS: 'kawkab_announcements_v9',
  AUDIT_LOGS: 'kawkab_audit_logs_v9',
  ROBO_MESSAGES: 'kawkab_robo_messages_v9',
  ROBO_CONVERSATIONS: 'kawkab_robo_conversations_v1',
  TEACHER_ASSIGNMENTS: 'kawkab_teacher_assignments_v9',
  CONTACT_SETTINGS: 'kawkab_contact_settings_v10',
  TEACHER_HOMEWORKS: 'kawkab_teacher_homeworks_v1',
  TEACHER_MESSAGES: 'kawkab_teacher_messages_v1',
  TEACHER_SCHEDULE: 'kawkab_teacher_schedule_v1',
  TEACHER_ATTENDANCE: 'kawkab_teacher_attendance_v1',
  DAILY_STREAK: 'kawkab_daily_streak_v1',
  STUDENT_BADGES: 'kawkab_student_badges_v1',
  STUDENT_GOALS: 'kawkab_student_goals_v1',
  FLASHCARDS: 'kawkab_flashcards_v1',
  STUDENT_GROUP_CHATS: 'kawkab_student_group_chats_v1',
  STUDENT_SCHEDULE: 'kawkab_student_schedule_v1',
  STUDENT_TASKS: 'kawkab_student_tasks_v1',
  DELETED_USER_IDS: 'kawkab_deleted_user_ids_v1',
};

// ==============================================================================
// 1. OFFICIAL USER PROFILES (Admin, Teacher, and Students)
// ==============================================================================
const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'admin-1',
    email: '2ndprepplanet@gmail.com',
    password: '06062012@Mostafa',
    fullName: 'مصطفى عثمان (الإدارة)',
    role: 'admin',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'الإدارة العامة لمنصة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'teacher-1',
    email: 'teacher@kawkab.com',
    password: '06062012',
    fullName: 'أ/ مصطفى عثمان (المعلم والمشرف)',
    role: 'teacher',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'مدرسة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-15T08:00:00Z',
  },
  {
    id: 'student-1',
    email: 'mostafaosman06062012@gmail.com',
    password: '06062012',
    fullName: 'مصطفى عثمان',
    role: 'student',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'مدرسة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-09-01T10:00:00Z',
  },
];

// ==============================================================================
// 2. THE OFFICIAL SCHOOL SUBJECTS (Reference Screenshot 2026-10-15 184127.png)
// ==============================================================================
const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-arabic',
    slug: 'arabic',
    nameAr: 'اللغة العربية',
    description: 'شرح فروع النحو، القراءة، النصوص الأدبية، والقصة المقررة.',
    icon: 'Feather',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: 'sub-math',
    slug: 'mathematics',
    nameAr: 'الرياضيات',
    description: 'الجبر والإحصاء، وحساب المثلثات والهندسة التحليلية.',
    icon: 'Calculator',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: 'sub-science',
    slug: 'science',
    nameAr: 'العلوم',
    description: 'القوى والحركة، الطاقة الضوئية، الكون، والتكاثر واستمرار النوع.',
    icon: 'FlaskConical',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 3,
    isPublished: true,
  },
  {
    id: 'sub-religion',
    slug: 'islamic-studies',
    nameAr: 'التربية الدينية',
    description: 'القرآن الكريم، العقيدة، العبادات، والشخصيات الإسلامية.',
    icon: 'Moon',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 4,
    isPublished: true,
  },
  {
    id: 'sub-art',
    slug: 'art-education',
    nameAr: 'التربية الفنية',
    description: 'التراث الشعبي والقبطي، والتصميم الابتكاري والأشغال الفنية.',
    icon: 'Palette',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 5,
    isPublished: true,
  },
  {
    id: 'sub-math-en',
    slug: 'math',
    nameAr: 'Math',
    description: 'Algebra, Statistics, Trigonometry and Analytical Geometry.',
    icon: 'Calculator',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 6,
    isPublished: true,
  },
  {
    id: 'sub-english',
    slug: 'english',
    nameAr: 'اللغة الإنجليزية',
    description: 'منهج New Hello! Prep 3: القواعد والكلمات والمحادثات.',
    icon: 'Languages',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 7,
    isPublished: true,
  },
  {
    id: 'sub-social',
    slug: 'social-studies',
    nameAr: 'الدراسات الاجتماعية',
    description: 'جغرافية العالم الطبيعية وتاريخ مصر الحديث والمعاصر.',
    icon: 'Globe',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 8,
    isPublished: true,
  },
  {
    id: 'sub-computer',
    slug: 'computer-it',
    nameAr: 'الحاسب وتكنولوجيا المعلومات',
    description: 'حل المشكلات وخرائط التدفق ولغة البرمجة Visual Basic.NET.',
    icon: 'Cpu',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 9,
    isPublished: true,
  },
  {
    id: 'sub-science-en',
    slug: 'science-en',
    nameAr: 'Science',
    description: 'Motion, Light energy, Universe, and Reproduction.',
    icon: 'Atom',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 10,
    isPublished: true,
  },
];

// ==============================================================================
// 3. CURRICULUM UNITS
// ==============================================================================
const INITIAL_UNITS: Unit[] = [
  {
    id: 'unit-ar-1',
    subjectId: 'sub-arabic',
    title: 'الوحدة الأولى: المشتقات وأعمالها الأدبية',
    orderIndex: 1,
    description: 'اسم الفاعل وصوغه، صيغ المبالغة، واسم المفعول وفق المنهج الوزاري المصري.',
  },
  {
    id: 'unit-sc-1',
    subjectId: 'sub-science',
    title: 'الوحدة الأولى: القوى والحركة',
    orderIndex: 1,
    description: 'الحركة في اتجاه واحد، السرعة القياسية والمتجهة، التمثيل البياني للعجلة المنتظمة.',
  },
  {
    id: 'unit-ma-1',
    subjectId: 'sub-math',
    title: 'الوحدة الأولى: العلاقات والدوال',
    orderIndex: 1,
    description: 'حاصل الضرب الديكارتي، العلاقات والدوال، ودوال كثيرات الحدود.',
  },
];

// ==============================================================================
// 4. LESSONS (Official Curriculum Samples)
// ==============================================================================
const INITIAL_LESSONS: Lesson[] = [
  {
    id: 'les-arabic-1',
    unitId: 'unit-ar-1',
    subjectId: 'sub-arabic',
    title: 'اسم الفاعل وصوغه وإعماله',
    orderIndex: 1,
    teacherName: 'أ/ مصطفى عثمان',
    summary: 'شرح طريقة صوغ اسم الفاعل من الثلاثي وغير الثلاثي وشروط إعماله عمل فعله مع أمثلة إعرابية كاملة.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">مفهوم اسم الفاعل:</h3>
      <p class="text-sm leading-relaxed text-slate-200">اسم الفاعل هو اسم مشتق من حروف الفعل المبني للمعلوم ليدل على من قام بالفعل أو اتصف به.</p>
      <h4 class="text-sm font-bold text-amber-300">أولاً: صوغه من الثلاثي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">يُصاغ على وزن «فَاعِل» مثل: (كتب ➔ كاتب)، (جلس ➔ جالس). وإذا كان أجوف قلبت عينه همزة: (قال ➔ قائل)، (صام ➔ صائم).</p>
      <h4 class="text-sm font-bold text-purple-300">ثانياً: صوغه من غير الثلاثي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">يأتي على وزن مضارعه مع إبدال حرف المضارعة ميماً مضمومة وكسر ما قبل الآخر مثل: (انطلق ➔ يَنطَلِق ➔ مُنطَلِق)، (أكرم ➔ يُكرِم ➔ مُكرِم).</p>
      <h4 class="text-sm font-bold text-emerald-300">شروط الإعمال:</h4>
      <p class="text-sm leading-relaxed text-slate-300">المحلى بـ (أل) يعمل بلا شروط. أما المجرد منها فيشترط دلالته على الحال أو الاستقبال وأن يعتمد على: نفي، استفهام، مبتدأ، موصوف، أو نداء.</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    pdfUrl: 'https://example.com/arabic-lesson-1.pdf',
    durationMinutes: 25,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-science-1',
    unitId: 'unit-sc-1',
    subjectId: 'sub-science',
    title: 'الحركة في اتجاه واحد والسرعة المنتظمة',
    orderIndex: 1,
    teacherName: 'أ/ محمد محمود',
    summary: 'مفهوم السرعة وعواملها، والفرق الدقيق بين السرعة المنتظمة والسرعة المتوسطة والنسبية.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">ما هي الحركة؟</h3>
      <p class="text-sm leading-relaxed text-slate-200">الحركة هي تغير موضع الجسم بمرور الزمن بالنسبة لموضع جسم آخر ثابت. وأبسط أنواع الحركة هي الحركة في اتجاه واحد وفي خط مستقيم مثل حركة القطار.</p>
      <h4 class="text-sm font-bold text-amber-300">قانون السرعة الأساسي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">السرعة (ع) = المسافة (ف) ÷ الزمن (ز). وتقاس بوحدة (متر / ثانية) أو (كم / ساعة).</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    pdfUrl: 'https://example.com/science-lesson-1.pdf',
    durationMinutes: 20,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-math-1',
    unitId: 'unit-ma-1',
    subjectId: 'sub-math',
    title: 'حاصل الضرب الديكارتي',
    orderIndex: 1,
    teacherName: 'أ/ طارق أحمد',
    summary: 'الزوج المرتب وتساوي زوجين مرتبين، وحاصل الضرب الديكارتي لمجموعتين س × ص وتمثيله بالمخطط السهمي والبياني.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">الزوج المرتب:</h3>
      <p class="text-sm leading-relaxed text-slate-200">الزوج المرتب (أ ، ب) يتكون من مسقط أول (أ) ومسقط ثانٍ (ب). ويختلف عن المجموعة {أ ، ب} حيث الترتيب هام جداً.</p>
      <h4 class="text-sm font-bold text-amber-300">قاعدة التساوي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">إذا كان (أ ، ب) = (س ، ص) فإن: أ = س ، وَ ب = ص.</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    pdfUrl: 'https://example.com/math-lesson-1.pdf',
    durationMinutes: 30,
    isFreePreview: true,
    isPublished: true,
  },
];

// ==============================================================================
// 5. EXAMINATIONS
// ==============================================================================
const INITIAL_EXAMINATIONS: Examination[] = [
  {
    id: 'exam-arabic-1',
    subjectId: 'sub-arabic',
    subjectName: 'اللغة العربية',
    unitId: 'unit-ar-1',
    title: 'اختبار الوحدة الأولى: النحو وقواعد اسم الفاعل',
    description: 'اختبار وزاري شامل يحتوي على أسئلة موضوعية وأسئلة مقالية للمراجعة والتصحيح الأكاديمي.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    antiCheatingTabSwitch: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'exam-science-1',
    subjectId: 'sub-science',
    subjectName: 'العلوم',
    unitId: 'unit-sc-1',
    title: 'اختبار شامل: القوى والحركة والسرعة',
    description: 'اختبار تجريبي في مفاهيم السرعة القياسية والمتجهة والعجلة المنتظمة.',
    timeLimitMinutes: 15,
    passingPercentage: 50,
    randomizeQuestions: true,
    randomizeAnswers: true,
    antiCheatingTabSwitch: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'practice',
    createdAt: '2026-09-02T10:00:00Z',
  },
];

// ==============================================================================
// 6. QUESTIONS FOR EXAMINATIONS
// ==============================================================================
const INITIAL_QUESTIONS: Question[] = [];

// ==============================================================================
// 7. SUBSCRIPTION PLANS (Free, Standard, Premium)
// ==============================================================================
const INITIAL_FLASHCARDS: Flashcard[] = [
  // Arabic (les-arabic-1: اسم الفاعل)
  {
    id: 'fc-ar-1',
    subjectId: 'sub-arabic',
    lessonId: 'les-arabic-1',
    front: 'ما هو مفهوم «اسم الفاعل» لغةً واصطلاحاً؟',
    back: 'اسم مشتق من الفعل المبني للمعلوم للدلالة على من قام بالفعل أو اتصف به (مثل: كاتب، صائم، مجتهد).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-ar-2',
    subjectId: 'sub-arabic',
    lessonId: 'les-arabic-1',
    front: 'كيف يُصاغ اسم الفاعل من الفعل الثلاثي معتل الوسط (الأجوف) مثل: قال، باع؟',
    back: 'يُصاغ على وزن «فاعل» وتُقلب عينه همزة مكسورة، فيقال: (قال ➔ قائل)، (باع ➔ بائع).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-ar-3',
    subjectId: 'sub-arabic',
    lessonId: 'les-arabic-1',
    front: 'كيف يصاغ اسم الفاعل من الفعل غير الثلاثي؟',
    back: 'على وزن مضارعه مع إبدال حرف المضارعة ميماً مضمومة وكسر ما قبل الآخر، مثل: (انطلق ➔ يَنطَلِق ➔ مُنطَلِق).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-ar-4',
    subjectId: 'sub-arabic',
    lessonId: 'les-arabic-1',
    front: 'ما شروط عمل اسم الفاعل المجرد من (أل)؟',
    back: '1- أن يدل على الحال أو الاستقبال.\n2- أن يعتمد على: نفي، استفهام، مبتدأ، موصوف، أو نداء.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // Science (les-science-1: الحركة في اتجاه واحد والسرعة المنتظمة)
  {
    id: 'fc-sc-1',
    subjectId: 'sub-science',
    lessonId: 'les-science-1',
    front: 'ما هو تعريف «الحركة» في مادة العلوم؟',
    back: 'تغير موضع الجسم بمرور الزمن بالنسبة لموضع جسم آخر ثابت (نقطة مرجعية). وأبسط أنواعها الحركة في اتجاه واحد في خط مستقيم.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-sc-2',
    subjectId: 'sub-science',
    lessonId: 'les-science-1',
    front: 'ما هو قانون حساب السرعة (ع) ووحدات قياسها الشائعة؟',
    back: 'السرعة (ع) = المسافة (ف) ÷ الزمن (ز).\nوحدة قياسها: (متر / ثانية) أو (كم / ساعة). للتحويل من كم/س إلى م/ث نضرب في (5 / 18).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-sc-3',
    subjectId: 'sub-science',
    lessonId: 'les-science-1',
    front: 'ما الفرق بين «السرعة المنتظمة» و«السرعة غير المنتظمة»؟',
    back: 'السرعة المنتظمة: يقطع فيها الجسم مسافات متساوية في أزمنة متساوية.\nغير المنتظمة: يقطع مسافات غير متساوية في أزمنة متساوية أو العكس.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-sc-4',
    subjectId: 'sub-science',
    lessonId: 'les-science-1',
    front: 'ما هي «السرعة المتوسطة» (ع¯)؟',
    back: 'المسافة الكلية التي يقطعها الجسم المتحرك مقسومة على الزمن الكلي المستغرق لقطع هذه المسافة: (ع¯ = ف الكلية ÷ ز الكلي).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-sc-5',
    subjectId: 'sub-science',
    lessonId: 'les-science-1',
    front: 'متى تكون السرعة النسبية لجسم متحرك مساوية للصفر؟',
    back: 'عندما يتحرك المراقب في نفس اتجاه حركة الجسم وبنفس سرعته الفعلية بالضبط.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // Math (les-math-1: حاصل الضرب الديكارتي)
  {
    id: 'fc-ma-1',
    subjectId: 'sub-math',
    lessonId: 'les-math-1',
    front: 'ما قاعدة تساوي زوجين مرتبين: (أ ، ب) = (س ، ص)؟',
    back: 'المسقط الأول = المسقط الأول (أ = س)، والمسقط الثاني = المسقط الثاني (ب = ص).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-ma-2',
    subjectId: 'sub-math',
    lessonId: 'les-math-1',
    front: 'إذا كانت س = {1 ، 2} ، وَ ص = {3 ، 4} ، فما هو س × ص؟',
    back: 'س × ص = {(1 ، 3) ، (1 ، 4) ، (2 ، 3) ، (2 ، 4)}.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-ma-3',
    subjectId: 'sub-math',
    lessonId: 'les-math-1',
    front: 'ما العلاقة بين ن(س × ص) وَ ن(س) وَ ن(ص)؟',
    back: 'عدد عناصر س × ص = ن(س) × ن(ص). إذا كان ن(س) = 3 وَ ن(ص) = 2 فإن ن(س × ص) = 6.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // Social Studies (les-social-1: مصر بين المماليك والعثمانيين)
  {
    id: 'fc-so-1',
    subjectId: 'sub-social',
    lessonId: 'les-social-1',
    front: 'ما نتائج معركة مرج دابق عام 1516م؟',
    back: 'هزيمة المماليك ومقتل السلطان قنصوة الغوري، وأصبحت بلاد الشام ولاية عثمانية وانفتح الطريق أمام العثمانيين نحو مصر.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-so-2',
    subjectId: 'sub-social',
    lessonId: 'les-social-1',
    front: 'ما نتائج معركة الريدانية عام 1517م؟',
    back: 'هزيمة المماليك بقيادة طومان باي، دخول العثمانيين القاهرة، انتهاء دولة المماليك، وأصبحت مصر ولاية عثمانية.',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // English (les-english-1: Around Town)
  {
    id: 'fc-en-1',
    subjectId: 'sub-english',
    lessonId: 'les-english-1',
    front: 'What does "botanical gardens" mean in Arabic?',
    back: 'حدائق نباتية (مساحة واسعة تضم نباتات وأشجار نادرة ومميزة يتم دراستها وعرضها للجمهور).',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'fc-en-2',
    subjectId: 'sub-english',
    lessonId: 'les-english-1',
    front: 'Why do we use Present Simple for timetables (buses, trains)?',
    back: 'We use the Present Simple to express future events based on fixed public timetables.\nExample: "The train leaves at 8:15 AM tomorrow."',
    createdBy: 'teacher',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    tier: 'free',
    nameAr: 'الباقة المجانية',
    priceEgp: 0,
    periodDays: 365,
    features: [
      'درس واحد مجاني لكل مادة دراسية',
      'دخول الاختبارات التجريبية',
      'لوحة المتابعة وإحصائيات التعلم',
    ],
    isActive: true,
  },
  {
    id: 'plan-standard',
    tier: 'standard',
    nameAr: 'الباقة القياسية',
    priceEgp: 90,
    periodDays: 30,
    features: [
      'الوصول لجميع الدروس في كافة المواد الـ 8',
      'مشاهدة كافة فيديوهات الشرح المباشرة واليوتيوب',
      'تحميل ملخصات ومذكرات PDF الدراسية',
      'إجراء اختبارات غير محدودة لكل درس ووحدة',
      'حفظ الملاحظات الخاصة لكل درس',
    ],
    isActive: true,
  },
  {
    id: 'plan-premium',
    tier: 'premium',
    nameAr: 'الباقة المميزة',
    priceEgp: 150,
    periodDays: 30,
    features: [
      'جميع مزايا الباقة القياسية كاملة',
      'غرف التحدي المباشر والمنافسة مع الزملاء بالكود',
      'إصدار وتحميل شهادات التقدير الرسمية المعتمدة',
      'المساعد الذكي (روبو) بلا حدود لشرح الأسئلة ومذكرات PDF',
      'أولوية التصحيح السريع بالذكاء الاصطناعي والمعلمين للأسئلة المقالية',
    ],
    isActive: true,
  },
];

// ==============================================================================
// 8. CONTACT & SUPPORT SETTINGS (Reference Screenshot 2026-10-15 183057.png)
// ==============================================================================
const INITIAL_CONTACT_SETTINGS: ContactSettings = {
  whatsappDirectNumber: '01103075485',
  whatsappDirectUrl: 'https://wa.me/201103075485?text=مرحباً%20منصة%20كوكب%20تالتة%20إعدادي',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb79XC0EKyZFm37c5P0R',
  facebookPageUrl: 'https://www.facebook.com/share/1DQc2gf9fs/',
  telegramChannelUrl: 'https://t.me/planet_of_3rd_prep',
  supportEmail: 'support@kawkab.edu.eg',
};

// ==============================================================================
// 9. PLATFORM ANNOUNCEMENTS
// ==============================================================================
const INITIAL_ANNOUNCEMENTS: Announcement[] = [
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

// ==============================================================================
// 10. TEACHER ASSIGNMENTS & INITIAL ATTEMPTS
// ==============================================================================
const INITIAL_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  {
    id: 'ta-1',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: 'sub-arabic',
    subjectName: 'اللغة العربية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-2',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: 'sub-science',
    subjectName: 'العلوم',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-3',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: 'sub-math',
    subjectName: 'الرياضيات',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-4',
    teacherId: 'admin-1',
    teacherName: 'مصطفى عثمان (الإدارة)',
    subjectId: 'sub-arabic',
    subjectName: 'اللغة العربية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
];

const INITIAL_ATTEMPTS: ExamAttempt[] = [];

// ==============================================================================
// LOCAL DATABASE ENGINE IMPLEMENTATION
// ==============================================================================
export class LocalDatabaseEngine {
  constructor() {
    this.ensureInitialized();
    this.purgeMockAndDefaultData();
  }

  // Purge any mock accounts (e.g. Ahmed Alaa) and legacy dummy slots on startup
  private purgeMockAndDefaultData(): void {
    try {
      // 1. Purge mock user
      const rawUsers = this.get<UserProfile[]>(STORAGE_KEYS.USERS, []);
      const cleanUsers = rawUsers.filter(
        (u) => u.id !== 'usr-student-2' && u.email?.toLowerCase() !== 'ahmed.student@gmail.com'
      );
      if (cleanUsers.length !== rawUsers.length) {
        this.set(STORAGE_KEYS.USERS, cleanUsers);
      }

      // 2. Ensure mock user is marked permanently deleted
      const deleted = this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
      if (!deleted.includes('usr-student-2') || !deleted.includes('ahmed.student@gmail.com')) {
        this.set(STORAGE_KEYS.DELETED_USER_IDS, Array.from(new Set([...deleted, 'usr-student-2', 'ahmed.student@gmail.com'])));
      }

      // 3. Purge mock & legacy seed attempts
      const rawAttempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
      const cleanAttempts = rawAttempts.filter(
        (a) => a.studentId !== 'usr-student-2' && a.id !== 'att-seed-2' && a.id !== 'att-seed-1'
      );
      if (cleanAttempts.length !== rawAttempts.length) {
        this.set(STORAGE_KEYS.ATTEMPTS, cleanAttempts);
      }

      // 4. Purge 'default' schedule slots and tasks
      const rawSlots = this.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []);
      const cleanSlots = rawSlots.filter((s) => s.studentId !== 'default');
      if (cleanSlots.length !== rawSlots.length) {
        this.set(STORAGE_KEYS.STUDENT_SCHEDULE, cleanSlots);
      }

      const rawTasks = this.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []);
      const cleanTasks = rawTasks.filter((t) => t.studentId !== 'default');
      if (cleanTasks.length !== rawTasks.length) {
        this.set(STORAGE_KEYS.STUDENT_TASKS, cleanTasks);
      }
    } catch {
      // ignore
    }
  }
  private memoryCache = new Map<string, any>();

  private get<T>(key: string, defaultValue: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        this.memoryCache.set(key, defaultValue);
        return defaultValue;
      }
      const parsed = JSON.parse(item) as T;
      this.memoryCache.set(key, parsed);
      return parsed;
    } catch (e) {
      console.warn(`Failed reading key ${key} from storage:`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    this.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e: any) {
      console.error(`Failed writing key ${key} to storage:`, e);
      // Emergency recovery for QuotaExceededError
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882) {
        try {
          // Remove old legacy bloated keys
          localStorage.removeItem('kawkab_robo_messages_v9');
          localStorage.removeItem('kawkab_robo_messages_v8');
          localStorage.removeItem('kawkab_audit_logs_v9');

          // Clean heavy base64 strings from conversations
          const convs = this.get<any>(STORAGE_KEYS.ROBO_CONVERSATIONS, {});
          if (convs && typeof convs === 'object') {
            Object.keys(convs).forEach((uid) => {
              if (Array.isArray(convs[uid])) {
                convs[uid] = convs[uid].slice(0, 5).map((c: any) => ({
                  ...c,
                  messages: (c.messages || []).slice(-20).map((m: any) => ({
                    ...m,
                    attachmentUrl: m.attachmentUrl && m.attachmentUrl.length > 300 ? undefined : m.attachmentUrl,
                  })),
                }));
              }
            });
            localStorage.setItem(STORAGE_KEYS.ROBO_CONVERSATIONS, JSON.stringify(convs));
          }

          // Retry saving
          localStorage.setItem(key, JSON.stringify(value));
          console.log(`Successfully recovered and saved key ${key} after quota cleanup.`);
        } catch (retryErr) {
          console.warn('Failed emergency quota cleanup:', retryErr);
        }
      }
    }
  }

  public ensureInitialized(): void {
    const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (currentVersion !== 'v9') {
      try {
        // Clear all previous version keys for a clean production database
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('kawkab_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {}
      localStorage.setItem(STORAGE_KEYS.VERSION, 'v9');
    }

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, INITIAL_PROFILES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      this.set(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.UNITS)) {
      this.set(STORAGE_KEYS.UNITS, INITIAL_UNITS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LESSONS)) {
      this.set(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXAMS)) {
      this.set(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
      this.set(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    }
    // Wipe old pre-seeded questions so platform starts completely fresh
    if (!localStorage.getItem('kawkab_questions_clean_slate_v1')) {
      this.set(STORAGE_KEYS.QUESTIONS, []);
      localStorage.setItem('kawkab_questions_clean_slate_v1', 'true');
    }
    if (!localStorage.getItem(STORAGE_KEYS.PLANS)) {
      this.set(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONTACT_SETTINGS)) {
      this.set(STORAGE_KEYS.CONTACT_SETTINGS, INITIAL_CONTACT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) {
      this.set(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEACHER_ASSIGNMENTS)) {
      this.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, INITIAL_TEACHER_ASSIGNMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
      this.set(STORAGE_KEYS.REQUESTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CERTIFICATES)) {
      this.set(STORAGE_KEYS.CERTIFICATES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      this.set(STORAGE_KEYS.NOTIFICATIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      this.set(STORAGE_KEYS.PROGRESS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
      this.set(STORAGE_KEYS.ATTEMPTS, INITIAL_ATTEMPTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      this.set(STORAGE_KEYS.NOTES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHALLENGES)) {
      this.set(STORAGE_KEYS.CHALLENGES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.set(STORAGE_KEYS.AUDIT_LOGS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROBO_MESSAGES)) {
      this.set(STORAGE_KEYS.ROBO_MESSAGES, {});
    }
  }

  public resetToEmptyState(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('kawkab_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
    this.ensureInitialized();
  }

  // --- PROFILES & AUTH ---
  public getProfiles(): UserProfile[] {
    const deletedIds = new Set(this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []));
    deletedIds.add('usr-student-2');
    deletedIds.add('ahmed.student@gmail.com');

    const rawUsers = this.get<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_PROFILES);
    const users = rawUsers.filter(
      (u) => !deletedIds.has(u.id) && !deletedIds.has(u.email.toLowerCase()) && u.id !== 'usr-student-2' && u.email.toLowerCase() !== 'ahmed.student@gmail.com'
    );

    let changed = false;
    for (const initP of INITIAL_PROFILES) {
      if (deletedIds.has(initP.id) || deletedIds.has(initP.email.toLowerCase())) {
        continue;
      }
      if (!users.some((u) => u.id === initP.id || u.email.toLowerCase() === initP.email.toLowerCase())) {
        users.push(initP);
        changed = true;
      }
    }
    if (changed || users.length !== rawUsers.length) {
      this.set(STORAGE_KEYS.USERS, users);
    }
    return users;
  }

  // Multi-device cloud sync: merge real registered profiles from Supabase
  public syncProfilesFromCloud(cloudProfiles: UserProfile[]): void {
    if (!cloudProfiles || cloudProfiles.length === 0) return;
    const deletedIds = new Set(this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []));
    deletedIds.add('usr-student-2');
    deletedIds.add('ahmed.student@gmail.com');

    const current = this.getProfiles();
    let changed = false;

    for (const cp of cloudProfiles) {
      if (deletedIds.has(cp.id) || deletedIds.has(cp.email.toLowerCase())) continue;
      const idx = current.findIndex((u) => u.id === cp.id || u.email.toLowerCase() === cp.email.toLowerCase());
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...cp };
        changed = true;
      } else {
        current.push(cp);
        changed = true;
      }
    }

    if (changed) {
      this.set(STORAGE_KEYS.USERS, current);
    }
  }

  // Multi-device cloud sync: merge all exam attempts from Supabase for live leaderboard
  public syncAttemptsFromCloud(cloudAttempts: ExamAttempt[]): void {
    if (!cloudAttempts || cloudAttempts.length === 0) return;
    const current = this.getExamAttempts();
    const currentIds = new Set(current.map((a) => a.id));
    const toAdd = cloudAttempts.filter((a) => !currentIds.has(a.id) && a.studentId !== 'usr-student-2');
    if (toAdd.length > 0) {
      this.set(STORAGE_KEYS.ATTEMPTS, [...toAdd, ...current]);
    }
  }

  // Multi-device cloud sync: merge subjects from Supabase
  public syncSubjectsFromCloud(cloudSubjects: Subject[]): void {
    if (!cloudSubjects || cloudSubjects.length === 0) return;
    const local = this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const map = new Map<string, Subject>();
    local.forEach((s) => map.set(s.id, s));
    cloudSubjects.forEach((cs) => {
      const existing = map.get(cs.id);
      map.set(cs.id, existing ? { ...existing, ...cs } : cs);
    });
    this.set(STORAGE_KEYS.SUBJECTS, Array.from(map.values()));
  }

  // Multi-device cloud sync: merge lessons from Supabase
  public syncLessonsFromCloud(cloudLessons: Lesson[]): void {
    if (!cloudLessons || cloudLessons.length === 0) return;
    const local = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    const map = new Map<string, Lesson>();
    local.forEach((l) => map.set(l.id, l));
    cloudLessons.forEach((cl) => {
      const existing = map.get(cl.id);
      map.set(cl.id, existing ? { ...existing, ...cl } : cl);
    });
    this.set(STORAGE_KEYS.LESSONS, Array.from(map.values()));
  }

  public getProfileById(id: string): UserProfile | null {
    const users = this.getProfiles();
    return users.find((u) => u.id === id) || null;
  }

  public updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    const users = this.getProfiles();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    this.set(STORAGE_KEYS.USERS, users);
    sbAdminUpdateProfile(id, updates).catch((e) => console.warn('[updateProfile] Cloud sync error:', e));
    return users[index];
  }

  public deleteProfile(id: string): void {
    const target = this.getProfileById(id);
    const deletedIds = this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    const updatedDeleted = Array.from(
      new Set([...deletedIds, id, target?.email.toLowerCase()].filter(Boolean) as string[])
    );
    this.set(STORAGE_KEYS.DELETED_USER_IDS, updatedDeleted);

    const users = this.getProfiles().filter((u) => u.id !== id);
    this.set(STORAGE_KEYS.USERS, users);

    // Also remove any teacher assignments for this user
    const assignments = this.getTeacherAssignments().filter((a) => a.teacherId !== id);
    this.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, assignments);

    // Clean from student group chat registry if applicable
    const chats = this.get<Record<string, any>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    if (chats[id]) {
      delete chats[id];
      this.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, chats);
    }

    if (target) {
      this.logAudit('admin', 'مدير النظام', `حذف حساب المستخدم: ${target.fullName} (${target.role})`, 'profile', id);
    }
  }

  public createProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'aiQuestionsUsedThisMonth'> & { id?: string }): UserProfile {
    const users = this.getProfiles();
    const newProfile: UserProfile = {
      ...profile,
      id: profile.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      aiQuestionsUsedThisMonth: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(newProfile);
    this.set(STORAGE_KEYS.USERS, users);
    this.logAudit(newProfile.id, newProfile.fullName, 'تسجيل مستخدم جديد', 'profile', newProfile.id, { role: newProfile.role });
    return newProfile;
  }

  // --- SUBJECTS ---
  public getSubjects(): Subject[] {
    const subs = this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const units = this.getUnits();
    const lessons = this.getLessons();
    return subs.map((s) => ({
      ...s,
      unitsCount: units.filter((u) => u.subjectId === s.id).length,
      lessonsCount: lessons.filter((l) => l.subjectId === s.id).length,
    })).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getSubjectById(idOrSlug: string): Subject | null {
    const subs = this.getSubjects();
    return subs.find((s) => s.id === idOrSlug || s.slug === idOrSlug) || null;
  }

  public saveSubject(subject: Partial<Subject>): Subject {
    const subs = this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    if (subject.id) {
      const idx = subs.findIndex((s) => s.id === subject.id);
      if (idx !== -1) {
        subs[idx] = { ...subs[idx], ...subject } as Subject;
        this.set(STORAGE_KEYS.SUBJECTS, subs);
      sbSaveSubject(subs[idx]).catch((e) => console.warn('[saveSubject] Cloud sync error:', e));
        return subs[idx];
      }
    }
    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      slug: subject.slug || `sub-${Date.now()}`,
      nameAr: subject.nameAr || 'مادة جديدة',
      description: subject.description || '',
      icon: subject.icon || 'BookOpen',
      colorPrimary: subject.colorPrimary || '#22d3ee',
      colorSecondary: subject.colorSecondary || '#0891b2',
      orderIndex: subs.length + 1,
      isPublished: subject.isPublished ?? true,
    };
    subs.push(newSub);
    this.set(STORAGE_KEYS.SUBJECTS, subs);
    return newSub;
  }

  public deleteSubject(id: string): void {
    const subs = this.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS).filter((s) => s.id !== id);
    this.set(STORAGE_KEYS.SUBJECTS, subs);
  }

  // --- UNITS & LESSONS ---
  public getUnits(subjectId?: string): Unit[] {
    const units = this.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
    if (subjectId) {
      return units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return units.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public saveUnit(unit: Partial<Unit>): Unit {
    const units = this.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
    if (unit.id) {
      const idx = units.findIndex((u) => u.id === unit.id);
      if (idx !== -1) {
        units[idx] = { ...units[idx], ...unit } as Unit;
        this.set(STORAGE_KEYS.UNITS, units);
        return units[idx];
      }
    }
    const newUnit: Unit = {
      id: `unit-${Date.now()}`,
      subjectId: unit.subjectId || '',
      title: unit.title || 'وحدة جديدة',
      orderIndex: units.length + 1,
      description: unit.description,
    };
    units.push(newUnit);
    this.set(STORAGE_KEYS.UNITS, units);
    return newUnit;
  }

  public deleteUnit(id: string): void {
    const units = this.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS).filter((u) => u.id !== id);
    this.set(STORAGE_KEYS.UNITS, units);
  }

  public getLessons(subjectId?: string, unitId?: string): Lesson[] {
    let lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    if (subjectId) lessons = lessons.filter((l) => l.subjectId === subjectId);
    if (unitId) lessons = lessons.filter((l) => l.unitId === unitId);
    return lessons.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getLessonById(id: string): Lesson | null {
    const lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    return lessons.find((l) => l.id === id) || null;
  }

  public saveLesson(lesson: Partial<Lesson>): Lesson {
    const lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    if (lesson.id) {
      const idx = lessons.findIndex((l) => l.id === lesson.id);
      if (idx !== -1) {
        lessons[idx] = { ...lessons[idx], ...lesson } as Lesson;
        this.set(STORAGE_KEYS.LESSONS, lessons);
        sbSaveLessonToCloud(lessons[idx]).catch((e) => console.warn('[saveLesson] Cloud sync error:', e));
        return lessons[idx];
      }
    }
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      unitId: lesson.unitId || '',
      subjectId: lesson.subjectId || '',
      title: lesson.title || 'درس جديد',
      teacherName: lesson.teacherName || 'أستاذ المادة',
      orderIndex: lessons.length + 1,
      contentHtml: lesson.contentHtml || '',
      summary: lesson.summary,
      videoUrl: lesson.videoUrl,
      videoType: lesson.videoType || 'youtube',
      pdfUrl: lesson.pdfUrl,
      images: lesson.images || [],
      durationMinutes: lesson.durationMinutes || 20,
      isFreePreview: lesson.isFreePreview ?? false,
      isPublished: lesson.isPublished ?? true,
    };
    lessons.push(newLesson);
    this.set(STORAGE_KEYS.LESSONS, lessons);
    sbSaveLessonToCloud(newLesson).catch((e) => console.warn('[saveLesson] Cloud sync error:', e));
    return newLesson;
  }

  public deleteLesson(id: string): void {
    const lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS).filter((l) => l.id !== id);
    this.set(STORAGE_KEYS.LESSONS, lessons);
    sbDeleteLesson(id).catch((e) => console.warn('[deleteLesson] Cloud sync error:', e));
  }

  // --- PROGRESS & NOTES ---
  public getLessonProgress(studentId: string, lessonId?: string): LessonProgress[] {
    const list = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    if (lessonId) {
      return list.filter((p) => p.studentId === studentId && p.lessonId === lessonId);
    }
    return list.filter((p) => p.studentId === studentId);
  }

  public isLessonCompleted(lessonId: string, studentId: string): boolean {
    const list = this.getLessonProgress(studentId, lessonId);
    return list.some((p) => p.completed);
  }

  public completeLesson(lessonId: string, studentId: string): void {
    const list = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const existing = list.find((p) => p.studentId === studentId && p.lessonId === lessonId);
    if (existing) {
      existing.completed = true;
      existing.completedAt = new Date().toISOString();
    } else {
      list.push({
        id: `prog-${Date.now()}`,
        studentId,
        lessonId,
        completed: true,
        completedAt: new Date().toISOString(),
      });
    }
    this.set(STORAGE_KEYS.PROGRESS, list);
  }

  public markLessonComplete(studentId: string, lessonId: string): LessonProgress {
    this.completeLesson(lessonId, studentId);
    const list = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    // Supabase sync (fire-and-forget)
    sbMarkLessonComplete(studentId, lessonId).catch(() => {});
    return list.find((p) => p.studentId === studentId && p.lessonId === lessonId)!;
  }

  public getUserStats(userId: string): UserEducationalStats {
    const allLessons = this.getLessons();
    const totalLessons = allLessons.length;
    const progress = this.getLessonProgress(userId);
    const completedLessons = progress.filter((p) => p.completed).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const attempts = this.getExamAttempts().filter((a) => a.studentId === userId && a.status === 'graded');
    const passedExams = attempts.filter((a) => a.passed).length;
    const avgScore = attempts.length > 0
      ? attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length
      : 0;

    const certs = this.getCertificates(userId).filter((c) => !c.isRevoked).length;
    const challenges = this.getChallenges().filter((c) => c.winnerId === userId).length;

    // Approved system points formula:
    // +25 pts per completed lesson
    // +50 pts per certificate earned
    // +30 pts per challenge duel won
    // + (avgScore * 10) pts for exam achievement
    const points = Math.round(
      (avgScore * 10) + (completedLessons * 25) + (certs * 50) + (challenges * 30)
    );

    return {
      points,
      completedLessonsCount: completedLessons,
      totalLessonsCount: totalLessons,
      progressPercentage: progressPercent,
      passedExamsCount: passedExams,
      certificatesCount: certs,
      challengesWonCount: challenges,
    };
  }

  public getLessonNote(lessonId: string, studentId: string): LessonNote | null {
    const notes = this.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    return notes.find((n) => n.lessonId === lessonId && n.studentId === studentId) || null;
  }

  public saveLessonNote(lessonId: string, studentId: string, content: string): LessonNote {
    const notes = this.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    const idx = notes.findIndex((n) => n.lessonId === lessonId && n.studentId === studentId);
    if (idx !== -1) {
      notes[idx].content = content;
      notes[idx].updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.NOTES, notes);
      return notes[idx];
    }
    const newNote: LessonNote = {
      id: `note-${Date.now()}`,
      lessonId,
      studentId,
      content,
      updatedAt: new Date().toISOString(),
    };
    notes.push(newNote);
    this.set(STORAGE_KEYS.NOTES, notes);
    return newNote;
  }

  // --- EXAMINATIONS & QUESTIONS ---
  public getExaminations(subjectId?: string): Examination[] {
    const exams = this.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    const questions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    const filtered = subjectId ? exams.filter((e) => e.subjectId === subjectId) : exams;
    return filtered.map((e) => ({
      ...e,
      questions: questions.filter((q) => q.examId === e.id),
    }));
  }

  public getExaminationById(id: string): Examination | null {
    const exams = this.getExaminations();
    return exams.find((e) => e.id === id) || null;
  }

  public saveExamination(exam: Partial<Examination>): Examination {
    const exams = this.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    if (exam.id) {
      const idx = exams.findIndex((e) => e.id === exam.id);
      if (idx !== -1) {
        exams[idx] = { ...exams[idx], ...exam } as Examination;
        this.set(STORAGE_KEYS.EXAMS, exams);
        return exams[idx];
      }
    }
    const newExam: Examination = {
      id: `exam-${Date.now()}`,
      subjectId: exam.subjectId || '',
      unitId: exam.unitId,
      title: exam.title || 'امتحان جديد',
      description: exam.description || '',
      timeLimitMinutes: exam.timeLimitMinutes || 20,
      passingPercentage: exam.passingPercentage || 50,
      randomizeQuestions: exam.randomizeQuestions ?? true,
      randomizeAnswers: exam.randomizeAnswers ?? true,
      antiCheatingTabSwitch: exam.antiCheatingTabSwitch ?? true,
      maxAttempts: exam.maxAttempts || 3,
      isPublished: exam.isPublished ?? true,
      allowsCertificate: exam.allowsCertificate ?? true,
      examType: exam.examType || 'official',
      createdAt: new Date().toISOString(),
    };
    exams.push(newExam);
    this.set(STORAGE_KEYS.EXAMS, exams);
    return newExam;
  }

  public deleteExamination(id: string): void {
    const exams = this.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS).filter((e) => e.id !== id);
    this.set(STORAGE_KEYS.EXAMS, exams);
  }

  public getQuestionsByExam(examId: string): Question[] {
    const questions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    return questions.filter((q) => q.examId === examId).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public saveQuestion(question: Partial<Question>): Question {
    const questions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    if (question.id) {
      const idx = questions.findIndex((q) => q.id === question.id);
      if (idx !== -1) {
        questions[idx] = { ...questions[idx], ...question } as Question;
        this.set(STORAGE_KEYS.QUESTIONS, questions);
        return questions[idx];
      }
    }
    const newQ: Question = {
      id: `q-${Date.now()}`,
      examId: question.examId || '',
      questionText: question.questionText || '',
      questionType: question.questionType || 'mcq',
      points: question.points || 1.0,
      orderIndex: questions.length + 1,
      explanation: question.explanation,
      modelAnswer: question.modelAnswer,
      choices: question.choices || [],
    };
    questions.push(newQ);
    this.set(STORAGE_KEYS.QUESTIONS, questions);
    return newQ;
  }

  public deleteQuestion(id: string): void {
    const questions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS).filter((q) => q.id !== id);
    this.set(STORAGE_KEYS.QUESTIONS, questions);
  }

  public clearAllQuestions(): void {
    this.set(STORAGE_KEYS.QUESTIONS, []);
  }

  // --- EXAM ATTEMPTS & BACKEND GRADING ---
  public getExamAttempts(studentId?: string, examId?: string): ExamAttempt[] {
    let attempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    if (studentId) attempts = attempts.filter((a) => a.studentId === studentId);
    if (examId) attempts = attempts.filter((a) => a.examId === examId);
    return attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public getAttemptById(attemptId: string): ExamAttempt | null {
    const attempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    return attempts.find((a) => a.id === attemptId) || null;
  }

  public submitExamAttempt(
    examId: string,
    studentId: string,
    rawAnswers: Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>,
    timeSpentSeconds: number,
    violationCount: number,
    violationLogs: Array<{ timestamp: string; type: string; details: string }>
  ): ExamAttempt {
    const exam = this.getExaminationById(examId);
    if (!exam) throw new Error('الامتحان غير موجود');

    const questions = this.getQuestionsByExam(examId);
    const student = this.getProfileById(studentId);
    const attemptId = generateUUID();

    let autoScore = 0;
    let maxScore = 0;
    let hasEssayQuestions = false;
    const studentAnswersMap: Record<string, StudentAnswer> = {};

    questions.forEach((q) => {
      maxScore += Number(q.points);
      const studentInput = rawAnswers[q.id];

      if (q.questionType === 'mcq' || q.questionType === 'true_false') {
        const selectedId = studentInput?.selectedChoiceId;
        const correctChoice = q.choices?.find((c) => c.isCorrect);
        const isRight = Boolean(selectedId && correctChoice && selectedId === correctChoice.id);
        const awarded = isRight ? Number(q.points) : 0;
        autoScore += awarded;

        studentAnswersMap[q.id] = {
          id: `ans-${Date.now()}-${q.id}`,
          attemptId,
          questionId: q.id,
          selectedChoiceId: selectedId,
          scoreAwarded: awarded,
        };
      } else if (q.questionType === 'fill_blank') {
        const studentText = (studentInput?.essayAnswerText || '').trim();
        const normalize = (t: string) =>
          (t || '')
            .trim()
            .toLowerCase()
            .replace(/[أإآء]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[\u064B-\u065F\u0670]/g, '')
            .replace(/\s+/g, ' ');

        const target = normalize(q.correctBlankAnswer || q.modelAnswer || '');
        const actual = normalize(studentText);
        const isRight = Boolean(actual && target && (actual === target || target.split(/[,/،]/).map((x) => x.trim()).includes(actual)));
        const awarded = isRight ? Number(q.points) : 0;
        autoScore += awarded;

        studentAnswersMap[q.id] = {
          id: `ans-${Date.now()}-${q.id}`,
          attemptId,
          questionId: q.id,
          essayAnswerText: studentText,
          scoreAwarded: awarded,
          teacherFeedback: isRight ? 'إجابة صحيحة ومطابقة تماماً للنموذج ✓' : `الإجابة الصحيحة هي: ${q.correctBlankAnswer || q.modelAnswer || ''}`,
        };
      } else if (q.questionType === 'essay') {
        hasEssayQuestions = true;
        const essayText = studentInput?.essayAnswerText || '';
        const suggested = essayText.length > 20 ? Number((q.points * 0.85).toFixed(1)) : 0;
        
        studentAnswersMap[q.id] = {
          id: `ans-${Date.now()}-${q.id}`,
          attemptId,
          questionId: q.id,
          essayAnswerText: essayText,
          scoreAwarded: 0,
          aiSuggestedScore: suggested,
          aiFeedback: essayText.length > 20 
            ? 'الإجابة تتضمن مفاهيم أساسية قريبة من نموذج الإجابة. في انتظار مراجعة المعلم.'
            : 'الإجابة غير مكتملة وبحاجة لتوضيح أكثر.',
        };
      }
    });

    const isProvisional = hasEssayQuestions;
    const initialTotal = autoScore;
    const percentage = Number(((initialTotal / (maxScore || 1)) * 100).toFixed(1));
    const passed = !isProvisional && percentage >= exam.passingPercentage;

    const newAttempt: ExamAttempt = {
      id: attemptId,
      examId,
      studentId,
      studentName: student?.fullName || 'طالب كوكب تالتة',
      examTitle: exam.title,
      subjectName: exam.subjectName || 'المادة الدراسية',
      startedAt: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeSpentSeconds,
      autoScore,
      essayScore: 0,
      totalScore: initialTotal,
      maxScore,
      percentage,
      passed,
      status: isProvisional ? 'under_review' : 'graded',
      violationCount,
      violationLogs,
      isProvisional,
      answers: studentAnswersMap,
    };

    const attempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    attempts.unshift(newAttempt);
    this.set(STORAGE_KEYS.ATTEMPTS, attempts);

    // Supabase sync (fire-and-forget with syncQueue offline fallback)
    sbSaveAttempt(newAttempt).then((success) => {
      if (!success) syncQueue.enqueue('attempt', newAttempt);
    }).catch(() => syncQueue.enqueue('attempt', newAttempt));

    if (passed && exam.allowsCertificate) {
      this.issueCertificate(newAttempt);
    }

    this.createNotification({
      userId: studentId,
      title: isProvisional ? '⏳ تم استلام إجابات امتحانك بنجاح' : (passed ? '🎉 مبروك! لقد اجتزت الامتحان بنجاح' : '📊 تم تصحيح الامتحان'),
      message: isProvisional
        ? `حصلت على ${autoScore} في الأسئلة الموضوعية، والأسئلة المقالية قيد المراجعة بواسطة المعلم.`
        : `حصلت على نتيجة ${percentage}% (${initialTotal} من ${maxScore}).`,
      type: passed ? 'success' : 'info',
      linkUrl: '/exams',
    });

    this.logAudit(studentId, student?.fullName || 'طالب', 'تسليم محاولة امتحان', 'exam_attempt', attemptId, {
      percentage,
      passed,
      violations: violationCount,
    });

    return newAttempt;
  }

  // --- AUTHORITATIVE SERVER-SIDE EXAM SUBMISSION & GRADING ---
  public async submitExamAttemptAuthoritative(
    examId: string,
    studentId: string,
    rawAnswers: Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>,
    timeSpentSeconds: number,
    violationCount: number,
    violationLogs: Array<{ timestamp: string; type: string; details: string }>
  ): Promise<ExamAttempt> {
    const isClientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId);

    if (isClientUuid) {
      try {
        const serverRes = await sbSubmitAndGradeExamAttempt(
          examId,
          rawAnswers,
          timeSpentSeconds,
          violationCount,
          violationLogs
        );

        if (serverRes.success && serverRes.attempt) {
          const s = serverRes.attempt;
          const exam = this.getExaminationById(examId);
          const student = this.getProfileById(studentId);

          const authoritativeAttempt: ExamAttempt = {
            id: s.id || generateUUID(),
            examId,
            studentId,
            studentName: s.studentName || student?.fullName || 'طالب كوكب تالتة',
            examTitle: s.examTitle || exam?.title || 'امتحان رسمي',
            subjectName: s.subjectName || exam?.subjectName || 'المادة الدراسية',
            startedAt: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
            submittedAt: s.submittedAt || new Date().toISOString(),
            timeSpentSeconds,
            autoScore: s.autoScore || 0,
            essayScore: s.essayScore || 0,
            totalScore: s.totalScore || 0,
            maxScore: s.maxScore || 1,
            percentage: s.percentage || 0,
            passed: s.passed || false,
            status: s.status || (s.isProvisional ? 'under_review' : 'graded'),
            violationCount,
            violationLogs,
            isProvisional: s.isProvisional ?? false,
            answers: rawAnswers as any,
          };

          const attempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
          attempts.unshift(authoritativeAttempt);
          this.set(STORAGE_KEYS.ATTEMPTS, attempts);

          if (authoritativeAttempt.passed && exam?.allowsCertificate) {
            this.issueCertificate(authoritativeAttempt);
          }

          return authoritativeAttempt;
        }
      } catch (err) {
        console.warn('[Server-side grading failed, falling back to local grading]', err);
      }
    }

    return this.submitExamAttempt(examId, studentId, rawAnswers, timeSpentSeconds, violationCount, violationLogs);
  }

  public gradeEssaySubmission(
    attemptId: string,
    questionId: string,
    score: number,
    feedback: string,
    graderId: string
  ): ExamAttempt | null {
    const attempts = this.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    const idx = attempts.findIndex((a) => a.id === attemptId);
    if (idx === -1) return null;

    const attempt = attempts[idx];
    if (attempt.answers && attempt.answers[questionId]) {
      attempt.answers[questionId].scoreAwarded = score;
      attempt.answers[questionId].teacherFeedback = feedback;
      attempt.answers[questionId].gradedBy = graderId;
      attempt.answers[questionId].gradedAt = new Date().toISOString();
    }

    const questions = this.getQuestionsByExam(attempt.examId);
    let totalScore = 0;
    let anyStillPending = false;

    questions.forEach((q) => {
      const ans = attempt.answers[q.id];
      if (ans) {
        if (q.questionType === 'essay' && ans.gradedBy === undefined) {
          anyStillPending = true;
        }
        totalScore += ans.scoreAwarded || 0;
      }
    });

    attempt.totalScore = totalScore;
    attempt.percentage = Number(((totalScore / (attempt.maxScore || 1)) * 100).toFixed(1));
    const exam = this.getExaminationById(attempt.examId);
    const passing = exam ? exam.passingPercentage : 50;

    if (!anyStillPending) {
      attempt.status = 'graded';
      attempt.isProvisional = false;
      attempt.passed = attempt.percentage >= passing;

      if (attempt.passed && exam?.allowsCertificate) {
        this.issueCertificate(attempt);
      }

      this.createNotification({
        userId: attempt.studentId,
        title: attempt.passed ? '🎉 تم اعتماد نتيجتك النهائية ونجاحك!' : '📊 تم تصحيح إجاباتك المقالية',
        message: `تم الانتهاء من التصحيح بنتيجة نهائية ${attempt.percentage}% (${totalScore} من ${attempt.maxScore}).`,
        type: attempt.passed ? 'success' : 'info',
        linkUrl: '/exams',
      });
    }

    attempts[idx] = attempt;
    this.set(STORAGE_KEYS.ATTEMPTS, attempts);

    // Sync updated graded attempt to Supabase (with offline queue fallback)
    sbSaveAttempt(attempt).then((success) => {
      if (!success) syncQueue.enqueue('attempt', attempt);
    }).catch(() => syncQueue.enqueue('attempt', attempt));

    return attempt;
  }

  // --- CERTIFICATES ---
  public getCertificates(studentId?: string): Certificate[] {
    let certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    if (studentId) certs = certs.filter((c) => c.studentId === studentId);
    return certs.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  public getCertificateById(id: string): Certificate | null {
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    return certs.find((c) => c.id === id || c.certificateNumber === id) || null;
  }

  public issueCertificate(attempt: ExamAttempt): Certificate {
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    const existing = certs.find((c) => c.examId === attempt.examId && c.studentId === attempt.studentId);
    if (existing) return existing;

    const certNum = `CERT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newCert: Certificate = {
      id: generateUUID(),
      certificateNumber: certNum,
      studentId: attempt.studentId,
      examId: attempt.examId,
      subjectName: attempt.subjectName,
      examTitle: attempt.examTitle,
      studentName: attempt.studentName,
      scorePercentage: attempt.percentage,
      issuedAt: new Date().toISOString(),
      qrCodeData: `https://kawkab.edu.eg/verify/${certNum}`,
      isRevoked: false,
    };

    certs.unshift(newCert);
    this.set(STORAGE_KEYS.CERTIFICATES, certs);

    // Sync certificate to Supabase with offline queue fallback
    sbSaveCertificate(newCert).then((success) => {
      if (!success) syncQueue.enqueue('certificate', newCert);
    }).catch(() => syncQueue.enqueue('certificate', newCert));

    this.logAudit(attempt.studentId, attempt.studentName || 'طالب', 'إصدار شهادة تفوق', 'certificate', newCert.id, {
      certificateNumber: certNum,
      score: attempt.percentage,
    });

    return newCert;
  }

  public revokeCertificate(id: string, adminId: string): void {
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    const idx = certs.findIndex((c) => c.id === id || c.certificateNumber === id);
    if (idx !== -1) {
      certs[idx].isRevoked = true;
      this.set(STORAGE_KEYS.CERTIFICATES, certs);
      sbRevokeCertificate(certs[idx].certificateNumber || id).catch(() => {});
      const admin = this.getProfileById(adminId);
      this.logAudit(adminId, admin?.fullName || 'مشرف', 'إلغاء شهادة', 'certificate', id, {});
    }
  }

  // --- PLANS & SUBSCRIPTION REQUESTS ---
  public getPlans(): SubscriptionPlan[] {
    const plans = this.get<SubscriptionPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    if (!plans.some((p) => p.tier === 'standard')) {
      const standardPlan = INITIAL_PLANS.find((p) => p.tier === 'standard');
      if (standardPlan) {
        plans.splice(1, 0, standardPlan);
        this.set(STORAGE_KEYS.PLANS, plans);
      }
    }
    return plans;
  }

  public savePlan(plan: Partial<SubscriptionPlan>): SubscriptionPlan {
    const plans = this.getPlans();
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...plan } as SubscriptionPlan;
      this.set(STORAGE_KEYS.PLANS, plans);
      return plans[idx];
    }
    const newP: SubscriptionPlan = {
      id: plan.id || `plan-${Date.now()}`,
      tier: plan.tier || 'standard',
      nameAr: plan.nameAr || 'باقة جديدة',
      priceEgp: plan.priceEgp || 0,
      periodDays: plan.periodDays || 30,
      features: plan.features || [],
      isActive: plan.isActive ?? true,
    };
    plans.push(newP);
    this.set(STORAGE_KEYS.PLANS, plans);
    return newP;
  }

  public getSubscriptionRequests(): SubscriptionRequest[] {
    return this.get<SubscriptionRequest[]>(STORAGE_KEYS.REQUESTS, []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createSubscriptionRequest(request: Omit<SubscriptionRequest, 'id' | 'status' | 'createdAt'>): SubscriptionRequest {
    const reqs = this.get<SubscriptionRequest[]>(STORAGE_KEYS.REQUESTS, []);
    const newReq: SubscriptionRequest = {
      ...request,
      id: generateUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    reqs.unshift(newReq);
    this.set(STORAGE_KEYS.REQUESTS, reqs);
    // Supabase sync (fire-and-forget)
    sbSaveSubscriptionRequest({
      studentId: newReq.studentId,
      planId: newReq.planId || '',
      tier: newReq.tier,
      paymentMethod: newReq.paymentMethod,
      paymentProofUrl: newReq.paymentProofUrl,
      senderPhone: newReq.senderPhone,
      transactionRef: newReq.transactionRef,
    }).catch(() => {});
    return newReq;
  }

  public reviewSubscriptionRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes: string,
    adminId: string
  ): SubscriptionRequest | null {
    const reqs = this.getSubscriptionRequests();
    const idx = reqs.findIndex((r) => r.id === requestId);
    if (idx === -1) return null;

    const req = reqs[idx];
    req.status = status;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = adminId;
    req.adminNotes = adminNotes;

    if (status === 'approved') {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30);
      this.updateProfile(req.studentId, {
        subscriptionTier: req.tier,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expDate.toISOString(),
      });

      this.createNotification({
        userId: req.studentId,
        title: '🎉 مبروك! تم تفعيل اشتراكك بنجاح',
        message: `تمت الموافقة على طلب اشتراكك في ${req.tier === 'premium' ? 'الباقة المميزة' : 'الباقة القياسية'}. استمتع بكافة المزايا الآن!`,
        type: 'success',
        linkUrl: '/profile',
      });
    } else {
      this.createNotification({
        userId: req.studentId,
        title: '❌ تعذر تفعيل طلب الاشتراك',
        message: adminNotes || 'لم يتم تأكيد الحوالة. يرجى التواصل مع إدارة المنصة عبر واتساب لمراجعة البيانات.',
        type: 'warning',
        linkUrl: '/contact',
      });
    }

    reqs[idx] = req;
    this.set(STORAGE_KEYS.REQUESTS, reqs);
    // Supabase sync (fire-and-forget)
    sbUpdateSubscriptionRequest(requestId, status, adminNotes, adminId).catch(() => {});
    return req;
  }

  // --- LIVE CHALLENGES ---
  public getChallenges(): LiveChallenge[] {
    return this.get<LiveChallenge[]>(STORAGE_KEYS.CHALLENGES, []);
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
    const sub = this.getSubjectById(subjectId);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const exams = this.getExaminations().filter((e) => !subjectId || e.subjectId === subjectId);
    const examIds = new Set(exams.map((e) => e.id));

    const subjectQuestions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
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
    this.set(STORAGE_KEYS.CHALLENGES, challenges);
    // Supabase sync (fire-and-forget)
    sbUpsertChallenge(newChallenge).catch(() => {});
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
    this.set(STORAGE_KEYS.CHALLENGES, challenges);
    // Supabase sync (fire-and-forget)
    sbUpsertChallenge(chl).catch(() => {});
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
    this.set(STORAGE_KEYS.CHALLENGES, challenges);
    // Supabase sync (fire-and-forget)
    sbUpsertChallenge(chl).catch(() => {});
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
    // Default fallback (Social Studies, Religion, IT, Art, General)
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

  // --- LEADERBOARD & RANKINGS ---
  public getLeaderboard(): LeaderboardEntry[] {
    const allProfiles = this.getProfiles();

    // 1. Identify all admin, supervisor, and teacher accounts to guarantee 100% exclusion
    const staffIds = new Set<string>();
    const staffEmails = new Set<string>();

    allProfiles.forEach((u) => {
      const email = u.email?.toLowerCase().trim() || '';
      const role = u.role?.toLowerCase().trim() || '';
      if (
        role === 'admin' ||
        role === 'supervisor' ||
        role === 'teacher' ||
        u.id.startsWith('admin') ||
        u.id.startsWith('teacher') ||
        email.includes('admin') ||
        email === '2ndprepplanet@gmail.com'
      ) {
        staffIds.add(u.id);
        if (email) staffEmails.add(email);
      }
    });

    // 2. Filter ONLY genuine students (excluding all staff, admin, suspended, and mock users)
    const students = allProfiles.filter((u) => {
      const email = u.email?.toLowerCase().trim() || '';
      if (u.role !== 'student') return false;
      if (staffIds.has(u.id)) return false;
      if (email && staffEmails.has(email)) return false;
      if (u.isSuspended) return false;
      if (u.id === 'usr-student-2' || email === 'ahmed.student@gmail.com') return false;
      return true;
    });

    // Filter attempts, progress, and certificates strictly to student records
    const attempts = this.getExamAttempts().filter((a) => !staffIds.has(a.studentId));
    const progress = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []).filter((p) => !staffIds.has(p.studentId));
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []).filter((c) => !staffIds.has(c.studentId));
    const challenges = this.getChallenges();

    const entries: LeaderboardEntry[] = students.map((s) => {
      const studentAttempts = attempts.filter((a) => a.studentId === s.id && a.status === 'graded');
      const avgScore =
        studentAttempts.length > 0
          ? Number(
              (
                studentAttempts.reduce((sum, a) => sum + a.percentage, 0) /
                studentAttempts.length
              ).toFixed(1)
            )
          : 0;
      const completedLessons = progress.filter((p) => p.studentId === s.id && p.completed).length;
      const studentCerts = certs.filter((c) => c.studentId === s.id && !c.isRevoked).length;
      const wonChallenges = challenges.filter((c) => c.winnerId === s.id).length;

      const points = Math.round(
        avgScore * 10 + completedLessons * 25 + studentCerts * 50 + wonChallenges * 30
      );

      return {
        rank: 0,
        studentId: s.id,
        studentName: s.fullName,
        governorate: s.governorate || 'القاهرة',
        schoolName: s.schoolName || 'الشهادة الإعدادية',
        examAverage: avgScore,
        completedLessonsCount: completedLessons,
        challengesWon: wonChallenges,
        certificatesCount: studentCerts,
        points,
        tier: s.subscriptionTier,
      };
    });

    entries.sort((a, b) => b.points - a.points);
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return entries;
  }

  // --- ROBO AI CONVERSATIONS & CHAT PERSISTENCE ---
  private getRoboConversationsStorage(): Record<string, RoboConversation[]> {
    let all = this.get<any>(STORAGE_KEYS.ROBO_CONVERSATIONS, {});
    if (!all || Array.isArray(all) || typeof all !== 'object') {
      all = {};
    }

    // Auto-migration from legacy single-thread ROBO_MESSAGES
    try {
      const legacyStorage = this.get<any>(STORAGE_KEYS.ROBO_MESSAGES, {});
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

    // Auto-upgrade legacy non-UUID IDs to valid UUIDs to maintain DB compatibility
    try {
      let changed = false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      Object.keys(all).forEach((uid) => {
        if (Array.isArray(all[uid])) {
          all[uid].forEach((c) => {
            if (!uuidRegex.test(c.id)) {
              c.id = generateUUID();
              changed = true;
            }
            if (Array.isArray(c.messages)) {
              c.messages.forEach((m) => {
                if (!uuidRegex.test(m.id)) {
                  m.id = generateUUID();
                  changed = true;
                }
              });
            }
          });
        }
      });
      if (changed) {
        this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
      }
    } catch (e) {
      console.warn('Auto-upgrade legacy convs error:', e);
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
      this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
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
    this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
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
    this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    return this.getRoboConversations(userId);
  }

  public updateRoboConversationTitle(userId: string, conversationId: string, newTitle: string): void {
    const all = this.getRoboConversationsStorage();
    if (!all[userId]) return;
    const conv = all[userId].find((c) => c.id === conversationId);
    if (conv) {
      conv.title = newTitle.trim() || 'محادثة';
      conv.updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
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
    const ts = Date.now();
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

    // For local storage persistence: do not store heavy raw base64 data URLs in localStorage
    // to strictly prevent browser QuotaExceededError (5MB quota)
    const storedUserMsg: RoboMessage = {
      ...userMsg,
      attachmentUrl: (attachmentUrl && attachmentUrl.length > 2048) ? undefined : attachmentUrl,
    };
    conv.messages.push(storedUserMsg);
    conv.updatedAt = new Date().toISOString();

    // Auto-update conversation title if it was default
    if (conv.title === 'محادثة جديدة' && text.trim().length > 0) {
      const cleanText = text.replace(/💡|📝|📐|🔬|🌍|🇬🇧|💻/g, '').trim();
      conv.title = cleanText.length > 32 ? cleanText.substring(0, 32) + '...' : cleanText;
    }

    this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    // Supabase sync (fire-and-forget)
    sbSaveConversation(conv).catch(() => {});
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
    this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    // Supabase sync (fire-and-forget)
    sbSaveConversation(conv).catch(() => {});

    return replyMsg;
  }

  // Backward compatibility methods
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
    const user = this.getProfileById(userId);
    const isStaff = user?.role === 'admin' || user?.role === 'teacher';
    let limit = 10; // Default Free tier: 10 questions/day
    if (isStaff || user?.subscriptionTier === 'premium') {
      limit = 150;
    } else if (user?.subscriptionTier === 'standard') {
      limit = 60;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const usageMap = this.get<Record<string, { date: string; count: number }>>('kawkab_robo_daily_usage', {});
    const userUsage = usageMap[userId];

    const used = (userUsage && userUsage.date === todayStr) ? userUsage.count : 0;
    const remaining = Math.max(0, limit - used);

    return { limit, used, remaining };
  }

  public incrementRoboDailyUsage(userId: string): number {
    const todayStr = new Date().toISOString().split('T')[0];
    const usageMap = this.get<Record<string, { date: string; count: number }>>('kawkab_robo_daily_usage', {});
    const current = (usageMap[userId] && usageMap[userId].date === todayStr) ? usageMap[userId].count : 0;
    const nextCount = current + 1;
    usageMap[userId] = { date: todayStr, count: nextCount };
    this.set('kawkab_robo_daily_usage', usageMap);

    // Increment monthly AI question metric for user profile
    const user = this.getProfileById(userId);
    if (user) {
      const monthCount = (user.aiQuestionsUsedThisMonth || 0) + 1;
      this.updateProfile(userId, { aiQuestionsUsedThisMonth: monthCount });
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
    this.set(STORAGE_KEYS.ROBO_CONVERSATIONS, all);
    if (targetConv) {
      sbSaveConversation(targetConv).catch(() => {});
    }
  }

  // --- NOTIFICATIONS & ANNOUNCEMENTS ---
  public getNotifications(userId: string): Notification[] {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return notifs
      .filter((n) => n.userId === userId || !n.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newN: Notification = {
      ...notif,
      id: generateUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifs.unshift(newN);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
    // Supabase sync (fire-and-forget)
    if (newN.userId) {
      sbInsertNotification(newN).catch(() => {});
    }
    return newN;
  }

  public markNotificationRead(id: string): void {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const n = notifs.find((x) => x.id === id);
    if (n) {
      n.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
      // Supabase sync (fire-and-forget)
      sbMarkNotificationRead(id).catch(() => {});
    }
  }

  public getAnnouncements(): Announcement[] {
    const anns = this.get<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    return anns.filter((a) => a.isPublished).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveAnnouncement(ann: Partial<Announcement>): Announcement {
    const anns = this.get<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    if (ann.id) {
      const idx = anns.findIndex((a) => a.id === ann.id);
      if (idx !== -1) {
        anns[idx] = { ...anns[idx], ...ann } as Announcement;
        this.set(STORAGE_KEYS.ANNOUNCEMENTS, anns);
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
    this.set(STORAGE_KEYS.ANNOUNCEMENTS, anns);
    return newA;
  }

  // --- TEACHERS ---
  public getTeacherAssignments(teacherId?: string): TeacherAssignment[] {
    const list = this.get<TeacherAssignment[]>(STORAGE_KEYS.TEACHER_ASSIGNMENTS, INITIAL_TEACHER_ASSIGNMENTS);
    if (teacherId) return list.filter((a) => a.teacherId === teacherId);
    return list;
  }

  public assignTeacherToSubject(teacherId: string, subjectId: string): TeacherAssignment {
    const list = this.getTeacherAssignments();
    const existing = list.find((a) => a.teacherId === teacherId && a.subjectId === subjectId);
    if (existing) return existing;

    const teacher = this.getProfileById(teacherId);
    const sub = this.getSubjectById(subjectId);
    const newAss: TeacherAssignment = {
      id: `ta-${Date.now()}`,
      teacherId,
      teacherName: teacher?.fullName || 'معلم',
      subjectId,
      subjectName: sub?.nameAr || 'المادة',
      assignedAt: new Date().toISOString(),
    };
    list.push(newAss);
    this.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
    return newAss;
  }

  public removeTeacherAssignment(id: string): void {
    const list = this.getTeacherAssignments().filter((a) => a.id !== id);
    this.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
  }

  public saveTeacherAssignments(list: TeacherAssignment[]): void {
    this.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public logAudit(
    actorId: string,
    actorName: string,
    action: string,
    targetType: string,
    targetId?: string,
    details: Record<string, any> = {}
  ): void {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorId,
      actorName,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (logs.length > 200) logs.pop();
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- CONTACT SETTINGS ---
  public getContactSettings(): ContactSettings {
    return this.get<ContactSettings>(STORAGE_KEYS.CONTACT_SETTINGS, INITIAL_CONTACT_SETTINGS);
  }

  public saveContactSettings(settings: ContactSettings): void {
    this.set(STORAGE_KEYS.CONTACT_SETTINGS, settings);
  }

  // ============================================================
  // TEACHER HOMEWORKS
  // ============================================================

  public getTeacherHomeworks(teacherId?: string): TeacherHomework[] {
    const all = this.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    if (teacherId) return all.filter((h) => h.teacherId === teacherId);
    return all;
  }

  public saveTeacherHomework(hw: Partial<TeacherHomework> & { teacherId: string; subjectId: string; title: string }): TeacherHomework {
    const all = this.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    if (hw.id) {
      const idx = all.findIndex((h) => h.id === hw.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...hw } as TeacherHomework;
        this.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
        return all[idx];
      }
    }
    const newHw: TeacherHomework = {
      id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId: hw.teacherId,
      subjectId: hw.subjectId,
      subjectName: hw.subjectName || '',
      title: hw.title,
      description: hw.description || '',
      deadlineAt: hw.deadlineAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: hw.maxScore || 10,
      createdAt: new Date().toISOString(),
      submissions: [],
    };
    all.unshift(newHw);
    this.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    return newHw;
  }

  public deleteTeacherHomework(id: string): void {
    const all = this.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []).filter((h) => h.id !== id);
    this.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
  }

  public submitHomeworkAnswer(hwId: string, studentId: string, studentName: string, answerText: string): boolean {
    const all = this.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    const hw = all.find((h) => h.id === hwId);
    if (!hw) return false;
    const existing = hw.submissions.findIndex((s) => s.studentId === studentId);
    const sub = { studentId, studentName, submittedAt: new Date().toISOString(), answerText };
    if (existing !== -1) { hw.submissions[existing] = sub; }
    else { hw.submissions.push(sub); }
    this.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    return true;
  }

  public gradeHomeworkSubmission(hwId: string, studentId: string, score: number, feedback: string): boolean {
    const all = this.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    const hw = all.find((h) => h.id === hwId);
    if (!hw) return false;
    const sub = hw.submissions.find((s) => s.studentId === studentId);
    if (!sub) return false;
    sub.score = score;
    sub.teacherFeedback = feedback;
    this.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    return true;
  }

  // ============================================================
  // TEACHER MESSAGES
  // ============================================================

  public getTeacherMessages(userId: string): TeacherMessage[] {
    const all = this.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    return all.filter((m) => m.fromId === userId || m.toId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public sendTeacherMessage(msg: Omit<TeacherMessage, 'id' | 'isRead' | 'createdAt'>): TeacherMessage {
    const all = this.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    const newMsg: TeacherMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newMsg);
    // Keep max 500 messages
    if (all.length > 500) all.splice(500);
    this.set(STORAGE_KEYS.TEACHER_MESSAGES, all);

    // Sync into Student Group Chat if toId is a student
    const studentChats = this.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    const existingRoom = studentChats[msg.toId] || this.getStudentGroupMessages(msg.toId);
    const syncedGroupMsg: StudentGroupMessage = {
      id: `gm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: msg.toId,
      senderId: msg.fromId,
      senderName: msg.fromName,
      senderRole: msg.fromRole === 'admin' ? 'admin' : 'teacher',
      senderBadge: msg.fromRole === 'admin' ? 'المشرف الأكاديمي العام' : 'معلم المادة',
      text: msg.text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    studentChats[msg.toId] = [...existingRoom, syncedGroupMsg];
    this.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, studentChats);

    return newMsg;
  }

  // ============================================================
  // STUDENT DEDICATED PRIVATE GROUP CHATS (With Supervisor & Teachers)
  // ============================================================

  public getStudentGroupMessages(studentId: string): StudentGroupMessage[] {
    const all = this.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    if (all[studentId] && all[studentId].length > 0) {
      return all[studentId];
    }

    const student = this.getProfileById(studentId);
    const studentName = student?.fullName?.split(' ')[0] || 'يا بطل';
    const adminUser = this.getProfiles().find((p) => p.role === 'admin');
    const adminName = adminUser?.fullName || 'المشرف الأكاديمي العام';
    const adminId = adminUser?.id || 'usr-admin-1';

    // Initial Welcome message from the verified academic supervisor
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
    this.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, all);
    return initialWelcome;
  }

  public sendStudentGroupMessage(
    studentId: string,
    msg: Omit<StudentGroupMessage, 'id' | 'createdAt'>
  ): StudentGroupMessage {
    const all = this.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    const room = all[studentId] || this.getStudentGroupMessages(studentId);

    const newMsg: StudentGroupMessage = {
      ...msg,
      id: `gm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    room.push(newMsg);
    all[studentId] = room;
    this.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, all);

    // Supabase sync (fire-and-forget)
    sbSendStudentGroupMessage(studentId, msg.text, msg.attachmentUrl).catch(() => {});

    // Also sync to TeacherMessage inbox so supervisor/teachers see it
    if (msg.senderRole === 'student') {
      const allMsgs = this.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
      const teacherMsg: TeacherMessage = {
        id: `tmsg-${newMsg.id}`,
        fromId: studentId,
        fromName: msg.senderName,
        fromRole: 'student',
        toId: 'usr-admin-1', // Default to supervisor
        toName: 'المشرف الأكاديمي',
        text: `[جروب المتابعة الأكاديمية] ${msg.text}`,
        isRead: false,
        createdAt: newMsg.createdAt,
      };
      allMsgs.unshift(teacherMsg);
      if (allMsgs.length > 500) allMsgs.splice(500);
      this.set(STORAGE_KEYS.TEACHER_MESSAGES, allMsgs);
    }

    return newMsg;
  }

  public markTeacherMessageRead(messageId: string): void {
    const all = this.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    const msg = all.find((m) => m.id === messageId);
    if (msg) { msg.isRead = true; this.set(STORAGE_KEYS.TEACHER_MESSAGES, all); }
  }

  public getUnreadMessageCount(userId: string): number {
    return this.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, [])
      .filter((m) => m.toId === userId && !m.isRead).length;
  }

  // ============================================================
  // TEACHER SCHEDULE
  // ============================================================

  public getTeacherSchedule(teacherId: string): TeacherScheduleSlot[] {
    return this.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, [])
      .filter((s) => s.teacherId === teacherId);
  }

  public saveScheduleSlot(slot: Omit<TeacherScheduleSlot, 'id'> & { id?: string }): TeacherScheduleSlot {
    const all = this.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, []);
    if (slot.id) {
      const idx = all.findIndex((s) => s.id === slot.id);
      if (idx !== -1) { all[idx] = slot as TeacherScheduleSlot; this.set(STORAGE_KEYS.TEACHER_SCHEDULE, all); return all[idx]; }
    }
    const newSlot: TeacherScheduleSlot = { ...slot, id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
    all.push(newSlot);
    this.set(STORAGE_KEYS.TEACHER_SCHEDULE, all);
    return newSlot;
  }

  public deleteScheduleSlot(id: string): void {
    const all = this.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, []).filter((s) => s.id !== id);
    this.set(STORAGE_KEYS.TEACHER_SCHEDULE, all);
  }

  // ============================================================
  // ATTENDANCE
  // ============================================================

  public getAttendanceRecords(teacherId: string, lessonId?: string): AttendanceRecord[] {
    const all = this.get<AttendanceRecord[]>(STORAGE_KEYS.TEACHER_ATTENDANCE, [])
      .filter((r) => r.teacherId === teacherId);
    if (lessonId) return all.filter((r) => r.lessonId === lessonId);
    return all;
  }

  public saveAttendanceRecord(record: Omit<AttendanceRecord, 'id'> & { id?: string }): AttendanceRecord {
    const all = this.get<AttendanceRecord[]>(STORAGE_KEYS.TEACHER_ATTENDANCE, []);
    if (record.id) {
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx !== -1) { all[idx] = record as AttendanceRecord; this.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all); return all[idx]; }
    }
    // Check if record for same lesson+date already exists
    const existingIdx = all.findIndex((r) => r.lessonId === record.lessonId && r.date === record.date && r.teacherId === record.teacherId);
    if (existingIdx !== -1) {
      all[existingIdx] = { ...all[existingIdx], ...record, id: all[existingIdx].id };
      this.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all);
      return all[existingIdx];
    }
    const newRecord: AttendanceRecord = { ...record, id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
    all.unshift(newRecord);
    this.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all);
    return newRecord;
  }

  // ==================== DAILY STREAK ====================
  getStreak(studentId: string): DailyStreak {
    const all = this.get<DailyStreak[]>(STORAGE_KEYS.DAILY_STREAK, []);
    return all.find((s) => s.studentId === studentId) ?? {
      studentId, currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalActiveDays: 0,
    };
  }

  updateStreak(studentId: string): DailyStreak {
    const all = this.get<DailyStreak[]>(STORAGE_KEYS.DAILY_STREAK, []);
    const today = new Date().toISOString().split('T')[0];
    const existing = all.find((s) => s.studentId === studentId);
    if (!existing) {
      const newS: DailyStreak = { studentId, currentStreak: 1, longestStreak: 1, lastActiveDate: today, totalActiveDays: 1 };
      this.set(STORAGE_KEYS.DAILY_STREAK, [...all, newS]);
      sbUpsertStreak(newS).catch(() => {});
      return newS;
    }
    if (existing.lastActiveDate === today) return existing;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const consecutive = existing.lastActiveDate === yStr;
    const newCurrent = consecutive ? existing.currentStreak + 1 : 1;
    const updated: DailyStreak = { ...existing, currentStreak: newCurrent, longestStreak: Math.max(existing.longestStreak, newCurrent), lastActiveDate: today, totalActiveDays: existing.totalActiveDays + 1 };
    this.set(STORAGE_KEYS.DAILY_STREAK, all.map((s) => s.studentId === studentId ? updated : s));
    sbUpsertStreak(updated).catch(() => {});
    return updated;
  }

  // ==================== BADGES ====================
  getBadges(studentId: string): StudentBadge[] {
    return this.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []).filter((b) => b.studentId === studentId);
  }

  awardBadge(studentId: string, badgeType: BadgeType): StudentBadge | null {
    const all = this.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []);
    if (all.some((b) => b.studentId === studentId && b.badgeType === badgeType)) return null;
    const badge: StudentBadge = { id: generateUUID(), studentId, badgeType, earnedAt: new Date().toISOString(), isNew: true };
    this.set(STORAGE_KEYS.STUDENT_BADGES, [...all, badge]);
    sbAwardBadge(studentId, badgeType).catch(() => {});
    return badge;
  }

  markBadgeSeen(badgeId: string): void {
    const all = this.get<StudentBadge[]>(STORAGE_KEYS.STUDENT_BADGES, []);
    this.set(STORAGE_KEYS.STUDENT_BADGES, all.map((b) => b.id === badgeId ? { ...b, isNew: false } : b));
  }

  // ==================== GOALS ====================
  getGoals(studentId: string): StudentGoal[] {
    return this.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []).filter((g) => g.studentId === studentId);
  }

  saveGoal(goal: StudentGoal): void {
    const all = this.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []);
    const idx = all.findIndex((g) => g.id === goal.id);
    this.set(STORAGE_KEYS.STUDENT_GOALS, idx >= 0 ? all.map((g) => g.id === goal.id ? goal : g) : [...all, goal]);
    sbSaveGoal(goal).catch(() => {});
  }

  deleteGoal(goalId: string): void {
    this.set(STORAGE_KEYS.STUDENT_GOALS, this.get<StudentGoal[]>(STORAGE_KEYS.STUDENT_GOALS, []).filter((g) => g.id !== goalId));
  }

  // ==================== FLASHCARDS ====================
  getFlashcards(subjectId?: string, lessonId?: string): Flashcard[] {
    const all = this.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, INITIAL_FLASHCARDS);
    let filtered = all;
    if (subjectId) filtered = filtered.filter((f) => f.subjectId === subjectId);
    if (lessonId && lessonId !== 'all') filtered = filtered.filter((f) => f.lessonId === lessonId);
    return filtered;
  }

  saveFlashcard(card: Flashcard): void {
    const all = this.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []);
    const idx = all.findIndex((f) => f.id === card.id);
    this.set(STORAGE_KEYS.FLASHCARDS, idx >= 0 ? all.map((f) => f.id === card.id ? card : f) : [...all, card]);
    const currentUserId = localStorage.getItem('kawkab_current_user_id_v9') || '';
    if (currentUserId) {
      sbSaveFlashcards(currentUserId, [card]).catch(() => {});
    }
  }

  saveFlashcards(cards: Flashcard[]): void {
    const all = this.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []);
    const newIds = new Set(cards.map((c) => c.id));
    const merged = [...all.filter((c) => !newIds.has(c.id)), ...cards];
    this.set(STORAGE_KEYS.FLASHCARDS, merged);
    const currentUserId = localStorage.getItem('kawkab_current_user_id_v9') || '';
    if (currentUserId && cards.length > 0) {
      sbSaveFlashcards(currentUserId, cards).catch(() => {});
    }
  }

  deleteFlashcard(cardId: string): void {
    this.set(STORAGE_KEYS.FLASHCARDS, this.get<Flashcard[]>(STORAGE_KEYS.FLASHCARDS, []).filter((f) => f.id !== cardId));
    sbDeleteFlashcard(cardId).catch(() => {});
  }

  // ==================== STUDENT SCHEDULE & TASKS ====================
  getStudentSchedule(studentId: string): StudentScheduleSlot[] {
    const all = this.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []);
    return all.filter((s) => s.studentId === studentId && s.studentId !== 'default');
  }

  saveStudentScheduleSlot(slot: Omit<StudentScheduleSlot, 'id' | 'createdAt'> & { id?: string }): StudentScheduleSlot {
    const all = this.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []).filter((s) => s.studentId !== 'default');
    if (slot.id) {
      const idx = all.findIndex((s) => s.id === slot.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...slot } as StudentScheduleSlot;
        this.set(STORAGE_KEYS.STUDENT_SCHEDULE, all);
        return all[idx];
      }
    }
    const newSlot: StudentScheduleSlot = {
      ...slot,
      id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(newSlot);
    this.set(STORAGE_KEYS.STUDENT_SCHEDULE, all);
    return newSlot;
  }

  deleteStudentScheduleSlot(slotId: string): void {
    const all = this.get<StudentScheduleSlot[]>(STORAGE_KEYS.STUDENT_SCHEDULE, []).filter((s) => s.id !== slotId && s.studentId !== 'default');
    this.set(STORAGE_KEYS.STUDENT_SCHEDULE, all);
  }

  getStudentTasks(studentId: string): StudentTask[] {
    const all = this.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []);
    return all.filter((t) => t.studentId === studentId && t.studentId !== 'default');
  }

  saveStudentTask(task: Omit<StudentTask, 'id' | 'createdAt' | 'completed'> & { id?: string; completed?: boolean }): StudentTask {
    const all = this.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.studentId !== 'default');
    if (task.id) {
      const idx = all.findIndex((t) => t.id === task.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...task } as StudentTask;
        this.set(STORAGE_KEYS.STUDENT_TASKS, all);
        return all[idx];
      }
    }
    const newTask: StudentTask = {
      ...task,
      completed: task.completed ?? false,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newTask);
    this.set(STORAGE_KEYS.STUDENT_TASKS, all);
    return newTask;
  }

  toggleStudentTask(taskId: string): boolean {
    const all = this.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.studentId !== 'default');
    const task = all.find((t) => t.id === taskId);
    if (!task) return false;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : undefined;
    this.set(STORAGE_KEYS.STUDENT_TASKS, all);
    return task.completed;
  }

  deleteStudentTask(taskId: string): void {
    const all = this.get<StudentTask[]>(STORAGE_KEYS.STUDENT_TASKS, []).filter((t) => t.id !== taskId && t.studentId !== 'default');
    this.set(STORAGE_KEYS.STUDENT_TASKS, all);
  }
}

// Initial Templates for Student Schedule & Tasks — Empty for genuine student entries
const INITIAL_STUDENT_SCHEDULE: StudentScheduleSlot[] = [];
const INITIAL_STUDENT_TASKS: StudentTask[] = [];

export const db = new LocalDatabaseEngine();
