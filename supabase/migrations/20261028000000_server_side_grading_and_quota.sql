-- ==============================================================================
-- KAWKAB TALTA E3DADI — SERVER-SIDE AUTHORITATIVE GRADING & SECURE AI QUOTA
-- Migration: 20261028000000_server_side_grading_and_quota.sql
-- ==============================================================================

-- ==============================================================================
-- 1. SECURE SERVER-SIDE AI DAILY QUOTA TABLE & FUNCTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_daily_ai_usage (
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  questions_count INT NOT NULL DEFAULT 0 CHECK (questions_count >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.user_daily_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_usage_select" ON public.user_daily_ai_usage;
CREATE POLICY "user_usage_select" ON public.user_daily_ai_usage
  FOR SELECT USING (user_id = auth.uid() OR is_admin() OR is_teacher());

-- Atomic Server-Side Check & Consume Quota Function
CREATE OR REPLACE FUNCTION public.check_and_consume_ai_quota()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_tier TEXT;
  v_is_suspended BOOLEAN;
  v_limit INT;
  v_current_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not authenticated';
  END IF;

  SELECT role, subscription_tier, is_suspended 
  INTO v_role, v_tier, v_is_suspended
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_is_suspended IS TRUE THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'Account is suspended',
      'used', 0,
      'limit', 0,
      'remaining', 0
    );
  END IF;

  -- Determine daily limit based on role and tier
  IF v_role IN ('admin', 'teacher') THEN
    v_limit := 150;
  ELSIF v_tier = 'premium' THEN
    v_limit := 150;
  ELSIF v_tier = 'standard' THEN
    v_limit := 60;
  ELSE
    v_limit := 10; -- Free student tier default
  END IF;

  -- Query today's usage
  SELECT questions_count INTO v_current_count
  FROM public.user_daily_ai_usage
  WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  IF v_current_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'error', 'Daily AI question quota exceeded',
      'used', v_current_count,
      'limit', v_limit,
      'remaining', 0
    );
  END IF;

  -- Increment atomic usage
  INSERT INTO public.user_daily_ai_usage (user_id, usage_date, questions_count, updated_at)
  VALUES (v_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET 
    questions_count = user_daily_ai_usage.questions_count + 1,
    updated_at = NOW();

  -- Update profile monthly count
  UPDATE public.profiles
  SET ai_questions_used_this_month = COALESCE(ai_questions_used_this_month, 0) + 1
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'used', v_current_count + 1,
    'limit', v_limit,
    'remaining', v_limit - (v_current_count + 1)
  );
END;
$$;

-- Read Quota Status without consuming
CREATE OR REPLACE FUNCTION public.get_ai_quota_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_tier TEXT;
  v_limit INT;
  v_current_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', FALSE, 'used', 0, 'limit', 0, 'remaining', 0);
  END IF;

  SELECT role, subscription_tier INTO v_role, v_tier
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_role IN ('admin', 'teacher') THEN
    v_limit := 150;
  ELSIF v_tier = 'premium' THEN
    v_limit := 150;
  ELSIF v_tier = 'standard' THEN
    v_limit := 60;
  ELSE
    v_limit := 10;
  END IF;

  SELECT questions_count INTO v_current_count
  FROM public.user_daily_ai_usage
  WHERE user_id = v_user_id AND usage_date = CURRENT_DATE;

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_current_count < v_limit),
    'used', v_current_count,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - v_current_count)
  );
END;
$$;


-- ==============================================================================
-- 2. AUTHORITATIVE SERVER-SIDE EXAM SUBMISSION & GRADING RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_and_grade_exam_attempt(
  p_exam_id             UUID,
  p_answers             JSONB,
  p_time_spent_seconds  INT,
  p_violation_count     INT DEFAULT 0,
  p_violation_logs      JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_student_name TEXT;
  v_exam RECORD;
  v_subject_name TEXT;
  v_q RECORD;
  v_chosen_choice_id UUID;
  v_correct_choice_id UUID;
  v_student_text TEXT;
  v_is_right BOOLEAN;
  v_points NUMERIC(5,2);
  v_auto_score NUMERIC(5,2) := 0;
  v_max_score NUMERIC(5,2) := 0;
  v_has_essay BOOLEAN := FALSE;
  v_attempt_id UUID;
  v_percentage NUMERIC(5,2);
  v_passed BOOLEAN := FALSE;
  v_status attempt_status;
  v_answer_id UUID;
  v_ans_entry JSONB;
  v_cert_id UUID;
  v_cert_number TEXT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in to submit an exam attempt.';
  END IF;

  -- 1. Fetch Student Profile
  SELECT full_name INTO v_student_name FROM public.profiles WHERE id = v_student_id;
  IF v_student_name IS NULL THEN
    v_student_name := 'طالب كوكب تالتة';
  END IF;

  -- 2. Fetch Examination Details
  SELECT e.*, s.name_ar AS sub_name
  INTO v_exam
  FROM public.examinations e
  JOIN public.subjects s ON s.id = e.subject_id
  WHERE e.id = p_exam_id;

  IF v_exam.id IS NULL THEN
    RAISE EXCEPTION 'Examination not found.';
  END IF;

  v_subject_name := v_exam.sub_name;

  -- 3. Verify attempt limit
  IF (SELECT COUNT(*) FROM public.exam_attempts WHERE exam_id = p_exam_id AND student_id = v_student_id) >= v_exam.max_attempts THEN
    RAISE EXCEPTION 'Maximum exam attempts limit reached.';
  END IF;

  -- 4. Create authoritative Attempt ID
  v_attempt_id := uuid_generate_v4();

  -- 5. Loop over all questions belonging to this examination
  FOR v_q IN
    SELECT q.id, q.question_type, q.points, q.correct_blank_answer, q.model_answer
    FROM public.questions q
    WHERE q.exam_id = p_exam_id
    ORDER BY q.order_index ASC
  LOOP
    v_points := COALESCE(v_q.points, 1.0);
    v_max_score := v_max_score + v_points;
    v_ans_entry := p_answers->(v_q.id::text);

    IF v_q.question_type IN ('mcq', 'true_false') THEN
      v_chosen_choice_id := NULL;
      IF v_ans_entry IS NOT NULL AND v_ans_entry->>'selectedChoiceId' IS NOT NULL THEN
        BEGIN
          v_chosen_choice_id := (v_ans_entry->>'selectedChoiceId')::UUID;
        EXCEPTION WHEN OTHERS THEN
          v_chosen_choice_id := NULL;
        END;
      END IF;

      -- Check against hidden is_correct choice securely on the server
      SELECT id INTO v_correct_choice_id
      FROM public.answer_choices
      WHERE question_id = v_q.id AND is_correct = TRUE
      LIMIT 1;

      IF v_chosen_choice_id IS NOT NULL AND v_correct_choice_id IS NOT NULL AND v_chosen_choice_id = v_correct_choice_id THEN
        v_is_right := TRUE;
        v_auto_score := v_auto_score + v_points;
      ELSE
        v_is_right := FALSE;
      END IF;

      INSERT INTO public.student_answers (
        attempt_id, question_id, selected_choice_id, score_awarded, created_at
      ) VALUES (
        v_attempt_id, v_q.id, v_chosen_choice_id, (CASE WHEN v_is_right THEN v_points ELSE 0 END), NOW()
      );

    ELSIF v_q.question_type = 'fill_blank' THEN
      v_student_text := TRIM(COALESCE(v_ans_entry->>'essayAnswerText', v_ans_entry->>'blankAnswerText', ''));
      
      -- Normalize arabic strings
      v_is_right := (
        LENGTH(v_student_text) > 0 AND (
          LOWER(TRIM(v_student_text)) = LOWER(TRIM(COALESCE(v_q.correct_blank_answer, v_q.model_answer, '')))
          OR POSITION(LOWER(TRIM(v_student_text)) IN LOWER(COALESCE(v_q.correct_blank_answer, ''))) > 0
        )
      );

      IF v_is_right THEN
        v_auto_score := v_auto_score + v_points;
      END IF;

      INSERT INTO public.student_answers (
        attempt_id, question_id, blank_answer_text, score_awarded,
        teacher_feedback, created_at
      ) VALUES (
        v_attempt_id, v_q.id, v_student_text, (CASE WHEN v_is_right THEN v_points ELSE 0 END),
        (CASE WHEN v_is_right THEN 'إجابة صحيحة ومطابقة ✓' ELSE 'تم تصحيح الإجابة آلياً' END),
        NOW()
      );

    ELSIF v_q.question_type = 'essay' THEN
      v_has_essay := TRUE;
      v_student_text := COALESCE(v_ans_entry->>'essayAnswerText', '');

      INSERT INTO public.student_answers (
        attempt_id, question_id, essay_answer_text, score_awarded,
        ai_suggested_score, ai_feedback, created_at
      ) VALUES (
        v_attempt_id, v_q.id, v_student_text, 0,
        (CASE WHEN LENGTH(v_student_text) > 20 THEN (v_points * 0.8) ELSE 0 END),
        'في انتظار مراجعة المعلم واعتماد الدرجة',
        NOW()
      );
    END IF;
  END LOOP;

  -- 6. Compute Final Authoritative Scores
  IF v_max_score <= 0 THEN
    v_max_score := 1.0;
  END IF;

  v_percentage := ROUND(((v_auto_score / v_max_score) * 100)::numeric, 1);
  v_status := CASE WHEN v_has_essay THEN 'under_review'::attempt_status ELSE 'graded'::attempt_status END;
  v_passed := (NOT v_has_essay) AND (v_percentage >= v_exam.passing_percentage);

  -- 7. Insert the authoritative attempt row
  INSERT INTO public.exam_attempts (
    id,
    exam_id,
    student_id,
    subject_name,
    started_at,
    submitted_at,
    time_spent_seconds,
    auto_score,
    essay_score,
    total_score,
    max_score,
    percentage,
    passed,
    status,
    violation_count,
    violation_logs,
    is_provisional
  ) VALUES (
    v_attempt_id,
    p_exam_id,
    v_student_id,
    v_subject_name,
    NOW() - (p_time_spent_seconds || ' seconds')::interval,
    NOW(),
    p_time_spent_seconds,
    v_auto_score,
    0,
    v_auto_score,
    v_max_score,
    v_percentage,
    v_passed,
    v_status,
    COALESCE(p_violation_count, 0),
    COALESCE(p_violation_logs, '[]'::jsonb),
    v_has_essay
  );

  -- 8. Auto-issue Certificate on the server if passed and allows_certificate
  IF v_passed AND v_exam.allows_certificate THEN
    v_cert_number := 'CERT_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    INSERT INTO public.certificates (
      certificate_number,
      student_id,
      exam_id,
      subject_name,
      exam_title,
      student_name,
      score_percentage,
      issued_at,
      qr_code_data,
      is_revoked
    ) VALUES (
      v_cert_number,
      v_student_id,
      p_exam_id,
      v_subject_name,
      v_exam.title,
      v_student_name,
      v_percentage,
      NOW(),
      'https://kawkab.edu.eg/verify/' || v_cert_number,
      FALSE
    )
    ON CONFLICT (certificate_number) DO NOTHING;
  END IF;

  -- 9. Return validated attempt
  RETURN jsonb_build_object(
    'id', v_attempt_id,
    'examId', p_exam_id,
    'studentId', v_student_id,
    'studentName', v_student_name,
    'subjectName', v_subject_name,
    'examTitle', v_exam.title,
    'autoScore', v_auto_score,
    'essayScore', 0,
    'totalScore', v_auto_score,
    'maxScore', v_max_score,
    'percentage', v_percentage,
    'passed', v_passed,
    'status', v_status,
    'isProvisional', v_has_essay,
    'submittedAt', NOW()
  );
END;
$$;

-- Grant Execution Rights
REVOKE ALL ON FUNCTION public.check_and_consume_ai_quota() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_quota_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_and_grade_exam_attempt(UUID, JSONB, INT, INT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_and_consume_ai_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_quota_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_and_grade_exam_attempt(UUID, JSONB, INT, INT, JSONB) TO authenticated;
