-- ==============================================================================
-- Kawkab Talta E3dadi: Attendance, Student Schedule, and Student Tasks Tables
-- Migration: 20261117000000_attendance_schedule_tasks.sql
-- ==============================================================================

-- 1. Teacher Attendance Table
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID,
    lesson_title TEXT,
    subject_id UUID,
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON public.teacher_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_lesson_id ON public.teacher_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON public.teacher_attendance(date);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_attendance_select" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_select"
    ON public.teacher_attendance FOR SELECT
    USING (
        teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
    );

DROP POLICY IF EXISTS "teacher_attendance_insert" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_insert"
    ON public.teacher_attendance FOR INSERT
    WITH CHECK (
        teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "teacher_attendance_update" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_update"
    ON public.teacher_attendance FOR UPDATE
    USING (
        teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "teacher_attendance_delete" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_delete"
    ON public.teacher_attendance FOR DELETE
    USING (
        teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- 2. Student Schedule Table
CREATE TABLE IF NOT EXISTS public.student_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    subject_id UUID,
    subject_name TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    notes TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_schedule_student_id ON public.student_schedule(student_id);

ALTER TABLE public.student_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_schedule_select" ON public.student_schedule;
CREATE POLICY "student_schedule_select"
    ON public.student_schedule FOR SELECT
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_schedule_insert" ON public.student_schedule;
CREATE POLICY "student_schedule_insert"
    ON public.student_schedule FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_schedule_update" ON public.student_schedule;
CREATE POLICY "student_schedule_update"
    ON public.student_schedule FOR UPDATE
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_schedule_delete" ON public.student_schedule;
CREATE POLICY "student_schedule_delete"
    ON public.student_schedule FOR DELETE
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- 3. Student Tasks Table
CREATE TABLE IF NOT EXISTS public.student_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_name TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_tasks_student_id ON public.student_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_completed ON public.student_tasks(completed);

ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_tasks_select" ON public.student_tasks;
CREATE POLICY "student_tasks_select"
    ON public.student_tasks FOR SELECT
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_tasks_insert" ON public.student_tasks;
CREATE POLICY "student_tasks_insert"
    ON public.student_tasks FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_tasks_update" ON public.student_tasks;
CREATE POLICY "student_tasks_update"
    ON public.student_tasks FOR UPDATE
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "student_tasks_delete" ON public.student_tasks;
CREATE POLICY "student_tasks_delete"
    ON public.student_tasks FOR DELETE
    USING (
        student_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
