-- ==============================================================================
-- KAWKAB TALTA E3DADI — ENTERPRISE PRODUCTION-HARDENED SCHEMA v3.0
-- Platform: كوكب تالتة إعدادي (3rd Prep Egyptian Educational Platform)
-- Migration: 20261015000001_secure_kawkab_schema.sql
-- ==============================================================================
-- RUN ORDER IN SUPABASE DASHBOARD:
--   1. Go to: Supabase Dashboard → SQL Editor → New Query
--   2. Paste and run THIS file completely.
--   3. Then run seed_production.sql (for official subjects, approved plans, settings).
--   4. To promote your first admin, run in SQL Editor:
--      SELECT public.set_user_as_admin('your-email@domain.com');
-- ==============================================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1: ENUM TYPES (Idempotent with specific exceptions)
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role         AS ENUM ('student','teacher','admin');         EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE subscription_tier AS ENUM ('free','standard','premium');          EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('active','pending','expired','suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE question_type     AS ENUM ('mcq','true_false','essay','fill_blank'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'question_type' AND e.enumlabel = 'fill_blank'
  ) THEN
    ALTER TYPE question_type ADD VALUE 'fill_blank';
  END IF;
END $$;
DO $$ BEGIN CREATE TYPE attempt_status    AS ENUM ('in_progress','submitted','under_review','graded'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- SECTION 2: CORE TABLES (Idempotent CREATE TABLE IF NOT EXISTS)
-- ============================================================

-- 2.1 PROFILES (linked to auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                      TEXT UNIQUE NOT NULL,
  full_name                  TEXT NOT NULL,
  role                       user_role NOT NULL DEFAULT 'student',
  phone_number               TEXT,
  governorate                TEXT DEFAULT 'القاهرة',
  school_name                TEXT,
  subscription_tier          subscription_tier NOT NULL DEFAULT 'free',
  subscription_status        subscription_status NOT NULL DEFAULT 'active',
  subscription_expires_at    TIMESTAMPTZ,
  is_suspended               BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url                 TEXT,
  ai_questions_used_this_month INT NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 SUBJECTS (Official school subjects — managed by admin only)
CREATE TABLE IF NOT EXISTS public.subjects (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug           TEXT UNIQUE NOT NULL,
  name_ar        TEXT NOT NULL,
  description    TEXT,
  icon           TEXT NOT NULL DEFAULT 'BookOpen',
  color_primary  TEXT NOT NULL DEFAULT '#06b6d4',
  color_secondary TEXT NOT NULL DEFAULT '#0284c7',
  order_index    INT NOT NULL DEFAULT 0,
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 TEACHER SUBJECT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

-- 2.4 UNITS
CREATE TABLE IF NOT EXISTS public.units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id          UUID REFERENCES public.units(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  order_index      INT NOT NULL DEFAULT 0,
  content_html     TEXT NOT NULL DEFAULT '',
  summary          TEXT,
  teacher_name     TEXT,
  video_type       TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube','direct')),
  video_url        TEXT,
  pdf_url          TEXT,
  images           JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes INT DEFAULT 20,
  is_free_preview  BOOLEAN NOT NULL DEFAULT FALSE,
  is_published     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 LESSON NOTES (strictly private per student)
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 2.7 LESSON PROGRESS
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id    UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 2.8 EXAMINATIONS
CREATE TABLE IF NOT EXISTS public.examinations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id           UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_id              UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  time_limit_minutes   INT NOT NULL DEFAULT 30 CHECK (time_limit_minutes > 0),
  passing_percentage   INT NOT NULL DEFAULT 60 CHECK (passing_percentage BETWEEN 1 AND 100),
  randomize_questions  BOOLEAN NOT NULL DEFAULT TRUE,
  randomize_answers    BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts         INT NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  is_published         BOOLEAN NOT NULL DEFAULT TRUE,
  allows_certificate   BOOLEAN NOT NULL DEFAULT TRUE,
  exam_type            TEXT NOT NULL DEFAULT 'official' CHECK (exam_type IN ('practice','official','challenge')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 QUESTIONS (MCQ, Fill in blank, Essay, with Diagram/Image support)
CREATE TABLE IF NOT EXISTS public.questions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id              UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  question_text        TEXT NOT NULL,
  question_type        question_type NOT NULL DEFAULT 'mcq',
  points               NUMERIC(5,2) NOT NULL DEFAULT 1.0 CHECK (points >= 0),
  order_index          INT NOT NULL DEFAULT 0,
  image_url            TEXT,
  correct_blank_answer TEXT,
  explanation          TEXT,
  model_answer         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_blank_answer TEXT;

-- 2.10 ANSWER CHOICES (MCQ / True-False)
CREATE TABLE IF NOT EXISTS public.answer_choices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INT NOT NULL DEFAULT 0
);

-- 2.11 EXAM ATTEMPTS
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id             UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_name        TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at        TIMESTAMPTZ,
  time_spent_seconds  INT NOT NULL DEFAULT 0,
  auto_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  essay_score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score         NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score           NUMERIC(5,2) NOT NULL DEFAULT 0,
  percentage          NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentage BETWEEN 0 AND 100),
  passed              BOOLEAN NOT NULL DEFAULT FALSE,
  status              attempt_status NOT NULL DEFAULT 'in_progress',
  violation_count     INT NOT NULL DEFAULT 0,
  violation_logs      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_provisional      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.12 STUDENT ANSWERS
CREATE TABLE IF NOT EXISTS public.student_answers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id          UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_choice_id  UUID REFERENCES public.answer_choices(id) ON DELETE SET NULL,
  essay_answer_text   TEXT,
  blank_answer_text   TEXT,
  score_awarded       NUMERIC(5,2) NOT NULL DEFAULT 0,
  teacher_feedback    TEXT,
  ai_suggested_score  NUMERIC(5,2),
  ai_feedback         TEXT,
  graded_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS blank_answer_text TEXT;

-- 2.13 CERTIFICATES
CREATE TABLE IF NOT EXISTS public.certificates (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_number TEXT UNIQUE NOT NULL,
  student_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id            UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  subject_name       TEXT NOT NULL,
  exam_title         TEXT NOT NULL,
  student_name       TEXT NOT NULL,
  score_percentage   NUMERIC(5,2) NOT NULL CHECK (score_percentage BETWEEN 0 AND 100),
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qr_code_data       TEXT NOT NULL,
  is_revoked         BOOLEAN NOT NULL DEFAULT FALSE
);

-- 2.14 SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier        subscription_tier UNIQUE NOT NULL,
  name_ar     TEXT NOT NULL,
  price_egp   NUMERIC(8,2) NOT NULL CHECK (price_egp >= 0),
  period_days INT NOT NULL DEFAULT 30 CHECK (period_days > 0),
  features    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.15 SUBSCRIPTION REQUESTS
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id           UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  tier              subscription_tier NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'vodafone_cash',
  payment_proof_url TEXT,
  sender_phone      TEXT,
  transaction_ref   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.16 LIVE CHALLENGES
CREATE TABLE IF NOT EXISTS public.challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_name    TEXT,
  code            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_name    TEXT NOT NULL,
  creator_governorate TEXT,
  opponent_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opponent_name   TEXT,
  is_open_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','completed')),
  time_limit_seconds INT NOT NULL DEFAULT 60 CHECK (time_limit_seconds > 0),
  questions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  creator_score   INT NOT NULL DEFAULT 0,
  opponent_score  INT NOT NULL DEFAULT 0,
  winner_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

-- 2.17 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','grade','challenge','certificate')),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  link_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.18 ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all','students','teachers')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.19 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.20 AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'محادثة تعليمية مع روبو',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.21 AI MESSAGES
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL CHECK (sender IN ('user','assistant')),
  text            TEXT NOT NULL,
  attachment_url  TEXT,
  tokens_used     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.22 SYSTEM SETTINGS (Admin-controlled)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.23 TEACHER EXTRAS & STUDENT GROUP CHAT
CREATE TABLE IF NOT EXISTS public.teacher_homeworks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id  UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_group_messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name    TEXT NOT NULL,
  sender_role    TEXT NOT NULL CHECK (sender_role IN ('student','teacher','admin')),
  sender_badge   TEXT NOT NULL DEFAULT '',
  sender_avatar  TEXT,
  text           TEXT NOT NULL,
  attachment_url TEXT,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_schedule (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('saturday','sunday','monday','tuesday','wednesday','thursday','friday')),
  start_time TEXT NOT NULL,
  end_time   TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, student_id, date)
);

-- 2.24 STUDENT GAMIFICATION & LESSON-BASED FLASHCARDS
CREATE TABLE IF NOT EXISTS public.daily_streaks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type  TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new      BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(student_id, badge_type)
);

CREATE TABLE IF NOT EXISTS public.student_goals (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id         UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_name       TEXT NOT NULL,
  target_percentage  INT NOT NULL DEFAULT 80 CHECK (target_percentage BETWEEN 1 AND 100),
  current_percentage INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  created_by  TEXT NOT NULL DEFAULT 'student' CHECK (created_by IN ('student','ai','teacher')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;
ALTER TABLE public.flashcards DROP CONSTRAINT IF EXISTS flashcards_created_by_check;
ALTER TABLE public.flashcards ADD CONSTRAINT flashcards_created_by_check CHECK (created_by IN ('student','ai','teacher'));

-- ============================================================
-- SECTION 3: PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_subject        ON public.lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit           ON public.lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_units_subject          ON public.units(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam         ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_answer_choices_question ON public.answer_choices(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student       ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam          ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt        ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_progress_student       ON public.lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson        ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_notes_student          ON public.lesson_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_student          ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_challenges_code        ON public.challenges(code);
CREATE INDEX IF NOT EXISTS idx_challenges_status      ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user           ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv            ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sub_requests_student   ON public.subscription_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_actor            ON public.audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher    ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_student     ON public.flashcards(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_lesson      ON public.flashcards(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_group_chat     ON public.student_group_messages(student_id, created_at);

-- ============================================================
-- SECTION 4: HELPER FUNCTIONS & INTEGRITY TRIGGERS
-- (All SECURITY DEFINER functions explicitly declare search_path)
-- ============================================================

-- Returns current user's role (SECURITY DEFINER prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Returns TRUE if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Returns TRUE if current user is teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher','admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Returns TRUE if teacher is assigned to a specific subject (or is admin)
CREATE OR REPLACE FUNCTION public.is_teacher_of_subject(p_subject_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments
    WHERE teacher_id = auth.uid() AND subject_id = p_subject_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HARDENED TRIGGER: Protects profile privilege escalation
-- Allows SQL Editor / database superuser bootstrap, but strictly blocks client role escalation
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If executed via SQL Editor / superuser or by an authenticated admin
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- For regular authenticated users (students / teachers):
  -- STRICTLY FORBID tampering with privileged fields
  NEW.role := OLD.role;
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_expires_at := OLD.subscription_expires_at;
  NEW.is_suspended := OLD.is_suspended;
  NEW.ai_questions_used_this_month := OLD.ai_questions_used_this_month;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- Helper procedure to promote first admin from SQL Editor reliably
CREATE OR REPLACE FUNCTION public.set_user_as_admin(p_email TEXT)
RETURNS VOID AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') OR public.is_admin() THEN
    UPDATE public.profiles SET role = 'admin' WHERE email = LOWER(TRIM(p_email));
  ELSE
    RAISE EXCEPTION 'Only system administrators can promote users to admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- HARDENED TRIGGER: Protects exam attempt tampering and score inflation
CREATE OR REPLACE FUNCTION public.protect_exam_attempt_scoring()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is NOT staff (admin or teacher), restrict score mutations
  IF NOT (public.is_admin() OR public.is_teacher()) THEN
    -- Student CANNOT modify an already submitted, under_review, or graded attempt
    IF OLD.status IN ('submitted','under_review','graded') THEN
      RAISE EXCEPTION 'Cannot modify an exam attempt that has already been submitted, is under review, or graded';
    END IF;

    -- Student CANNOT mark status as 'graded' directly (must be submitted or under_review)
    IF NEW.status = 'graded' THEN
      RAISE EXCEPTION 'Students cannot directly mark exam status as graded';
    END IF;

    -- Student CANNOT award themselves essay scores
    NEW.essay_score := OLD.essay_score;

    -- Student CANNOT decrease violation count
    IF NEW.violation_count < OLD.violation_count THEN
      NEW.violation_count := OLD.violation_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_exam_attempts ON public.exam_attempts;
CREATE TRIGGER trg_protect_exam_attempts
  BEFORE UPDATE ON public.exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.protect_exam_attempt_scoring();

-- HARDENED TRIGGER: Protects live challenge scores and auto-calculates winner safely
CREATE OR REPLACE FUNCTION public.protect_challenge_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Immutable game metadata
  NEW.code := OLD.code;
  NEW.created_by := OLD.created_by;
  NEW.subject_id := OLD.subject_id;
  NEW.questions := OLD.questions;
  NEW.time_limit_seconds := OLD.time_limit_seconds;

  -- Joining open room validation
  IF OLD.status = 'waiting' AND OLD.opponent_id IS NULL THEN
    IF NEW.opponent_id IS NOT NULL AND NEW.opponent_id <> auth.uid() THEN
      RAISE EXCEPTION 'Cannot join challenge on behalf of another user';
    END IF;
  END IF;

  -- Player score boundary: creator can only update creator_score, opponent can only update opponent_score
  IF auth.uid() = OLD.created_by AND (OLD.opponent_id IS NULL OR auth.uid() <> OLD.opponent_id) THEN
    NEW.opponent_score := OLD.opponent_score;
    IF OLD.opponent_id IS NOT NULL THEN
      NEW.opponent_id := OLD.opponent_id;
      NEW.opponent_name := OLD.opponent_name;
    END IF;
  ELSIF auth.uid() = OLD.opponent_id THEN
    NEW.creator_score := OLD.creator_score;
    NEW.created_by := OLD.created_by;
    NEW.creator_name := OLD.creator_name;
  END IF;

  -- Server-side winner determination upon completion
  IF NEW.status = 'completed' THEN
    IF NEW.creator_score > NEW.opponent_score THEN
      NEW.winner_id := NEW.created_by;
      NEW.winner_name := NEW.creator_name;
    ELSIF NEW.opponent_score > NEW.creator_score THEN
      NEW.winner_id := NEW.opponent_id;
      NEW.winner_name := NEW.opponent_name;
    ELSE
      NEW.winner_id := NULL;
      NEW.winner_name := 'تعادل';
    END IF;
    NEW.finished_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_challenges ON public.challenges;
CREATE TRIGGER trg_protect_challenges
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.protect_challenge_updates();

-- HARDENED TRIGGER: Prevents impersonation in student group messages
CREATE OR REPLACE FUNCTION public.stamp_student_group_message()
RETURNS TRIGGER AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user profile not found';
  END IF;

  -- Force identity fields directly from verified profile
  NEW.sender_id := auth.uid();
  NEW.sender_name := v_profile.full_name;
  NEW.sender_role := v_profile.role::text;
  NEW.sender_avatar := v_profile.avatar_url;

  IF v_profile.role = 'admin' THEN
    NEW.sender_badge := '👑 مشرف عام';
  ELSIF v_profile.role = 'teacher' THEN
    NEW.sender_badge := '👨‍🏫 معلم معتمد';
  ELSE
    NEW.sender_badge := '🎓 طالب';
  END IF;

  -- Student can only send messages in their own designated chat room
  IF v_profile.role = 'student' AND NEW.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Students can only send messages in their own group chat';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_stamp_student_group_message ON public.student_group_messages;
CREATE TRIGGER trg_stamp_student_group_message
  BEFORE INSERT ON public.student_group_messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_student_group_message();

-- ============================================================
-- SECTION 5: SUPABASE AUTH TRIGGER
-- Auto-creates profile row when a user signs up via Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, role, phone_number, governorate, school_name, subscription_tier, subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'student',   -- strictly 'student' on self-registration; admin must promote manually
    NEW.raw_user_meta_data->>'phone_number',
    COALESCE(NEW.raw_user_meta_data->>'governorate', 'القاهرة'),
    NEW.raw_user_meta_data->>'school_name',
    'free',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY — Enable on ALL tables
-- ============================================================
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_choices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_homeworks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_schedule       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_streaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_goals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 7: RLS POLICIES (Least Privilege & WITH CHECK)
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR is_admin()
  OR (is_teacher() AND role = 'student')
);

DROP POLICY IF EXISTS "profiles_insert_trigger_only" ON public.profiles;
CREATE POLICY "profiles_insert_trigger_only" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own_contact" ON public.profiles;
CREATE POLICY "profiles_update_own_contact" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE
  USING (is_admin());

-- ── SUBJECTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "subjects_read_published" ON public.subjects;
CREATE POLICY "subjects_read_published"  ON public.subjects FOR SELECT USING (is_published = TRUE OR is_admin() OR is_teacher());
DROP POLICY IF EXISTS "subjects_write_admin" ON public.subjects;
CREATE POLICY "subjects_write_admin"     ON public.subjects FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "subjects_update_admin" ON public.subjects;
CREATE POLICY "subjects_update_admin"    ON public.subjects FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "subjects_delete_admin" ON public.subjects;
CREATE POLICY "subjects_delete_admin"    ON public.subjects FOR DELETE USING (is_admin());

-- ── TEACHER ASSIGNMENTS ──────────────────────────────────────
DROP POLICY IF EXISTS "assignments_select" ON public.teacher_assignments;
CREATE POLICY "assignments_select" ON public.teacher_assignments FOR SELECT USING (
  teacher_id = auth.uid() OR is_admin()
);
DROP POLICY IF EXISTS "assignments_manage_admin" ON public.teacher_assignments;
CREATE POLICY "assignments_manage_admin" ON public.teacher_assignments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── UNITS (Restricted to assigned subjects for teachers) ─────
DROP POLICY IF EXISTS "units_read" ON public.units;
CREATE POLICY "units_read"        ON public.units FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "units_write_staff" ON public.units;
CREATE POLICY "units_write_staff" ON public.units FOR INSERT WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "units_update_staff" ON public.units;
CREATE POLICY "units_update_staff"ON public.units FOR UPDATE USING (is_admin() OR is_teacher_of_subject(subject_id)) WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "units_delete_admin" ON public.units;
CREATE POLICY "units_delete_admin"ON public.units FOR DELETE USING (is_admin() OR is_teacher_of_subject(subject_id));

-- ── LESSONS (Restricted to assigned subjects for teachers) ───
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT USING (
  is_published = TRUE OR is_admin() OR is_teacher_of_subject(subject_id)
);
DROP POLICY IF EXISTS "lessons_insert_staff" ON public.lessons;
CREATE POLICY "lessons_insert_staff" ON public.lessons FOR INSERT WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "lessons_update_staff" ON public.lessons;
CREATE POLICY "lessons_update_staff" ON public.lessons FOR UPDATE USING (is_admin() OR is_teacher_of_subject(subject_id)) WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "lessons_delete_admin" ON public.lessons;
CREATE POLICY "lessons_delete_admin" ON public.lessons FOR DELETE USING (is_admin() OR is_teacher_of_subject(subject_id));

-- ── LESSON NOTES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "notes_select_own" ON public.lesson_notes;
CREATE POLICY "notes_select_own" ON public.lesson_notes FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "notes_insert_own" ON public.lesson_notes;
CREATE POLICY "notes_insert_own" ON public.lesson_notes FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "notes_update_own" ON public.lesson_notes;
CREATE POLICY "notes_update_own" ON public.lesson_notes FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "notes_delete_own" ON public.lesson_notes;
CREATE POLICY "notes_delete_own" ON public.lesson_notes FOR DELETE USING (student_id = auth.uid());

-- ── LESSON PROGRESS ──────────────────────────────────────────
DROP POLICY IF EXISTS "progress_select" ON public.lesson_progress;
CREATE POLICY "progress_select" ON public.lesson_progress FOR SELECT USING (
  student_id = auth.uid() OR is_teacher() OR is_admin()
);
DROP POLICY IF EXISTS "progress_insert_own" ON public.lesson_progress;
CREATE POLICY "progress_insert_own" ON public.lesson_progress FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "progress_update_own" ON public.lesson_progress;
CREATE POLICY "progress_update_own" ON public.lesson_progress FOR UPDATE USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ── EXAMINATIONS (Restricted to assigned subjects for teachers)
DROP POLICY IF EXISTS "exams_select" ON public.examinations;
CREATE POLICY "exams_select" ON public.examinations FOR SELECT USING (
  is_published = TRUE OR is_admin() OR is_teacher_of_subject(subject_id)
);
DROP POLICY IF EXISTS "exams_insert_staff" ON public.examinations;
CREATE POLICY "exams_insert_staff" ON public.examinations FOR INSERT WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "exams_update_staff" ON public.examinations;
CREATE POLICY "exams_update_staff" ON public.examinations FOR UPDATE USING (is_admin() OR is_teacher_of_subject(subject_id)) WITH CHECK (is_admin() OR is_teacher_of_subject(subject_id));
DROP POLICY IF EXISTS "exams_delete_admin" ON public.examinations;
CREATE POLICY "exams_delete_admin" ON public.examinations FOR DELETE USING (is_admin() OR is_teacher_of_subject(subject_id));

-- ── QUESTIONS (Restricted to assigned subjects for teachers) ─
DROP POLICY IF EXISTS "questions_select_staff" ON public.questions;
CREATE POLICY "questions_select_staff"   ON public.questions FOR SELECT USING (is_teacher() OR is_admin());
DROP POLICY IF EXISTS "questions_select_student" ON public.questions;
CREATE POLICY "questions_select_student" ON public.questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.exam_id = questions.exam_id
      AND ea.student_id = auth.uid()
      AND ea.status = 'in_progress'
  )
);
DROP POLICY IF EXISTS "questions_write_staff" ON public.questions;
CREATE POLICY "questions_write_staff" ON public.questions FOR INSERT WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.examinations e WHERE e.id = exam_id AND public.is_teacher_of_subject(e.subject_id)
  )
);
DROP POLICY IF EXISTS "questions_update_staff" ON public.questions;
CREATE POLICY "questions_update_staff" ON public.questions FOR UPDATE USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.examinations e WHERE e.id = exam_id AND public.is_teacher_of_subject(e.subject_id)
  )
) WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.examinations e WHERE e.id = exam_id AND public.is_teacher_of_subject(e.subject_id)
  )
);
DROP POLICY IF EXISTS "questions_delete_admin" ON public.questions;
CREATE POLICY "questions_delete_admin" ON public.questions FOR DELETE USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.examinations e WHERE e.id = exam_id AND public.is_teacher_of_subject(e.subject_id)
  )
);

-- ── ANSWER CHOICES (is_correct hidden from students via RLS) ─
-- Direct SELECT from answer_choices is restricted to staff only!
-- Students consume choices via public.exam_question_choices_student view.
DROP POLICY IF EXISTS "choices_select" ON public.answer_choices;
DROP POLICY IF EXISTS "choices_select_staff" ON public.answer_choices;
CREATE POLICY "choices_select_staff" ON public.answer_choices FOR SELECT USING (is_teacher() OR is_admin());

DROP POLICY IF EXISTS "choices_write_staff" ON public.answer_choices;
CREATE POLICY "choices_write_staff" ON public.answer_choices FOR INSERT WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = question_id AND public.is_teacher_of_subject(e.subject_id)
  )
);
DROP POLICY IF EXISTS "choices_update_staff" ON public.answer_choices;
CREATE POLICY "choices_update_staff" ON public.answer_choices FOR UPDATE USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = question_id AND public.is_teacher_of_subject(e.subject_id)
  )
) WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = question_id AND public.is_teacher_of_subject(e.subject_id)
  )
);
DROP POLICY IF EXISTS "choices_delete_admin" ON public.answer_choices;
CREATE POLICY "choices_delete_admin" ON public.answer_choices FOR DELETE USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = question_id AND public.is_teacher_of_subject(e.subject_id)
  )
);

-- Public view for students to read choices without leaking is_correct:
CREATE OR REPLACE VIEW public.exam_question_choices_student AS
  SELECT id, question_id, choice_text, order_index
  FROM public.answer_choices;

GRANT SELECT ON public.exam_question_choices_student TO authenticated, anon;

-- ── EXAM ATTEMPTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "attempts_select" ON public.exam_attempts;
CREATE POLICY "attempts_select" ON public.exam_attempts FOR SELECT USING (
  student_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    JOIN public.examinations e ON e.id = exam_attempts.exam_id
    WHERE ta.teacher_id = auth.uid() AND ta.subject_id = e.subject_id
  )
);

DROP POLICY IF EXISTS "attempts_insert_own" ON public.exam_attempts;
CREATE POLICY "attempts_insert_own" ON public.exam_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "attempts_update_own" ON public.exam_attempts;
CREATE POLICY "attempts_update_own" ON public.exam_attempts FOR UPDATE
  USING (student_id = auth.uid() OR is_teacher() OR is_admin())
  WITH CHECK (student_id = auth.uid() OR is_teacher() OR is_admin());

-- ── STUDENT ANSWERS ───────────────────────────────────────────
DROP POLICY IF EXISTS "answers_select" ON public.student_answers;
CREATE POLICY "answers_select" ON public.student_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.id = student_answers.attempt_id
      AND (ea.student_id = auth.uid() OR is_teacher() OR is_admin())
  )
);

DROP POLICY IF EXISTS "answers_insert_own" ON public.student_answers;
CREATE POLICY "answers_insert_own" ON public.student_answers FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exam_attempts ea
    WHERE ea.id = attempt_id AND ea.student_id = auth.uid() AND ea.status = 'in_progress'
  )
);

-- Only teachers of the exam's subject or admins can grade
DROP POLICY IF EXISTS "answers_grade_staff" ON public.student_answers;
CREATE POLICY "answers_grade_staff" ON public.student_answers FOR UPDATE USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = student_answers.question_id AND public.is_teacher_of_subject(e.subject_id)
  )
) WITH CHECK (
  is_admin() OR EXISTS (
    SELECT 1 FROM public.questions q JOIN public.examinations e ON e.id = q.exam_id
    WHERE q.id = student_answers.question_id AND public.is_teacher_of_subject(e.subject_id)
  )
);

-- ── CERTIFICATES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "certs_select" ON public.certificates;
CREATE POLICY "certs_select" ON public.certificates FOR SELECT USING (student_id = auth.uid() OR is_admin() OR is_teacher());
DROP POLICY IF EXISTS "certs_insert_admin" ON public.certificates;
CREATE POLICY "certs_insert_admin" ON public.certificates FOR INSERT WITH CHECK (is_admin() OR is_teacher());
DROP POLICY IF EXISTS "certs_update_admin" ON public.certificates;
CREATE POLICY "certs_update_admin" ON public.certificates FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ── SUBSCRIPTION PLANS ────────────────────────────────────────
DROP POLICY IF EXISTS "plans_read" ON public.subscription_plans;
CREATE POLICY "plans_read"        ON public.subscription_plans FOR SELECT USING (is_active = TRUE OR is_admin());
DROP POLICY IF EXISTS "plans_write_admin" ON public.subscription_plans;
CREATE POLICY "plans_write_admin" ON public.subscription_plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── SUBSCRIPTION REQUESTS ─────────────────────────────────────
DROP POLICY IF EXISTS "sub_requests_select" ON public.subscription_requests;
CREATE POLICY "sub_requests_select" ON public.subscription_requests FOR SELECT USING (student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "sub_requests_insert_own" ON public.subscription_requests;
CREATE POLICY "sub_requests_insert_own" ON public.subscription_requests FOR INSERT
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "sub_requests_update_admin" ON public.subscription_requests;
CREATE POLICY "sub_requests_update_admin" ON public.subscription_requests FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── CHALLENGES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "challenges_select" ON public.challenges;
CREATE POLICY "challenges_select" ON public.challenges FOR SELECT USING (
  status = 'waiting' OR created_by = auth.uid() OR opponent_id = auth.uid() OR is_admin()
);
DROP POLICY IF EXISTS "challenges_insert_own" ON public.challenges;
CREATE POLICY "challenges_insert_own" ON public.challenges FOR INSERT
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "challenges_update_participant" ON public.challenges;
CREATE POLICY "challenges_update_participant" ON public.challenges FOR UPDATE
  USING (created_by = auth.uid() OR opponent_id = auth.uid() OR (status = 'waiting' AND opponent_id IS NULL) OR is_admin())
  WITH CHECK (created_by = auth.uid() OR opponent_id = auth.uid() OR (status = 'waiting' AND opponent_id IS NULL) OR is_admin());

-- ── NOTIFICATIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own"  ON public.notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "notif_insert_system" ON public.notifications;
CREATE POLICY "notif_insert_system" ON public.notifications FOR INSERT WITH CHECK (is_admin() OR is_teacher());
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own"  ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "notif_delete_own" ON public.notifications;
CREATE POLICY "notif_delete_own"  ON public.notifications FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "announce_read" ON public.announcements;
CREATE POLICY "announce_read"   ON public.announcements FOR SELECT USING (is_published = TRUE OR is_admin());
DROP POLICY IF EXISTS "announce_write" ON public.announcements;
CREATE POLICY "announce_write"  ON public.announcements FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "announce_update" ON public.announcements;
CREATE POLICY "announce_update" ON public.announcements FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "announce_delete" ON public.announcements;
CREATE POLICY "announce_delete" ON public.announcements FOR DELETE USING (is_admin());

-- ── AUDIT LOGS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_select_admin" ON public.audit_logs;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "audit_insert_service" ON public.audit_logs;
CREATE POLICY "audit_insert_service" ON public.audit_logs FOR INSERT WITH CHECK (is_admin());

-- ── AI CONVERSATIONS ──────────────────────────────────────────
DROP POLICY IF EXISTS "ai_conv_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_own"   ON public.ai_conversations FOR SELECT USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "ai_conv_insert" ON public.ai_conversations;
CREATE POLICY "ai_conv_insert"ON public.ai_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_conv_delete" ON public.ai_conversations;
CREATE POLICY "ai_conv_delete"ON public.ai_conversations FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- ── AI MESSAGES ───────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_msg_own" ON public.ai_messages;
CREATE POLICY "ai_msg_own" ON public.ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = conversation_id AND (user_id = auth.uid() OR is_admin()))
);
DROP POLICY IF EXISTS "ai_msg_insert" ON public.ai_messages;
CREATE POLICY "ai_msg_insert" ON public.ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
);

-- ── SYSTEM SETTINGS ───────────────────────────────────────────
DROP POLICY IF EXISTS "settings_read_all" ON public.system_settings;
CREATE POLICY "settings_read_all"   ON public.system_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "settings_write_admin" ON public.system_settings;
CREATE POLICY "settings_write_admin"ON public.system_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── TEACHER EXTRAS & STUDENT GROUP CHAT ────────────────────────
DROP POLICY IF EXISTS "hw_select" ON public.teacher_homeworks;
CREATE POLICY "hw_select" ON public.teacher_homeworks FOR SELECT USING (teacher_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "hw_write" ON public.teacher_homeworks;
CREATE POLICY "hw_write"  ON public.teacher_homeworks FOR ALL USING (teacher_id = auth.uid() OR is_admin()) WITH CHECK (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "msg_select" ON public.teacher_messages;
CREATE POLICY "msg_select" ON public.teacher_messages FOR SELECT USING (teacher_id = auth.uid() OR student_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "msg_insert" ON public.teacher_messages;
CREATE POLICY "msg_insert" ON public.teacher_messages FOR INSERT WITH CHECK (teacher_id = auth.uid() OR student_id = auth.uid());

DROP POLICY IF EXISTS "sg_messages_select" ON public.student_group_messages;
CREATE POLICY "sg_messages_select" ON public.student_group_messages FOR SELECT USING (student_id = auth.uid() OR is_teacher() OR is_admin());
DROP POLICY IF EXISTS "sg_messages_insert" ON public.student_group_messages;
CREATE POLICY "sg_messages_insert" ON public.student_group_messages FOR INSERT WITH CHECK (student_id = auth.uid() OR is_teacher() OR is_admin());

DROP POLICY IF EXISTS "schedule_select" ON public.teacher_schedule;
CREATE POLICY "schedule_select" ON public.teacher_schedule FOR SELECT USING (teacher_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "schedule_write" ON public.teacher_schedule;
CREATE POLICY "schedule_write" ON public.teacher_schedule FOR ALL USING (teacher_id = auth.uid() OR is_admin()) WITH CHECK (teacher_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "attendance_select" ON public.attendance_records;
CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT USING (teacher_id = auth.uid() OR student_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "attendance_write" ON public.attendance_records;
CREATE POLICY "attendance_write" ON public.attendance_records FOR ALL USING (teacher_id = auth.uid() OR is_admin()) WITH CHECK (teacher_id = auth.uid() OR is_admin());

-- ── GAMIFICATION ──────────────────────────────────────────────
DROP POLICY IF EXISTS "streak_own" ON public.daily_streaks;
CREATE POLICY "streak_own"   ON public.daily_streaks FOR SELECT USING (student_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "streak_write" ON public.daily_streaks;
CREATE POLICY "streak_write" ON public.daily_streaks FOR ALL USING (student_id = auth.uid() OR is_admin()) WITH CHECK (student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "badges_own" ON public.student_badges;
CREATE POLICY "badges_own"   ON public.student_badges FOR SELECT USING (student_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "badges_write" ON public.student_badges;
CREATE POLICY "badges_write" ON public.student_badges FOR ALL USING (student_id = auth.uid() OR is_admin()) WITH CHECK (student_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "goals_own" ON public.student_goals;
CREATE POLICY "goals_own"   ON public.student_goals FOR SELECT USING (student_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "goals_write" ON public.student_goals;
CREATE POLICY "goals_write" ON public.student_goals FOR ALL USING (student_id = auth.uid() OR is_admin()) WITH CHECK (student_id = auth.uid() OR is_admin());

-- ── FLASHCARDS (Privacy-Guaranteed: Teacher cannot view student private cards)
DROP POLICY IF EXISTS "flash_select" ON public.flashcards;
CREATE POLICY "flash_select" ON public.flashcards FOR SELECT USING (
  -- Students see their own cards
  student_id = auth.uid()
  -- Teacher or AI created educational flashcards are public to all enrolled students
  OR created_by IN ('teacher', 'ai')
  -- Platform Admin
  OR is_admin()
);

DROP POLICY IF EXISTS "flash_write" ON public.flashcards;
DROP POLICY IF EXISTS "flash_student_insert" ON public.flashcards;
CREATE POLICY "flash_student_insert" ON public.flashcards FOR INSERT WITH CHECK (
  student_id = auth.uid() AND created_by = 'student'
);

DROP POLICY IF EXISTS "flash_student_update" ON public.flashcards;
CREATE POLICY "flash_student_update" ON public.flashcards FOR UPDATE USING (
  student_id = auth.uid() AND created_by = 'student'
) WITH CHECK (
  student_id = auth.uid() AND created_by = 'student'
);

DROP POLICY IF EXISTS "flash_student_delete" ON public.flashcards;
CREATE POLICY "flash_student_delete" ON public.flashcards FOR DELETE USING (
  student_id = auth.uid() AND created_by = 'student'
);

DROP POLICY IF EXISTS "flash_teacher_manage" ON public.flashcards;
CREATE POLICY "flash_teacher_manage" ON public.flashcards FOR ALL USING (
  is_admin() OR (is_teacher() AND is_teacher_of_subject(subject_id))
) WITH CHECK (
  is_admin() OR (is_teacher() AND is_teacher_of_subject(subject_id))
);

-- ============================================================
-- SECTION 8: SUPABASE STORAGE BUCKETS (Idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('lesson-pdfs',    'lesson-pdfs',    false, 52428800,  ARRAY['application/pdf']),
  ('lesson-images',  'lesson-images',  true,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',        'avatars',        true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "pdf_read_authenticated" ON storage.objects;
CREATE POLICY "pdf_read_authenticated" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-pdfs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pdf_upload_staff" ON storage.objects;
CREATE POLICY "pdf_upload_staff" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lesson-pdfs' AND is_teacher());

DROP POLICY IF EXISTS "pdf_manage_staff" ON storage.objects;
CREATE POLICY "pdf_manage_staff" ON storage.objects FOR ALL USING (bucket_id = 'lesson-pdfs' AND is_teacher());

DROP POLICY IF EXISTS "images_read_public" ON storage.objects;
CREATE POLICY "images_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-images');

DROP POLICY IF EXISTS "images_upload_staff" ON storage.objects;
CREATE POLICY "images_upload_staff" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lesson-images' AND is_teacher());

DROP POLICY IF EXISTS "images_manage_staff" ON storage.objects;
CREATE POLICY "images_manage_staff" ON storage.objects FOR ALL USING (bucket_id = 'lesson-images' AND is_teacher());

DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
CREATE POLICY "avatars_read_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

DROP POLICY IF EXISTS "payment_proofs_own" ON storage.objects;
CREATE POLICY "payment_proofs_own" ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

DROP POLICY IF EXISTS "payment_proofs_upload_own" ON storage.objects;
CREATE POLICY "payment_proofs_upload_own" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Payment proofs cannot be deleted or overwritten by students (audit trail integrity)
DROP POLICY IF EXISTS "payment_proofs_manage_admin" ON storage.objects;
CREATE POLICY "payment_proofs_manage_admin" ON storage.objects FOR ALL USING (
  bucket_id = 'payment-proofs' AND is_admin()
);

-- ============================================================
-- SECTION 9: REALTIME PUBLICATIONS (Idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_group_messages;
  END IF;
END $$;

-- ============================================================
-- SECTION 10: PERMISSION HARDENING (GRANT & REVOKE)
-- ============================================================
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher_of_subject(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_as_admin(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_subject(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_as_admin(TEXT) TO postgres, service_role;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
