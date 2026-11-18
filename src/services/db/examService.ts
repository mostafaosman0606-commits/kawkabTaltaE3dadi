// ==============================================================================
// KAWKAB TALTA E3DADI — EXAMINATION & ASSESSMENT SERVICE
// Official Examinations, Dynamic Questions, Authoritative Grading & Certificates
// ==============================================================================

import type { Examination, Question, ExamAttempt, StudentAnswer, Certificate } from '../../types';
import { storageEngine, STORAGE_KEYS, generateUUID } from './storageEngine';
import { ensureUUID, isValidUUID } from '../uuid';
import {
  sbSaveExaminationToCloud,
  sbDeleteExamination,
  sbSaveQuestionToCloud,
  sbSubmitAndGradeExamAttempt,
  sbSaveAttempt,
  sbSaveCertificate,
  sbRevokeCertificate,
} from '../supabaseDb';
import { syncQueue } from '../syncQueue';
import { profileService } from './profileService';
import { curriculumService } from './curriculumService';

export const INITIAL_EXAMINATIONS: Examination[] = [
  {
    id: '89cee155-0747-47bf-aac6-8a2b9b231ef7',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f146e', // arabic
    title: 'امتحان شامل: المشتقات وأعمالها الأدبية',
    description: 'اختبار تقييمي معتمد يحاكي مواصفات الورقة الامتحانية لوزارة التربية والتعليم 2026.',
    timeLimitMinutes: 20,
    passingPercentage: 50,
    randomizeQuestions: true,
    randomizeAnswers: true,
    antiCheatingTabSwitch: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'official',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: '393d690b-da60-48e5-aa2a-f20fa73466ed',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f1470', // science
    title: 'اختبار تجريبي: القوى والحركة والسرعة',
    description: 'أسئلة معيارية تغطي مفاهيم السرعة، العجلة، والتمثيل البياني للحركة.',
    timeLimitMinutes: 25,
    passingPercentage: 60,
    randomizeQuestions: true,
    randomizeAnswers: true,
    antiCheatingTabSwitch: true,
    maxAttempts: 3,
    isPublished: true,
    allowsCertificate: true,
    examType: 'practice',
    createdAt: '2026-09-05T09:00:00Z',
  },
];

export const INITIAL_QUESTIONS: Question[] = [];

export class ExamService {
  // ── EXAMINATIONS ──────────────────────────────────────────────────────────
  public getExaminations(subjectId?: string): Examination[] {
    const exams = storageEngine.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    const questions = storageEngine.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    const filtered = subjectId ? exams.filter((e) => e.subjectId === subjectId) : exams;
    return filtered.map((e) => ({
      ...e,
      subjectName: e.subjectName || curriculumService.getSubjectById(e.subjectId)?.nameAr || 'المادة الدراسية',
      questions: questions.filter((q) => q.examId === e.id),
    }));
  }

  public getExaminationById(id: string): Examination | null {
    const exams = this.getExaminations();
    return exams.find((e) => e.id === id) || null;
  }

  public saveExamination(exam: Partial<Examination>): Examination {
    const exams = storageEngine.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS);
    if (exam.id) {
      const idx = exams.findIndex((e) => e.id === exam.id);
      if (idx !== -1) {
        exams[idx] = { ...exams[idx], ...exam } as Examination;
        storageEngine.set(STORAGE_KEYS.EXAMS, exams);
        sbSaveExaminationToCloud(exams[idx] as Examination).catch((e) => console.warn('[saveExam] Cloud sync error:', e));
        storageEngine.notifyDataChanged();
        return exams[idx];
      }
    }
    const newExamId = exam.id && isValidUUID(exam.id) ? exam.id : generateUUID();
    const newExam: Examination = {
      id: newExamId,
      subjectId: exam.subjectId ? ensureUUID(exam.subjectId) : '',
      unitId: exam.unitId ? ensureUUID(exam.unitId) : undefined,
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
    storageEngine.set(STORAGE_KEYS.EXAMS, exams);
    sbSaveExaminationToCloud(newExam).catch((e) => console.warn('[saveExam] Cloud sync error:', e));
    storageEngine.notifyDataChanged();
    return newExam;
  }

  public deleteExamination(id: string): void {
    const exams = storageEngine.get<Examination[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMINATIONS).filter((e) => e.id !== id);
    storageEngine.set(STORAGE_KEYS.EXAMS, exams);
    sbDeleteExamination(id).catch((e) => console.warn('[deleteExam] Cloud sync error:', e));
    storageEngine.notifyDataChanged();
  }

  // ── QUESTIONS ─────────────────────────────────────────────────────────────
  public getQuestionsByExam(examId: string): Question[] {
    const questions = storageEngine.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    return questions.filter((q) => q.examId === examId).sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public saveQuestion(question: Partial<Question>): Question {
    const questions = storageEngine.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS);
    if (question.id) {
      const idx = questions.findIndex((q) => q.id === question.id);
      if (idx !== -1) {
        questions[idx] = { ...questions[idx], ...question } as Question;
        storageEngine.set(STORAGE_KEYS.QUESTIONS, questions);
        sbSaveQuestionToCloud(questions[idx] as Question).catch((e) => console.warn('[saveQuestion] Cloud sync error:', e));
        storageEngine.notifyDataChanged();
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
    storageEngine.set(STORAGE_KEYS.QUESTIONS, questions);
    sbSaveQuestionToCloud(newQ).catch((e) => console.warn('[saveQuestion] Cloud sync error:', e));
    storageEngine.notifyDataChanged();
    return newQ;
  }

  public deleteQuestion(id: string): void {
    const questions = storageEngine.get<Question[]>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS).filter((q) => q.id !== id);
    storageEngine.set(STORAGE_KEYS.QUESTIONS, questions);
    // Note: No sbDeleteQuestion in supabaseDb — questions are managed via exam upserts
    storageEngine.notifyDataChanged();
  }

  public clearAllQuestions(): void {
    storageEngine.set(STORAGE_KEYS.QUESTIONS, []);
    storageEngine.notifyDataChanged();
  }

  // ── EXAM ATTEMPTS & GRADING ───────────────────────────────────────────────
  public getExamAttempts(studentId?: string, examId?: string): ExamAttempt[] {
    let attempts = storageEngine.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    if (studentId) {
      const sid = studentId.toLowerCase();
      attempts = attempts.filter((a) => a.studentId?.toLowerCase() === sid);
    }
    if (examId) {
      const eid = examId.toLowerCase();
      attempts = attempts.filter((a) => a.examId?.toLowerCase() === eid);
    }
    return attempts.sort((a, b) => {
      const tb = new Date(b.submittedAt || b.startedAt || 0).getTime();
      const ta = new Date(a.submittedAt || a.startedAt || 0).getTime();
      return tb - ta;
    });
  }

  public getAttemptById(id: string): ExamAttempt | null {
    const attempts = storageEngine.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    return attempts.find((a) => a.id === id) || null;
  }

  public syncAttemptsFromCloud(cloudAttempts: ExamAttempt[]): void {
    if (!cloudAttempts || cloudAttempts.length === 0) return;
    const current = this.getExamAttempts();
    const currentIds = new Set(current.map((a) => a.id));
    const toAdd = cloudAttempts.filter((a) => !currentIds.has(a.id));
    if (toAdd.length > 0) {
      storageEngine.set(STORAGE_KEYS.ATTEMPTS, [...toAdd, ...current]);
      storageEngine.notifyDataChanged();
    }
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
    const student = profileService.getProfileById(studentId);
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

    const resolvedSubjectName = exam.subjectName || curriculumService.getSubjectById(exam.subjectId)?.nameAr || 'المادة الدراسية';

    const newAttempt: ExamAttempt = {
      id: attemptId,
      examId,
      studentId,
      studentName: student?.fullName || 'طالب كوكب تالتة',
      examTitle: exam.title,
      subjectName: resolvedSubjectName,
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

    const attempts = storageEngine.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
    attempts.unshift(newAttempt);
    storageEngine.set(STORAGE_KEYS.ATTEMPTS, attempts);

    sbSaveAttempt(newAttempt).then((success) => {
      if (!success) syncQueue.enqueue('attempt', newAttempt);
    }).catch(() => syncQueue.enqueue('attempt', newAttempt));

    if (passed && exam.allowsCertificate) {
      this.issueCertificate(newAttempt);
    }

    // Insert notification
    const notifs = storageEngine.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifs.unshift({
      id: generateUUID(),
      userId: studentId,
      title: isProvisional ? '⏳ تم استلام إجابات امتحانك بنجاح' : (passed ? '🎉 مبروك! لقد اجتزت الامتحان بنجاح' : '📊 تم تصحيح الامتحان'),
      message: isProvisional
        ? `حصلت على ${autoScore} في الأسئلة الموضوعية، والأسئلة المقالية قيد المراجعة بواسطة المعلم.`
        : `حصلت على نتيجة ${percentage}% (${initialTotal} من ${maxScore}).`,
      type: passed ? 'success' : 'info',
      linkUrl: '/exams',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    storageEngine.set(STORAGE_KEYS.NOTIFICATIONS, notifs);

    profileService.logAudit(studentId, student?.fullName || 'طالب', 'تسليم محاولة امتحان', 'exam_attempt', attemptId, {
      percentage,
      passed,
      violations: violationCount,
    });

    storageEngine.notifyDataChanged();
    return newAttempt;
  }

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
          const student = profileService.getProfileById(studentId);

          const authoritativeAttempt: ExamAttempt = {
            id: s.id || generateUUID(),
            examId,
            studentId,
            studentName: s.studentName || student?.fullName || 'طالب كوكب تالتة',
            examTitle: s.examTitle || exam?.title || 'امتحان رسمي',
            subjectName: s.subjectName || exam?.subjectName || (exam?.subjectId ? curriculumService.getSubjectById(exam.subjectId)?.nameAr : null) || 'المادة الدراسية',
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

          const attempts = storageEngine.get<ExamAttempt[]>(STORAGE_KEYS.ATTEMPTS, []);
          attempts.unshift(authoritativeAttempt);
          storageEngine.set(STORAGE_KEYS.ATTEMPTS, attempts);

          if (authoritativeAttempt.passed && exam?.allowsCertificate) {
            this.issueCertificate(authoritativeAttempt);
          }

          storageEngine.notifyDataChanged();
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
    gradedBy: string
  ): ExamAttempt | null {
    const attempts = this.getExamAttempts();
    const idx = attempts.findIndex((a) => a.id === attemptId);
    if (idx === -1) return null;

    const attempt = attempts[idx];
    if (!attempt.answers[questionId]) return null;

    attempt.answers[questionId].scoreAwarded = score;
    attempt.answers[questionId].teacherFeedback = feedback;
    attempt.answers[questionId].gradedBy = gradedBy;
    attempt.answers[questionId].gradedAt = new Date().toISOString();

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
    }

    attempts[idx] = attempt;
    storageEngine.set(STORAGE_KEYS.ATTEMPTS, attempts);

    sbSaveAttempt(attempt).then((success) => {
      if (!success) syncQueue.enqueue('attempt', attempt);
    }).catch(() => syncQueue.enqueue('attempt', attempt));

    storageEngine.notifyDataChanged();
    return attempt;
  }

  // ── CERTIFICATES ──────────────────────────────────────────────────────────
  public getCertificates(studentId?: string): Certificate[] {
    let certs = storageEngine.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []);
    if (studentId) certs = certs.filter((c) => c.studentId === studentId);
    return certs.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  public getCertificateById(id: string): Certificate | null {
    const certs = this.getCertificates();
    return certs.find((c) => c.id === id || c.certificateNumber === id) || null;
  }

  public issueCertificate(attempt: ExamAttempt): Certificate {
    const certs = this.getCertificates();
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
    storageEngine.set(STORAGE_KEYS.CERTIFICATES, certs);

    sbSaveCertificate(newCert).then((success) => {
      if (!success) syncQueue.enqueue('certificate', newCert);
    }).catch(() => syncQueue.enqueue('certificate', newCert));

    profileService.logAudit(attempt.studentId, attempt.studentName || 'طالب', 'إصدار شهادة تفوق', 'certificate', newCert.id, {
      certificateNumber: certNum,
      score: attempt.percentage,
    });

    storageEngine.notifyDataChanged();
    return newCert;
  }

  public revokeCertificate(id: string, adminId: string): void {
    const certs = this.getCertificates();
    const idx = certs.findIndex((c) => c.id === id || c.certificateNumber === id);
    if (idx !== -1) {
      certs[idx].isRevoked = true;
      storageEngine.set(STORAGE_KEYS.CERTIFICATES, certs);
      sbRevokeCertificate(certs[idx].certificateNumber || id).catch(() => {});
      const admin = profileService.getProfileById(adminId);
      profileService.logAudit(adminId, admin?.fullName || 'مشرف', 'إلغاء شهادة', 'certificate', id, {});
      storageEngine.notifyDataChanged();
    }
  }
}

export const examService = new ExamService();
