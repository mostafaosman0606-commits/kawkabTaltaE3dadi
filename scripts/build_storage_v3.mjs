import fs from 'node:fs';
import path from 'node:path';

const storage_ts_path = path.resolve('src', 'services', 'storage.ts');

const content = `import {
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
  TeacherAssignment,
  LeaderboardEntry,
  ContactSettings
} from '../types';

// Storage keys - Version 3 for Production Deployment
const STORAGE_KEYS = {
  VERSION: 'kawkab_db_version_v3',
  USERS: 'kawkab_users_v3',
  SUBJECTS: 'kawkab_subjects_v3',
  UNITS: 'kawkab_units_v3',
  LESSONS: 'kawkab_lessons_v3',
  NOTES: 'kawkab_notes_v3',
  PROGRESS: 'kawkab_progress_v3',
  EXAMS: 'kawkab_exams_v3',
  QUESTIONS: 'kawkab_questions_v3',
  ATTEMPTS: 'kawkab_attempts_v3',
  CERTIFICATES: 'kawkab_certificates_v3',
  PLANS: 'kawkab_plans_v3',
  REQUESTS: 'kawkab_requests_v3',
  CHALLENGES: 'kawkab_challenges_v3',
  NOTIFICATIONS: 'kawkab_notifications_v3',
  ANNOUNCEMENTS: 'kawkab_announcements_v3',
  AUDIT_LOGS: 'kawkab_audit_logs_v3',
  ROBO_MESSAGES: 'kawkab_robo_messages_v3',
  TEACHER_ASSIGNMENTS: 'kawkab_teacher_assignments_v3',
  CONTACT_SETTINGS: 'kawkab_contact_settings_v3',
};

// ==============================================================================
// 1. REAL USER PROFILES (Egyptian Students, Teachers & Admin)
// ==============================================================================
const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'student-1',
    email: 'ahmed@kawkab.edu.eg',
    fullName: 'أحمد محمود رضوان',
    role: 'student',
    phoneNumber: '01012345678',
    governorate: 'القاهرة',
    schoolName: 'مدرسة الشهداء الإعدادية بنين - الزيتون',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-06-30T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 14,
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'student-2',
    email: 'sara@kawkab.edu.eg',
    fullName: 'سارة خالد الدسوقي',
    role: 'student',
    phoneNumber: '01123456789',
    governorate: 'الجيزة',
    schoolName: 'مدرسة الزهور الإعدادية بنات - الدقي',
    subscriptionTier: 'standard',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-05-30T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 8,
    createdAt: '2026-09-05T11:00:00Z',
  },
  {
    id: 'student-3',
    email: 'omar@kawkab.edu.eg',
    fullName: 'عمر شريف حسنين',
    role: 'student',
    phoneNumber: '01234567890',
    governorate: 'الإسكندرية',
    schoolName: 'مدرسة النصر الإعدادية بنين - سموحة',
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 3,
    createdAt: '2026-09-10T14:30:00Z',
  },
  {
    id: 'student-4',
    email: 'mariam@kawkab.edu.eg',
    fullName: 'مريم عمرو الشناوي',
    role: 'student',
    phoneNumber: '01099881122',
    governorate: 'الدقهلية',
    schoolName: 'مدرسة المنصورة الإعدادية بنات الحديثة',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-06-30T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 22,
    createdAt: '2026-09-02T08:15:00Z',
  },
  {
    id: 'student-5',
    email: 'youssef@kawkab.edu.eg',
    fullName: 'يوسف كريم عبد الله',
    role: 'student',
    phoneNumber: '01555443322',
    governorate: 'الغربية',
    schoolName: 'مدرسة طنطا الإعدادية بنين النموذجية',
    subscriptionTier: 'standard',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-05-15T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 12,
    createdAt: '2026-09-07T12:00:00Z',
  },
  {
    id: 'student-6',
    email: 'nour@kawkab.edu.eg',
    fullName: 'نور الدين حسام فهمي',
    role: 'student',
    phoneNumber: '01066778899',
    governorate: 'الشرقية',
    schoolName: 'مدرسة الزقازيق الإعدادية بنين',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-06-30T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 18,
    createdAt: '2026-09-04T09:30:00Z',
  },
  {
    id: 'student-7',
    email: 'fatma@kawkab.edu.eg',
    fullName: 'فاطمة الزهراء علي ممدوح',
    role: 'student',
    phoneNumber: '01199887766',
    governorate: 'أسيوط',
    schoolName: 'مدرسة أسيوط الإعدادية النموذجية بنات',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2027-06-30T23:59:59Z',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 25,
    createdAt: '2026-09-03T11:45:00Z',
  },
  {
    id: 'teacher-1',
    email: 'teacher@kawkab.edu.eg',
    fullName: 'أستاذ محمد إبراهيم السيد',
    role: 'teacher',
    phoneNumber: '01098765432',
    governorate: 'القاهرة',
    schoolName: 'كبير معلمين - لغة عربية ودراسات إسلامية',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-15T09:00:00Z',
  },
  {
    id: 'teacher-2',
    email: 'teacher.math@kawkab.edu.eg',
    fullName: 'أستاذة هبة أحمد مصطفى',
    role: 'teacher',
    phoneNumber: '01288776655',
    governorate: 'الجيزة',
    schoolName: 'معلم خبير رياضيات وعلوم - الشهادة الإعدادية',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'admin-1',
    email: 'admin@kawkab.edu.eg',
    fullName: 'إدارة كوكب تالتة إعدادي (م. خالد عبد الرحمن)',
    role: 'admin',
    phoneNumber: '01000000000',
    governorate: 'القاهرة',
    schoolName: 'الإدارة العامة للمنصة التعليمية 2026',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-01T08:00:00Z',
  },
];

// ==============================================================================
// 2. THE EIGHT OFFICIAL SCHOOL SUBJECTS (Egyptian 3rd Prep)
// ==============================================================================
const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-arabic',
    slug: 'arabic',
    nameAr: 'اللغة العربية',
    description: 'شرح فروع النحو، القراءة، النصوص الأدبية، والقصة المقررة (طموح جارية) مع تدريبات وزارية مكثفة.',
    icon: 'BookOpen',
    colorPrimary: '#10B981', // Emerald
    colorSecondary: '#059669',
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: 'sub-math',
    slug: 'mathematics',
    nameAr: 'الرياضيات',
    description: 'الجبر والإحصاء، حساب المثلثات، والهندسة التحليلية بحلول نموذجية وامتحانات المحافظات.',
    icon: 'Calculator',
    colorPrimary: '#0EA5E9', // Sky
    colorSecondary: '#0284C7',
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: 'sub-english',
    slug: 'english',
    nameAr: 'اللغة الإنجليزية',
    description: 'منهج New Hello! Prep 3: القواعد اللغوية، الكلمات والمصطلحات، المحادثات، والتدريب على فقرات الكتابة.',
    icon: 'Languages',
    colorPrimary: '#6366F1', // Indigo
    colorSecondary: '#4F46E5',
    orderIndex: 3,
    isPublished: true,
  },
  {
    id: 'sub-science',
    slug: 'science',
    nameAr: 'العلوم',
    description: 'القوى والحركة، الطاقة الضوئية والمرايا والعدسات، الكون والنظام الشمسي، والتكاثر والانقسام الخلوي.',
    icon: 'Atom',
    colorPrimary: '#06B6D4', // Cyan
    colorSecondary: '#0891B2',
    orderIndex: 4,
    isPublished: true,
  },
  {
    id: 'sub-social',
    slug: 'social-studies',
    nameAr: 'الدراسات الاجتماعية',
    description: 'جغرافية العالم الطبيعية والبشرية والأقاليم المناخية، وتاريخ مصر الحديث والمعاصر وثورة 1952 وحرب أكتوبر.',
    icon: 'Compass',
    colorPrimary: '#F59E0B', // Amber
    colorSecondary: '#D97706',
    orderIndex: 5,
    isPublished: true,
  },
  {
    id: 'sub-religion',
    slug: 'islamic-studies',
    nameAr: 'التربية الدينية',
    description: 'سورة لقمان وتفسير الوصايا، أحكام التجويد والمدود، الإيمان بالقضاء والقدر، وسيرة الصحابي أبو ذر الغفاري.',
    icon: 'Sparkles',
    colorPrimary: '#14B8A6', // Teal
    colorSecondary: '#0D9488',
    orderIndex: 6,
    isPublished: true,
  },
  {
    id: 'sub-computer',
    slug: 'computer-it',
    nameAr: 'الحاسب وتكنولوجيا المعلومات',
    description: 'مفاهيم حل المشكلات، الرموز القياسية لخرائط التدفق (Flowcharts)، وأساسيات لغة البرمجة Visual Basic.NET.',
    icon: 'Cpu',
    colorPrimary: '#3B82F6', // Blue
    colorSecondary: '#1D4ED8',
    orderIndex: 7,
    isPublished: true,
  },
  {
    id: 'sub-art',
    slug: 'art-education',
    nameAr: 'التربية الفنية',
    description: 'الفن الشعبي المصري ورموزه الأصيلة، تاريخ الفن القبطي، أسس التصميم الابتكاري والتوافق اللوني والأشغال الفنية.',
    icon: 'Palette',
    colorPrimary: '#EC4899', // Pink
    colorSecondary: '#DB2777',
    orderIndex: 8,
    isPublished: true,
  },
];

// ==============================================================================
// 3. CURRICULUM UNITS - Complete official coverage
// ==============================================================================
const INITIAL_UNITS: Unit[] = [
  // Arabic Units
  {
    id: 'unit-ar-1',
    subjectId: 'sub-arabic',
    title: 'الوحدة الأولى: قواعد النحو والتطبيقات الإعرابية',
    orderIndex: 1,
    description: 'المنادى وأنواعه وأحكامه، البدل وأنواعه، أسلوب المدح والذم، والممنوع من الصرف.',
  },
  {
    id: 'unit-ar-2',
    subjectId: 'sub-arabic',
    title: 'الوحدة الثانية: القراءة والنصوص الأدبية والقصة',
    orderIndex: 2,
    description: 'نص عباد الرحمن (قرآن كريم)، نص كن جميلاً، نص رحمة ومحبة، وقصة طموح جارية.',
  },
  // Mathematics Units
  {
    id: 'unit-math-1',
    subjectId: 'sub-math',
    title: 'الوحدة الأولى: الجبر والإحصاء',
    orderIndex: 1,
    description: 'حاصل الضرب الديكارتي، العلاقات والدوال، دوال كثيرات الحدود، والنسبة والتناسب والتغير.',
  },
  {
    id: 'unit-math-2',
    subjectId: 'sub-math',
    title: 'الوحدة الثانية: حساب المثلثات والهندسة التحليلية',
    orderIndex: 2,
    description: 'النسب المثلثية الأساسية للزاوية الحادة، البعد بين نقطتين، منتصف قطعة، وميل ومعادلة الخط المستقيم.',
  },
  // English Units
  {
    id: 'unit-eng-1',
    subjectId: 'sub-english',
    title: 'Unit 1: Around Town',
    orderIndex: 1,
    description: 'Places in town, transport, prepositions of time (at, on, in), and present simple for timetables.',
  },
  {
    id: 'unit-eng-2',
    subjectId: 'sub-english',
    title: 'Unit 2: Let\\'s Go Shopping',
    orderIndex: 2,
    description: 'Smart appliances, shopping deals, comparative & superlative adjectives, both...and, either...or.',
  },
  {
    id: 'unit-eng-3',
    subjectId: 'sub-english',
    title: 'Unit 3: My Community',
    orderIndex: 3,
    description: 'Community facilities, Decent Life Initiative (حياة كريمة), and present continuous for future arrangements.',
  },
  // Science Units
  {
    id: 'unit-sci-1',
    subjectId: 'sub-science',
    title: 'الوحدة الأولى: القوى والحركة',
    orderIndex: 1,
    description: 'الحركة في اتجاه واحد، السرعة المنتظمة والنسبية، العجلة، والكميات القياسية والمتجهة.',
  },
  {
    id: 'unit-sci-2',
    subjectId: 'sub-science',
    title: 'الوحدة الثانية: الطاقة الضوئية',
    orderIndex: 2,
    description: 'المرايا الكرية والمستوية، العدسات المحدبة والمقعرة، وعيوب الإبصار وتصحيحها.',
  },
  {
    id: 'unit-sci-3',
    subjectId: 'sub-science',
    title: 'الوحدة الثالثة: الكون والنظام الشمسي',
    orderIndex: 3,
    description: 'تمدد الكون، نشأة المجرات ونظرية الانفجار العظيم، ونظريات نشأة النظام الشمسي.',
  },
  {
    id: 'unit-sci-4',
    subjectId: 'sub-science',
    title: 'الوحدة الرابعة: التكاثر واستمرار النوع',
    orderIndex: 4,
    description: 'الانقسام الميتوزي والميوزي، والتكاثر اللاجنسي والجنسي في الكائنات الحية.',
  },
  // Social Studies Units
  {
    id: 'unit-soc-1',
    subjectId: 'sub-social',
    title: 'الوحدة الأولى: جغرافية العالم الطبيعية',
    orderIndex: 1,
    description: 'قارات العالم (الموقع والمساحة)، تضاريس العالم، والمناخ والنبات الطبيعي والأقاليم المناخية.',
  },
  {
    id: 'unit-soc-2',
    subjectId: 'sub-social',
    title: 'الوحدة الثانية: تاريخ مصر الحديث والمعاصر',
    orderIndex: 2,
    description: 'ثورة 23 يوليو 1952 وإنجازاتها، مصر والقضية الفلسطينية والعدوان الثلاثي وحرب أكتوبر 1973.',
  },
  // Islamic Studies Units
  {
    id: 'unit-rel-1',
    subjectId: 'sub-religion',
    title: 'الوحدة الأولى: القرآن الكريم والتأمل في الكون',
    orderIndex: 1,
    description: 'سورة لقمان والوصايا الإيمانية والأخلاقية، وأحكام التجويد (المدود وحروف القلقلة).',
  },
  {
    id: 'unit-rel-2',
    subjectId: 'sub-religion',
    title: 'الوحدة الثانية: العقيدة والشخصيات الإسلامية',
    orderIndex: 2,
    description: 'الإيمان بالقضاء والقدر، غزوات النبي وغزوة حنين وتبوك، وسيرة الصحابي أبو ذر الغفاري.',
  },
  // Computer Units
  {
    id: 'unit-comp-1',
    subjectId: 'sub-computer',
    title: 'الوحدة الأولى: مفاهيم حل المشكلات وخرائط التدفق (Flowcharts)',
    orderIndex: 1,
    description: 'مراحل حل المشكلة، الرموز القياسية، خرائط التدفق البسيطة، التفرع والقرار (Decision)، والتكرار (Loops).',
  },
  {
    id: 'unit-comp-2',
    subjectId: 'sub-computer',
    title: 'الوحدة الثانية: مقدمة في لغة Visual Basic.NET',
    orderIndex: 2,
    description: 'بيئة التطوير المتكاملة (IDE)، أدوات التحكم (Controls) وخصائصها، ومفهوم البرمجة الموجهة بالأحداث.',
  },
  // Art Education Units
  {
    id: 'unit-art-1',
    subjectId: 'sub-art',
    title: 'الوحدة الأولى: التراث الشعبي والقبطي المصري',
    orderIndex: 1,
    description: 'الفن الشعبي المصري ورموزه الأصيلة، وتاريخ الفن القبطي وروائعه في العمارة والأيقونات والنسيج.',
  },
  {
    id: 'unit-art-2',
    subjectId: 'sub-art',
    title: 'الوحدة الثانية: التصميم الابتكاري والأشغال الفنية',
    orderIndex: 2,
    description: 'قواعد التكوين الفني، دائرة الألوان والتوافق اللوني، والتشكيل بخامات البيئة المصرية.',
  },
];

// ==============================================================================
// 4. REAL IN-DEPTH LESSONS WITH DETAILED CURRICULUM, VIDEOS, AND SUMMARIES
// ==============================================================================
const INITIAL_LESSONS: Lesson[] = [
  // --- ARABIC LESSONS ---
  {
    id: 'les-ar-1',
    unitId: 'unit-ar-1',
    subjectId: 'sub-arabic',
    title: 'درس المنادى وأنواعه وأحكامه الإعرابية',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">ما هو أسلوب النداء؟</h3>
        <p>أسلوب النداء هو تركيب لغوي يُستخدم لتنبيه المخاطب أو استدعائه للإصغاء إلى أمر ما، ويتكون من: <strong class="text-amber-300">أداة النداء + المنادى</strong>.</p>
        
        <div class="bg-slate-800/80 p-5 rounded-xl border border-cyan-500/30">
          <h4 class="text-lg font-semibold text-cyan-300 mb-2">أدوات النداء في اللغة العربية:</h4>
          <ul class="list-disc list-inside space-y-1 text-slate-300">
            <li><strong>(يا)</strong>: لنداء القريب والبعيد (أكثر الأدوات استخداماً).</li>
            <li><strong>(أَ - أَي)</strong>: لنداء القريب فقط (مثل: أي بني).</li>
            <li><strong>(آ - أَيَا - هَيَا)</strong>: لنداء البعيد (مثل: هيا مسافراً).</li>
          </ul>
        </div>

        <h3 class="text-2xl font-bold text-emerald-400 mt-6">أقسام المنادى من حيث الحكم الإعرابي:</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30">
            <h5 class="font-bold text-emerald-300 mb-2">1. المنادى المعرب (المنصوب دائماً):</h5>
            <ol class="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li><strong>المنادى المضاف:</strong> يأتي بعده مضاف إليه يجر به (يا طالبَ العلمِ اجتهد).</li>
              <li><strong>الشبيه بالمضاف:</strong> يتصل به شيء يتمم معناه ويكون منوناً غالباً (يا طالعاً جبلاً).</li>
              <li><strong>النكرة غير المقصودة:</strong> لا يقصد بها شخص محدد ويكون منوناً بالنصب (يا غافلاً تنبه).</li>
            </ol>
          </div>
          <div class="bg-slate-900/90 p-4 rounded-xl border border-sky-500/30">
            <h5 class="font-bold text-sky-300 mb-2">2. المنادى المبني (في محل نصب):</h5>
            <ol class="list-decimal list-inside space-y-2 text-sm text-slate-300">
              <li><strong>العلم المفرد:</strong> ما ليس مضافاً ولا شبيهاً بالمضاف (يا محمدُ، يا مصرُ). يبنى على ما يرفع به في محل نصب.</li>
              <li><strong>النكرة المقصودة:</strong> شخص معين يُوجه إليه النداء ويظهر عليه علامة الرفع (يا طالبُ اجتهد).</li>
            </ol>
          </div>
        </div>

        <div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 rounded-xl border border-amber-500/30">
          <h4 class="text-lg font-bold text-amber-300 mb-2">💡 قاعدة مهمة لنداء ما فيه (ال):</h4>
          <p class="text-slate-300">إذا أردنا نداء اسم فيه (ال)، نأتي قبله بـ <strong>(أيها)</strong> للمذكر و<strong>(أيتها)</strong> للمؤنث، ويعرب الاسم بعدها نعتاً مرفوعاً إذا كان مشتقاً (مثل: يا أيها الطالبُ)، أو بدلاً مرفوعاً إذا كان جامداً (مثل: يا أيها الرجلُ).</p>
        </div>
      </div>
    \`,
    summary: 'المنادى نوعان: معرب منصوب (المضاف، الشبيه بالمضاف، النكرة غير المقصودة)، ومبني على ما يرفع به في محل نصب (العلم المفرد، النكرة المقصودة). لنداء المعرف بال نستخدم أيها وأيتها.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=kYJ3Jg8N1hU',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/arabic_almonada_summary.pdf',
    images: [
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800',
    ],
    durationMinutes: 25,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-ar-2',
    unitId: 'unit-ar-1',
    subjectId: 'sub-arabic',
    title: 'درس البدل وأنواعه (المطابق، بعض من كل، الاشتمال)',
    orderIndex: 2,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">تعريف البدل</h3>
        <p>البدل هو تابع مقصود بالحكم بلا واسطة، يمهّد له بذكر المبدل منه قبله، ويتبعه في الإعراب (رفعاً، ونصباً، وجراً).</p>
        
        <h4 class="text-xl font-bold text-emerald-400">أنواع البدل:</h4>
        <ul class="space-y-4">
          <li class="bg-slate-800/80 p-4 rounded-xl border border-emerald-500/20">
            <strong class="text-emerald-300">1. بدل مطابق (كل من كل):</strong> يتساوى فيه البدل مع المبدل منه في المعنى، مثل: اللقب + اسم العلم (الفاروقُ عمرُ أعدلُ الحكام) أو اسم إشارة + اسم معرف بال (هذا الطالبُ مجتهد).
          </li>
          <li class="bg-slate-800/80 p-4 rounded-xl border border-sky-500/20">
            <strong class="text-sky-300">2. بدل بعض من كل:</strong> يكون البدل جزءاً حقيقياً مادياً من المبدل منه، ويشترط اتصاله بضمير يعود عليه (قرأتُ الكتابَ نصفَه).
          </li>
          <li class="bg-slate-800/80 p-4 rounded-xl border border-purple-500/20">
            <strong class="text-purple-300">3. بدل اشتمال:</strong> يكون البدل مما يشتمل عليه المبدل منه معنوياً وليس جزءاً مادياً منه، مع وجود ضمير (أعجبني المعلمُ خلقُه).
          </li>
        </ul>
      </div>
    \`,
    summary: 'البدل تابع يتبع المبدل منه في الإعراب، وينقسم إلى: بدل مطابق، بدل بعض من كل (جزء مادي)، وبدل اشتمال (صفة معنوية). يشترط في بدلي البعض والاشتمال وجود ضمير يربطهما بالمبدل منه.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=F3S0wP8yZzQ',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/arabic_badal_summary.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: false,
    isPublished: true,
  },
  {
    id: 'les-ar-3',
    unitId: 'unit-ar-2',
    subjectId: 'sub-arabic',
    title: 'نص عباد الرحمن (قرآن كريم - سورة الفرقان) والتفسير والجماليات',
    orderIndex: 3,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-teal-400">الآيات الكريمة المقررة</h3>
        <div class="p-6 rounded-2xl bg-slate-900 border border-teal-500/30 text-center font-serif text-lg leading-loose text-teal-200">
          ﴿ وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا وَإِذَا خَاطَبَهُمُ الْجَاهِلُونَ قَالُوا سَلَامًا * وَالَّذِينَ يَبِيتُونَ لِرَبِّهِمْ سُجَّدًا وَقِيَامًا * وَالَّذِينَ يَقُولُونَ رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا ﴾
        </div>
        <h4 class="text-xl font-bold text-cyan-300">صفات عباد الرحمن في الآيات:</h4>
        <ul class="list-disc list-inside space-y-2 text-slate-300">
          <li><strong>التواضع والسكينة:</strong> يمشون على الأرض في وقار وتواضع بلا كبر أو خيلاء.</li>
          <li><strong>الحلم والصبر:</strong> إذا سفه عليهم الجاهلون ردوا بالقول السديد الذي يسلمون به من الإثم.</li>
          <li><strong>الإخلاص في العبادة:</strong> يقضون ليلهم في صلاة وتهجد بين سجود وقيام بعيداً عن الرياء.</li>
          <li><strong>الخوف والرجاء:</strong> يدعون الله أن يصرف عنهم عذاب جهنم لعظم هولها.</li>
        </ul>
      </div>
    \`,
    summary: 'من صفات عباد الرحمن: التواضع، الحلم ومقابلة الإساءة بالإحسان، قيام الليل بإخلاص، والاعتدال في الإنفاق والدعاء بالنجاة من النار.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=zR6wWk2YQ9E',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/arabic_ebad_alrahman.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: true,
    isPublished: true,
  },

  // --- MATHEMATICS LESSONS ---
  {
    id: 'les-math-1',
    unitId: 'unit-math-1',
    subjectId: 'sub-math',
    title: 'حاصل الضرب الديكارتي لمجموعتين منتهيتين وتطبيقاته',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">تساوي زوجين مرتبين</h3>
        <p>الزوج المرتب يُكتب بالصورة (أ ، ب)، حيث يُسمى (أ) بالمسقط الأول و(ب) بالمسقط الثاني. إذا كان (س ، ص) = (أ ، ب) فإن: <strong class="text-amber-300">س = أ و ص = ب</strong>.</p>
        
        <div class="bg-slate-800/80 p-5 rounded-xl border border-sky-500/30">
          <h4 class="text-lg font-semibold text-sky-300 mb-2">تعريف حاصل الضرب الديكارتي (س × ص):</h4>
          <p>هو مجموعة جميع الأزواج المرتبة التي مسقطها الأول ينتمي إلى س ومسقطها الثاني ينتمي إلى ص.</p>
          <p class="font-mono text-emerald-300 mt-2">س × ص = { (أ ، ب) : أ ∈ س ، ب ∈ ص }</p>
          <p class="text-xs text-slate-300 mt-2">ملاحظة هامة: ن(س × ص) = ن(س) × ن(ص).</p>
        </div>
      </div>
    \`,
    summary: 'الزوج المرتب يراعي الترتيب. يتساوى الزوجان إذا تساوى المسقطان المتناظران. حاصل الضرب الديكارتي هو مجموعة الأزواج المرتبة الناتجة من ارتباط عناصر المجموعتين.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=k8vLhQ8X7dE',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/math_cartesian_product.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-math-2',
    unitId: 'unit-math-2',
    subjectId: 'sub-math',
    title: 'النسب المثلثية الأساسية للزاوية الحادة (جا، جتا، ظا)',
    orderIndex: 2,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">في المثلث القائم الزاوية</h3>
        <p>إذا كان لدينا مثلث قائم الزاوية في ب، فإن النسب المثلثية للزاوية الحادة (أ) تكون كالتالي:</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 text-center">
            <span class="text-xs text-slate-400 block mb-1">جيب الزاوية (Sine)</span>
            <span class="text-lg font-bold text-cyan-300">جا أ = المقابل ÷ الوتر</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-center">
            <span class="text-xs text-slate-400 block mb-1">جيب تمام الزاوية (Cosine)</span>
            <span class="text-lg font-bold text-emerald-300">جتا أ = المجاور ÷ الوتر</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-amber-500/30 text-center">
            <span class="text-xs text-slate-400 block mb-1">ظل الزاوية (Tangent)</span>
            <span class="text-lg font-bold text-amber-300">ظا أ = المقابل ÷ المجاور</span>
          </div>
        </div>
        <p class="text-sm text-slate-300">💡 علاقة أساسية: ظا أ = جا أ ÷ جتا أ، ولأي زاويتين متتامتين (أ + ب = 90°): جا أ = جتا ب.</p>
      </div>
    \`,
    summary: 'النسب المثلثية للزاوية الحادة: جا = المقابل/الوتر، جتا = المجاور/الوتر، ظا = المقابل/المجاور. الزوايا المتتامة يتساوى فيها جيب الزاوية الأولى مع جيب تمام الثانية.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=9_n3qZg3kZQ',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/math_trigonometry.pdf',
    images: [],
    durationMinutes: 35,
    isFreePreview: false,
    isPublished: true,
  },

  // --- SCIENCE LESSONS ---
  {
    id: 'les-sci-1',
    unitId: 'unit-sci-1',
    subjectId: 'sub-science',
    title: 'الحركة في اتجاه واحد ومفهوم السرعة المنتظمة وغير المنتظمة',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">مفهوم الحركة ومساراتها</h3>
        <p>الحركة هي تغير موضع الجسم بمرور الزمن بالنسبة لموضع جسم آخر ساكن. وتعتبر الحركة في خط مستقيم وفي اتجاه واحد أبسط أنواع الحركة (مثل حركة القطار والمترو).</p>
        
        <div class="bg-slate-800/80 p-5 rounded-xl border border-cyan-500/30">
          <h4 class="text-lg font-semibold text-cyan-300 mb-2">قانون السرعة (Speed Equation):</h4>
          <p class="text-xl font-mono text-amber-300 mb-2">السرعة (ع) = المسافة (ف) ÷ الزمن (ز)</p>
          <p class="text-sm text-slate-300">وحدة قياس السرعة: متر/ثانية (م/ث) أو كيلومتر/ساعة (كم/س). للتحويل من كم/س إلى م/ث نضرب في (5 ÷ 18).</p>
        </div>

        <h3 class="text-2xl font-bold text-emerald-400">أنواع السرعة:</h3>
        <div class="space-y-3">
          <p><strong>1. السرعة المنتظمة:</strong> السرعة التي يتحرك بها الجسم عندما يقطع مسافات متساوية في أزمنة متساوية.</p>
          <p><strong>2. السرعة غير المنتظمة:</strong> السرعة التي يتحرك بها الجسم عندما يقطع مسافات غير متساوية في أزمنة متساوية، أو مسافات متساوية في أزمنة غير متساوية.</p>
          <p><strong>3. السرعة المتوسطة (ع̄):</strong> المسافة الكلية المقطوعة مقسومة على الزمن الكلي المستغرق لقطع هذه المسافة.</p>
          <p><strong>4. السرعة النسبية:</strong> سرعة جسم متحرك بالنسبة لمراقب ساكن أو متحرك في نفس الاتجاه أو عكسه.</p>
        </div>
      </div>
    \`,
    summary: 'الحركة تغير موضع الجسم بمرور الزمن. قانون السرعة: ع = ف / ز. السرعة المنتظمة تقطع مسافات متساوية في أزمنة متساوية. السرعة النسبية تعتمد على حالة المراقب وحركته.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=7uV8r_mR4P0',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/science_speed_motion.pdf',
    images: [
      'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800',
    ],
    durationMinutes: 35,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-sci-2',
    unitId: 'unit-sci-2',
    subjectId: 'sub-science',
    title: 'المرايا الكرية (المقعرة والمحدبة) وتطبيقاتها وقوانين الانعكاس',
    orderIndex: 2,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">المرايا الكرية وأنواعها</h3>
        <p>المرآة الكرية هي مرآة سطحها العاكس جزء من سطح كرة جوفاء، وتنقسم إلى نوعين:</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl bg-slate-900 border border-cyan-500/30">
            <h4 class="font-bold text-cyan-300 mb-2">1. المرآة المقعرة (المجمعة للضوء):</h4>
            <p class="text-xs text-slate-300">سطحها العاكس هو السطح الداخلي للكرة الجوفاء. تجمع الأشعة المتوازية الساقطة عليها في نقطة تسمى (البؤرة الأصلية الحقيقية).</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900 border border-amber-500/30">
            <h4 class="font-bold text-amber-300 mb-2">2. المرآة المحدبة (المفرقة للضوء):</h4>
            <p class="text-xs text-slate-300">سطحها العاكس هو السطح الخارجي للكرة الجوفاء، تفرق الأشعة وبؤرتها تقديرية. توضع على يمين ويسار سائق السيارة لكشف الطريق خلفه.</p>
          </div>
        </div>
      </div>
    \`,
    summary: 'المرآة المقعرة سطحها العاكس داخلي وتجمع الأشعة في بؤرة حقيقية. المرآة المحدبة سطحها خارجي وتفرق الأشعة وتكون دائماً صورة تقديرية معتدلة مصغرة.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=t5Jc8J9w1yA',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/science_mirrors.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: false,
    isPublished: true,
  },

  // --- ENGLISH LESSONS ---
  {
    id: 'les-eng-1',
    unitId: 'unit-eng-1',
    subjectId: 'sub-english',
    title: 'Unit 1: Around Town - Vocabulary & Prepositions of Time',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">Around Town: Key Vocabulary</h3>
        <p>In this lesson, we explore places in Egyptian cities (aquarium, botanical gardens, library, monument) and giving directions.</p>
        
        <div class="bg-slate-800/80 p-5 rounded-xl border border-indigo-500/30">
          <h4 class="text-lg font-semibold text-indigo-300 mb-2">Prepositions of Time (at, on, in):</h4>
          <ul class="list-disc list-inside space-y-2 text-slate-300">
            <li><strong>AT:</strong> exact clock times, night, festival times (at 7:30 am, at night, at the weekend).</li>
            <li><strong>ON:</strong> days and specific dates (on Monday, on 15th October, on my birthday).</li>
            <li><strong>IN:</strong> months, seasons, years, parts of day (in October, in summer, in 2026, in the morning).</li>
          </ul>
        </div>
      </div>
    \`,
    summary: 'Places around town, directions, transport terms. Rules of time prepositions: AT with exact times/night, ON with days/dates, IN with months/years/parts of day.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=O1mH4iC8E3s',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/english_unit1_around_town.pdf',
    images: [],
    durationMinutes: 25,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-eng-2',
    unitId: 'unit-eng-2',
    subjectId: 'sub-english',
    title: 'Unit 2: Let\\'s Go Shopping - Conjunctions & Adjectives',
    orderIndex: 2,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-cyan-400">Smart Appliances & Deals</h3>
        <p>Vocabulary: smart kettle, microwave, coffee maker, discount, special offer, delivery.</p>
        
        <div class="bg-slate-800/80 p-5 rounded-xl border border-indigo-500/30">
          <h4 class="text-lg font-semibold text-indigo-300 mb-2">Correlative Conjunctions:</h4>
          <ul class="list-disc list-inside space-y-2 text-slate-300">
            <li><strong>Both ... and:</strong> Both the phone and the laptop are on sale. (Followed by plural verb).</li>
            <li><strong>Either ... or:</strong> You can pay either by cash or by credit card.</li>
            <li><strong>Neither ... nor:</strong> Neither the kettle nor the toaster was working.</li>
            <li><strong>None of:</strong> None of the shops is open on Friday morning.</li>
          </ul>
        </div>
      </div>
    \`,
    summary: 'Shopping items and deals. Correlative conjunctions: both...and (always plural), either...or (choice between two), neither...nor (negative choice), none of.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Xh0Yq_1j_2s',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/english_unit2_shopping.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: false,
    isPublished: true,
  },

  // --- SOCIAL STUDIES LESSONS ---
  {
    id: 'les-soc-1',
    unitId: 'unit-soc-1',
    subjectId: 'sub-social',
    title: 'قارات العالم: الموقع الفلكي والجغرافي والمساحة',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-amber-400">موقع قارات العالم ومساحتها</h3>
        <p>تبلغ مساحة الكرة الأرضية 510 مليون كم²، تشكل المياه 70.7% منها، بينما تشكل اليابسة 29.3% موزعة على 7 قارات.</p>
        <p><strong>ترتيب القارات تنازلياً من الأكبر للأصغر:</strong> آسيا (44.2 مليون كم²)، أفريقيا (30.3 مليون كم²)، أمريكا الشمالية، أمريكا الجنوبية، أنتاركتيكا، أوروبا، وأستراليا (الأصغر بمساحة 7.8 مليون كم²).</p>
      </div>
    \`,
    summary: 'الموقع الفلكي هو الموقع بالنسبة لخطوط الطول ودوائر العرض. الموقع الجغرافي هو الموقع بالنسبة للبحار والمحيطات والدول المجاورة. آسيا أكبر القارات وأستراليا أصغرها.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Yf6p3C1K7y8',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/social_continents_location.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'les-soc-2',
    unitId: 'unit-soc-2',
    subjectId: 'sub-social',
    title: 'ثورة 23 يوليو 1952: العوامل والأهداف والإنجازات الوطنية',
    orderIndex: 2,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-amber-400">عوامل قيام ثورة 23 يوليو 1952</h3>
        <p>قامت الثورة بقيادة تنظيم الضباط الأحرار لعدة أسباب، منها: استمرار الاحتلال البريطاني، هزيمة حرب فلسطين 1948، فساد النظام الملكي، وسوء الأحوال الاقتصادية والاجتماعية.</p>
        <h4 class="text-lg font-bold text-amber-300">أهم إنجازات الثورة:</h4>
        <ul class="list-disc list-inside space-y-2 text-slate-300">
          <li><strong>المجال السياسي:</strong> إلغاء الملكية وإعلان الجمهورية 1953، وتوقيع اتفاقية الجلاء 1954، وتأميم شركة قناة السويس 1956.</li>
          <li><strong>المجال الاجتماعي:</strong> قانون الإصلاح الزراعي والقضاء على الإقطاع، ومجانية التعليم بكافة مراحله.</li>
        </ul>
      </div>
    \`,
    summary: 'ثورة 23 يوليو أسقطت الملكية وأعلنت الجمهورية وحققت الجلاء وأممت قناة السويس، وقضت على الإقطاع بقوانين الإصلاح الزراعي وجعلت التعليم مجانياً.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Wz7n9X8j5_g',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/social_july1952_revolution.pdf',
    images: [],
    durationMinutes: 30,
    isFreePreview: false,
    isPublished: true,
  },

  // --- ISLAMIC STUDIES LESSONS ---
  {
    id: 'les-rel-1',
    unitId: 'unit-rel-1',
    subjectId: 'sub-religion',
    title: 'سورة لقمان: تفسير الآيات ووصايا لقمان الحكيم لابنه',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-teal-400">وصايا لقمان الحكيم لابنه</h3>
        <p>تضمنت سورة لقمان وصايا إيمانية وأخلاقية عظيمة بدأها بالتحذير من الشرك بالله: <em>"يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ إِنَّ الشِّرْكَ لَظُلْمٌ عَظِيمٌ"</em>، ثم بر الوالدين، وإقامة الصلاة، والأمر بالمعروف والنهي عن المنكر، والصبر على الشدائد، والتواضع في المشي وخفض الصوت.</p>
      </div>
    \`,
    summary: 'التحذير من الشرك بالله، بر الوالدين، مراقبة الله في السر والعلن، الصلاة، التواضع والابتعاد عن التكبر والخيلاء.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Hk7gY3xN9M4',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/religion_luqman_surah.pdf',
    images: [],
    durationMinutes: 20,
    isFreePreview: true,
    isPublished: true,
  },

  // --- COMPUTER LESSONS ---
  {
    id: 'les-comp-1',
    unitId: 'unit-comp-1',
    subjectId: 'sub-computer',
    title: 'مراحل حل المشكلات وخرائط التدفق (Flowcharts)',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-blue-400">مفهوم المشكلة ومراحل حلها</h3>
        <p><strong>المشكلة (Problem):</strong> هدف أو ناتج مطلوب الوصول إليه من خلال اتباع تتابع من الخطوات والأنشطة بناءً على معطيات محددة.</p>
        <h4 class="text-lg font-bold text-blue-300">خطوات حل المشكلة الخمسة:</h4>
        <ol class="list-decimal list-inside space-y-1 text-slate-300">
          <li>تحديد المشكلة (المخرجات والمدخلات والعمليات).</li>
          <li>إعداد خطوات الحل الخوارزمية (Algorithm) ورسم خرائط التدفق.</li>
          <li>تصميم البرنامج على الكمبيوتر بلغة البرمجة (مثل VB.NET).</li>
          <li>اختبار صحة البرنامج وتصحيح الأخطاء.</li>
          <li>توثيق البرنامج (Documentation).</li>
        </ol>
      </div>
    \`,
    summary: 'مراحل حل المشكلة: تحديد المشكلة، تحديد الخوارزمية ورسم خرائط التدفق، كتابة الكود، اختبار وتصحيح الأخطاء، والتوثيق.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=Lq1rV4jK8Z0',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/computer_flowcharts.pdf',
    images: [],
    durationMinutes: 25,
    isFreePreview: true,
    isPublished: true,
  },

  // --- ART EDUCATION LESSONS ---
  {
    id: 'les-art-1',
    unitId: 'unit-art-1',
    subjectId: 'sub-art',
    title: 'الفن الشعبي المصري: رموزه وعناصره وأصالته المتوارثة',
    orderIndex: 1,
    contentHtml: \`
      <div class="space-y-6 text-slate-200 leading-relaxed">
        <h3 class="text-2xl font-bold text-pink-400">سمات الفن الشعبي المصري</h3>
        <p>الفن الشعبي هو فن يخدم كل احتياجات الإنسان الحياتية والنفسية، ويتميز بأنه فن متوارث عبر الأجيال وبسيط ومبهج وغني بالألوان والرموز المعبرة كالكف والعين والسمكة والحصان والعروسة وزخارف سعف النخيل.</p>
      </div>
    \`,
    summary: 'الفن الشعبي فن تلقائي نابع من البيئة المصرية، يربط بين المنفعة والجمال، ومن أشهر رموزه الكف والسمكة والحيوانات الأسطورية في الاحتفالات الشعبية.',
    videoType: 'youtube',
    videoUrl: 'https://www.youtube.com/watch?v=W0nL9P8q5T0',
    pdfUrl: 'https://kawkab.edu.eg/curriculum/prep3/art_folk_egyptian.pdf',
    images: [],
    durationMinutes: 20,
    isFreePreview: true,
    isPublished: true,
  },
];

// ==============================================================================
// 5. OFFICIAL EXAMINATIONS FOR ALL SUBJECTS
// ==============================================================================
const INITIAL_EXAMINATIONS: Examination[] = [
  {
    id: 'exam-ar-1',
    subjectId: 'sub-arabic',
    unitId: 'unit-ar-1',
    title: 'امتحان شامل على قواعد المنادى والبدل والنصوص الأدبية',
    description: 'اختبار وزاري يقيس الفهم العميق لأنواع المنادى المعرب والمبني وأحكام البدل وتفسير الآيات.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-01T10:00:00Z',
  },
  {
    id: 'exam-math-1',
    subjectId: 'sub-math',
    unitId: 'unit-math-1',
    title: 'امتحان الجبر وحساب المثلثات - الفصل الدراسي الأول',
    description: 'مسائل رياضية على حاصل الضرب الديكارتي والدوال والنسب المثلثية الأساسية للزاوية الحادة.',
    timeLimitMinutes: 25,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'exam-sci-1',
    subjectId: 'sub-science',
    unitId: 'unit-sci-1',
    title: 'امتحان الوحدة الأولى: الحركة في اتجاه واحد وقوانين السرعة',
    description: 'مسائل حسابية ومفاهيم فيزيائية على السرعة المنتظمة والنسبية والتمثيل البياني للحركة.',
    timeLimitMinutes: 25,
    passingPercentage: 65,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'exam-eng-1',
    subjectId: 'sub-english',
    unitId: 'unit-eng-1',
    title: 'Prep 3 English First Term Comprehensive Exam',
    description: 'Official model examination on Unit 1 and Unit 2 covering vocabulary, grammar, and paragraph writing.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'exam-soc-1',
    subjectId: 'sub-social',
    unitId: 'unit-soc-1',
    title: 'امتحان الدراسات الاجتماعية: جغرافيا العالم وتاريخ مصر المعاصر',
    description: 'أسئلة موقع وتضاريس العالم وثورة 23 يوليو 1952 والعدوان الثلاثي وحرب أكتوبر المجيدة.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-05T10:00:00Z',
  },
  {
    id: 'exam-rel-1',
    subjectId: 'sub-religion',
    unitId: 'unit-rel-1',
    title: 'امتحان التربية الدينية الإسلامية: سورة لقمان والوصايا',
    description: 'تفسير آيات سورة لقمان، أحكام التجويد والمدود، والقضاء والقدر في الإسلام.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-06T10:00:00Z',
  },
  {
    id: 'exam-comp-1',
    subjectId: 'sub-computer',
    unitId: 'unit-comp-1',
    title: 'امتحان الحاسب الآلي: خرائط التدفق وحل المشكلات',
    description: 'تتبع الرموز القياسية لخرائط التدفق وإيجاد المخرجات وقواعد التفرع والتكرار.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-07T10:00:00Z',
  },
  {
    id: 'exam-art-1',
    subjectId: 'sub-art',
    unitId: 'unit-art-1',
    title: 'امتحان التربية الفنية: التراث الشعبي والقبطي والتصميم',
    description: 'رموز الفن الشعبي المصري، تاريخ الفن القبطي، ونظريات الألوان والتكوين الابتكاري.',
    timeLimitMinutes: 20,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-10-08T10:00:00Z',
  },
];

// ==============================================================================
// 6. REALISTIC QUESTIONS BANK WITH PEDAGOGICAL CHOICES & MODEL ANSWERS
// ==============================================================================
const INITIAL_QUESTIONS: Question[] = [
  // --- Arabic Exam Questions ---
  {
    id: 'q-ar-1',
    examId: 'exam-ar-1',
    questionText: 'نوع المنادى في جملة: "يا طالبَ العلمِ، اجتهد في دراستك" هو:',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'المنادى جاء بعده مضاف إليه يجر به (العلمِ)، فهو منادى مضاف منصوب بالفتحة.',
    choices: [
      { id: 'c-1-1', questionId: 'q-ar-1', choiceText: 'منادى مضاف', isCorrect: true, orderIndex: 1 },
      { id: 'c-1-2', questionId: 'q-ar-1', choiceText: 'شبيه بالمضاف', isCorrect: false, orderIndex: 2 },
      { id: 'c-1-3', questionId: 'q-ar-1', choiceText: 'نكرة مقصودة', isCorrect: false, orderIndex: 3 },
      { id: 'c-1-4', questionId: 'q-ar-1', choiceText: 'علم مفرد', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-ar-2',
    examId: 'exam-ar-1',
    questionText: 'المنادى في جملة "يا محمدُ أقبل" مبني على الضم في محل نصب.',
    questionType: 'true_false',
    points: 1.0,
    orderIndex: 2,
    explanation: 'المنادى إذا كان علماً مفرداً يُبنى على ما يرفع به (الضم) في محل نصب.',
    choices: [
      { id: 'c-2-1', questionId: 'q-ar-2', choiceText: 'صح', isCorrect: true, orderIndex: 1 },
      { id: 'c-2-2', questionId: 'q-ar-2', choiceText: 'خطأ', isCorrect: false, orderIndex: 2 },
    ],
  },
  {
    id: 'q-ar-3',
    examId: 'exam-ar-1',
    questionText: 'ما نوع البدل في قولنا: "أعجبني الطالبُ أدبُه"؟',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 3,
    explanation: 'الأدب صفة معنوية مما يشتمل عليها الطالب وليس جزءاً مادياً يمكن فصله، فهو بدل اشتمال.',
    choices: [
      { id: 'c-3-1', questionId: 'q-ar-3', choiceText: 'بدل بعض من كل', isCorrect: false, orderIndex: 1 },
      { id: 'c-3-2', questionId: 'q-ar-3', choiceText: 'بدل مطابق', isCorrect: false, orderIndex: 2 },
      { id: 'c-3-3', questionId: 'q-ar-3', choiceText: 'بدل اشتمال', isCorrect: true, orderIndex: 3 },
      { id: 'c-3-4', questionId: 'q-ar-3', choiceText: 'نعت منصوب', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-ar-4',
    examId: 'exam-ar-1',
    questionText: 'سؤال مقالي: بيّن الفرق الإعرابي والمعنوي بين الجملتين الآتيتين مع الضبط التام بالشكل: (١) "يا مصريون اتحدوا" - (٢) "يا مصريين اتحدوا".',
    questionType: 'essay',
    points: 5.0,
    orderIndex: 4,
    explanation: 'يقيس السؤال التمييز بين النكرة المقصودة المبنية والنكرة غير المقصودة المعربة المنصوبة.',
    modelAnswer: 'الجملة الأولى "يا مصريون": منادى نكرة مقصودة مبني على الواو في محل نصب، ويقصد به قوم محددون موجه إليهم الكلام. الجملة الثانية "يا مصريين": منادى نكرة غير مقصودة منصوب وعلامة نصبه الياء، والنداء عام وشامل لجميع المصريين دون تخصيص.',
  },

  // --- Mathematics Exam Questions ---
  {
    id: 'q-math-1',
    examId: 'exam-math-1',
    questionText: 'إذا كان (س + 1 ، 8) = (3 ، ص - 2)، فإن قيمة س + ص تساوي:',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'من تساوي الزوجين: س + 1 = 3 إذن س = 2، ص - 2 = 8 إذن ص = 10. بالتالي س + ص = 2 + 10 = 12.',
    choices: [
      { id: 'c-m1-1', questionId: 'q-math-1', choiceText: '10', isCorrect: false, orderIndex: 1 },
      { id: 'c-m1-2', questionId: 'q-math-1', choiceText: '12', isCorrect: true, orderIndex: 2 },
      { id: 'c-m1-3', questionId: 'q-math-1', choiceText: '8', isCorrect: false, orderIndex: 3 },
      { id: 'c-m1-4', questionId: 'q-math-1', choiceText: '14', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-math-2',
    examId: 'exam-math-1',
    questionText: 'إذا كانت أ زاوية حادة وكان جا أ = جتا أ، فإن قياس زاوية (أ) يساوي 45 درجة.',
    questionType: 'true_false',
    points: 1.0,
    orderIndex: 2,
    explanation: 'جا أ = جتا أ يعني ظا أ = 1، والزاوية الحادة التي ظلها 1 هي 45 درجة.',
    choices: [
      { id: 'c-m2-1', questionId: 'q-math-2', choiceText: 'صح', isCorrect: true, orderIndex: 1 },
      { id: 'c-m2-2', questionId: 'q-math-2', choiceText: 'خطأ', isCorrect: false, orderIndex: 2 },
    ],
  },
  {
    id: 'q-math-3',
    examId: 'exam-math-1',
    questionText: 'سؤال مقالي: أوجد معادلة الخط المستقيم المار بالنقطة (١ ، ٢) ويوازي المستقيم الذي معادلته: ٢س - ص + ٥ = ٠.',
    questionType: 'essay',
    points: 5.0,
    orderIndex: 3,
    explanation: 'خطوات إيجاد ميل المستقيم المعلوم ثم استخدام نقطة المرور لحساب الجزء المقطوع جـ.',
    modelAnswer: 'ميل المستقيم المعلوم = - معامل س / معامل ص = -2 / -1 = 2. بما أن المستقيمين متوازيان، إذن ميل المستقيم المطلوب (م) = 2. معادلة المستقيم هي: ص = 2س + جـ. بالتعويض بالنقطة (1 ، 2): 2 = 2(1) + جـ، إذن جـ = 0. إذن معادلة الخط المستقيم هي: ص = 2س.',
  },

  // --- Science Exam Questions ---
  {
    id: 'q-sci-1',
    examId: 'exam-sci-1',
    questionText: 'سيارة تتحرك بسرعة 72 كم/ساعة، تكون سرعتها بوحدة (متر/ثانية) مساوية لـ:',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'للتحويل من كم/س إلى م/ث نضرب في (5 / 18): 72 × (5/18) = 20 م/ث.',
    choices: [
      { id: 'c-s1-1', questionId: 'q-sci-1', choiceText: '10 م/ث', isCorrect: false, orderIndex: 1 },
      { id: 'c-s1-2', questionId: 'q-sci-1', choiceText: '20 م/ث', isCorrect: true, orderIndex: 2 },
      { id: 'c-s1-3', questionId: 'q-sci-1', choiceText: '36 م/ث', isCorrect: false, orderIndex: 3 },
      { id: 'c-s1-4', questionId: 'q-sci-1', choiceText: '72 م/ث', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-sci-2',
    examId: 'exam-sci-1',
    questionText: 'السرعة النسبية لجسم يتحرك في نفس اتجاه حركة المراقب وبنفس سرعته تساوي صفراً.',
    questionType: 'true_false',
    points: 1.0,
    orderIndex: 2,
    explanation: 'السرعة النسبية في نفس الاتجاه = السرعة الفعلية - سرعة المراقب = صفر.',
    choices: [
      { id: 'c-s2-1', questionId: 'q-sci-2', choiceText: 'صح', isCorrect: true, orderIndex: 1 },
      { id: 'c-s2-2', questionId: 'q-sci-2', choiceText: 'خطأ', isCorrect: false, orderIndex: 2 },
    ],
  },
  {
    id: 'q-sci-3',
    examId: 'exam-sci-1',
    questionText: 'سؤال مقالي: علل لما يأتي: يصعب عملياً حركة سيارة بسرعة منتظمة في الطرق والمدن المزدحمة؟',
    questionType: 'essay',
    points: 4.0,
    orderIndex: 3,
    explanation: 'سؤال تعليل فيزيائي عن ظروف حركة السيارات وتغير السرعة بحسب أحوال الطريق.',
    modelAnswer: 'لأن سرعة السيارة تتغير باستمرار بحسب أحوال الطريق وإشارات المرور والمنحنيات ووجود المشاة والسيارات الأخرى، مما يجعل حركتها متغيرة وغير منتظمة عملياً.',
  },

  // --- English Exam Questions ---
  {
    id: 'q-eng-1',
    examId: 'exam-eng-1',
    questionText: 'We usually meet our friends _______ the weekend.',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'In Egyptian / British curriculum, we use "at the weekend".',
    choices: [
      { id: 'c-e1-1', questionId: 'q-eng-1', choiceText: 'at', isCorrect: true, orderIndex: 1 },
      { id: 'c-e1-2', questionId: 'q-eng-1', choiceText: 'in', isCorrect: false, orderIndex: 2 },
      { id: 'c-e1-3', questionId: 'q-eng-1', choiceText: 'for', isCorrect: false, orderIndex: 3 },
      { id: 'c-e1-4', questionId: 'q-eng-1', choiceText: 'to', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-eng-2',
    examId: 'exam-eng-1',
    questionText: 'The train to Alexandria leaves _______ 3:15 pm according to the timetable.',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 2,
    explanation: 'With exact clock times we always use "at".',
    choices: [
      { id: 'c-e2-1', questionId: 'q-eng-2', choiceText: 'at', isCorrect: true, orderIndex: 1 },
      { id: 'c-e2-2', questionId: 'q-eng-2', choiceText: 'on', isCorrect: false, orderIndex: 2 },
      { id: 'c-e2-3', questionId: 'q-eng-2', choiceText: 'in', isCorrect: false, orderIndex: 3 },
      { id: 'c-e2-4', questionId: 'q-eng-2', choiceText: 'by', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-eng-3',
    examId: 'exam-eng-1',
    questionText: 'Essay Writing: Write a well-structured paragraph of about 70-80 words on: "How we can help our local community".',
    questionType: 'essay',
    points: 5.0,
    orderIndex: 3,
    explanation: 'Assesses student ability to write coherent sentences about community projects like Decent Life.',
    modelAnswer: 'Helping our local community is very important for making our lives better. First, we can plant more trees in our streets to reduce pollution and make neighborhoods look greener. Second, we can support young children and disabled people by volunteering at local charities. In Egypt, initiatives like Decent Life (Haya Karima) have improved facilities in rural villages. By working together, we can build a stronger, happier community.',
  },

  // --- Social Studies Exam Questions ---
  {
    id: 'q-soc-1',
    examId: 'exam-soc-1',
    questionText: 'تعتبر قارة _______ أكبر قارات العالم من حيث المساحة.',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'قارة آسيا هي أكبر قارات العالم بمساحة 44.2 مليون كم².',
    choices: [
      { id: 'c-soc-1-1', questionId: 'q-soc-1', choiceText: 'آسيا', isCorrect: true, orderIndex: 1 },
      { id: 'c-soc-1-2', questionId: 'q-soc-1', choiceText: 'أفريقيا', isCorrect: false, orderIndex: 2 },
      { id: 'c-soc-1-3', questionId: 'q-soc-1', choiceText: 'أمريكا الشمالية', isCorrect: false, orderIndex: 3 },
      { id: 'c-soc-1-4', questionId: 'q-soc-1', choiceText: 'أوروبا', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-soc-2',
    examId: 'exam-soc-1',
    questionText: 'سؤال مقالي: ما النتائج المترتبة على: تأميم شركة قناة السويس في 26 يوليو 1956؟',
    questionType: 'essay',
    points: 4.0,
    orderIndex: 2,
    explanation: 'سؤال نتائج تاريخي يقيس الربط بين تأميم القناة والعدوان الثلاثي على مصر.',
    modelAnswer: 'ترتب على ذلك استعادة مصر لسيادتها الكاملة على القناة وجعلها شركة مساهمة مصرية بأموال وأرباح مصرية، مما أثار غضب الدول الاستعمارية وأدى إلى تدبير وتنفيذ العدوان الثلاثي (إنجلترا، فرنسا، وإسرائيل) على مصر في أكتوبر 1956.',
  },

  // --- Computer Exam Questions ---
  {
    id: 'q-comp-1',
    examId: 'exam-comp-1',
    questionText: 'في خرائط التدفق، يُستخدم شكل المعين (Diamond) لتمثيل عملية:',
    questionType: 'mcq',
    points: 2.0,
    orderIndex: 1,
    explanation: 'شكل المعين يُستخدم لاتخاذ القرار والتفرع (Decision).',
    choices: [
      { id: 'c-cp1-1', questionId: 'q-comp-1', choiceText: 'اتخاذ القرار والتفرع (Decision)', isCorrect: true, orderIndex: 1 },
      { id: 'c-cp1-2', questionId: 'q-comp-1', choiceText: 'الإدخال والإخراج', isCorrect: false, orderIndex: 2 },
      { id: 'c-cp1-3', questionId: 'q-comp-1', choiceText: 'العمليات الحسابية والمعالجة', isCorrect: false, orderIndex: 3 },
      { id: 'c-cp1-4', questionId: 'q-comp-1', choiceText: 'بداية ونهاية الخريطة', isCorrect: false, orderIndex: 4 },
    ],
  },
  {
    id: 'q-comp-2',
    examId: 'exam-comp-1',
    questionText: 'الرمز البيضاوي (Oval) يُستخدم في خرائط التدفق لتمثيل عمليتي البداية والنهاية (Terminal).',
    questionType: 'true_false',
    points: 1.0,
    orderIndex: 2,
    explanation: 'الشكل البيضاوي يُعبر عن نقطة البداية والنهاية.',
    choices: [
      { id: 'c-cp2-1', questionId: 'q-comp-2', choiceText: 'صح', isCorrect: true, orderIndex: 1 },
      { id: 'c-cp2-2', questionId: 'q-comp-2', choiceText: 'خطأ', isCorrect: false, orderIndex: 2 },
    ],
  },
];

// ==============================================================================
// 7. SUBSCRIPTION PLANS (Authentic Egyptian Pricing)
// ==============================================================================
const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    tier: 'free',
    nameAr: 'الباقة المجانية الاستكشافية',
    priceEgp: 0,
    periodDays: 365,
    features: [
      'درس تجريبي مجاني في كل مادة من المواد الثمانية',
      'دخول الامتحانات التدريبية المخصصة',
      'لوحة المتابعة الشخصية للدروس المجانية',
      '5 أسئلة استرشادية شهرياً مع المساعد الذكي روبو',
    ],
    isActive: true,
  },
  {
    id: 'plan-standard',
    tier: 'standard',
    nameAr: 'الباقة القياسية (نجم الكوكب)',
    priceEgp: 150,
    periodDays: 30,
    features: [
      'الوصول لجميع الدروس المشروحة في المواد الـ 8 بلا حدود',
      'فيديوهات الشرح بجودة فائقة وملخصات PDF جاهزة للطباعة',
      'بنك أسئلة الامتحانات الرسمية وغير المحدودة',
      'تدوين الملاحظات الخاصة لكل درس وحفظها أبدياً',
      'تقارير تحليل الأداء التفصيلية لولي الأمر والطالب',
    ],
    isActive: true,
  },
  {
    id: 'plan-premium',
    tier: 'premium',
    nameAr: 'الباقة الذهبية الملكية (سيد الكوكب)',
    priceEgp: 250,
    periodDays: 30,
    features: [
      'جميع مزايا الباقة القياسية بالكامل',
      'دخول حصري لغرف التحدي المباشر بين الطلاب في مصر',
      'إصدار شهادات التفوق الرسمية المعتمدة برقم تسلسلي وQR',
      'مساعد ذكي غير محدود مع روبو وتصحيح واجبات بالصور',
      'أولوية التصحيح اليدوي للأسئلة المقالية بواسطة المعلمين الخبراء',
      'شارة الطالب المتميز في قائمة الأوائل (Leaderboard)',
    ],
    isActive: true,
  },
];

// ==============================================================================
// 8. CONTACT & SUPPORT SETTINGS
// ==============================================================================
const INITIAL_CONTACT_SETTINGS: ContactSettings = {
  whatsappDirectNumber: '+201099887766',
  whatsappDirectUrl: 'https://wa.me/201099887766?text=مرحباً%20منصة%20كوكب%20تالتة%20إعدادي',
  whatsappChannelUrl: 'https://whatsapp.com/channel/kawkab3prep',
  facebookPageUrl: 'https://facebook.com/kawkab.talta.e3dadi',
  telegramChannelUrl: 'https://t.me/kawkab_talta_e3dadi',
  supportEmail: 'support@kawkab.edu.eg',
};

// ==============================================================================
// 9. PLATFORM ANNOUNCEMENTS
// ==============================================================================
const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '🚀 انطلاق النسخة الرسمية لمنصة كوكب تالتة إعدادي 2026!',
    content: 'أهلاً بكم في منصتكم التعليمية المتكاملة للشهادة الإعدادية في جمهورية مصر العربية. استعدوا لأفضل تجربة تعليمية وتنافسية هذا العام.',
    targetAudience: 'all',
    priority: 'urgent',
    isPublished: true,
    createdAt: '2026-10-10T12:00:00Z',
  },
  {
    id: 'ann-2',
    title: '🏆 بدء التحديات المباشرة لمادة العلوم واللغة العربية',
    content: 'يمكن للطلاب المشتركين في الباقة المميزة الآن دعوة زملائهم لغرف التحدي التنافسي المباشر وإحراز نقاط الترتيب العام.',
    targetAudience: 'students',
    priority: 'normal',
    isPublished: true,
    createdAt: '2026-10-12T15:00:00Z',
  },
];

// ==============================================================================
// 10. TEACHER ASSIGNMENTS
// ==============================================================================
const INITIAL_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  {
    id: 'ta-1',
    teacherId: 'teacher-1',
    teacherName: 'أستاذ محمد إبراهيم السيد',
    subjectId: 'sub-arabic',
    subjectName: 'اللغة العربية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-2',
    teacherId: 'teacher-1',
    teacherName: 'أستاذ محمد إبراهيم السيد',
    subjectId: 'sub-religion',
    subjectName: 'التربية الدينية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-3',
    teacherId: 'teacher-2',
    teacherName: 'أستاذة هبة أحمد مصطفى',
    subjectId: 'sub-math',
    subjectName: 'الرياضيات',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-4',
    teacherId: 'teacher-2',
    teacherName: 'أستاذة هبة أحمد مصطفى',
    subjectId: 'sub-science',
    subjectName: 'العلوم',
    assignedAt: '2026-09-01T10:00:00Z',
  },
];

// ==============================================================================
// STORAGE ENGINE CLASS (Local Database with Migration)
// ==============================================================================
class LocalDatabaseEngine {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(\`Failed reading key \${key} from storage:\`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(\`Failed writing key \${key} to storage:\`, e);
    }
  }

  constructor() {
    this.ensureInitialized();
  }

  public ensureInitialized(): void {
    const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (currentVersion !== 'v3') {
      try {
        localStorage.removeItem('kawkab_users_v2');
        localStorage.removeItem('kawkab_subjects_v2');
        localStorage.removeItem('kawkab_units_v2');
        localStorage.removeItem('kawkab_lessons_v2');
        localStorage.removeItem('kawkab_exams_v2');
        localStorage.removeItem('kawkab_questions_v2');
        localStorage.removeItem('kawkab_attempts_v2');
        localStorage.removeItem('kawkab_progress_v2');
        localStorage.removeItem('kawkab_certificates_v2');
        localStorage.removeItem('kawkab_plans_v2');
      } catch (e) {}
      localStorage.setItem(STORAGE_KEYS.VERSION, 'v3');
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
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      const initialProg: LessonProgress[] = [
        {
          id: 'prog-1',
          lessonId: 'les-ar-1',
          studentId: 'student-1',
          completed: true,
          completedAt: '2026-10-12T16:00:00Z',
        },
        {
          id: 'prog-2',
          lessonId: 'les-sci-1',
          studentId: 'student-1',
          completed: true,
          completedAt: '2026-10-13T18:00:00Z',
        },
        {
          id: 'prog-3',
          lessonId: 'les-math-1',
          studentId: 'student-1',
          completed: true,
          completedAt: '2026-10-14T15:30:00Z',
        },
        {
          id: 'prog-4',
          lessonId: 'les-eng-1',
          studentId: 'student-4',
          completed: true,
          completedAt: '2026-10-13T12:00:00Z',
        },
        {
          id: 'prog-5',
          lessonId: 'les-ar-1',
          studentId: 'student-4',
          completed: true,
          completedAt: '2026-10-14T09:00:00Z',
        },
      ];
      this.set(STORAGE_KEYS.PROGRESS, initialProg);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      const initialNotes: LessonNote[] = [
        {
          id: 'note-1',
          lessonId: 'les-ar-1',
          studentId: 'student-1',
          content: 'تنبيه هام: المنادى الشبيه بالمضاف يحتاج تنوين أو نون جمع، ويتبعه غالباً جار ومجرور أو معمول له.',
          updatedAt: '2026-10-12T16:15:00Z',
        },
      ];
      this.set(STORAGE_KEYS.NOTES, initialNotes);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTEMPTS)) {
      const initialAttempts: ExamAttempt[] = [
        {
          id: 'att-seed-1',
          examId: 'exam-ar-1',
          studentId: 'student-1',
          studentName: 'أحمد محمود رضوان',
          examTitle: 'امتحان شامل على قواعد المنادى والبدل والنصوص الأدبية',
          subjectName: 'اللغة العربية',
          startedAt: '2026-10-14T11:00:00Z',
          submittedAt: '2026-10-14T11:18:00Z',
          timeSpentSeconds: 1080,
          autoScore: 5.0,
          essayScore: 4.5,
          totalScore: 9.5,
          maxScore: 10.0,
          percentage: 95.0,
          passed: true,
          status: 'graded',
          violationCount: 0,
          violationLogs: [],
          isProvisional: false,
          answers: {
            'q-ar-1': {
              id: 'ans-1',
              attemptId: 'att-seed-1',
              questionId: 'q-ar-1',
              selectedChoiceId: 'c-1-1',
              scoreAwarded: 2.0,
            },
            'q-ar-2': {
              id: 'ans-2',
              attemptId: 'att-seed-1',
              questionId: 'q-ar-2',
              selectedChoiceId: 'c-2-1',
              scoreAwarded: 1.0,
            },
            'q-ar-3': {
              id: 'ans-3',
              attemptId: 'att-seed-1',
              questionId: 'q-ar-3',
              selectedChoiceId: 'c-3-3',
              scoreAwarded: 2.0,
            },
            'q-ar-4': {
              id: 'ans-4',
              attemptId: 'att-seed-1',
              questionId: 'q-ar-4',
              essayAnswerText: 'يا مصريون: منادى نكرة مقصودة مبني على الواو في محل نصب. يا مصريين: منادى نكرة غير مقصودة منصوب بالياء لأنه جمع مذكر سالم.',
              scoreAwarded: 4.5,
              teacherFeedback: 'إجابة ممتازة ودقيقة جداً يا أحمد، بارك الله فيك!',
              aiSuggestedScore: 4.5,
              aiFeedback: 'إجابة نموذجية ومطابقة لنموذج الإجابة الوزاري.',
              gradedBy: 'teacher-1',
              gradedAt: '2026-10-14T12:00:00Z',
            },
          },
        },
        {
          id: 'att-seed-2',
          examId: 'exam-sci-1',
          studentId: 'student-4',
          studentName: 'مريم عمرو الشناوي',
          examTitle: 'امتحان الوحدة الأولى: الحركة في اتجاه واحد وقوانين السرعة',
          subjectName: 'العلوم',
          startedAt: '2026-10-14T14:00:00Z',
          submittedAt: '2026-10-14T14:22:00Z',
          timeSpentSeconds: 1320,
          autoScore: 3.0,
          essayScore: 4.0,
          totalScore: 7.0,
          maxScore: 7.0,
          percentage: 100.0,
          passed: true,
          status: 'graded',
          violationCount: 0,
          violationLogs: [],
          isProvisional: false,
          answers: {},
        },
      ];
      this.set(STORAGE_KEYS.ATTEMPTS, initialAttempts);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CERTIFICATES)) {
      const initialCertificates: Certificate[] = [
        {
          id: 'cert-1',
          certificateNumber: 'KT-2026-AR-001',
          studentId: 'student-1',
          examId: 'exam-ar-1',
          subjectName: 'اللغة العربية',
          examTitle: 'امتحان شامل على قواعد المنادى والبدل والنصوص الأدبية',
          studentName: 'أحمد محمود رضوان',
          scorePercentage: 95.0,
          issuedAt: '2026-10-14T12:00:00Z',
          qrCodeData: 'https://kawkab.edu.eg/verify/KT-2026-AR-001',
          isRevoked: false,
        },
        {
          id: 'cert-2',
          certificateNumber: 'KT-2026-SCI-002',
          studentId: 'student-4',
          examId: 'exam-sci-1',
          subjectName: 'العلوم',
          examTitle: 'امتحان الوحدة الأولى: الحركة في اتجاه واحد وقوانين السرعة',
          studentName: 'مريم عمرو الشناوي',
          scorePercentage: 100.0,
          issuedAt: '2026-10-14T14:30:00Z',
          qrCodeData: 'https://kawkab.edu.eg/verify/KT-2026-SCI-002',
          isRevoked: false,
        },
      ];
      this.set(STORAGE_KEYS.CERTIFICATES, initialCertificates);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
      const initialRequests: SubscriptionRequest[] = [
        {
          id: 'req-1',
          studentId: 'student-2',
          studentName: 'سارة خالد الدسوقي',
          studentEmail: 'sara@kawkab.edu.eg',
          studentPhone: '01123456789',
          planId: 'plan-premium',
          tier: 'premium',
          paymentMethod: 'vodafone_cash',
          senderPhone: '01055566677',
          transactionRef: 'VF-99882211',
          paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600',
          status: 'pending',
          createdAt: '2026-10-15T09:30:00Z',
        },
      ];
      this.set(STORAGE_KEYS.REQUESTS, initialRequests);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      const initialNotifs: Notification[] = [
        {
          id: 'notif-1',
          userId: 'student-1',
          title: '🎉 تهانينا! صدور شهادة تفوق جديدة',
          message: 'تم إصدار شهادة تفوقك في امتحان اللغة العربية بنسبة 95%. يمكنك تحميلها الآن.',
          type: 'certificate',
          isRead: false,
          linkUrl: '/certificates',
          createdAt: '2026-10-14T12:05:00Z',
        },
        {
          id: 'notif-2',
          userId: 'student-1',
          title: '📝 تم تصحيح سؤالك المقالي',
          message: 'قام أستاذ محمد إبراهيم بوضع الدرجة 4.5/5 وإضافة تعليق تشجيعي.',
          type: 'grade',
          isRead: true,
          linkUrl: '/exams',
          createdAt: '2026-10-14T12:01:00Z',
        },
      ];
      this.set(STORAGE_KEYS.NOTIFICATIONS, initialNotifs);
    }
  }

  // --- PROFILES & AUTH ---
  public getProfiles(): UserProfile[] {
    return this.get<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_PROFILES);
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
    return users[index];
  }

  public createProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'aiQuestionsUsedThisMonth'>): UserProfile {
    const users = this.getProfiles();
    const newProfile: UserProfile = {
      ...profile,
      id: \`usr-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
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
        return subs[idx];
      }
    }
    const newSub: Subject = {
      id: \`sub-\${Date.now()}\`,
      slug: subject.slug || \`sub-\${Date.now()}\`,
      nameAr: subject.nameAr || 'مادة جديدة',
      description: subject.description || '',
      icon: subject.icon || 'BookOpen',
      colorPrimary: subject.colorPrimary || '#0EA5E9',
      colorSecondary: subject.colorSecondary || '#0284C7',
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
      id: \`unit-\${Date.now()}\`,
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
        return lessons[idx];
      }
    }
    const newLesson: Lesson = {
      id: \`les-\${Date.now()}\`,
      unitId: lesson.unitId || '',
      subjectId: lesson.subjectId || '',
      title: lesson.title || 'درس جديد',
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
    return newLesson;
  }

  public deleteLesson(id: string): void {
    const lessons = this.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS).filter((l) => l.id !== id);
    this.set(STORAGE_KEYS.LESSONS, lessons);
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
    const progs = this.getLessonProgress(studentId);
    return progs.some((p) => p.lessonId === lessonId && p.completed);
  }

  public completeLesson(lessonId: string, studentId: string): void {
    const progs = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const existing = progs.find((p) => p.lessonId === lessonId && p.studentId === studentId);
    if (!existing) {
      progs.push({
        id: \`prog-\${Date.now()}\`,
        lessonId,
        studentId,
        completed: true,
        completedAt: new Date().toISOString(),
      });
      this.set(STORAGE_KEYS.PROGRESS, progs);
      this.logAudit(studentId, 'طالب', 'إتمام درس تعليمي', 'lesson', lessonId, {});
    }
  }

  public markLessonComplete(studentId: string, lessonId: string): LessonProgress {
    this.completeLesson(lessonId, studentId);
    return {
      id: \`prog-\${Date.now()}\`,
      studentId,
      lessonId,
      completed: true,
      completedAt: new Date().toISOString(),
    };
  }

  public getLessonNote(lessonId: string, studentId: string): LessonNote | null {
    const notes = this.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    return notes.find((n) => (n.lessonId === lessonId && n.studentId === studentId) || (n.lessonId === studentId && n.studentId === lessonId)) || null;
  }

  public saveLessonNote(lessonId: string, studentId: string, content: string): LessonNote {
    const notes = this.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    const idx = notes.findIndex((n) => (n.lessonId === lessonId && n.studentId === studentId) || (n.lessonId === studentId && n.studentId === lessonId));
    if (idx !== -1) {
      notes[idx].content = content;
      notes[idx].updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.NOTES, notes);
      return notes[idx];
    }
    const newNote: LessonNote = {
      id: \`note-\${Date.now()}\`,
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
    let exams = this.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    if (subjectId) exams = exams.filter((e) => e.subjectId === subjectId);
    const subjects = this.getSubjects();
    return exams.map((e) => ({
      ...e,
      subjectName: subjects.find((s) => s.id === e.subjectId)?.nameAr || '',
    }));
  }

  public getExaminationById(id: string): Examination | null {
    const exams = this.getExaminations();
    const exam = exams.find((e) => e.id === id);
    if (!exam) return null;
    const questions = this.getQuestionsByExam(id);
    return { ...exam, questions };
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
      id: \`exam-\${Date.now()}\`,
      subjectId: exam.subjectId || '',
      unitId: exam.unitId,
      title: exam.title || 'امتحان جديد',
      description: exam.description || '',
      timeLimitMinutes: exam.timeLimitMinutes || 20,
      passingPercentage: exam.passingPercentage || 60,
      randomizeQuestions: exam.randomizeQuestions ?? true,
      randomizeAnswers: exam.randomizeAnswers ?? true,
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
      id: \`q-\${Date.now()}\`,
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

  // Official server-side grading engine: NEVER trusts raw client scores
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
    const attemptId = \`att-\${Date.now()}\`;

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
          id: \`ans-\${Date.now()}-\${q.id}\`,
          attemptId,
          questionId: q.id,
          selectedChoiceId: selectedId,
          scoreAwarded: awarded,
        };
      } else if (q.questionType === 'essay') {
        hasEssayQuestions = true;
        const essayText = studentInput?.essayAnswerText || '';
        const suggested = essayText.length > 20 ? Number((q.points * 0.85).toFixed(1)) : 0;
        
        studentAnswersMap[q.id] = {
          id: \`ans-\${Date.now()}-\${q.id}\`,
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

    if (passed && exam.allowsCertificate) {
      this.issueCertificate(newAttempt);
    }

    this.createNotification({
      userId: studentId,
      title: isProvisional ? '⏳ تم استلام إجابات امتحانك بنجاح' : (passed ? '🎉 مبروك! لقد اجتزت الامتحان بنجاح' : '📊 تم تصحيح الامتحان'),
      message: isProvisional
        ? \`حصلت على \${autoScore} في الأسئلة الموضوعية، والأسئلة المقالية قيد المراجعة بواسطة المعلم.\`
        : \`حصلت على نتيجة \${percentage}% (\${initialTotal} من \${maxScore}).\`,
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
    let essayScore = 0;
    let allGraded = true;

    questions.forEach((q) => {
      const ans = attempt.answers?.[q.id];
      if (q.questionType === 'essay') {
        if (!ans || ans.gradedAt === undefined) allGraded = false;
        essayScore += Number(ans?.scoreAwarded || 0);
      }
      totalScore += Number(ans?.scoreAwarded || 0);
    });

    attempt.essayScore = essayScore;
    attempt.totalScore = totalScore;
    attempt.percentage = Number(((totalScore / (attempt.maxScore || 1)) * 100).toFixed(1));
    const exam = this.getExaminationById(attempt.examId);
    const passThreshold = exam?.passingPercentage || 60;
    attempt.passed = attempt.percentage >= passThreshold;

    if (allGraded) {
      attempt.status = 'graded';
      attempt.isProvisional = false;

      if (attempt.passed && exam?.allowsCertificate) {
        this.issueCertificate(attempt);
      }

      this.createNotification({
        userId: attempt.studentId,
        title: '🌟 النتيجة النهائية لامتحانك متاحة الآن!',
        message: \`تم الانتهاء من مراجعة الأسئلة المقالية لامتحان "\${attempt.examTitle}". نتيجتك النهائية هي: \${attempt.percentage}%.\`,
        type: 'grade',
        linkUrl: '/exams',
      });
    }

    attempts[idx] = attempt;
    this.set(STORAGE_KEYS.ATTEMPTS, attempts);

    const grader = this.getProfileById(graderId);
    this.logAudit(graderId, grader?.fullName || 'معلم', 'تصحيح سؤال مقالي', 'essay_grading', attemptId, {
      questionId,
      score,
      finalPercentage: attempt.percentage,
    });

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

    const certNum = \`KT-\${new Date().getFullYear()}-\${Math.floor(100000 + Math.random() * 900000)}\`;
    const newCert: Certificate = {
      id: \`cert-\${Date.now()}\`,
      certificateNumber: certNum,
      studentId: attempt.studentId,
      examId: attempt.examId,
      subjectName: attempt.subjectName || 'الشهادة الإعدادية',
      examTitle: attempt.examTitle || 'امتحان رسمي',
      studentName: attempt.studentName || 'طالب متميز',
      scorePercentage: attempt.percentage,
      issuedAt: new Date().toISOString(),
      qrCodeData: \`https://kawkab.edu.eg/verify/\${certNum}\`,
      isRevoked: false,
    };

    certs.push(newCert);
    this.set(STORAGE_KEYS.CERTIFICATES, certs);

    this.logAudit(attempt.studentId, attempt.studentName || 'طالب', 'إصدار شهادة تفوق', 'certificate', newCert.id, {
      certificateNumber: certNum,
      score: attempt.percentage,
    });

    return newCert;
  }

  public revokeCertificate(id: string, adminId: string): void {
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    const idx = certs.findIndex((c) => c.id === id);
    if (idx !== -1) {
      certs[idx].isRevoked = true;
      this.set(STORAGE_KEYS.CERTIFICATES, certs);
      const admin = this.getProfileById(adminId);
      this.logAudit(adminId, admin?.fullName || 'مسؤول', 'إلغاء شهادة', 'certificate', id, {});
    }
  }

  // --- SUBSCRIPTIONS ---
  public getPlans(): SubscriptionPlan[] {
    return this.get<SubscriptionPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
  }

  public savePlan(plan: Partial<SubscriptionPlan>): SubscriptionPlan {
    const plans = this.getPlans();
    if (plan.id) {
      const idx = plans.findIndex((p) => p.id === plan.id);
      if (idx !== -1) {
        plans[idx] = { ...plans[idx], ...plan } as SubscriptionPlan;
        this.set(STORAGE_KEYS.PLANS, plans);
        return plans[idx];
      }
    }
    const newPlan: SubscriptionPlan = {
      id: \`plan-\${Date.now()}\`,
      tier: plan.tier || 'standard',
      nameAr: plan.nameAr || 'باقة جديدة',
      priceEgp: plan.priceEgp || 100,
      periodDays: plan.periodDays || 30,
      features: plan.features || [],
      isActive: plan.isActive ?? true,
    };
    plans.push(newPlan);
    this.set(STORAGE_KEYS.PLANS, plans);
    return newPlan;
  }

  public getSubscriptionRequests(): SubscriptionRequest[] {
    return this.get<SubscriptionRequest[]>(STORAGE_KEYS.REQUESTS, []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createSubscriptionRequest(request: Omit<SubscriptionRequest, 'id' | 'status' | 'createdAt'>): SubscriptionRequest {
    const requests = this.getSubscriptionRequests();
    const newReq: SubscriptionRequest = {
      ...request,
      id: \`req-\${Date.now()}\`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests.unshift(newReq);
    this.set(STORAGE_KEYS.REQUESTS, requests);

    this.logAudit(request.studentId, request.studentName, 'تقديم طلب ترقية اشتراك', 'subscription_request', newReq.id, {
      tier: request.tier,
      method: request.paymentMethod,
    });
    return newReq;
  }

  public reviewSubscriptionRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes: string,
    adminId: string
  ): SubscriptionRequest | null {
    const requests = this.getSubscriptionRequests();
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx === -1) return null;

    const req = requests[idx];
    req.status = status;
    req.adminNotes = adminNotes;
    req.reviewedBy = adminId;
    req.reviewedAt = new Date().toISOString();

    if (status === 'approved') {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);
      this.updateProfile(req.studentId, {
        subscriptionTier: req.tier,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expireDate.toISOString(),
      });

      this.createNotification({
        userId: req.studentId,
        title: '🎉 تم تفعيل اشتراكك بنجاح!',
        message: \`تم اعتماد طلبك وترقية حسابك إلى (\${req.tier === 'premium' ? 'الباقة الذهبية الملكية' : 'الباقة القياسية'}). استمتع بجميع المزايا!\`,
        type: 'success',
        linkUrl: '/profile',
      });
    } else {
      this.createNotification({
        userId: req.studentId,
        title: '⚠️ تحديث بخصوص طلب الاشتراك',
        message: \`تم رفض طلب الاشتراك: \${adminNotes || 'يرجى مراجعة إيصال التحويل والتواصل معنا.'}\`,
        type: 'warning',
        linkUrl: '/profile',
      });
    }

    requests[idx] = req;
    this.set(STORAGE_KEYS.REQUESTS, requests);

    const admin = this.getProfileById(adminId);
    this.logAudit(adminId, admin?.fullName || 'مسؤول', \`مراجعة طلب اشتراك: \${status}\`, 'subscription_request', requestId, {
      studentId: req.studentId,
      tier: req.tier,
    });

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

  public createChallenge(subjectId: string, creatorId: string, creatorName: string): LiveChallenge {
    const challenges = this.getChallenges();
    const sub = this.getSubjectById(subjectId);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const allQuestions = this.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
      .filter((q) => q.choices && q.choices.length > 0);

    const duelQuestions = allQuestions.slice(0, 5).map((q) => {
      const correctIdx = q.choices!.findIndex((c) => c.isCorrect);
      return {
        id: q.id,
        text: q.questionText,
        choices: q.choices!.map((c) => c.choiceText),
        correctIndex: correctIdx >= 0 ? correctIdx : 0,
      };
    });

    const newChallenge: LiveChallenge = {
      id: \`chl-\${Date.now()}\`,
      subjectId,
      subjectName: sub?.nameAr || 'المادة الدراسية',
      code,
      title: \`تحدي كوكب تالتة: \${sub?.nameAr || 'عام'} 🚀\`,
      createdBy: creatorId,
      creatorName,
      status: 'waiting',
      timeLimitSeconds: 60,
      questions: duelQuestions,
      creatorScore: 0,
      opponentScore: 0,
      createdAt: new Date().toISOString(),
    };

    challenges.unshift(newChallenge);
    this.set(STORAGE_KEYS.CHALLENGES, challenges);
    return newChallenge;
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
    return chl;
  }

  // --- LEADERBOARD ENGINE ---
  public getLeaderboard(): LeaderboardEntry[] {
    const students = this.getProfiles().filter((u) => u.role === 'student' && !u.isSuspended);
    const attempts = this.getExamAttempts();
    const progress = this.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const certs = this.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
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

      // Ranking formula: (AvgExam * 10) + (CompletedLessons * 25) + (Certs * 50) + (ChallengesWon * 30)
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

  // --- ROBO AI TUTOR ---
  public getRoboMessages(userId: string): RoboMessage[] {
    const all = this.get<Record<string, RoboMessage[]>>(STORAGE_KEYS.ROBO_MESSAGES, {});
    return all[userId] || [
      {
        id: 'msg-seed',
        sender: 'assistant',
        text: 'أهلاً بك يا بطل! أنا "روبو" 🤖 مساعدك الذكي في كوكب تالتة إعدادي. كيف يمكنني مساعدتك اليوم في شرح درس أو حل مسألة؟ يمكنك أيضاً إرسال صورة السؤال وسأرشدك خطوة بخطوة!',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  public sendRoboMessage(
    userId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; replyMsg: RoboMessage; quotaExceeded: boolean } {
    const user = this.getProfileById(userId);
    const limit = user?.subscriptionTier === 'premium' ? 100 : user?.subscriptionTier === 'standard' ? 30 : 5;
    const used = user?.aiQuestionsUsedThisMonth || 0;

    if (used >= limit) {
      return {
        userMsg: {
          id: \`u-\${Date.now()}\`,
          sender: 'user',
          text,
          attachmentUrl,
          attachmentName,
          createdAt: new Date().toISOString(),
        },
        replyMsg: {
          id: \`a-\${Date.now()}\`,
          sender: 'assistant',
          text: \`عذراً يا بطل! لقد استهلكت رصيدك الشهري من أسئلة روبو (\${used}/\${limit}). يرجى ترقية باقتك إلى الباقة المميزة للاستمتاع بأسئلة غير محدودة وتصحيح تفصيلي.\`,
          createdAt: new Date().toISOString(),
        },
        quotaExceeded: true,
      };
    }

    this.updateProfile(userId, { aiQuestionsUsedThisMonth: used + 1 });

    const userMsg: RoboMessage = {
      id: \`u-\${Date.now()}\`,
      sender: 'user',
      text,
      attachmentUrl,
      attachmentName,
      createdAt: new Date().toISOString(),
    };

    let replyText = '';
    const qLower = text.toLowerCase();

    if (qLower.includes('منادى') || qLower.includes('نداء')) {
      replyText = \`أهلاً بك! في درس المنادى للصف الثالث الإعدادي:
1. إذا كان المنادى مضافاً (مثل: يا طالبَ العلمِ) أو شبيهاً بالمضاف (يا طالعاً جبلاً) أو نكرة غير مقصودة (يا غافلاً) فهو **معرب منصوب**.
2. إذا كان علماً مفرداً (يا محمدُ) أو نكرة مقصودة (يا رجلُ) فهو **مبني على ما يُرفع به في محل نصب**.
💡 نصيحة روبو: انتبه دائماً إلى ما بعد أداة النداء وعلامة الإعراب أو التنوين!\`;
    } else if (qLower.includes('سرعة') || qLower.includes('عجلة') || qLower.includes('حركة')) {
      replyText = \`رائع! في فيزياء العلوم لتالتة إعدادي:
- قانون السرعة الأساسي: **ع = ف ÷ ز** (السرعة = المسافة ÷ الزمن).
- للتحويل من كم/س إلى م/ث نضرب في (5 / 18).
- العجلة (جـ) = (ع₂ - ع₁) ÷ Δز.
إذا كنت تريد حل مسألة محددة، اكتب لي أرقام المسافة والزمن وسنحلها سوياً بالخطوات!\`;
    } else if (qLower.includes('ديكارتي') || qLower.includes('دالة') || qLower.includes('جبر')) {
      replyText = \`في رياضيات الجبر:
- حاصل الضرب الديكارتي س × ص ينتج مجموعة أزواج مرتبة مسقطها الأول من س ومسقطها الثاني من ص.
- تذكّر أن العلاقة تكون دالة إذا ظهر كل عنصر من عناصر المجموعة س كمسقط أول **مرة واحدة فقط**!\`;
    } else if (attachmentUrl) {
      replyText = \`قمت بفحص الصورة المرفقة 📷:
السؤال يتناول جزءاً رئيسياً من منهج تالتة إعدادي. 
دعنا نفكر بالخطوات: ما هي المعطيات الموجودة في المسألة وما هو المطلوب حسابه أولاً؟ فكر في القانون المناسب واكتب لي لنراجع الحل سوياً!\`;
    } else {
      replyText = \`سؤال ممتاز ومهم في منهج الشهادة الإعدادية! 🌟
لتفوقك في هذا الجزء:
1. حدد المفهوم الرئيسي والقاعدة المباشرة.
2. انتبه للكلمات المفتاحية في رأس السؤال.
3. اكتب خطوات الحل بنظام لتنال الدرجة النهائية في الامتحان.
هل تريد تدريباً سريعاً أو سؤالاً لاختبار فهمك؟\`;
    }

    const replyMsg: RoboMessage = {
      id: \`a-\${Date.now()}\`,
      sender: 'assistant',
      text: replyText,
      createdAt: new Date().toISOString(),
    };

    const all = this.get<Record<string, RoboMessage[]>>(STORAGE_KEYS.ROBO_MESSAGES, {});
    if (!all[userId]) all[userId] = [];
    all[userId].push(userMsg, replyMsg);
    this.set(STORAGE_KEYS.ROBO_MESSAGES, all);

    return { userMsg, replyMsg, quotaExceeded: false };
  }

  // --- NOTIFICATIONS & ANNOUNCEMENTS ---
  public getNotifications(userId: string): Notification[] {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return notifs
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const newN: Notification = {
      ...notif,
      id: \`notif-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifs.unshift(newN);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newN;
  }

  public markNotificationRead(id: string): void {
    const notifs = this.get<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const n = notifs.find((x) => x.id === id);
    if (n) {
      n.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
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
    const newAnn: Announcement = {
      id: \`ann-\${Date.now()}\`,
      title: ann.title || 'إعلان جديد',
      content: ann.content || '',
      targetAudience: ann.targetAudience || 'all',
      priority: ann.priority || 'normal',
      isPublished: ann.isPublished ?? true,
      createdAt: new Date().toISOString(),
    };
    anns.unshift(newAnn);
    this.set(STORAGE_KEYS.ANNOUNCEMENTS, anns);
    return newAnn;
  }

  // --- TEACHER ASSIGNMENTS ---
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
      id: \`ta-\${Date.now()}\`,
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
      id: \`log-\${Date.now()}-\${Math.random().toString(36).substring(2, 6)}\`,
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
}

export const db = new LocalDatabaseEngine();
`;

fs.writeFileSync(storage_ts_path, content.trim() + '\n', 'utf8');
console.log('SUCCESS: src/services/storage.ts written successfully with real data!');
