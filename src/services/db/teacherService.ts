// ==============================================================================
// KAWKAB TALTA E3DADI — TEACHER SERVICE
// Teacher Assignments, Homeworks, Direct Messages, Schedules & Attendance Records
// ==============================================================================

import type {
  TeacherAssignment,
  TeacherHomework,
  TeacherMessage,
  TeacherScheduleSlot,
  AttendanceRecord,
  StudentGroupMessage,
} from '../../types';
import { storageEngine, STORAGE_KEYS } from './storageEngine';
import { profileService } from './profileService';
import { curriculumService } from './curriculumService';

export const INITIAL_TEACHER_ASSIGNMENTS: TeacherAssignment[] = [
  {
    id: 'ta-1',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f146e', // arabic
    subjectName: 'اللغة العربية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-2',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f1470', // science
    subjectName: 'العلوم',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-3',
    teacherId: 'teacher-1',
    teacherName: 'أ/ مصطفى عثمان',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f1471', // math
    subjectName: 'الرياضيات',
    assignedAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'ta-4',
    teacherId: 'admin-1',
    teacherName: 'مصطفى عثمان (الإدارة)',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f146e', // arabic
    subjectName: 'اللغة العربية',
    assignedAt: '2026-09-01T10:00:00Z',
  },
];

export class TeacherService {
  // ============================================================
  // TEACHER ASSIGNMENTS
  // ============================================================

  public getTeacherAssignments(teacherId?: string): TeacherAssignment[] {
    const list = storageEngine.get<TeacherAssignment[]>(STORAGE_KEYS.TEACHER_ASSIGNMENTS, INITIAL_TEACHER_ASSIGNMENTS);
    if (teacherId) return list.filter((a) => a.teacherId === teacherId);
    return list;
  }

  public assignTeacherToSubject(teacherId: string, subjectId: string): TeacherAssignment {
    const list = this.getTeacherAssignments();
    const existing = list.find((a) => a.teacherId === teacherId && a.subjectId === subjectId);
    if (existing) return existing;

    const teacher = profileService.getProfileById(teacherId);
    const sub = curriculumService.getSubjectById(subjectId);
    const newAss: TeacherAssignment = {
      id: `ta-${Date.now()}`,
      teacherId,
      teacherName: teacher?.fullName || 'معلم',
      subjectId,
      subjectName: sub?.nameAr || 'المادة',
      assignedAt: new Date().toISOString(),
    };
    list.push(newAss);
    storageEngine.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
    storageEngine.notifyDataChanged();
    return newAss;
  }

  public removeTeacherAssignment(id: string): void {
    const list = this.getTeacherAssignments().filter((a) => a.id !== id);
    storageEngine.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
    storageEngine.notifyDataChanged();
  }

  public saveTeacherAssignments(list: TeacherAssignment[]): void {
    storageEngine.set(STORAGE_KEYS.TEACHER_ASSIGNMENTS, list);
    storageEngine.notifyDataChanged();
  }

  // ============================================================
  // TEACHER HOMEWORKS
  // ============================================================

  public getTeacherHomeworks(teacherId?: string): TeacherHomework[] {
    const all = storageEngine.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    if (teacherId) return all.filter((h) => h.teacherId === teacherId);
    return all;
  }

  public saveTeacherHomework(hw: Partial<TeacherHomework> & { teacherId: string; subjectId: string; title: string }): TeacherHomework {
    const all = storageEngine.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    if (hw.id) {
      const idx = all.findIndex((h) => h.id === hw.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...hw } as TeacherHomework;
        storageEngine.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
        storageEngine.notifyDataChanged();
        return all[idx];
      }
    }
    const newHw: TeacherHomework = {
      id: `hw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId: hw.teacherId,
      subjectId: hw.subjectId,
      subjectName: hw.subjectName || '',
      title: hw.title,
      description: hw.description || '',
      deadlineAt: hw.deadlineAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: hw.maxScore || 10,
      createdAt: new Date().toISOString(),
      submissions: [],
    };
    all.unshift(newHw);
    storageEngine.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    storageEngine.notifyDataChanged();
    return newHw;
  }

  public deleteTeacherHomework(id: string): void {
    const all = storageEngine.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []).filter((h) => h.id !== id);
    storageEngine.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    storageEngine.notifyDataChanged();
  }

  public submitHomeworkAnswer(hwId: string, studentId: string, studentName: string, answerText: string): boolean {
    const all = storageEngine.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    const hw = all.find((h) => h.id === hwId);
    if (!hw) return false;
    const existing = hw.submissions.findIndex((s) => s.studentId === studentId);
    const sub = { studentId, studentName, submittedAt: new Date().toISOString(), answerText };
    if (existing !== -1) {
      hw.submissions[existing] = sub;
    } else {
      hw.submissions.push(sub);
    }
    storageEngine.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    storageEngine.notifyDataChanged();
    return true;
  }

  public gradeHomeworkSubmission(hwId: string, studentId: string, score: number, feedback: string): boolean {
    const all = storageEngine.get<TeacherHomework[]>(STORAGE_KEYS.TEACHER_HOMEWORKS, []);
    const hw = all.find((h) => h.id === hwId);
    if (!hw) return false;
    const sub = hw.submissions.find((s) => s.studentId === studentId);
    if (!sub) return false;
    sub.score = score;
    sub.teacherFeedback = feedback;
    storageEngine.set(STORAGE_KEYS.TEACHER_HOMEWORKS, all);
    storageEngine.notifyDataChanged();
    return true;
  }

  // ============================================================
  // TEACHER MESSAGES
  // ============================================================

  public getTeacherMessages(userId: string): TeacherMessage[] {
    const all = storageEngine.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    return all.filter((m) => m.fromId === userId || m.toId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public sendTeacherMessage(msg: Omit<TeacherMessage, 'id' | 'isRead' | 'createdAt'>): TeacherMessage {
    const all = storageEngine.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    const newMsg: TeacherMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newMsg);
    // Keep max 500 messages
    if (all.length > 500) all.splice(500);
    storageEngine.set(STORAGE_KEYS.TEACHER_MESSAGES, all);

    // Sync into Student Group Chat if toId is a student
    const studentChats = storageEngine.get<Record<string, StudentGroupMessage[]>>(STORAGE_KEYS.STUDENT_GROUP_CHATS, {});
    const existingRoom = studentChats[msg.toId] || [];
    const syncedGroupMsg: StudentGroupMessage = {
      id: `gm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: msg.toId,
      senderId: msg.fromId,
      senderName: msg.fromName,
      senderRole: msg.fromRole === 'admin' ? 'admin' : 'teacher',
      senderBadge: msg.fromRole === 'admin' ? 'المشرف الأكاديمي العام' : 'معلم المادة',
      text: msg.text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    studentChats[msg.toId] = [...existingRoom, syncedGroupMsg];
    storageEngine.set(STORAGE_KEYS.STUDENT_GROUP_CHATS, studentChats);

    storageEngine.notifyDataChanged();
    return newMsg;
  }

  public markTeacherMessageRead(messageId: string): void {
    const all = storageEngine.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, []);
    const msg = all.find((m) => m.id === messageId);
    if (msg) {
      msg.isRead = true;
      storageEngine.set(STORAGE_KEYS.TEACHER_MESSAGES, all);
      storageEngine.notifyDataChanged();
    }
  }

  public getUnreadMessageCount(userId: string): number {
    return storageEngine.get<TeacherMessage[]>(STORAGE_KEYS.TEACHER_MESSAGES, [])
      .filter((m) => m.toId === userId && !m.isRead).length;
  }

  // ============================================================
  // TEACHER SCHEDULE
  // ============================================================

  public getTeacherSchedule(teacherId: string): TeacherScheduleSlot[] {
    return storageEngine.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, [])
      .filter((s) => s.teacherId === teacherId);
  }

  public saveScheduleSlot(slot: Omit<TeacherScheduleSlot, 'id'> & { id?: string }): TeacherScheduleSlot {
    const all = storageEngine.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, []);
    if (slot.id) {
      const idx = all.findIndex((s) => s.id === slot.id);
      if (idx !== -1) {
        all[idx] = slot as TeacherScheduleSlot;
        storageEngine.set(STORAGE_KEYS.TEACHER_SCHEDULE, all);
        storageEngine.notifyDataChanged();
        return all[idx];
      }
    }
    const newSlot: TeacherScheduleSlot = { ...slot, id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
    all.push(newSlot);
    storageEngine.set(STORAGE_KEYS.TEACHER_SCHEDULE, all);
    storageEngine.notifyDataChanged();
    return newSlot;
  }

  public deleteScheduleSlot(id: string): void {
    const all = storageEngine.get<TeacherScheduleSlot[]>(STORAGE_KEYS.TEACHER_SCHEDULE, []).filter((s) => s.id !== id);
    storageEngine.set(STORAGE_KEYS.TEACHER_SCHEDULE, all);
    storageEngine.notifyDataChanged();
  }

  // ============================================================
  // ATTENDANCE
  // ============================================================

  public getAttendanceRecords(teacherId: string, lessonId?: string): AttendanceRecord[] {
    const all = storageEngine.get<AttendanceRecord[]>(STORAGE_KEYS.TEACHER_ATTENDANCE, [])
      .filter((r) => r.teacherId === teacherId);
    if (lessonId) return all.filter((r) => r.lessonId === lessonId);
    return all;
  }

  public saveAttendanceRecord(record: Omit<AttendanceRecord, 'id'> & { id?: string }): AttendanceRecord {
    const all = storageEngine.get<AttendanceRecord[]>(STORAGE_KEYS.TEACHER_ATTENDANCE, []);
    if (record.id) {
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        all[idx] = record as AttendanceRecord;
        storageEngine.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all);
        storageEngine.notifyDataChanged();
        return all[idx];
      }
    }
    // Check if record for same lesson+date already exists
    const existingIdx = all.findIndex((r) => r.lessonId === record.lessonId && r.date === record.date && r.teacherId === record.teacherId);
    if (existingIdx !== -1) {
      all[existingIdx] = { ...all[existingIdx], ...record, id: all[existingIdx].id };
      storageEngine.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all);
      storageEngine.notifyDataChanged();
      return all[existingIdx];
    }
    const newRecord: AttendanceRecord = { ...record, id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
    all.unshift(newRecord);
    storageEngine.set(STORAGE_KEYS.TEACHER_ATTENDANCE, all);
    storageEngine.notifyDataChanged();
    return newRecord;
  }
}

export const teacherService = new TeacherService();
