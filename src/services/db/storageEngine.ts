// ==============================================================================
// KAWKAB TALTA E3DADI — STORAGE ENGINE (Offline-First Memory + LocalStorage)
// Centralized, type-safe, resilient key-value store with cloud sync cache busting.
// ==============================================================================

import { ensureUUID, isValidUUID, KNOWN_SUBJECT_UUIDS } from '../uuid';
import { isSupabaseConfigured } from '../supabase';

export const STORAGE_KEYS = {
  VERSION: 'kawkab_db_version_v9',
  USERS: 'kawkab_users_v9',
  SUBJECTS: 'kawkab_subjects_v9',
  UNITS: 'kawkab_units_v9',
  LESSONS: 'kawkab_lessons_v9',
  NOTES: 'kawkab_notes_v9',
  PROGRESS: 'kawkab_progress_v9',
  EXAMS: 'kawkab_exams_v9',
  QUESTIONS: 'kawkab_questions_v9',
  ATTEMPTS: 'kawkab_attempts_v9',
  CERTIFICATES: 'kawkab_certificates_v9',
  PLANS: 'kawkab_plans_v9',
  REQUESTS: 'kawkab_requests_v9',
  CHALLENGES: 'kawkab_challenges_v9',
  NOTIFICATIONS: 'kawkab_notifications_v9',
  ANNOUNCEMENTS: 'kawkab_announcements_v9',
  AUDIT_LOGS: 'kawkab_audit_logs_v9',
  ROBO_MESSAGES: 'kawkab_robo_messages_v9',
  ROBO_CONVERSATIONS: 'kawkab_robo_conversations_v1',
  TEACHER_ASSIGNMENTS: 'kawkab_teacher_assignments_v9',
  CONTACT_SETTINGS: 'kawkab_contact_settings_v10',
  TEACHER_HOMEWORKS: 'kawkab_teacher_homeworks_v1',
  TEACHER_MESSAGES: 'kawkab_teacher_messages_v1',
  TEACHER_SCHEDULE: 'kawkab_teacher_schedule_v1',
  TEACHER_ATTENDANCE: 'kawkab_teacher_attendance_v1',
  DAILY_STREAK: 'kawkab_daily_streak_v1',
  STUDENT_BADGES: 'kawkab_student_badges_v1',
  STUDENT_GOALS: 'kawkab_student_goals_v1',
  FLASHCARDS: 'kawkab_flashcards_v1',
  STUDENT_GROUP_CHATS: 'kawkab_student_group_chats_v1',
  STUDENT_SCHEDULE: 'kawkab_student_schedule_v1',
  STUDENT_TASKS: 'kawkab_student_tasks_v1',
  DELETED_USER_IDS: 'kawkab_deleted_user_ids_v1',
} as const;

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class StorageEngine {
  private memoryCache = new Map<string, unknown>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('kawkab_cloud_synced', () => {
        this.clearMemoryCache();
      });
    }
  }

  public get<T>(key: string, defaultValue: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    try {
      if (typeof localStorage === 'undefined') return defaultValue;
      const item = localStorage.getItem(key);
      if (!item) {
        this.memoryCache.set(key, defaultValue);
        return defaultValue;
      }
      const parsed = JSON.parse(item) as T;
      this.memoryCache.set(key, parsed);
      return parsed;
    } catch (e) {
      console.warn(`[StorageEngine] Failed reading key ${key}:`, e);
      return defaultValue;
    }
  }

  public set<T>(key: string, value: T): void {
    this.memoryCache.set(key, value);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error(`[StorageEngine] Failed writing key ${key}:`, e);
    }
  }

  public remove(key: string): void {
    this.memoryCache.delete(key);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  }

  public clearMemoryCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  public notifyDataChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kawkab_cloud_synced', { detail: { timestamp: Date.now() } }));
    }
  }
}

export const storageEngine = new StorageEngine();
