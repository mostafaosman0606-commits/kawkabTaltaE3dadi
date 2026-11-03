// ==============================================================================
// Resilient Offline-First Synchronization Queue (SyncQueue)
// Handles automatic retries for failed or offline mutations (Exams, Progress, Certs, Streaks)
// ==============================================================================

import {
  sbSaveAttempt,
  sbMarkLessonComplete,
  sbSaveCertificate,
  sbUpsertStreak,
} from './supabaseDb';
import { isSupabaseConfigured } from './supabase';

export interface SyncQueueItem {
  id: string;
  type: 'attempt' | 'progress' | 'certificate' | 'streak';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'kawkab_sync_queue_v1';
const MAX_RETRIES = 5;

class SyncQueueManager {
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flush();
      });
      window.addEventListener('focus', () => {
        this.flush();
      });
    }
  }

  private getQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setQueue(items: SyncQueueItem[]): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
    } catch {}
  }

  public enqueue(type: SyncQueueItem['type'], payload: any): void {
    const queue = this.getQueue();
    // Avoid duplicate enqueues for the same entity
    const existingIndex = queue.findIndex(
      (item) => item.type === type && (item.payload?.id === payload?.id || item.payload?.certificateNumber === payload?.certificateNumber)
    );

    const item: SyncQueueItem = {
      id: `sq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (existingIndex !== -1) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }

    this.setQueue(queue);

    // If online, try to flush immediately
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.flush().catch(() => {});
    }
  }

  public async flush(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || !isSupabaseConfigured()) return;
    this.isProcessing = true;

    try {
      const queue = this.getQueue();
      if (queue.length === 0) return;

      const remaining: SyncQueueItem[] = [];

      for (const item of queue) {
        let success = false;
        try {
          switch (item.type) {
            case 'attempt':
              success = await sbSaveAttempt(item.payload);
              break;
            case 'progress':
              success = await sbMarkLessonComplete(item.payload.studentId, item.payload.lessonId);
              break;
            case 'certificate':
              success = await sbSaveCertificate(item.payload);
              break;
            case 'streak':
              success = await sbUpsertStreak(item.payload);
              break;
            default:
              success = true;
          }
        } catch {
          success = false;
        }

        if (!success) {
          item.retryCount += 1;
          if (item.retryCount < MAX_RETRIES) {
            remaining.push(item);
          }
        }
      }

      this.setQueue(remaining);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncQueue = new SyncQueueManager();
