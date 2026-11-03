// ==============================================================================
// KAWKAB TALTA E3DADI — SUPABASE HYBRID DATA LAYER
// Provides async Supabase operations with automatic localStorage fallback.
// All functions are safe to call even if Supabase is not configured.
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  UserProfile, UserRole, SubscriptionTier, SubscriptionStatus,
  Subject, Lesson, LessonProgress, ExamAttempt, Certificate,
  LiveChallenge, Notification, RoboConversation, RoboMessage,
  Announcement, StudentBadge, StudentGoal, DailyStreak,
  Flashcard, SubscriptionRequest, TeacherAssignment,
  StudentGroupMessage,
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
    const row: Record<string, unknown> = { slug: subject.slug, name_ar: subject.nameAr, description: subject.description, icon: subject.icon, color_primary: subject.colorPrimary, color_secondary: subject.colorSecondary, order_index: subject.orderIndex, is_published: subject.isPublished ?? true };
    if (subject.id) row['id'] = subject.id;
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
  try {
    let query = supabase.from('lessons').select('*').order('order_index');
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mapLesson);
  } catch (e) { console.warn('[sbGetLessons]', e); return []; }
}

export async function sbSaveLesson(lesson: Partial<Lesson> & { subjectId: string; title: string; contentHtml: string }): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
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
  try {
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) { console.warn('[sbDeleteLesson]', error.message); return false; }
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// LESSON PROGRESS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetProgress(studentId: string): Promise<LessonProgress[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('lesson_progress').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    return data.map(mapProgress);
  } catch (e) { console.warn('[sbGetProgress]', e); return []; }
}

export async function sbMarkLessonComplete(studentId: string, lessonId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
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
    const { error } = await supabase.from('exam_attempts').upsert({ id: attempt.id, exam_id: attempt.examId, student_id: attempt.studentId, subject_name: attempt.subjectName ?? null, started_at: attempt.startedAt, submitted_at: attempt.submittedAt ?? null, time_spent_seconds: attempt.timeSpentSeconds, auto_score: attempt.autoScore, essay_score: attempt.essayScore, total_score: attempt.totalScore, max_score: attempt.maxScore, percentage: attempt.percentage, passed: attempt.passed, status: attempt.status, violation_count: attempt.violationCount, violation_logs: attempt.violationLogs, is_provisional: attempt.isProvisional }, { onConflict: 'id' });
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
      return { allowed: true, used: 0, limit: 10, remaining: 10 };
    }
    return data;
  } catch {
    return { allowed: true, used: 0, limit: 10, remaining: 10 };
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
      return { allowed: true, used: 0, limit: 10, remaining: 10 };
    }
    return data;
  } catch {
    return { allowed: true, used: 0, limit: 10, remaining: 10 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATES
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetCertificates(studentId: string): Promise<Certificate[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('certificates').select('*').eq('student_id', studentId).eq('is_revoked', false).order('issued_at', { ascending: false });
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): Certificate => ({ id: r.id, certificateNumber: r.certificate_number, studentId: r.student_id, examId: r.exam_id, subjectName: r.subject_name, examTitle: r.exam_title, studentName: r.student_name, scorePercentage: r.score_percentage, issuedAt: r.issued_at, qrCodeData: r.qr_code_data, isRevoked: r.is_revoked ?? false }));
  } catch (e) { console.warn('[sbGetCertificates]', e); return []; }
}

export async function sbSaveCertificate(cert: Certificate): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
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
    const { error } = await supabase.from('certificates')
      .update({ is_revoked: true })
      .or(`certificate_number.eq.${certNumber},id.eq.${certNumber}`);
    if (error) return false;
    return true;
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
  try {
    const { error } = await supabase.from('challenges').upsert({ id: challenge.id, subject_id: challenge.subjectId, subject_name: challenge.subjectName, code: challenge.code, title: challenge.title, created_by: challenge.createdBy, creator_name: challenge.creatorName, creator_governorate: challenge.creatorGovernorate ?? null, is_open_challenge: challenge.isOpenChallenge ?? false, opponent_id: challenge.opponentId ?? null, opponent_name: challenge.opponentName ?? null, status: challenge.status, time_limit_seconds: challenge.timeLimitSeconds, questions: challenge.questions, creator_score: challenge.creatorScore, opponent_score: challenge.opponentScore, winner_id: challenge.winnerId ?? null, winner_name: challenge.winnerName ?? null, finished_at: challenge.finishedAt ?? null }, { onConflict: 'id' });
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
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data) return [];
    return data.map(mapNotification);
  } catch { return []; }
}

export async function sbMarkNotificationRead(notifId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    return !error;
  } catch { return false; }
}

export async function sbInsertNotification(notif: Omit<Notification, 'id' | 'createdAt'>): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
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
  try {
    const { error } = await supabase.from('subscription_requests').insert({ student_id: req.studentId, plan_id: req.planId || null, tier: req.tier, payment_method: req.paymentMethod, payment_proof_url: req.paymentProofUrl ?? null, sender_phone: req.senderPhone ?? null, transaction_ref: req.transactionRef ?? null, status: 'pending' });
    return !error;
  } catch { return false; }
}

export async function sbUpdateSubscriptionRequest(reqId: string, status: 'approved' | 'rejected', adminNotes?: string, reviewedBy?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
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
  try {
    const { data, error } = await supabase.from('daily_streaks').select('*').eq('student_id', studentId).single();
    if (error || !data) return null;
    return { studentId: data.student_id, currentStreak: data.current_streak ?? 0, longestStreak: data.longest_streak ?? 0, lastActiveDate: data.last_activity_date ?? '', totalActiveDays: data.total_active_days ?? 0 };
  } catch { return null; }
}

export async function sbUpsertStreak(streak: DailyStreak): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('daily_streaks').upsert({ student_id: streak.studentId, current_streak: streak.currentStreak, longest_streak: streak.longestStreak, last_activity_date: streak.lastActiveDate }, { onConflict: 'student_id' });
    return !error;
  } catch { return false; }
}

export async function sbGetBadges(studentId: string): Promise<StudentBadge[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('student_badges').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): StudentBadge => ({ id: r.id, studentId: r.student_id, badgeType: r.badge_type, earnedAt: r.earned_at, isNew: r.is_new ?? true }));
  } catch { return []; }
}

export async function sbAwardBadge(studentId: string, badgeType: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('student_badges').upsert({ student_id: studentId, badge_type: badgeType, is_new: true }, { onConflict: 'student_id,badge_type' });
    return !error;
  } catch { return false; }
}

export async function sbGetGoals(studentId: string): Promise<StudentGoal[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('student_goals').select('*').eq('student_id', studentId);
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): StudentGoal => ({ id: r.id, studentId: r.student_id, subjectId: r.subject_id, subjectName: r.subject_name, targetPercentage: r.target_percentage, currentPercentage: r.current_percentage ?? 0, createdAt: r.created_at }));
  } catch { return []; }
}

export async function sbSaveGoal(goal: StudentGoal): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('student_goals').upsert({ id: goal.id, student_id: goal.studentId, subject_id: goal.subjectId, subject_name: goal.subjectName, target_percentage: goal.targetPercentage, current_percentage: goal.currentPercentage }, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

export async function sbGetFlashcards(studentId: string, subjectId: string): Promise<Flashcard[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  try {
    const { data, error } = await supabase.from('flashcards').select('*').eq('student_id', studentId).eq('subject_id', subjectId).order('created_at');
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((r: any): Flashcard => ({ id: r.id, subjectId: r.subject_id, front: r.front, back: r.back, createdBy: r.created_by ?? 'student', createdAt: r.created_at }));
  } catch { return []; }
}

export async function sbSaveFlashcards(studentId: string, cards: Flashcard[]): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase || cards.length === 0) return false;
  try {
    const rows = cards.map((c) => ({ id: c.id, subject_id: c.subjectId, student_id: studentId, front: c.front, back: c.back, created_by: c.createdBy }));
    const { error } = await supabase.from('flashcards').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch { return false; }
}

export async function sbDeleteFlashcard(cardId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
    return !error;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetConversations(userId: string): Promise<RoboConversation[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
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
  try {
    await supabase.from('ai_conversations').upsert({ id: conv.id, user_id: conv.userId, title: conv.title }, { onConflict: 'id' });
    const msgs = conv.messages.slice(-20);
    if (msgs.length > 0) {
      const rows = msgs.map((m) => ({ id: m.id, conversation_id: conv.id, sender: m.sender, text: m.text.substring(0, 5000), attachment_url: m.attachmentUrl && m.attachmentUrl.length < 300 ? m.attachmentUrl : null }));
      await supabase.from('ai_messages').upsert(rows, { onConflict: 'id' });
    }
    return true;
  } catch (e) { console.warn('[sbSaveConversation]', e); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT GROUP CHAT (Students & Teachers / Supervisor)
// ─────────────────────────────────────────────────────────────────────────────
export async function sbGetStudentGroupMessages(studentId: string): Promise<StudentGroupMessage[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
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

export async function sbSendStudentGroupMessage(studentId: string, text: string, attachmentUrl?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase
      .from('student_group_messages')
      .insert({
        student_id: studentId,
        text,
        attachment_url: attachmentUrl || null,
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
      allProfiles,
      allAttempts,
      cloudSubjects,
      cloudLessons,
    ] = await Promise.all([
      userId ? sbGetProgress(userId) : Promise.resolve([]),
      userId ? sbGetAttempts(userId) : Promise.resolve([]),
      userId ? sbGetCertificates(userId) : Promise.resolve([]),
      userId ? sbGetNotifications(userId) : Promise.resolve([]),
      userId ? sbGetStreak(userId) : Promise.resolve(null),
      userId ? sbGetBadges(userId) : Promise.resolve([]),
      userId ? sbGetGoals(userId) : Promise.resolve([]),
      userId ? sbGetConversations(userId) : Promise.resolve([]),
      sbGetAllProfiles(),
      sbGetAllAttempts(),
      sbGetSubjects(),
      sbGetLessons(),
    ]);

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
              attemptMap.set(ca.id, { ...existing, ...ca });
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
    // Global 3. Subjects synchronization across all devices
    if (cloudSubjects && cloudSubjects.length > 0) {
      try {
        const local = JSON.parse(localStorage.getItem('kawkab_subjects_v9') || '[]');
        const map = new Map();
        local.forEach((s: any) => map.set(s.id, s));
        cloudSubjects.forEach((cs) => {
          const existing = map.get(cs.id);
          map.set(cs.id, existing ? { ...existing, ...cs } : cs);
        });
        localStorage.setItem('kawkab_subjects_v9', JSON.stringify(Array.from(map.values())));
      } catch {}
    }

    // Global 4. Lessons synchronization across all devices
    if (cloudLessons && cloudLessons.length > 0) {
      try {
        const local = JSON.parse(localStorage.getItem('kawkab_lessons_v9') || '[]');
        const map = new Map();
        local.forEach((l: any) => map.set(l.id, l));
        cloudLessons.forEach((cl) => {
          const existing = map.get(cl.id);
          map.set(cl.id, existing ? { ...existing, ...cl } : cl);
        });
        localStorage.setItem('kawkab_lessons_v9', JSON.stringify(Array.from(map.values())));
      } catch {}
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
        console.warn('[sbUploadLessonImage] Cloud upload error, falling back to local DataURL:', error.message);
      } else if (data?.path) {
        const { data: urlData } = supabase.storage
          .from(LESSON_MEDIA_BUCKET)
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          return { url: urlData.publicUrl, error: null };
        }
      }
    } catch (e: any) {
      console.warn('[sbUploadLessonImage] Exception during storage upload:', e?.message || e);
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
    if (imageUrl.includes(`/storage/v1/object/public/${LESSON_MEDIA_BUCKET}/`)) {
      const pathPart = imageUrl.split(`/storage/v1/object/public/${LESSON_MEDIA_BUCKET}/`)[1];
      if (pathPart) {
        const { error } = await supabase.storage.from(LESSON_MEDIA_BUCKET).remove([decodeURIComponent(pathPart)]);
        return !error;
      }
    }
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
    const isCustomUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lesson.id);
    const row = {
      ...(isCustomUuid ? { id: lesson.id } : {}),
      unit_id: lesson.unitId || null,
      subject_id: lesson.subjectId,
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

    const { error } = await supabase.from('lessons').upsert(row);
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

