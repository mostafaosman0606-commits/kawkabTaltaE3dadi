// ==============================================================================
// KAWKAB TALTA E3DADI — PROFILE SERVICE
// User Profiles, Auth Cache, Subscription Plans & Requests, Leaderboard & Audits
// ==============================================================================

import type {
  UserProfile,
  UserEducationalStats,
  LeaderboardEntry,
  SubscriptionPlan,
  SubscriptionRequest,
  ContactSettings,
  AuditLog,
  LessonProgress,
  Certificate,
  LiveChallenge,
  TeacherAssignment,
  StudentGroupMessage,
} from '../../types';
import { storageEngine, STORAGE_KEYS, generateUUID } from './storageEngine';
import { isValidUUID } from '../uuid';
import { isSupabaseConfigured } from '../supabase';
import {
  sbAdminUpdateProfile,
  sbSaveSubscriptionRequest,
  sbUpdateSubscriptionRequest,
  sbInsertNotification,
} from '../supabaseDb';
import { curriculumService } from './curriculumService';
import { examService } from './examService';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'admin-1',
    email: '2ndprepplanet@gmail.com',
    password: '06062012@Mostafa',
    fullName: 'مصطفى عثمان (الإدارة)',
    role: 'admin',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'الإدارة العامة لمنصة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'teacher-1',
    email: 'teacher@kawkab.com',
    password: '06062012',
    fullName: 'أ/ مصطفى عثمان (المعلم والمشرف)',
    role: 'teacher',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'مدرسة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-08-15T08:00:00Z',
  },
  {
    id: 'student-1',
    email: 'mostafaosman06062012@gmail.com',
    password: '06062012',
    fullName: 'مصطفى عثمان',
    role: 'student',
    phoneNumber: '01103075485',
    governorate: 'القاهرة',
    schoolName: 'مدرسة كوكب تالتة إعدادي',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    isSuspended: false,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    aiQuestionsUsedThisMonth: 0,
    createdAt: '2026-09-01T10:00:00Z',
  },
];

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    tier: 'free',
    nameAr: 'الباقة المجانية',
    priceEgp: 0,
    periodDays: 365,
    features: [
      'درس واحد مجاني لكل مادة دراسية',
      'دخول الاختبارات التجريبية',
      'لوحة المتابعة وإحصائيات التعلم',
    ],
    isActive: true,
  },
  {
    id: 'plan-standard',
    tier: 'standard',
    nameAr: 'الباقة القياسية',
    priceEgp: 90,
    periodDays: 30,
    features: [
      'الوصول لجميع الدروس في كافة المواد الـ 8',
      'مشاهدة كافة فيديوهات الشرح المباشرة واليوتيوب',
      'تحميل ملخصات ومذكرات PDF الدراسية',
      'إجراء اختبارات غير محدودة لكل درس ووحدة',
      'حفظ الملاحظات الخاصة لكل درس',
    ],
    isActive: true,
  },
  {
    id: 'plan-premium',
    tier: 'premium',
    nameAr: 'الباقة المميزة',
    priceEgp: 150,
    periodDays: 30,
    features: [
      'جميع مزايا الباقة القياسية كاملة',
      'غرف التحدي المباشر والمنافسة مع الزملاء بالكود',
      'إصدار وتحميل شهادات التقدير الرسمية المعتمدة',
      'المساعد الذكي (روبو) بلا حدود لشرح الأسئلة ومذكرات PDF',
      'أولوية التصحيح السريع بالذكاء الاصطناعي والمعلمين للأسئلة المقالية',
    ],
    isActive: true,
  },
];

export const INITIAL_CONTACT_SETTINGS: ContactSettings = {
  whatsappDirectNumber: '01103075485',
  whatsappDirectUrl: 'https://wa.me/201103075485?text=مرحباً%20منصة%20كوكب%20تالتة%20إعدادي',
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb79XC0EKyZFm37c5P0R',
  facebookPageUrl: 'https://www.facebook.com/share/1DQc2gf9fs/',
  telegramChannelUrl: 'https://t.me/planet_of_3rd_prep',
  supportEmail: 'support@kawkab.edu.eg',
};

export class ProfileService {
  public getDeletedProfileIds(): Set<string> {
    const stored = storageEngine.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    const legacyAutoExcluded = new Set(['usr-student-2', 'ahmed.student@gmail.com']);
    const retained = stored.filter((id) => typeof id === 'string' && !legacyAutoExcluded.has(id.toLowerCase()));
    if (retained.length !== stored.length) {
      storageEngine.set(STORAGE_KEYS.DELETED_USER_IDS, retained);
    }
    return new Set(retained);
  }

  public getProfiles(): UserProfile[] {
    const deletedIds = this.getDeletedProfileIds();
    const rawUsers = storageEngine.get<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_PROFILES);
    const users = rawUsers.filter(
      (u) => !deletedIds.has(u.id) && !deletedIds.has(u.email?.toLowerCase())
    );

    let changed = false;
    for (const initP of INITIAL_PROFILES) {
      if (deletedIds.has(initP.id) || deletedIds.has(initP.email.toLowerCase())) {
        continue;
      }
      if (!users.some((u) => u.id === initP.id || u.email.toLowerCase() === initP.email.toLowerCase())) {
        users.push(initP);
        changed = true;
      }
    }
    if (changed || users.length !== rawUsers.length) {
      storageEngine.set(STORAGE_KEYS.USERS, users);
    }
    return users;
  }

  public syncProfilesFromCloud(cloudProfiles: UserProfile[]): void {
    if (!cloudProfiles || cloudProfiles.length === 0) return;
    const deletedIds = this.getDeletedProfileIds();
    const current = this.getProfiles();
    let changed = false;

    for (const cp of cloudProfiles) {
      if (deletedIds.has(cp.id) || deletedIds.has(cp.email?.toLowerCase())) continue;
      const idx = current.findIndex((u) => u.id === cp.id || u.email?.toLowerCase() === cp.email?.toLowerCase());
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...cp };
        changed = true;
      } else {
        current.push(cp);
        changed = true;
      }
    }

    if (changed) {
      storageEngine.set(STORAGE_KEYS.USERS, current);
      storageEngine.notifyDataChanged();
    }
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
    storageEngine.set(STORAGE_KEYS.USERS, users);
    sbAdminUpdateProfile(id, updates).catch((e) => console.warn('[updateProfile] Cloud sync error:', e));
    storageEngine.notifyDataChanged();
    return users[index];
  }

  public deleteProfile(id: string): void {
    const target = this.getProfileById(id);
    const deletedIds = storageEngine.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    const updatedDeleted = Array.from(
      new Set([...deletedIds, id, target?.email?.toLowerCase()].filter(Boolean) as string[])
    );
    storageEngine.set(STORAGE_KEYS.DELETED_USER_IDS, updatedDeleted);

    const users = this.getProfiles().filter((u) => u.id !== id);
    storageEngine.set(STORAGE_KEYS.USERS, users);

    // Also remove any teacher assignments for this user
    const assignments = storageEngine.get<TeacherAssignment[]>(STORAGE_KEYS.TEACHER_ASSIGNMENTS, []).filter((a) => a.teacherId !== id);
    storageEngine.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, assignments);

    // Clean from student group chat registry if applicable
    const chats = storageEngine.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    if (chats[id]) {
      delete chats[id];
      storageEngine.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, chats);
    }

    if (target) {
      this.logAudit('admin', 'مدير النظام', `حذف حساب المستخدم: ${target.fullName} (${target.role})`, 'profile', id);
    }
    storageEngine.notifyDataChanged();
  }

  public createProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'aiQuestionsUsedThisMonth'> & { id?: string }): UserProfile {
    const users = this.getProfiles();
    const newProfile: UserProfile = {
      ...profile,
      id: profile.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      aiQuestionsUsedThisMonth: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(newProfile);
    storageEngine.set(STORAGE_KEYS.USERS, users);
    this.logAudit(newProfile.id, newProfile.fullName, 'تسجيل مستخدم جديد', 'profile', newProfile.id, { role: newProfile.role });
    storageEngine.notifyDataChanged();
    return newProfile;
  }

  public getUserStats(userId: string): UserEducationalStats {
    const allLessons = curriculumService.getLessons();
    const totalLessons = allLessons.length;
    const progress = curriculumService.getLessonProgress(userId);
    const completedLessons = progress.filter((p) => p.completed).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const attempts = examService.getExamAttempts().filter((a) => a.studentId === userId && a.status === 'graded');
    const passedExams = attempts.filter((a) => a.passed).length;
    const avgScore = attempts.length > 0
      ? attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length
      : 0;

    const certs = examService.getCertificates(userId).filter((c) => !c.isRevoked).length;
    const challenges = storageEngine.get<LiveChallenge[]>(STORAGE_KEYS.CHALLENGES, []).filter((c) => c.winnerId === userId).length;

    // Approved system points formula:
    // +25 pts per completed lesson
    // +50 pts per certificate earned
    // +30 pts per challenge duel won
    // + (avgScore * 10) pts for exam achievement
    const points = Math.round(
      (avgScore * 10) + (completedLessons * 25) + (certs * 50) + (challenges * 30)
    );

    return {
      points,
      completedLessonsCount: completedLessons,
      totalLessonsCount: totalLessons,
      progressPercentage: progressPercent,
      passedExamsCount: passedExams,
      certificatesCount: certs,
      challengesWonCount: challenges,
    };
  }

  public getPlans(): SubscriptionPlan[] {
    const plans = storageEngine.get<SubscriptionPlan[]>(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    if (!plans.some((p) => p.tier === 'standard')) {
      const standardPlan = INITIAL_PLANS.find((p) => p.tier === 'standard');
      if (standardPlan) {
        plans.splice(1, 0, standardPlan);
        storageEngine.set(STORAGE_KEYS.PLANS, plans);
      }
    }
    return plans;
  }

  public savePlan(plan: Partial<SubscriptionPlan>): SubscriptionPlan {
    const plans = this.getPlans();
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...plan } as SubscriptionPlan;
      storageEngine.set(STORAGE_KEYS.PLANS, plans);
      storageEngine.notifyDataChanged();
      return plans[idx];
    }
    const newP: SubscriptionPlan = {
      id: plan.id || `plan-${Date.now()}`,
      tier: plan.tier || 'standard',
      nameAr: plan.nameAr || 'باقة جديدة',
      priceEgp: plan.priceEgp || 0,
      periodDays: plan.periodDays || 30,
      features: plan.features || [],
      isActive: plan.isActive ?? true,
    };
    plans.push(newP);
    storageEngine.set(STORAGE_KEYS.PLANS, plans);
    storageEngine.notifyDataChanged();
    return newP;
  }

  public getSubscriptionRequests(): SubscriptionRequest[] {
    return storageEngine.get<SubscriptionRequest[]>(STORAGE_KEYS.REQUESTS, []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createSubscriptionRequest(request: Omit<SubscriptionRequest, 'id' | 'status' | 'createdAt'>): SubscriptionRequest {
    const reqs = storageEngine.get<SubscriptionRequest[]>(STORAGE_KEYS.REQUESTS, []);
    const newReq: SubscriptionRequest = {
      ...request,
      id: generateUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    reqs.unshift(newReq);
    storageEngine.set(STORAGE_KEYS.REQUESTS, reqs);
    // Supabase sync (fire-and-forget)
    sbSaveSubscriptionRequest({
      studentId: newReq.studentId,
      planId: newReq.planId || '',
      tier: newReq.tier,
      paymentMethod: newReq.paymentMethod,
      paymentProofUrl: newReq.paymentProofUrl,
      senderPhone: newReq.senderPhone,
      transactionRef: newReq.transactionRef,
    }).catch(() => {});
    storageEngine.notifyDataChanged();
    return newReq;
  }

  public reviewSubscriptionRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes: string,
    adminId: string
  ): SubscriptionRequest | null {
    const reqs = this.getSubscriptionRequests();
    const idx = reqs.findIndex((r) => r.id === requestId);
    if (idx !== -1) {
      const req = reqs[idx];
      req.status = status;
      req.reviewedAt = new Date().toISOString();
      req.reviewedBy = adminId;
      req.adminNotes = adminNotes;

      if (status === 'approved') {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 30);
        this.updateProfile(req.studentId, {
          subscriptionTier: req.tier,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expDate.toISOString(),
        });

        // Insert notification
        const notif = {
          id: generateUUID(),
          userId: req.studentId,
          title: '🎉 مبروك! تم تفعيل اشتراكك بنجاح',
          message: `تمت الموافقة على طلب اشتراكك في ${req.tier === 'premium' ? 'الباقة المميزة' : 'الباقة القياسية'}. استمتع بكافة المزايا الآن!`,
          type: 'success' as const,
          linkUrl: '/profile',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        const notifs = storageEngine.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        notifs.unshift(notif);
        storageEngine.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
        sbInsertNotification(notif).catch(() => {});
      } else {
        const notif = {
          id: generateUUID(),
          userId: req.studentId,
          title: '❌ تعذر تفعيل طلب الاشتراك',
          message: adminNotes || 'لم يتم تأكيد الحوالة. يرجى التواصل مع إدارة المنصة عبر واتساب لمراجعة البيانات.',
          type: 'warning' as const,
          linkUrl: '/contact',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        const notifs = storageEngine.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        notifs.unshift(notif);
        storageEngine.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
        sbInsertNotification(notif).catch(() => {});
      }

      reqs[idx] = req;
      storageEngine.set(STORAGE_KEYS.REQUESTS, reqs);
      sbUpdateSubscriptionRequest(requestId, status, adminNotes, adminId).catch(() => {});
      storageEngine.notifyDataChanged();
      return req;
    }
    return null;
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const allProfiles = this.getProfiles();

    // 1. Identify all admin, supervisor, and teacher accounts to guarantee 100% exclusion
    const staffIds = new Set<string>();
    const staffEmails = new Set<string>();

    allProfiles.forEach((u) => {
      const email = u.email?.toLowerCase().trim() || '';
      const role = u.role?.toLowerCase().trim() || '';
      if (
        role === 'admin' ||
        role === 'supervisor' ||
        role === 'teacher' ||
        u.id.startsWith('admin') ||
        u.id.startsWith('teacher') ||
        email.includes('admin') ||
        email === '2ndprepplanet@gmail.com'
      ) {
        staffIds.add(u.id);
        if (email) staffEmails.add(email);
      }
    });

    // 2. Filter ONLY genuine students (excluding all staff, admin, suspended, and mock users)
    const students = allProfiles.filter((u) => {
      const email = u.email?.toLowerCase().trim() || '';
      if (u.role !== 'student') return false;
      if (staffIds.has(u.id)) return false;
      if (email && staffEmails.has(email)) return false;
      if (u.isSuspended) return false;
      return true;
    });

    // Filter attempts, progress, and certificates strictly to student records
    const attempts = examService.getExamAttempts().filter((a) => !staffIds.has(a.studentId));
    const progress = storageEngine.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []).filter((p) => !staffIds.has(p.studentId));
    const certs = storageEngine.get<Certificate[]>(STORAGE_KEYS.CERTIFICATES, []).filter((c) => !staffIds.has(c.studentId));
    const challenges = storageEngine.get<LiveChallenge[]>(STORAGE_KEYS.CHALLENGES, []);

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

  public getContactSettings(): ContactSettings {
    return storageEngine.get<ContactSettings>(STORAGE_KEYS.CONTACT_SETTINGS, INITIAL_CONTACT_SETTINGS);
  }

  public saveContactSettings(settings: ContactSettings): void {
    storageEngine.set(STORAGE_KEYS.CONTACT_SETTINGS, settings);
    storageEngine.notifyDataChanged();
  }

  public getAuditLogs(): AuditLog[] {
    return storageEngine.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []).sort(
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
    const logs = storageEngine.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actorId,
      actorName,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (logs.length > 200) logs.pop();
    storageEngine.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  }
}

export const profileService = new ProfileService();
