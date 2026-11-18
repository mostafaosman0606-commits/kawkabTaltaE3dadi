// ==============================================================================
// KAWKAB TALTA E3DADI — UNIFIED DATABASE FACADE (LocalDatabaseEngine)
// High-performance, clean facade delegating to modular domain services:
// - curriculumService: Subjects, Units, Lessons, Notes, Progress
// - examService: Examinations, Questions, Attempts, Certificates
// - profileService: User Profiles, Subscriptions, Leaderboard, Audits
// - teacherService: Teacher Assignments, Homeworks, Messages, Schedules, Attendance
// - socialService: Challenges, Robo AI, Notifications, Announcements, Flashcards, Streaks, Tasks
// ==============================================================================

import type {
  UserProfile,
  UserEducationalStats,
  LeaderboardEntry,
  SubscriptionPlan,
  SubscriptionRequest,
  ContactSettings,
  AuditLog,
  Subject,
  Unit,
  Lesson,
  LessonProgress,
  LessonNote,
  Examination,
  Question,
  ExamAttempt,
  Certificate,
  TeacherAssignment,
  TeacherHomework,
  TeacherMessage,
  TeacherScheduleSlot,
  AttendanceRecord,
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
} from '../types';

import {
  storageEngine,
  STORAGE_KEYS,
  curriculumService,
  examService,
  profileService,
  teacherService,
  socialService,
} from './db';

export { STORAGE_KEYS };

export class LocalDatabaseEngine {
  constructor() {
    this.ensureInitialized();
  }

  public clearMemoryCache(key?: string): void {
    storageEngine.clearMemoryCache(key);
  }

  public ensureInitialized(): void {
    // Run initial data bootstrap and schema version checks
    try {
      const currentVersion = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.VERSION) : null;
      if (currentVersion !== 'v9') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.VERSION, 'v9');
        }
      }
    } catch {}
  }

  public resetToEmptyState(): void {
    if (!import.meta.env.DEV) return;
    try {
      if (typeof localStorage !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('kawkab_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {}
    this.ensureInitialized();
  }

  // ============================================================
  // PROFILES & AUTH
  // ============================================================

  public getProfiles(): UserProfile[] {
    return profileService.getProfiles();
  }

  public syncProfilesFromCloud(cloudProfiles: UserProfile[]): void {
    profileService.syncProfilesFromCloud(cloudProfiles);
  }

  public getProfileById(id: string): UserProfile | null {
    return profileService.getProfileById(id);
  }

  public updateProfile(id: string, updates: Partial<UserProfile>): UserProfile | null {
    return profileService.updateProfile(id, updates);
  }

  public deleteProfile(id: string): void {
    profileService.deleteProfile(id);
  }

  public createProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'aiQuestionsUsedThisMonth'> & { id?: string }): UserProfile {
    return profileService.createProfile(profile);
  }

  public getUserStats(userId: string): UserEducationalStats {
    return profileService.getUserStats(userId);
  }

  public getPlans(): SubscriptionPlan[] {
    return profileService.getPlans();
  }

  public savePlan(plan: Partial<SubscriptionPlan>): SubscriptionPlan {
    return profileService.savePlan(plan);
  }

  public getSubscriptionRequests(): SubscriptionRequest[] {
    return profileService.getSubscriptionRequests();
  }

  public createSubscriptionRequest(request: Omit<SubscriptionRequest, 'id' | 'status' | 'createdAt'>): SubscriptionRequest {
    return profileService.createSubscriptionRequest(request);
  }

  public reviewSubscriptionRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes: string,
    adminId: string
  ): SubscriptionRequest | null {
    return profileService.reviewSubscriptionRequest(requestId, status, adminNotes, adminId);
  }

  public getLeaderboard(): LeaderboardEntry[] {
    return profileService.getLeaderboard();
  }

  public getContactSettings(): ContactSettings {
    return profileService.getContactSettings();
  }

  public saveContactSettings(settings: ContactSettings): void {
    profileService.saveContactSettings(settings);
  }

  public getAuditLogs(): AuditLog[] {
    return profileService.getAuditLogs();
  }

  public logAudit(
    actorId: string,
    actorName: string,
    action: string,
    targetType: string,
    targetId?: string,
    details: Record<string, any> = {}
  ): void {
    profileService.logAudit(actorId, actorName, action, targetType, targetId, details);
  }

  // ============================================================
  // CURRICULUM: SUBJECTS, UNITS, LESSONS, NOTES & PROGRESS
  // ============================================================

  public getSubjects(): Subject[] {
    return curriculumService.getSubjects();
  }

  public getSubjectById(id: string): Subject | null {
    return curriculumService.getSubjectById(id);
  }

  public saveSubject(subject: Partial<Subject>): Subject {
    return curriculumService.saveSubject(subject);
  }

  public deleteSubject(id: string): void {
    curriculumService.deleteSubject(id);
  }

  public syncSubjectsFromCloud(cloudSubjects: Subject[]): void {
    curriculumService.syncSubjectsFromCloud(cloudSubjects);
  }

  public getUnits(subjectId?: string): Unit[] {
    return curriculumService.getUnits(subjectId);
  }

  public saveUnit(unit: Partial<Unit>): Unit {
    return curriculumService.saveUnit(unit);
  }

  public deleteUnit(id: string): void {
    curriculumService.deleteUnit(id);
  }

  public getLessons(subjectId?: string, unitId?: string): Lesson[] {
    return curriculumService.getLessons(subjectId, unitId);
  }

  public getLessonById(id: string): Lesson | null {
    return curriculumService.getLessonById(id);
  }

  public saveLesson(lesson: Partial<Lesson>): Lesson {
    return curriculumService.saveLesson(lesson);
  }

  public deleteLesson(id: string): void {
    curriculumService.deleteLesson(id);
  }

  public syncLessonsFromCloud(cloudLessons: Lesson[]): void {
    curriculumService.syncLessonsFromCloud(cloudLessons);
  }

  public getLessonProgress(studentId: string, lessonId?: string): LessonProgress[] {
    return curriculumService.getLessonProgress(studentId, lessonId);
  }

  public isLessonCompleted(studentId: string, lessonId: string): boolean {
    return curriculumService.isLessonCompleted(studentId, lessonId);
  }

  public completeLesson(lessonId: string, studentId: string): void {
    curriculumService.completeLesson(lessonId, studentId);
  }

  public markLessonComplete(studentId: string, lessonId: string): LessonProgress {
    return curriculumService.markLessonComplete(studentId, lessonId);
  }

  public getLessonNote(lessonId: string, studentId: string): LessonNote | null {
    return curriculumService.getLessonNote(lessonId, studentId);
  }

  public saveLessonNote(lessonId: string, studentId: string, content: string): LessonNote {
    return curriculumService.saveLessonNote(lessonId, studentId, content);
  }

  // ============================================================
  // EXAMINATIONS, QUESTIONS, ATTEMPTS & CERTIFICATES
  // ============================================================

  public getExaminations(subjectId?: string): Examination[] {
    return examService.getExaminations(subjectId);
  }

  public getExaminationById(id: string): Examination | null {
    return examService.getExaminationById(id);
  }

  public saveExamination(exam: Partial<Examination>): Examination {
    return examService.saveExamination(exam);
  }

  public deleteExamination(id: string): void {
    examService.deleteExamination(id);
  }

  public getQuestionsByExam(examId: string): Question[] {
    return examService.getQuestionsByExam(examId);
  }

  public saveQuestion(question: Partial<Question>): Question {
    return examService.saveQuestion(question);
  }

  public deleteQuestion(id: string): void {
    examService.deleteQuestion(id);
  }

  public clearAllQuestions(): void {
    examService.clearAllQuestions();
  }

  public getExamAttempts(studentId?: string, examId?: string): ExamAttempt[] {
    return examService.getExamAttempts(studentId, examId);
  }

  public getAttemptById(id: string): ExamAttempt | null {
    return examService.getAttemptById(id);
  }

  public submitExamAttempt(
    examId: string,
    studentId: string,
    rawAnswers: Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>,
    timeSpentSeconds: number,
    violationCount: number,
    violationLogs: Array<{ timestamp: string; type: string; details: string }>
  ): ExamAttempt {
    return examService.submitExamAttempt(examId, studentId, rawAnswers, timeSpentSeconds, violationCount, violationLogs);
  }

  public submitExamAttemptAuthoritative(
    examId: string,
    studentId: string,
    rawAnswers: Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>,
    timeSpentSeconds: number,
    violationCount: number,
    violationLogs: Array<{ timestamp: string; type: string; details: string }>
  ): Promise<ExamAttempt> {
    return examService.submitExamAttemptAuthoritative(examId, studentId, rawAnswers, timeSpentSeconds, violationCount, violationLogs);
  }

  public gradeEssaySubmission(
    attemptId: string,
    questionId: string,
    score: number,
    feedback: string,
    gradedBy: string
  ): ExamAttempt | null {
    return examService.gradeEssaySubmission(attemptId, questionId, score, feedback, gradedBy);
  }

  public syncAttemptsFromCloud(cloudAttempts: ExamAttempt[]): void {
    examService.syncAttemptsFromCloud(cloudAttempts);
  }

  public getCertificates(studentId?: string): Certificate[] {
    return examService.getCertificates(studentId);
  }

  public getCertificateById(id: string): Certificate | null {
    return examService.getCertificateById(id);
  }

  public issueCertificate(attempt: ExamAttempt): Certificate {
    return examService.issueCertificate(attempt);
  }

  public revokeCertificate(id: string, adminId: string): void {
    examService.revokeCertificate(id, adminId);
  }

  // ============================================================
  // TEACHERS: ASSIGNMENTS, HOMEWORKS, MESSAGES, SCHEDULES & ATTENDANCE
  // ============================================================

  public getTeacherAssignments(teacherId?: string): TeacherAssignment[] {
    return teacherService.getTeacherAssignments(teacherId);
  }

  public assignTeacherToSubject(teacherId: string, subjectId: string): TeacherAssignment {
    return teacherService.assignTeacherToSubject(teacherId, subjectId);
  }

  public removeTeacherAssignment(id: string): void {
    teacherService.removeTeacherAssignment(id);
  }

  public saveTeacherAssignments(list: TeacherAssignment[]): void {
    teacherService.saveTeacherAssignments(list);
  }

  public getTeacherHomeworks(teacherId?: string): TeacherHomework[] {
    return teacherService.getTeacherHomeworks(teacherId);
  }

  public saveTeacherHomework(hw: Partial<TeacherHomework> & { teacherId: string; subjectId: string; title: string }): TeacherHomework {
    return teacherService.saveTeacherHomework(hw);
  }

  public deleteTeacherHomework(id: string): void {
    teacherService.deleteTeacherHomework(id);
  }

  public submitHomeworkAnswer(hwId: string, studentId: string, studentName: string, answerText: string): boolean {
    return teacherService.submitHomeworkAnswer(hwId, studentId, studentName, answerText);
  }

  public gradeHomeworkSubmission(hwId: string, studentId: string, score: number, feedback: string): boolean {
    return teacherService.gradeHomeworkSubmission(hwId, studentId, score, feedback);
  }

  public getTeacherMessages(userId: string): TeacherMessage[] {
    return teacherService.getTeacherMessages(userId);
  }

  public sendTeacherMessage(msg: Omit<TeacherMessage, 'id' | 'isRead' | 'createdAt'>): TeacherMessage {
    return teacherService.sendTeacherMessage(msg);
  }

  public markTeacherMessageRead(messageId: string): void {
    teacherService.markTeacherMessageRead(messageId);
  }

  public getUnreadMessageCount(userId: string): number {
    return teacherService.getUnreadMessageCount(userId);
  }

  public getTeacherSchedule(teacherId: string): TeacherScheduleSlot[] {
    return teacherService.getTeacherSchedule(teacherId);
  }

  public saveScheduleSlot(slot: Omit<TeacherScheduleSlot, 'id'> & { id?: string }): TeacherScheduleSlot {
    return teacherService.saveScheduleSlot(slot);
  }

  public deleteScheduleSlot(id: string): void {
    teacherService.deleteScheduleSlot(id);
  }

  public getAttendanceRecords(teacherId: string, lessonId?: string): AttendanceRecord[] {
    return teacherService.getAttendanceRecords(teacherId, lessonId);
  }

  public saveAttendanceRecord(record: Omit<AttendanceRecord, 'id'> & { id?: string }): AttendanceRecord {
    return teacherService.saveAttendanceRecord(record);
  }

  // ============================================================
  // SOCIAL & GAMIFICATION: CHALLENGES, ROBO AI, NOTIFICATIONS, TASKS
  // ============================================================

  public getChallenges(): LiveChallenge[] {
    return socialService.getChallenges();
  }

  public getChallengeByCode(code: string): LiveChallenge | null {
    return socialService.getChallengeByCode(code);
  }

  public createChallenge(
    subjectId: string,
    creatorId: string,
    creatorName: string,
    isOpenChallenge: boolean = false,
    creatorGovernorate?: string,
    timeLimitSeconds: number = 60
  ): LiveChallenge {
    return socialService.createChallenge(subjectId, creatorId, creatorName, isOpenChallenge, creatorGovernorate, timeLimitSeconds);
  }

  public getOpenChallenges(): LiveChallenge[] {
    return socialService.getOpenChallenges();
  }

  public joinChallenge(code: string, opponentId: string, opponentName: string): LiveChallenge | null {
    return socialService.joinChallenge(code, opponentId, opponentName);
  }

  public finishChallenge(challengeId: string, creatorScore: number, opponentScore: number): LiveChallenge | null {
    return socialService.finishChallenge(challengeId, creatorScore, opponentScore);
  }

  public getRoboConversations(userId: string): RoboConversation[] {
    return socialService.getRoboConversations(userId);
  }

  public createRoboConversation(userId: string, title?: string): RoboConversation {
    return socialService.createRoboConversation(userId, title);
  }

  public deleteRoboConversation(userId: string, conversationId: string): RoboConversation[] {
    return socialService.deleteRoboConversation(userId, conversationId);
  }

  public updateRoboConversationTitle(userId: string, conversationId: string, newTitle: string): void {
    socialService.updateRoboConversationTitle(userId, conversationId, newTitle);
  }

  public addUserMessageToConversation(
    userId: string,
    conversationId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string,
    enforceLocalQuota: boolean = true
  ): { userMsg: RoboMessage; quotaExceeded: boolean } {
    return socialService.addUserMessageToConversation(userId, conversationId, text, attachmentUrl, attachmentName, enforceLocalQuota);
  }

  public addAssistantMessageToConversation(
    userId: string,
    conversationId: string,
    text: string
  ): RoboMessage {
    return socialService.addAssistantMessageToConversation(userId, conversationId, text);
  }

  public getRoboMessages(userId: string): RoboMessage[] {
    return socialService.getRoboMessages(userId);
  }

  public addUserRoboMessage(
    userId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; quotaExceeded: boolean } {
    return socialService.addUserRoboMessage(userId, text, attachmentUrl, attachmentName);
  }

  public addAssistantRoboMessage(userId: string, text: string): RoboMessage {
    return socialService.addAssistantRoboMessage(userId, text);
  }

  public getRoboDailyUsage(userId: string): { limit: number; used: number; remaining: number } {
    return socialService.getRoboDailyUsage(userId);
  }

  public incrementRoboDailyUsage(userId: string): number {
    return socialService.incrementRoboDailyUsage(userId);
  }

  public sendRoboMessage(
    userId: string,
    text: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): { userMsg: RoboMessage; replyMsg: RoboMessage; quotaExceeded: boolean } {
    return socialService.sendRoboMessage(userId, text, attachmentUrl, attachmentName);
  }

  public updateRoboReply(userId: string, replyMsgId: string, newText: string): void {
    socialService.updateRoboReply(userId, replyMsgId, newText);
  }

  public getNotifications(userId: string): Notification[] {
    return socialService.getNotifications(userId);
  }

  public createNotification(notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    return socialService.createNotification(notif);
  }

  public markNotificationRead(id: string): void {
    socialService.markNotificationRead(id);
  }

  public getAnnouncements(): Announcement[] {
    return socialService.getAnnouncements();
  }

  public saveAnnouncement(ann: Partial<Announcement>): Announcement {
    return socialService.saveAnnouncement(ann);
  }

  public getStudentGroupMessages(studentId: string): StudentGroupMessage[] {
    return socialService.getStudentGroupMessages(studentId);
  }

  public sendStudentGroupMessage(
    studentId: string,
    msg: Omit<StudentGroupMessage, 'id' | 'createdAt'>
  ): StudentGroupMessage {
    return socialService.sendStudentGroupMessage(studentId, msg);
  }

  public getStreak(studentId: string): DailyStreak {
    return socialService.getStreak(studentId);
  }

  public updateStreak(studentId: string): DailyStreak {
    return socialService.updateStreak(studentId);
  }

  public getBadges(studentId: string): StudentBadge[] {
    return socialService.getBadges(studentId);
  }

  public awardBadge(studentId: string, badgeType: BadgeType): StudentBadge | null {
    return socialService.awardBadge(studentId, badgeType);
  }

  public markBadgeSeen(badgeId: string): void {
    socialService.markBadgeSeen(badgeId);
  }

  public getGoals(studentId: string): StudentGoal[] {
    return socialService.getGoals(studentId);
  }

  public saveGoal(goal: StudentGoal): void {
    socialService.saveGoal(goal);
  }

  public deleteGoal(goalId: string): void {
    socialService.deleteGoal(goalId);
  }

  public getFlashcards(subjectId?: string, lessonId?: string): Flashcard[] {
    return socialService.getFlashcards(subjectId, lessonId);
  }

  public saveFlashcard(card: Flashcard): void {
    socialService.saveFlashcard(card);
  }

  public saveFlashcards(cards: Flashcard[]): void {
    socialService.saveFlashcards(cards);
  }

  public deleteFlashcard(cardId: string): void {
    socialService.deleteFlashcard(cardId);
  }

  public getStudentSchedule(studentId: string): StudentScheduleSlot[] {
    return socialService.getStudentSchedule(studentId);
  }

  public saveStudentScheduleSlot(slot: Omit<StudentScheduleSlot, 'id' | 'createdAt'> & { id?: string }): StudentScheduleSlot {
    return socialService.saveStudentScheduleSlot(slot);
  }

  public deleteStudentScheduleSlot(slotId: string): void {
    socialService.deleteStudentScheduleSlot(slotId);
  }

  public getStudentTasks(studentId: string): StudentTask[] {
    return socialService.getStudentTasks(studentId);
  }

  public saveStudentTask(task: Omit<StudentTask, 'id' | 'createdAt' | 'completed'> & { id?: string; completed?: boolean }): StudentTask {
    return socialService.saveStudentTask(task);
  }

  public toggleStudentTask(taskId: string): boolean {
    return socialService.toggleStudentTask(taskId);
  }

  public deleteStudentTask(taskId: string): void {
    socialService.deleteStudentTask(taskId);
  }
}

export const db = new LocalDatabaseEngine();
