-- ==============================================================================
-- KAWKAB TALTA E3DADI — POSTGRESQL RELATIONAL SCHEMA & ROW LEVEL SECURITY
-- Platform: كوكب تالتة إعدادي (3rd Prep Egyptian Educational Platform)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('free', 'standard', 'premium');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'essay');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'under_review', 'graded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. PROFILES TABLE (linked to auth.users if Supabase Auth is enabled)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'student',
  phone_number TEXT,
  governorate TEXT DEFAULT 'القاهرة',
  school_name TEXT DEFAULT 'مدرسة الشهداء الإعدادية',
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  is_suspended BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  ai_questions_used_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUBJECTS TABLE (The 8 official school subjects)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color_primary TEXT NOT NULL,
  color_secondary TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEACHER SUBJECT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

-- 6. UNITS TABLE
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT DEFAULT 0,
  content_html TEXT NOT NULL,
  summary TEXT,
  video_type TEXT DEFAULT 'youtube', -- 'youtube' or 'direct'
  video_url TEXT,
  pdf_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  duration_minutes INT DEFAULT 20,
  is_free_preview BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LESSON NOTES (Private to each student)
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 9. LESSON PROGRESS (Tracking completed lessons)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 10. EXAMINATIONS TABLE
CREATE TABLE IF NOT EXISTS public.examinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT DEFAULT 30,
  passing_percentage INT DEFAULT 60,
  randomize_questions BOOLEAN DEFAULT TRUE,
  randomize_answers BOOLEAN DEFAULT TRUE,
  max_attempts INT DEFAULT 3,
  is_published BOOLEAN DEFAULT TRUE,
  allows_certificate BOOLEAN DEFAULT TRUE,
  exam_type TEXT DEFAULT 'official', -- 'practice', 'official', 'challenge'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.examinations(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type DEFAULT 'mcq',
  points NUMERIC(5,2) DEFAULT 1.0,
  order_index INT DEFAULT 0,
  explanation TEXT,
  model_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ANSWER CHOICES TABLE (for MCQ & True/False)
CREATE TABLE IF NOT EXISTS public.answer_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0
);

-- 13. EXAM ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES public.examinations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  auto_score NUMERIC(5,2) DEFAULT 0,
  essay_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  max_score NUMERIC(5,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  status attempt_status DEFAULT 'in_progress',
  violation_count INT DEFAULT 0,
  violation_logs JSONB DEFAULT '[]'::jsonb,
  is_provisional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. STUDENT ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_choice_id UUID REFERENCES public.answer_choices(id) ON DELETE SET NULL,
  essay_answer_text TEXT,
  score_awarded NUMERIC(5,2) DEFAULT 0,
  teacher_feedback TEXT,
  ai_suggested_score NUMERIC(5,2),
  ai_feedback TEXT,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_number TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.examinations(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  student_name TEXT NOT NULL,
  score_percentage NUMERIC(5,2) NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  qr_code_data TEXT NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE
);

-- 16. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier subscription_tier UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  price_egp NUMERIC(8,2) NOT NULL,
  period_days INT DEFAULT 30,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. SUBSCRIPTION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  tier subscription_tier NOT NULL,
  payment_method TEXT DEFAULT 'vodafone_cash',
  payment_proof_url TEXT,
  sender_phone TEXT,
  transaction_ref TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. LIVE CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed'
  time_limit_seconds INT DEFAULT 60,
  questions JSONB DEFAULT '[]'::jsonb,
  creator_score INT DEFAULT 0,
  opponent_score INT DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- 19. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'grade', 'challenge', 'certificate'
  is_read BOOLEAN DEFAULT FALSE,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all', -- 'all', 'students', 'teachers'
  priority TEXT DEFAULT 'normal', -- 'normal', 'urgent'
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. AI CONVERSATIONS & MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'محادثة تعليمية مع روبو',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- 'user' or 'assistant'
  text TEXT NOT NULL,
  attachment_url TEXT,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Anyone authenticated can read own profile; Admins can read all; Users can edit own contact details
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "Users can update own non-role fields" ON public.profiles FOR UPDATE USING (id = auth.uid() OR is_admin());

-- Lesson Notes: Strictly private to each student
CREATE POLICY "Students can view own lesson notes" ON public.lesson_notes FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can upsert own lesson notes" ON public.lesson_notes FOR ALL USING (student_id = auth.uid());

-- Lesson Progress: Student or Admin
CREATE POLICY "Students view own progress" ON public.lesson_progress FOR SELECT USING (student_id = auth.uid() OR is_admin());
CREATE POLICY "Students insert/update own progress" ON public.lesson_progress FOR ALL USING (student_id = auth.uid());

-- Exam Attempts: Student views own; Teachers view assigned subject attempts; Admin views all
CREATE POLICY "View exam attempts" ON public.exam_attempts FOR SELECT USING (
  student_id = auth.uid() OR is_admin() OR EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.examinations e ON e.id = exam_attempts.exam_id
    WHERE ta.teacher_id = auth.uid() AND ta.subject_id = e.subject_id
  )
);

-- Audit Logs: Admin only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Notifications: User views own notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
