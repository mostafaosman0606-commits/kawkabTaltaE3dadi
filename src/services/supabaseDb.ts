// ==============================================================================
// KAWKAB TALTA E3DADI — SUPABASE HYBRID DATA LAYER
// Provides async Supabase operations with automatic localStorage fallback.
// All functions are safe to call even if Supabase is not configured.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { ensureUUID, isValidUUID, normalizeUUIDOrNull } from './uuid';
export { ensureUUID, isValidUUID, normalizeUUIDOrNull, UUID_REGEX } from './uuid';

function requireUUIDFields(operation: string, fields: Record<string, string | null | undefined>): boolean {
  const invalidFields = Object.entries(fields)
    .filter(([, value]) => {
      if (value == null || value === '') return false;
      return !isValidUUID(value);
    })
    .map(([field]) => field);
  if (invalidFields.length > 0) {
    console.warn(`[${operation}] Skipping Supabase request; invalid UUID field(s): ${invalidFields.join(', ')}`);
    return false;
  }
  return true;
}

import type {
  UserProfile, UserRole, SubscriptionTier, SubscriptionStatus,
  Subject, Lesson, LessonProgress, ExamAttempt, Certificate,
  LiveChallenge, Notification, RoboConversation, RoboMessage,
  Unit, Examination, Question,
  Announcement, StudentBadge, StudentGoal, DailyStreak,
  Flashcard, SubscriptionRequest, TeacherAssignment,
  StudentGroupMessage, StudentScheduleSlot, StudentTask,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN MAPPERS  (Supabase snake_case ↔ App camelCase)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || row.email?.split('@')[0] || 'طالب كوكب تالتة',
    role: (row.role as UserRole) || 'student',
    phoneNumber: row.phone_number ?? undefined,
    governorate: row.governorate ?? undefined,
    schoolName: row.school_name ?? undefined,
    subscriptionTier: (row.subscription_tier as SubscriptionTier) || 'free',
    subscriptionStatus: (row.subscription_status as SubscriptionStatus) || 'active',
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    isSuspended: row.is_suspended ?? false,
    avatarUrl: row.avatar_url ?? undefined,
    aiQuestionsUsedThisMonth: row.ai_questions_used_this_month ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSubject(row: any): Subject {
  return {
    id: row.id, slug: row.slug, nameAr: row.name_ar,
    description: row.description ?? '', icon: row.icon ?? 'BookOpen',
    colorPrimary: row.color_primary ?? '#06b6d4',
    colorSecondary: row.color_secondary ?? '#0284c7',
    orderIndex: row.order_index ?? 0, isPublished: row.is_published ?? true,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLesson(row: any): Lesson {
  return {
    id: row.id, unitId: row.unit_id ?? undefined, subjectId: row.subject_id,
    title: row.title, orderIndex: row.order_index ?? 0,
    contentHtml: row.content_html ?? '', summary: row.summary ?? undefined,
    teacherName: row.teacher_name ?? undefined,
    videoType: row.video_type as 'youtube' | 'direct' | undefined,
    videoUrl: row.video_url ?? undefined, pdfUrl: row.pdf_url ?? undefined,
    images: row.images ?? [], durationMinutes: row.duration_minutes ?? undefined,
    isFreePreview: row.is_free_preview ?? false, isPublished: row.is_published ?? true,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProgress(row: any): LessonProgress {
  return {
    id: row.id, lessonId: row.lesson_id, studentId: row.student_id,
    completed: row.completed ?? true,
    completedAt: row.completed_at ?? new Date().toISOString(),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAttempt(row: any): ExamAttempt {
  return {
    id: row.id, examId: row.exam_id, studentId: row.student_id,
    subjectName: row.subject_name ?? undefined,
    startedAt: row.started_at ?? new Date().toISOString(),
    submittedAt: row.submitted_at ?? undefined,
    timeSpentSeconds: row.time_spent_seconds ?? 0,
    autoScore: row.auto_score ?? 0, essayScore: row.essay_score ?? 0,
    totalScore: row.total_score ?? 0, maxScore: row.max_score ?? 0,
    percentage: row.percentage ?? 0, passed: row.passed ?? false,
    status: row.status ?? 'in_progress',
    violationCount: row.violation_count ?? 0,
    violationLogs: row.violation_logs ?? [], isProvisional: row.is_provisional ?? false,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChallenge(row: any): LiveChallenge {
  return {
    id: row.id, subjectId: row.subject_id, subjectName: row.subject_name ?? '',
    code: row.code, title: row.title, createdBy: row.created_by,
    creatorName: row.creator_name ?? '',
    creatorGovernorate: row.creator_governorate ?? undefined,
    isOpenChallenge: row.is_open_challenge ?? false,
    opponentId: row.opponent_id ?? undefined, opponentName: row.opponent_name ?? undefined,
    status: row.status ?? 'waiting', timeLimitSeconds: row.time_limit_seconds ?? 60,
    questions: row.questions ?? [], creatorScore: row.creator_score ?? 0,
    opponentScore: row.opponent_score ?? 0, winnerId: row.winner_id ?? undefined,
    winnerName: row.winner_name ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    finishedAt: row.finished_at ?? undefined,
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(row: any): Notification {
  return {
    id: row.id, userId: row.user_id, title: row.title, message: row.message,
    type: row.type ?? 'info', isRead: row.is_read ?? false,
    linkUrl: row.link_url ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnnouncement(row: any): Announcement {
  return {
    id: row.id, title: row.title, content: row.content,
    targetAudience: row.target_audience ?? 'all', priority: row.priority ?? 'normal',
    isPublished: row.is_published ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStudentGroupMessage(row: any): StudentGroupMessage {
  return {
    id: row.id,
    studentId: row.student_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    senderBadge: row.sender_badge,
    senderAvatar: row.sender_avatar ?? undefined,
    text: row.text,
    attachmentUrl: row.attachment_url ?? undefined,
    createdAt: row.created_at,
    isRead: row.is_read ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export async function sbSignUp(email: string, password: string, fullName: string, phone: string, governorate: string, school: string): Promise<{ userId: string | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) return { userId: null, error: null };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone_number: phone, governorate, school_name: school } } });
    if (error) return { userId: null, error: error.message };
    return { userId: data.user?.id ?? null, error: null };
  } catch (e) { console.warn('[sbSignUp]', e); return { userId: null, error: null }; }
}

export async function sbSignIn(email: string, password: string): Promise<{ userId: string | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) return { userId: null, error: null };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { userId: null, error: error.message };
    return { userId: data.user?.id ?? null, error: null };
  } catch (e) { console.warn('[sbSignIn]', e); return { userId: null, error: null }; }
}

export async function sbSignOut(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try { await supabase.auth.signOut(); } catch (e) { console.warn('[sbSignOut]', e); }
}

export async function sbGetSession(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try { const { data } = await supabase.auth.getSession(); return data.session?.user?.id ?? null; } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  if (!requireUUIDFields('sbGetProfile', { userId })) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return mapProfile(data);
  } catch (e) { console.warn('[sbGetProfile]', e); return null; }
}

export async function sbGetAllProfiles(): Promise<UserProfile[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,phone_number,governorate,school_name,subscription_tier,subscription_status,subscription_expires_at,is_suspended,avatar_url,ai_questions_used_this_month,created_at').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapProfile);
  } catch (e) { console.warn('[sbGetAllProfiles]', e); return []; }
}

export async function sbUpsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbUpsertProfile', { id: profile.id })) return false;
  try {
    const row: Record<string, unknown> = { id: profile.id };
    if (profile.email !== undefined) row['email'] = profile.email;
    if (profile.fullName !== undefined) row['full_name'] = profile.fullName;
    if (profile.phoneNumber !== undefined) row['phone_number'] = profile.phoneNumber;
    if (profile.governorate !== undefined) row['governorate'] = profile.governorate;
    if (profile.schoolName !== undefined) row['school_name'] = profile.schoolName;
    if (profile.role !== undefined) row['role'] = profile.role;
    if (profile.subscriptionTier !== undefined) row['subscription_tier'] = profile.subscriptionTier;
    if (profile.subscriptionStatus !== undefined) row['subscription_status'] = profile.subscriptionStatus;
    if (profile.isSuspended !== undefined) row['is_suspended'] = profile.isSuspended;
    if (profile.avatarUrl !== undefined) row['avatar_url'] = profile.avatarUrl;
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) { console.warn('[sbUpsertProfile]', error.message); return false; }
    return true;
  } catch (e) { console.warn('[sbUpsertProfile]', e); return false; }
}

export async function sbAdminUpdateProfile(userId: string, updates: { role?: UserRole; subscriptionTier?: SubscriptionTier; subscriptionStatus?: SubscriptionStatus; isSuspended?: boolean; subscriptionExpiresAt?: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbAdminUpdateProfile', { userId })) return false;
  try {
    const row: Record<string, unknown> = {};
    if (updates.role !== undefined) row['role'] = updates.role;
    if (updates.subscriptionTier !== undefined) row['subscription_tier'] = updates.subscriptionTier;
    if (updates.subscriptionStatus !== undefined) row['subscription_status'] = updates.subscriptionStatus;
    if (updates.isSuspended !== undefined) row['is_suspended'] = updates.isSuspended;
    if (updates.subscriptionExpiresAt !== undefined) row['subscription_expires_at'] = updates.subscriptionExpiresAt;
    const { error } = await supabase.from('profiles').update(row).eq('id', userId);
    if (error) { console.warn('[sbAdminUpdateProfile]', error.message); return false; }
    return true;
  } catch (e) { console.warn('[sbAdminUpdateProfile]', e); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetSubjects(): Promise<Subject[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('order_index');
    if (error || !data) return [];
    return data.map(mapSubject);
  } catch (e) { console.warn('[sbGetSubjects]', e); return []; }
}

export async function sbSaveSubject(subject: Partial<Subject>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const subjectId = ensureUUID(subject.id || subject.slug);
    const row: Record<string, unknown> = {
      id: subjectId,
      slug: subject.slug,
      name_ar: subject.nameAr,
      description: subject.description,
      icon: subject.icon,
      color_primary: subject.colorPrimary,
      color_secondary: subject.colorSecondary,
      order_index: subject.orderIndex,
      is_published: subject.isPublished ?? true,
    };
    Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
    const { error } = await supabase.from('subjects').upsert(row, { onConflict: 'id' });
    if (error) { console.warn('[sbSaveSubject]', error.message); return false; }
    return true;
  } catch (e) { console.warn('[sbSaveSubject]', e); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSONS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetLessons(subjectId?: string): Promise<Lesson[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const normalizedSubjectId = subjectId ? ensureUUID(subjectId) : undefined;
  if (!requireUUIDFields('sbGetLessons', { subjectId: normalizedSubjectId })) return [];
  try {
    let query = supabase.from('lessons').select('*').order('order_index');
    if (normalizedSubjectId) query = query.eq('subject_id', normalizedSubjectId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapLesson);
  } catch (e) { console.warn('[sbGetLessons]', e); return []; }
}

export async function sbSaveLesson(lesson: Partial<Lesson> & { subjectId: string; title: string; contentHtml: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbSaveLesson', { id: lesson.id, subjectId: lesson.subjectId, unitId: lesson.unitId })) return false;
  try {
    const row: Record<string, unknown> = { subject_id: lesson.subjectId, unit_id: lesson.unitId ?? null, title: lesson.title, order_index: lesson.orderIndex ?? 0, content_html: lesson.contentHtml, summary: lesson.summary ?? null, teacher_name: lesson.teacherName ?? null, video_type: lesson.videoType ?? null, video_url: lesson.videoUrl ?? null, pdf_url: lesson.pdfUrl ?? null, images: lesson.images ?? [], duration_minutes: lesson.durationMinutes ?? 20, is_free_preview: lesson.isFreePreview ?? false, is_published: lesson.isPublished ?? true };
    if (lesson.id) row['id'] = lesson.id;
    const { error } = await supabase.from('lessons').upsert(row, { onConflict: 'id' });
    if (error) { console.warn('[sbSaveLesson]', error.message); return false; }
    return true;
  } catch (e) { console.warn('[sbSaveLesson]', e); return false; }
}

export async function sbDeleteLesson(lessonId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbDeleteLesson', { lessonId })) return false;
  try {
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) { console.warn('[sbDeleteLesson]', error.message); return false; }
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// UNITS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetUnits(subjectId?: string): Promise<Unit[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const normalizedSubjectId = subjectId ? ensureUUID(subjectId) : undefined;
  try {
    let query = supabase.from('units').select('*').order('order_index');
    if (normalizedSubjectId) query = query.eq('subject_id', normalizedSubjectId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((u: any) => ({
      id: u.id,
      subjectId: u.subject_id,
      title: u.title,
      orderIndex: u.order_index,
      description: u.description || undefined,
    }));
  } catch (e) {
    console.warn('[sbGetUnits]', e);
    return [];
  }
}

export async function sbSaveUnitToCloud(unit: Partial<Unit> & { subjectId: string; title: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const row = {
      id: unit.id ? ensureUUID(unit.id) : undefined,
      subject_id: ensureUUID(unit.subjectId),
      title: unit.title,
      order_index: unit.orderIndex || 1,
      description: unit.description || null,
    };
    const { error } = await supabase.from('units').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[sbSaveUnitToCloud]', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[sbSaveUnitToCloud]', e);
    return false;
  }
}

export async function sbDeleteUnit(unitId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('units').delete().eq('id', ensureUUID(unitId));
    return !error;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMINATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetExaminations(subjectId?: string): Promise<Examination[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const normalizedSubjectId = subjectId ? ensureUUID(subjectId) : undefined;
  try {
    let query = supabase.from('examinations').select('*').order('created_at', { ascending: false });
    if (normalizedSubjectId) query = query.eq('subject_id', normalizedSubjectId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((e: any) => ({
      id: e.id,
      subjectId: e.subject_id,
      unitId: e.unit_id || undefined,
      title: e.title,
      description: e.description || '',
      timeLimitMinutes: e.time_limit_minutes || 20,
      passingPercentage: e.passing_percentage || 50,
      randomizeQuestions: e.randomize_questions ?? true,
      randomizeAnswers: e.randomize_answers ?? true,
      antiCheatingTabSwitch: true,
      maxAttempts: e.max_attempts || 3,
      isPublished: e.is_published ?? true,
      allowsCertificate: e.allows_certificate ?? true,
      examType: e.exam_type || 'official',
      createdAt: e.created_at,
    }));
  } catch (e) {
    console.warn('[sbGetExaminations]', e);
    return [];
  }
}

export async function sbSaveExaminationToCloud(exam: Partial<Examination> & { subjectId: string; title: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const row = {
      id: exam.id ? ensureUUID(exam.id) : undefined,
      subject_id: ensureUUID(exam.subjectId),
      unit_id: normalizeUUIDOrNull(exam.unitId),
      title: exam.title,
      description: exam.description || '',
      time_limit_minutes: exam.timeLimitMinutes || 20,
      passing_percentage: exam.passingPercentage || 50,
      randomize_questions: exam.randomizeQuestions ?? true,
      randomize_answers: exam.randomizeAnswers ?? true,
      max_attempts: exam.maxAttempts || 3,
      is_published: exam.isPublished ?? true,
      allows_certificate: exam.allowsCertificate ?? true,
      exam_type: exam.examType || 'official',
    };
    const { error } = await supabase.from('examinations').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[sbSaveExaminationToCloud]', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[sbSaveExaminationToCloud]', e);
    return false;
  }
}

export async function sbDeleteExamination(examId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('examinations').delete().eq('id', ensureUUID(examId));
    return !error;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS & CHOICES
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetQuestions(examId?: string): Promise<Question[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    let query = supabase.from('questions').select('*, answer_choices(*)').order('order_index');
    if (examId) query = query.eq('exam_id', ensureUUID(examId));
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((q: any) => ({
      id: q.id,
      examId: q.exam_id,
      questionText: q.question_text,
      questionType: q.question_type || 'mcq',
      points: Number(q.points) || 1.0,
      orderIndex: q.order_index || 1,
      explanation: q.explanation || undefined,
      imageUrl: q.image_url || undefined,
      choices: (q.answer_choices || []).map((c: any) => ({
        id: c.id,
        questionId: c.question_id,
        choiceText: c.choice_text,
        isCorrect: c.is_correct ?? false,
        orderIndex: c.order_index || 1,
      })),
    }));
  } catch (e) {
    console.warn('[sbGetQuestions]', e);
    return [];
  }
}

export async function sbSaveQuestionToCloud(question: Partial<Question> & { examId: string; questionText: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const qId = ensureUUID(question.id);
    const examId = ensureUUID(question.examId);
    const qRow = {
      id: qId,
      exam_id: examId,
      question_text: question.questionText,
      question_type: question.questionType || 'mcq',
      points: question.points || 1.0,
      order_index: question.orderIndex || 1,
      explanation: question.explanation || null,
      image_url: question.imageUrl || null,
    };
    const { error: qError } = await supabase.from('questions').upsert(qRow, { onConflict: 'id' });
    if (qError) {
      console.warn('[sbSaveQuestionToCloud]', qError.message);
      return false;
    }
    if (question.choices && question.choices.length > 0) {
      const choiceRows = question.choices.map((c) => ({
        id: ensureUUID(c.id),
        question_id: qId,
        choice_text: c.choiceText,
        is_correct: c.isCorrect ?? false,
        order_index: c.orderIndex || 1,
      }));
      await supabase.from('answer_choices').upsert(choiceRows, { onConflict: 'id' });
    }
    return true;
  } catch (e) {
    console.warn('[sbSaveQuestionToCloud]', e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME MULTI-TABLE SYNC
// ─────────────────────────────────────────────────────────────────────────────
export function setupSupabaseRealtimeSync(onSync: () => void): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {};
  try {
    const channel = supabase
      .channel('kawkab_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'examinations' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_conversations' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_messages' }, onSync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_group_messages' }, onSync)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

// LESSON PROGRESS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetProgress(studentId: string): Promise<LessonProgress[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetProgress', { studentId })) return [];
  try {
    const { data, error } = await supabase.from('lesson_progress').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    return data.map(mapProgress);
  } catch (e) { console.warn('[sbGetProgress]', e); return []; }
}

export async function sbMarkLessonComplete(studentId: string, lessonId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbMarkLessonComplete', { studentId, lessonId })) return false;
  try {
    const { error } = await supabase.from('lesson_progress').upsert({ student_id: studentId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'lesson_id,student_id' });
    if (error) { console.warn('[sbMarkLessonComplete]', error.message); return false; }
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM ATTEMPTS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetAttempts(studentId: string): Promise<ExamAttempt[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetAttempts', { studentId })) return [];
  try {
    const { data, error } = await supabase.from('exam_attempts').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapAttempt);
  } catch (e) { console.warn('[sbGetAttempts]', e); return []; }
}

export async function sbGetAllAttempts(): Promise<ExamAttempt[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('exam_attempts').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapAttempt);
  } catch (e) { console.warn('[sbGetAllAttempts]', e); return []; }
}

export async function sbSaveAttempt(attempt: ExamAttempt): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const attemptId = ensureUUID(attempt.id);
    const examId = ensureUUID(attempt.examId);
    const studentId = ensureUUID(attempt.studentId);
    attempt.id = attemptId;
    attempt.examId = examId;
    attempt.studentId = studentId;
    const { error } = await supabase.from('exam_attempts').upsert({
      id: attemptId,
      exam_id: examId,
      student_id: studentId,
      subject_name: attempt.subjectName ?? null,
      started_at: attempt.startedAt,
      submitted_at: attempt.submittedAt ?? null,
      time_spent_seconds: attempt.timeSpentSeconds,
      auto_score: attempt.autoScore,
      essay_score: attempt.essayScore,
      total_score: attempt.totalScore,
      max_score: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      status: attempt.status,
      violation_count: attempt.violationCount,
      violation_logs: attempt.violationLogs,
      is_provisional: attempt.isProvisional
    }, { onConflict: 'id' });
    if (error) { console.warn('[sbSaveAttempt]', error.message); return false; }
    return true;
  } catch { return false; }
}

// Authoritative Server-Side Exam Submission and Grading RPC
export async function sbSubmitAndGradeExamAttempt(
  examId: string,
  answers: Record<string, { selectedChoiceId?: string; essayAnswerText?: string; blankAnswerText?: string }>,
  timeSpentSeconds: number,
  violationCount: number,
  violationLogs: Array<{ timestamp: string; type: string; details: string }>
): Promise<{ success: boolean; attempt?: Partial<ExamAttempt>; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) return { success: false, error: 'Supabase not configured' };
  const selectedChoiceIds = Object.values(answers).map((answer) => answer.selectedChoiceId || undefined);
  if (!requireUUIDFields('sbSubmitAndGradeExamAttempt', {
    examId,
    ...Object.fromEntries(selectedChoiceIds.map((id, index) => [`selectedChoiceId${index}`, id])),
  })) return { success: false, error: 'Invalid UUID in exam submission' };
  try {
    const { data, error } = await supabase.rpc('submit_and_grade_exam_attempt', {
      p_exam_id: examId,
      p_answers: answers,
      p_time_spent_seconds: timeSpentSeconds,
      p_violation_count: violationCount,
      p_violation_logs: violationLogs,
    });

    if (error || !data) {
      console.warn('[sbSubmitAndGradeExamAttempt]', error?.message);
      return { success: false, error: error?.message };
    }

    return { success: true, attempt: data };
  } catch (e: any) {
    console.warn('[sbSubmitAndGradeExamAttempt]', e);
    return { success: false, error: e?.message };
  }
}

// Authoritative Server-Side AI Daily Quota Check & Consume
export async function sbCheckAndConsumeAiQuota(): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { allowed: true, used: 0, limit: 10, remaining: 10 };
  }
  try {
    const { data, error } = await supabase.rpc('check_and_consume_ai_quota');
    if (error || !data) {
      console.warn('[sbCheckAndConsumeAiQuota] Quota check failed; denying request.', error?.message);
      return { allowed: false, used: 0, limit: 10, remaining: 0 };
    }
    return data;
  } catch {
    return { allowed: false, used: 0, limit: 10, remaining: 0 };
  }
}

// Authoritative Server-Side AI Daily Quota Status Check
export async function sbGetAiQuotaStatus(): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { allowed: true, used: 0, limit: 10, remaining: 10 };
  }
  try {
    const { data, error } = await supabase.rpc('get_ai_quota_status');
    if (error || !data) {
      console.warn('[sbGetAiQuotaStatus] Quota status unavailable.', error?.message);
      return { allowed: false, used: 0, limit: 10, remaining: 0 };
    }
    return data;
  } catch {
    return { allowed: false, used: 0, limit: 10, remaining: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetCertificates(studentId: string): Promise<Certificate[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetCertificates', { studentId })) return [];
  try {
    const { data, error } = await supabase.from('certificates').select('*').eq('student_id', studentId).eq('is_revoked', false).order('issued_at', { ascending: false });
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): Certificate => ({ id: r.id, certificateNumber: r.certificate_number, studentId: r.student_id, examId: r.exam_id, subjectName: r.subject_name, examTitle: r.exam_title, studentName: r.student_name, scorePercentage: r.score_percentage, issuedAt: r.issued_at, qrCodeData: r.qr_code_data, isRevoked: r.is_revoked ?? false }));
  } catch (e) { console.warn('[sbGetCertificates]', e); return []; }
}

export async function sbSaveCertificate(cert: Certificate): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbSaveCertificate', { studentId: cert.studentId, examId: cert.examId })) return false;
  try {
    // Only pass valid UUID for id if not a client-generated string
    const isClientUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cert.id);
    const row: Record<string, unknown> = {
      certificate_number: cert.certificateNumber,
      student_id: cert.studentId,
      exam_id: cert.examId,
      subject_name: cert.subjectName,
      exam_title: cert.examTitle,
      student_name: cert.studentName,
      score_percentage: cert.scorePercentage,
      issued_at: cert.issuedAt,
      qr_code_data: cert.qrCodeData,
      is_revoked: cert.isRevoked,
    };
    if (isClientUuid) row['id'] = cert.id;

    const { error } = await supabase.from('certificates').upsert(row, { onConflict: 'certificate_number' });
    if (error) {
      console.warn('[sbSaveCertificate]', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[sbSaveCertificate]', e);
    return false;
  }
}

export async function sbRevokeCertificate(certNumber: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { data, error } = await supabase.from('certificates')
      .update({ is_revoked: true })
      .eq('certificate_number', certNumber)
      .select('id');
    if (error) return false;
    if (data?.length) return true;
    if (!isValidUUID(certNumber)) return false;
    const { error: idError } = await supabase.from('certificates')
      .update({ is_revoked: true })
      .eq('id', certNumber);
    return !idError;
  } catch {
    return false;
  }
}

export async function sbVerifyCertificateOnline(certNumber: string): Promise<Certificate | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('certificates')
      .select('*')
      .eq('certificate_number', certNumber.trim())
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      certificateNumber: data.certificate_number,
      studentId: data.student_id,
      examId: data.exam_id,
      subjectName: data.subject_name,
      examTitle: data.exam_title,
      studentName: data.student_name,
      scorePercentage: data.score_percentage,
      issuedAt: data.issued_at,
      qrCodeData: data.qr_code_data,
      isRevoked: data.is_revoked ?? false,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES (Realtime)
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetOpenChallenges(): Promise<LiveChallenge[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('challenges').select('*').eq('status', 'waiting').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapChallenge);
  } catch { return []; }
}

export async function sbGetChallengeByCode(code: string): Promise<LiveChallenge | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('challenges').select('*').eq('code', code.toUpperCase()).single();
    if (error || !data) return null;
    return mapChallenge(data);
  } catch { return null; }
}

export async function sbUpsertChallenge(challenge: LiveChallenge): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbUpsertChallenge', {
    subjectId: challenge.subjectId,
    createdBy: challenge.createdBy,
    opponentId: challenge.opponentId,
    winnerId: challenge.winnerId,
  })) return false;
  try {
    const challengeId = ensureUUID(challenge.id);
    challenge.id = challengeId;
    const { error } = await supabase.from('challenges').upsert({ id: challengeId, subject_id: challenge.subjectId, subject_name: challenge.subjectName, code: challenge.code, title: challenge.title, created_by: challenge.createdBy, creator_name: challenge.creatorName, creator_governorate: challenge.creatorGovernorate ?? null, is_open_challenge: challenge.isOpenChallenge ?? false, opponent_id: challenge.opponentId ?? null, opponent_name: challenge.opponentName ?? null, status: challenge.status, time_limit_seconds: challenge.timeLimitSeconds, questions: challenge.questions, creator_score: challenge.creatorScore, opponent_score: challenge.opponentScore, winner_id: challenge.winnerId ?? null, winner_name: challenge.winnerName ?? null, finished_at: challenge.finishedAt ?? null }, { onConflict: 'id' });
    if (error) { console.warn('[sbUpsertChallenge]', error.message); return false; }
    return true;
  } catch { return false; }
}

export function sbSubscribeToChallenges(onUpdate: (challenge: LiveChallenge) => void): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {};
  try {
    const channel = supabase.channel('challenges-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, (payload) => { if (payload.new) onUpdate(mapChallenge(payload.new)); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  } catch { return () => {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetNotifications(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetNotifications', { userId })) return [];
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data) return [];
    return data.map(mapNotification);
  } catch { return []; }
}

export async function sbMarkNotificationRead(notifId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbMarkNotificationRead', { notifId })) return false;
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    return !error;
  } catch { return false; }
}

export async function sbInsertNotification(notif: Omit<Notification, 'id' | 'createdAt'>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbInsertNotification', { userId: notif.userId })) return false;
  try {
    const { error } = await supabase.from('notifications').insert({ user_id: notif.userId, title: notif.title, message: notif.message, type: notif.type, is_read: notif.isRead ?? false, link_url: notif.linkUrl ?? null });
    return !error;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetAnnouncements(): Promise<Announcement[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(10);
    if (error || !data) return [];
    return data.map(mapAnnouncement);
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('subscription_requests').select('*, profiles(full_name, email, phone_number)').order('created_at', { ascending: false });
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): SubscriptionRequest => ({ id: r.id, studentId: r.student_id, studentName: r.profiles?.full_name ?? '', studentEmail: r.profiles?.email ?? '', studentPhone: r.profiles?.phone_number ?? '', planId: r.plan_id ?? '', tier: r.tier, paymentMethod: r.payment_method ?? 'vodafone_cash', paymentProofUrl: r.payment_proof_url ?? undefined, senderPhone: r.sender_phone ?? undefined, transactionRef: r.transaction_ref ?? undefined, status: r.status ?? 'pending', adminNotes: r.admin_notes ?? undefined, reviewedBy: r.reviewed_by ?? undefined, reviewedAt: r.reviewed_at ?? undefined, createdAt: r.created_at }));
  } catch { return []; }
}

export async function sbSaveSubscriptionRequest(req: Omit<SubscriptionRequest, 'id' | 'createdAt' | 'studentName' | 'studentEmail' | 'studentPhone' | 'status'> & { status?: SubscriptionRequest['status'] }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbSaveSubscriptionRequest', { studentId: req.studentId, planId: req.planId || null })) return false;
  try {
    const { error } = await supabase.from('subscription_requests').insert({ student_id: req.studentId, plan_id: req.planId || null, tier: req.tier, payment_method: req.paymentMethod, payment_proof_url: req.paymentProofUrl ?? null, sender_phone: req.senderPhone ?? null, transaction_ref: req.transactionRef ?? null, status: 'pending' });
    return !error;
  } catch { return false; }
}

export async function sbUpdateSubscriptionRequest(reqId: string, status: 'approved' | 'rejected', adminNotes?: string, reviewedBy?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbUpdateSubscriptionRequest', { reqId, reviewedBy: reviewedBy || null })) return false;
  try {
    const { error } = await supabase.from('subscription_requests').update({ status, admin_notes: adminNotes ?? null, reviewed_by: reviewedBy ?? null, reviewed_at: new Date().toISOString() }).eq('id', reqId);
    return !error;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER ASSIGNMENTS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetTeacherAssignments(): Promise<TeacherAssignment[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('teacher_assignments').select('*, profiles(full_name), subjects(name_ar)');
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): TeacherAssignment => ({ id: r.id, teacherId: r.teacher_id, teacherName: r.profiles?.full_name ?? '', subjectId: r.subject_id, subjectName: r.subjects?.name_ar ?? '', assignedAt: r.assigned_at }));
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// GAMIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetStreak(studentId: string): Promise<DailyStreak | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  if (!requireUUIDFields('sbGetStreak', { studentId })) return null;
  try {
    const { data, error } = await supabase.from('daily_streaks').select('*').eq('student_id', studentId).single();
    if (error || !data) return null;
    return { studentId: data.student_id, currentStreak: data.current_streak ?? 0, longestStreak: data.longest_streak ?? 0, lastActiveDate: data.last_activity_date ?? '', totalActiveDays: data.total_active_days ?? 0 };
  } catch { return null; }
}

export async function sbUpsertStreak(streak: DailyStreak): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbUpsertStreak', { studentId: streak.studentId })) return false;
  try {
    const { error } = await supabase.from('daily_streaks').upsert({ student_id: streak.studentId, current_streak: streak.currentStreak, longest_streak: streak.longestStreak, last_activity_date: streak.lastActiveDate }, { onConflict: 'student_id' });
    return !error;
  } catch { return false; }
}

export async function sbGetBadges(studentId: string): Promise<StudentBadge[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetBadges', { studentId })) return [];
  try {
    const { data, error } = await supabase.from('student_badges').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): StudentBadge => ({ id: r.id, studentId: r.student_id, badgeType: r.badge_type, earnedAt: r.earned_at, isNew: r.is_new ?? true }));
  } catch { return []; }
}

export async function sbAwardBadge(studentId: string, badgeType: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbAwardBadge', { studentId })) return false;
  try {
    const { error } = await supabase.from('student_badges').upsert({ student_id: studentId, badge_type: badgeType, is_new: true }, { onConflict: 'student_id,badge_type' });
    return !error;
  } catch { return false; }
}

export async function sbGetGoals(studentId: string): Promise<StudentGoal[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetGoals', { studentId })) return [];
  try {
    const { data, error } = await supabase.from('student_goals').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): StudentGoal => ({ id: r.id, studentId: r.student_id, subjectId: r.subject_id, subjectName: r.subject_name, targetPercentage: r.target_percentage, currentPercentage: r.current_percentage ?? 0, createdAt: r.created_at }));
  } catch { return []; }
}

export async function sbSaveGoal(goal: StudentGoal): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbSaveGoal', { studentId: goal.studentId, subjectId: goal.subjectId })) return false;
  try {
    const goalId = ensureUUID(goal.id);
    goal.id = goalId;
    const { error } = await supabase.from('student_goals').upsert({ id: goalId, student_id: goal.studentId, subject_id: goal.subjectId, subject_name: goal.subjectName, target_percentage: goal.targetPercentage, current_percentage: goal.currentPercentage }, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

export async function sbGetFlashcards(studentId: string, subjectId: string): Promise<Flashcard[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetFlashcards', { studentId, subjectId })) return [];
  try {
    const { data, error } = await supabase.from('flashcards').select('*').eq('student_id', studentId).eq('subject_id', subjectId).order('created_at');
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): Flashcard => ({ id: r.id, subjectId: r.subject_id, front: r.front, back: r.back, createdBy: r.created_by ?? 'student', createdAt: r.created_at }));
  } catch { return []; }
}

export async function sbSaveFlashcards(studentId: string, cards: Flashcard[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || cards.length === 0) return false;
  if (!requireUUIDFields('sbSaveFlashcards', { studentId, ...Object.fromEntries(cards.map((card, index) => [`subjectId${index}`, card.subjectId])) })) return false;
  try {
    const rows = cards.map((c) => {
      const cardId = ensureUUID(c.id);
      c.id = cardId;
      return { id: cardId, subject_id: c.subjectId, student_id: studentId, front: c.front, back: c.back, created_by: c.createdBy };
    });
    const { error } = await supabase.from('flashcards').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

export async function sbDeleteFlashcard(cardId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbDeleteFlashcard', { cardId })) return false;
  try {
    const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
    return !error;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT SCHEDULE & TASKS (Cloud Sync across all devices)
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetStudentSchedule(studentId: string): Promise<StudentScheduleSlot[]> {
  if (!isSupabaseConfigured() || !supabase || !isValidUUID(studentId)) return [];
  // 1. Try native table first
  try {
    const { data, error } = await supabase.from('student_schedule').select('*').eq('student_id', studentId);
    if (!error && data && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any): StudentScheduleSlot => ({
        id: r.id,
        studentId: r.student_id,
        dayOfWeek: r.day_of_week,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        title: r.title,
        startTime: r.start_time,
        endTime: r.end_time,
        notes: r.notes || undefined,
        color: r.color || undefined,
        createdAt: r.created_at || new Date().toISOString(),
      }));
    }
  } catch {}

  // 2. Fallback cloud store via student's private record
  try {
    const { data: convs } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', studentId)
      .eq('title', '__kawkab_cloud_schedule__')
      .limit(1);
    if (convs && convs.length > 0) {
      const { data: msgs } = await supabase
        .from('ai_messages')
        .select('text')
        .eq('conversation_id', convs[0].id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (msgs && msgs[0]?.text) {
        return JSON.parse(msgs[0].text);
      }
    }
  } catch {}
  return [];
}

export async function sbSaveStudentSchedule(studentId: string, slots: StudentScheduleSlot[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !isValidUUID(studentId)) return false;
  // 1. Try native table
  try {
    const rows = slots.map((s) => ({
      id: ensureUUID(s.id),
      student_id: studentId,
      day_of_week: s.dayOfWeek,
      subject_id: isValidUUID(s.subjectId) ? s.subjectId : null,
      subject_name: s.subjectName,
      title: s.title,
      start_time: s.startTime,
      end_time: s.endTime,
      notes: s.notes || null,
      color: s.color || null,
    }));
    const { error } = await supabase.from('student_schedule').upsert(rows, { onConflict: 'id' });
    if (!error) return true;
  } catch {}

  // 2. Cloud Fallback Store
  try {
    let convId = '';
    const { data: convs } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', studentId)
      .eq('title', '__kawkab_cloud_schedule__')
      .limit(1);
    if (convs && convs.length > 0) {
      convId = convs[0].id;
    } else {
      const newConvId = ensureUUID(`conv-sched-${studentId}`);
      const { error: cErr } = await supabase
        .from('ai_conversations')
        .upsert({ id: newConvId, user_id: studentId, title: '__kawkab_cloud_schedule__' }, { onConflict: 'id' });
      if (!cErr) convId = newConvId;
    }
    if (convId) {
      const msgId = ensureUUID(`msg-sched-${studentId}`);
      await supabase
        .from('ai_messages')
        .upsert({
          id: msgId,
          conversation_id: convId,
          sender: 'assistant',
          text: JSON.stringify(slots),
        }, { onConflict: 'id' });
      return true;
    }
  } catch {}
  return false;
}

export async function sbGetStudentTasks(studentId: string): Promise<StudentTask[]> {
  if (!isSupabaseConfigured() || !supabase || !isValidUUID(studentId)) return [];
  // 1. Try native table first
  try {
    const { data, error } = await supabase.from('student_tasks').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any): StudentTask => ({
        id: r.id,
        studentId: r.student_id,
        title: r.title,
        subjectName: r.subject_name || undefined,
        dueDate: r.due_date || undefined,
        completed: r.completed ?? false,
        priority: r.priority || 'medium',
        createdAt: r.created_at,
        completedAt: r.completed_at || undefined,
      }));
    }
  } catch {}

  // 2. Fallback cloud store via student's private record
  try {
    const { data: convs } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', studentId)
      .eq('title', '__kawkab_cloud_tasks__')
      .limit(1);
    if (convs && convs.length > 0) {
      const { data: msgs } = await supabase
        .from('ai_messages')
        .select('text')
        .eq('conversation_id', convs[0].id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (msgs && msgs[0]?.text) {
        return JSON.parse(msgs[0].text);
      }
    }
  } catch {}
  return [];
}

export async function sbSaveStudentTasks(studentId: string, tasks: StudentTask[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !isValidUUID(studentId)) return false;
  // 1. Try native table
  try {
    const rows = tasks.map((t) => ({
      id: ensureUUID(t.id),
      student_id: studentId,
      title: t.title,
      subject_name: t.subjectName || null,
      due_date: t.dueDate || null,
      completed: t.completed,
      priority: t.priority,
      completed_at: t.completedAt || null,
    }));
    const { error } = await supabase.from('student_tasks').upsert(rows, { onConflict: 'id' });
    if (!error) return true;
  } catch {}

  // 2. Cloud Fallback Store
  try {
    let convId = '';
    const { data: convs } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('user_id', studentId)
      .eq('title', '__kawkab_cloud_tasks__')
      .limit(1);
    if (convs && convs.length > 0) {
      convId = convs[0].id;
    } else {
      const newConvId = ensureUUID(`conv-tasks-${studentId}`);
      const { error: cErr } = await supabase
        .from('ai_conversations')
        .upsert({ id: newConvId, user_id: studentId, title: '__kawkab_cloud_tasks__' }, { onConflict: 'id' });
      if (!cErr) convId = newConvId;
    }
    if (convId) {
      const msgId = ensureUUID(`msg-tasks-${studentId}`);
      await supabase
        .from('ai_messages')
        .upsert({
          id: msgId,
          conversation_id: convId,
          sender: 'assistant',
          text: JSON.stringify(tasks),
        }, { onConflict: 'id' });
      return true;
    }
  } catch {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetConversations(userId: string): Promise<RoboConversation[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetConversations', { userId })) return [];
  try {
    const { data: convData, error } = await supabase.from('ai_conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    if (error || !convData) return [];
    const conversations: RoboConversation[] = [];
    for (const conv of convData) {
      const { data: msgs } = await supabase.from('ai_messages').select('*').eq('conversation_id', conv.id).order('created_at').limit(50);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: RoboMessage[] = (msgs ?? []).map((m: any) => ({ id: m.id, sender: m.sender, text: m.text, attachmentUrl: m.attachment_url ?? undefined, createdAt: m.created_at }));
      conversations.push({ id: conv.id, userId: conv.user_id, title: conv.title, createdAt: conv.created_at, updatedAt: conv.created_at, messages });
    }
    return conversations;
  } catch (e) { console.warn('[sbGetConversations]', e); return []; }
}

export async function sbSaveConversation(conv: RoboConversation): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!isValidUUID(conv.userId)) {
    console.warn('[sbSaveConversation] Refusing cloud write: userId is not a UUID.');
    return false;
  }
  try {
    const convId = ensureUUID(conv.id);
    conv.id = convId; // Keep memory object compatible

    const { error: conversationError } = await supabase
      .from('ai_conversations')
      .upsert({ id: convId, user_id: conv.userId, title: conv.title }, { onConflict: 'id' });
    if (conversationError) {
      console.warn('[sbSaveConversation] Conversation write failed:', conversationError.message);
      return false;
    }
    const msgs = conv.messages.slice(-20);
    if (msgs.length > 0) {
      const rows = msgs.map((m) => {
        const msgId = ensureUUID(m.id);
        m.id = msgId;
        return {
          id: msgId,
          conversation_id: convId,
          sender: m.sender,
          text: m.text.substring(0, 5000),
          attachment_url: m.attachmentUrl && m.attachmentUrl.length < 300 ? m.attachmentUrl : null,
        };
      });
      const { error: messagesError } = await supabase
        .from('ai_messages')
        .upsert(rows, { onConflict: 'id' });
      if (messagesError) {
        console.warn('[sbSaveConversation] Message write failed:', messagesError.message);
        return false;
      }
    }
    return true;
  } catch (e) { console.warn('[sbSaveConversation]', e); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT GROUP CHAT (Students & Teachers / Supervisor)
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetStudentGroupMessages(studentId: string): Promise<StudentGroupMessage[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  if (!requireUUIDFields('sbGetStudentGroupMessages', { studentId })) return [];
  try {
    const { data, error } = await supabase
      .from('student_group_messages')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error || !data) return [];
    return data.map(mapStudentGroupMessage);
  } catch (e) {
    console.warn('[sbGetStudentGroupMessages]', e);
    return [];
  }
}

export async function sbSendStudentGroupMessage(
  studentId: string,
  text: string,
  attachmentUrl?: string,
  senderId?: string,
  senderName?: string,
  senderRole?: string,
  senderBadge?: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  if (!requireUUIDFields('sbSendStudentGroupMessage', { studentId })) return false;
  try {
    const { error } = await supabase
      .from('student_group_messages')
      .insert({
        student_id: studentId,
        text,
        attachment_url: attachmentUrl || null,
        sender_id: senderId || null,
        sender_name: senderName || null,
        sender_role: senderRole || null,
        sender_badge: senderBadge || null,
      });
    if (error) {
      console.warn('[sbSendStudentGroupMessage]', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[sbSendStudentGroupMessage]', e);
    return false;
  }
}

export function sbSubscribeToStudentGroupMessages(studentId: string, onNewMessage: (msg: StudentGroupMessage) => void): () => void {
  if (!isSupabaseConfigured() || !supabase) return () => {};
  if (!requireUUIDFields('sbSubscribeToStudentGroupMessages', { studentId })) return () => {};
  try {
    const channel = supabase
      .channel(`student-group-chat-${studentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'student_group_messages', filter: `student_id=eq.${studentId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.new) onNewMessage(mapStudentGroupMessage(payload.new));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUD TO LOCAL CACHE SYNC (Cross-Device Data Hydration)
// ─────────────────────────────────────────────────────────────────────────────
export async function syncCloudDataToLocal(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const [
      progressList,
      attemptsList,
      certsList,
      notifsList,
      streak,
      badgesList,
      goalsList,
      convsList,
      cloudSchedule,
      cloudTasks,
      allProfiles,
      allAttempts,
      cloudSubjects,
      cloudLessons,
      cloudUnits,
      cloudExams,
      cloudQuestions,
      cloudAnnouncements,
    ] = await Promise.all([
      userId ? sbGetProgress(userId) : Promise.resolve([]),
      userId ? sbGetAttempts(userId) : Promise.resolve([]),
      userId ? sbGetCertificates(userId) : Promise.resolve([]),
      userId ? sbGetNotifications(userId) : Promise.resolve([]),
      userId ? sbGetStreak(userId) : Promise.resolve(null),
      userId ? sbGetBadges(userId) : Promise.resolve([]),
      userId ? sbGetGoals(userId) : Promise.resolve([]),
      userId ? sbGetConversations(userId) : Promise.resolve([]),
      userId ? sbGetStudentSchedule(userId) : Promise.resolve([]),
      userId ? sbGetStudentTasks(userId) : Promise.resolve([]),
      sbGetAllProfiles(),
      sbGetAllAttempts(),
      sbGetSubjects(),
      sbGetLessons(),
      sbGetUnits(),
      sbGetExaminations(),
      sbGetQuestions(),
      sbGetAnnouncements(),
    ]);

    // Save cloud units
    if (cloudUnits && cloudUnits.length > 0) {
      try { localStorage.setItem('kawkab_units_v9', JSON.stringify(cloudUnits)); } catch {}
    }

    // Save cloud examinations
    if (cloudExams && cloudExams.length > 0) {
      try { localStorage.setItem('kawkab_exams_v9', JSON.stringify(cloudExams)); } catch {}
    }

    // Save cloud questions
    if (cloudQuestions && cloudQuestions.length > 0) {
      try { localStorage.setItem('kawkab_questions_v9', JSON.stringify(cloudQuestions)); } catch {}
    }

    // Save cloud announcements
    if (cloudAnnouncements && cloudAnnouncements.length > 0) {
      try { localStorage.setItem('kawkab_announcements_v9', JSON.stringify(cloudAnnouncements)); } catch {}
    }

    // Global 1. Real Profiles synchronization across all devices
    if (allProfiles && allProfiles.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_users_v9') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deletedIds = new Set(JSON.parse(localStorage.getItem('kawkab_deleted_user_ids_v1') || '[]'));
        deletedIds.add('usr-student-2');
        deletedIds.add('ahmed.student@gmail.com');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localMap = new Map<string, any>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        local.forEach((u: any) => {
          if (!deletedIds.has(u.id) && !deletedIds.has(u.email?.toLowerCase())) {
            localMap.set(u.id, u);
          }
        });

        allProfiles.forEach((cp) => {
          if (!deletedIds.has(cp.id) && !deletedIds.has(cp.email?.toLowerCase())) {
            const existing = localMap.get(cp.id) || {};
            localMap.set(cp.id, { ...existing, ...cp });
          }
        });

        localStorage.setItem('kawkab_users_v9', JSON.stringify(Array.from(localMap.values())));
      } catch {}
    }

    // Global 2 & User Attempts synchronization across all devices for Leaderboard & Grading
    const rawCloudAttempts = [...(allAttempts || []), ...(attemptsList || [])];
    if (rawCloudAttempts.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_attempts_v9') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptMap = new Map<string, any>();
        local.forEach((a: any) => attemptMap.set(a.id, a));

        rawCloudAttempts.forEach((ca) => {
          if (ca.studentId === 'usr-student-2') return;
          const existing = attemptMap.get(ca.id);
          if (!existing) {
            attemptMap.set(ca.id, ca);
          } else {
            // Update local attempt if cloud is graded or has newer results
            if (ca.status === 'graded' || existing.status !== 'graded' || ca.totalScore !== existing.totalScore) {
              // Preserve local `answers` field which cloud record may not have
              attemptMap.set(ca.id, { ...existing, ...ca, answers: (ca as any).answers || existing?.answers });
            }
          }
        });

        localStorage.setItem('kawkab_attempts_v9', JSON.stringify(Array.from(attemptMap.values())));
      } catch {}
    }

    // 1. Progress (merge completion status)
    if (progressList.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_progress_v9') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressMap = new Map<string, any>();
        local.forEach((p: any) => progressMap.set(`${p.studentId}_${p.lessonId}`, p));

        progressList.forEach((cp) => {
          const key = `${cp.studentId}_${cp.lessonId}`;
          const existing = progressMap.get(key);
          if (!existing) {
            progressMap.set(key, cp);
          } else if (!existing.completed && cp.completed) {
            progressMap.set(key, { ...existing, ...cp });
          }
        });

        localStorage.setItem('kawkab_progress_v9', JSON.stringify(Array.from(progressMap.values())));
      } catch {}
    }

    // 3. Certificates (merge by certificateNumber or id)
    if (certsList.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_certificates_v9') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const certMap = new Map<string, any>();
        local.forEach((c: any) => certMap.set(c.certificateNumber || c.id, c));

        certsList.forEach((cc) => {
          const key = cc.certificateNumber || cc.id;
          const existing = certMap.get(key);
          if (!existing) {
            certMap.set(key, cc);
          } else {
            certMap.set(key, { ...existing, ...cc });
          }
        });

        localStorage.setItem('kawkab_certificates_v9', JSON.stringify(Array.from(certMap.values())));
      } catch {}
    }

    // 4. Notifications
    if (notifsList.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_notifications_v9') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localIds = new Set(local.map((n: any) => n.id));
        const toAdd = notifsList.filter((n) => !localIds.has(n.id));
        if (toAdd.length > 0) {
          localStorage.setItem('kawkab_notifications_v9', JSON.stringify([...toAdd, ...local]));
        }
      } catch {}
    }

    // 5. Streak
    if (streak && userId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_daily_streak_v1') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = local.filter((s: any) => s.studentId !== userId);
        localStorage.setItem('kawkab_daily_streak_v1', JSON.stringify([...filtered, streak]));
      } catch {}
    }

    // 6. Badges
    if (badgesList.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_student_badges_v1') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localKeys = new Set(local.map((b: any) => `${b.studentId}_${b.badgeType}`));
        const toAdd = badgesList.filter((b) => !localKeys.has(`${b.studentId}_${b.badgeType}`));
        if (toAdd.length > 0) {
          localStorage.setItem('kawkab_student_badges_v1', JSON.stringify([...local, ...toAdd]));
        }
      } catch {}
    }

    // 7. Goals
    if (goalsList.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const local = JSON.parse(localStorage.getItem('kawkab_student_goals_v1') || '[]');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localIds = new Set(local.map((g: any) => g.id));
        const toAdd = goalsList.filter((g) => !localIds.has(g.id));
        if (toAdd.length > 0) {
          localStorage.setItem('kawkab_student_goals_v1', JSON.stringify([...local, ...toAdd]));
        }
      } catch {}
    }

    // 8. Robo conversations
    if (convsList.length > 0 && userId) {
      try {
        const localAll = JSON.parse(localStorage.getItem('kawkab_robo_conversations_v1') || '{}');
        localAll[userId] = convsList;
        localStorage.setItem('kawkab_robo_conversations_v1', JSON.stringify(localAll));
      } catch {}
    }

    // 9. Student Schedule
    if (cloudSchedule && cloudSchedule.length > 0 && userId) {
      try {
        localStorage.setItem('kawkab_student_schedule', JSON.stringify(cloudSchedule));
      } catch {}
    }

    // 10. Student Tasks
    if (cloudTasks && cloudTasks.length > 0 && userId) {
      try {
        localStorage.setItem('kawkab_student_tasks', JSON.stringify(cloudTasks));
      } catch {}
    }
    // Global 3. Subjects synchronization across all devices (Cloud is Authoritative Source of Truth)
    if (cloudSubjects && cloudSubjects.length > 0) {
      try {
        localStorage.setItem('kawkab_subjects_v9', JSON.stringify(cloudSubjects));
      } catch {}
    }

    // Global 4. Lessons synchronization across all devices (Cloud is Authoritative Source of Truth)
    if (cloudLessons && cloudLessons.length > 0) {
      try {
        localStorage.setItem('kawkab_lessons_v9', JSON.stringify(cloudLessons));
      } catch {}
    }

    // Dispatch global cloud sync event so in-memory cache and UI components refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kawkab_cloud_synced', { detail: { timestamp: Date.now() } }));
    }
  } catch (err) {
    console.warn('[syncCloudDataToLocal] Failed to hydrate cloud data:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE: LESSON MEDIA BUCKET ('lesson-media')
// ─────────────────────────────────────────────────────────────────────────────
export const LESSON_MEDIA_BUCKET = 'lesson-media';

/**
 * Uploads a lesson image to the Supabase Storage 'lesson-media' bucket.
 * Returns the permanent public CDN URL of the uploaded image.
 * Teachers and Admins have RLS INSERT permissions on this bucket.
 * Falls back safely to FileReader DataURL if offline or Supabase unconfigured.
 */
export async function sbUploadLessonImage(file: File): Promise<{ url: string | null; error: string | null }> {
  // 1. Validation
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return { url: null, error: 'نوع الملف غير مدعوم. يرجى رفع صورة بصيغة (PNG, JPG, WEBP, GIF, SVG).' };
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return { url: null, error: 'حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 10 ميجابايت.' };
  }

  // 2. If Supabase is configured, upload to Supabase Storage
  if (isSupabaseConfigured() && supabase) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = `lessons/${cleanName}`;

      const { data, error } = await supabase.storage
        .from(LESSON_MEDIA_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.warn('[sbUploadLessonImage] Cloud upload failed:', error.message);
        return { url: null, error: 'تعذر رفع الصورة إلى التخزين السحابي. لم يتم حفظ رابط محلي بديل.' };
      } else if (data?.path) {
        const { data: urlData } = supabase.storage
          .from(LESSON_MEDIA_BUCKET)
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          return { url: urlData.publicUrl, error: null };
        }
      }
    } catch (e: any) {
      console.warn('[sbUploadLessonImage] Exception during storage upload:', e?.message || 'Unknown storage error');
      return { url: null, error: 'تعذر رفع الصورة إلى التخزين السحابي. تحقق من الاتصال وحاول مرة أخرى.' };
    }
  }

  // 3. Fallback to local DataURL if offline or cloud unavailable
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ url: e.target?.result as string, error: null });
    };
    reader.onerror = () => {
      resolve({ url: null, error: 'فشل قراءة ملف الصورة محلياً.' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Deletes a lesson image from Supabase Storage bucket if it was stored there.
 */
export async function sbDeleteLessonImage(imageUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || !imageUrl) return false;
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${LESSON_MEDIA_BUCKET}/`;
    const publicBase = new URL(supabase.storage.from(LESSON_MEDIA_BUCKET).getPublicUrl('origin-check').data.publicUrl);
    if (url.origin !== publicBase.origin || !url.pathname.includes(marker)) return false;
    const encodedPath = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
    if (!encodedPath) return false;
    const path = decodeURIComponent(encodedPath);
    const { error } = await supabase.storage.from(LESSON_MEDIA_BUCKET).remove([path]);
    return !error;
  } catch (e) {
    console.warn('[sbDeleteLessonImage] Error deleting object:', e);
  }
  return false;
}

/**
 * Syncs a lesson to Supabase 'lessons' table (if configured).
 */
export async function sbSaveLessonToCloud(lesson: Lesson): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const canonicalSubjectId = ensureUUID(lesson.subjectId);
    const canonicalUnitId = normalizeUUIDOrNull(lesson.unitId);
    const canonicalLessonId = ensureUUID(lesson.id);

    const row = {
      id: canonicalLessonId,
      unit_id: canonicalUnitId,
      subject_id: canonicalSubjectId,
      title: lesson.title,
      order_index: lesson.orderIndex || 0,
      content_html: lesson.contentHtml || '',
      summary: lesson.summary || null,
      video_type: lesson.videoType || 'youtube',
      video_url: lesson.videoUrl || null,
      pdf_url: lesson.pdfUrl || null,
      images: lesson.images || [],
      duration_minutes: lesson.durationMinutes || 20,
      is_free_preview: lesson.isFreePreview ?? false,
      is_published: lesson.isPublished ?? true,
    };

    const { error } = await supabase.from('lessons').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[sbSaveLessonToCloud] Error upserting lesson:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[sbSaveLessonToCloud] Exception:', e);
    return false;
  }
}

