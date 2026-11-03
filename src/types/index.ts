export type UserRole = 'student' | 'teacher' | 'admin';

export type SubscriptionTier = 'free' | 'standard' | 'premium';

export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  governorate?: string;
  schoolName?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  isSuspended: boolean;
  avatarUrl?: string;
  aiQuestionsUsedThisMonth: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  slug: string;
  nameAr: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  colorPrimary: string;
  colorSecondary: string;
  orderIndex: number;
  isPublished: boolean;
  unitsCount?: number;
  lessonsCount?: number;
  completedLessonsCount?: number;
}

export interface Unit {
  id: string;
  subjectId: string;
  title: string;
  orderIndex: number;
  description?: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  unitId?: string;
  subjectId: string;
  title: string;
  orderIndex: number;
  contentHtml: string;
  summary?: string;
  teacherName?: string;
  videoType?: 'youtube' | 'direct';
  videoUrl?: string;
  pdfUrl?: string;
  images?: string[];
  durationMinutes?: number;
  isFreePreview?: boolean;
  isPublished?: boolean;
  isCompleted?: boolean;
}

export interface LessonNote {
  id: string;
  lessonId: string;
  studentId: string;
  content: string;
  updatedAt: string;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  studentId: string;
  completed: boolean;
  completedAt: string;
}

export type QuestionType = 'mcq' | 'true_false' | 'essay' | 'fill_blank';

export interface AnswerChoice {
  id: string;
  questionId: string;
  choiceText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface Question {
  id: string;
  examId: string;
  questionText: string;
  questionType: QuestionType;
  points: number;
  orderIndex: number;
  imageUrl?: string;
  correctBlankAnswer?: string;
  explanation?: string;
  modelAnswer?: string;
  choices?: AnswerChoice[];
}

export interface Examination {
  id: string;
  subjectId: string;
  unitId?: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  antiCheatingTabSwitch?: boolean;
  maxAttempts: number;
  isPublished: boolean;
  allowsCertificate: boolean;
  examType: 'practice' | 'official' | 'challenge';
  createdAt: string;
  questions?: Question[];
  subjectName?: string;
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'under_review' | 'graded';

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId?: string;
  essayAnswerText?: string;
  scoreAwarded: number;
  teacherFeedback?: string;
  aiSuggestedScore?: number;
  aiFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  examTitle?: string;
  subjectName?: string;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  autoScore: number;
  essayScore: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: AttemptStatus;
  violationCount: number;
  violationLogs: Array<{ timestamp: string; type: string; details: string }>;
  isProvisional: boolean;
  answers?: Record<string, StudentAnswer>;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  studentId: string;
  examId: string;
  subjectName: string;
  examTitle: string;
  studentName: string;
  scorePercentage: number;
  issuedAt: string;
  qrCodeData: string;
  isRevoked: boolean;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  nameAr: string;
  priceEgp: number;
  periodDays: number;
  features: string[];
  isActive: boolean;
}

export interface SubscriptionRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  planId: string;
  tier: SubscriptionTier;
  paymentMethod: 'vodafone_cash' | 'instapay' | 'fawry' | 'whatsapp';
  paymentProofUrl?: string;
  senderPhone?: string;
  transactionRef?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LiveChallenge {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  title: string;
  createdBy: string;
  creatorName: string;
  creatorGovernorate?: string;
  isOpenChallenge?: boolean;
  opponentId?: string;
  opponentName?: string;
  status: 'waiting' | 'in_progress' | 'completed';
  timeLimitSeconds: number;
  questions: Array<{
    id: string;
    text: string;
    choices: string[];
    correctIndex: number;
  }>;
  creatorScore: number;
  opponentScore: number;
  winnerId?: string;
  winnerName?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'grade' | 'challenge' | 'certificate';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'students' | 'teachers';
  priority: 'normal' | 'urgent';
  isPublished: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface RoboMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface StudentScheduleSlot {
  id: string;
  studentId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, ..., 6 = Saturday
  subjectId: string;
  subjectName: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  color?: string;
  createdAt: string;
}

export interface StudentTask {
  id: string;
  studentId: string;
  title: string;
  subjectName?: string;
  dueDate?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
}

export interface RoboConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: RoboMessage[];
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  assignedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  governorate: string;
  schoolName: string;
  examAverage: number;
  completedLessonsCount: number;
  challengesWon: number;
  certificatesCount: number;
  points: number;
  tier: SubscriptionTier;
}

export interface ContactSettings {
  whatsappDirectNumber: string;
  whatsappDirectUrl: string;
  whatsappChannelUrl: string;
  facebookPageUrl: string;
  telegramChannelUrl: string;
  supportEmail: string;
}

export interface UserEducationalStats {
  points: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercentage: number;
  passedExamsCount: number;
  certificatesCount: number;
  challengesWonCount: number;
}

// ============================================================
// Teacher-specific types
// ============================================================

export interface TeacherHomework {
  id: string;
  teacherId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  deadlineAt: string;
  maxScore: number;
  createdAt: string;
  submissions: TeacherHomeworkSubmission[];
}

export interface TeacherHomeworkSubmission {
  studentId: string;
  studentName: string;
  submittedAt: string;
  answerText: string;
  score?: number;
  teacherFeedback?: string;
}

export interface TeacherMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toName: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface StudentGroupMessage {
  id: string;
  studentId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'admin';
  senderBadge: string;
  senderAvatar?: string;
  text: string;
  attachmentUrl?: string;
  createdAt: string;
  isRead?: boolean;
}

export interface TeacherScheduleSlot {
  id: string;
  teacherId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun 6=Sat
  startTime: string; // "HH:mm"
  endTime: string;
  subjectName: string;
  title: string;
  location?: string;
  color?: string;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  date: string; // ISO date string
  records: Array<{ studentId: string; studentName: string; status: 'present' | 'absent' | 'late' }>;
}

// ============================================================
// Gamification: Streak, Badges, Goals
// ============================================================

export interface DailyStreak {
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalActiveDays: number;
}

export type BadgeType =
  | 'first_exam'
  | 'ten_lessons'
  | 'five_wins'
  | 'streak_7'
  | 'streak_30'
  | 'first_cert'
  | 'robo_5'
  | 'perfect_score'
  | 'all_subjects';

export interface StudentBadge {
  id: string;
  studentId: string;
  badgeType: BadgeType;
  earnedAt: string;
  isNew: boolean;
}

export interface StudentGoal {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  targetPercentage: number;
  currentPercentage: number;
  createdAt: string;
  deadline?: string;
}

// ============================================================
// Weekly Report
// ============================================================

export interface WeeklyReport {
  studentId: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  lessonsCompleted: number;
  examsAttempted: number;
  avgScore: number;
  weakestSubject: string;
  bestSubject: string;
  totalStudyDays: number;
}

// ============================================================
// Flashcards
// ============================================================

export interface Flashcard {
  id: string;
  subjectId: string;
  lessonId?: string;
  front: string; // question / term
  back: string;  // answer / definition
  createdBy: 'ai' | 'teacher' | 'student';
  createdAt: string;
}

export interface FlashcardSession {
  id: string;
  studentId: string;
  subjectId: string;
  cards: Flashcard[];
  currentIndex: number;
  knownIds: string[];
  unknownIds: string[];
  startedAt: string;
  completedAt?: string;
}
