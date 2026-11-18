// ==============================================================================
// KAWKAB TALTA E3DADI — CURRICULUM SERVICE
// Manages Subjects, Units, Lessons, Notes & Student Progress with Supabase sync.
// ==============================================================================

import type { Subject, Unit, Lesson, LessonProgress, LessonNote } from '../../types';
import { storageEngine, STORAGE_KEYS, generateUUID } from './storageEngine';
import { ensureUUID, isValidUUID, KNOWN_SUBJECT_UUIDS } from '../uuid';
import {
  sbSaveSubject,
  sbSaveLessonToCloud,
  sbDeleteLesson,
  sbSaveUnitToCloud,
  sbDeleteUnit,
  sbMarkLessonComplete,
} from '../supabaseDb';

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: '782537e8-0db9-47b7-9296-60d7a21f146e',
    slug: 'arabic',
    nameAr: 'اللغة العربية',
    description: 'شرح فروع النحو، القراءة، النصوص الأدبية، والقصة المقررة.',
    icon: 'Feather',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: '52f516bd-80b0-4294-9b92-56caf8d76ddb',
    slug: 'mathematics',
    nameAr: 'الرياضيات',
    description: 'الجبر والإحصاء، وحساب المثلثات والهندسة التحليلية.',
    icon: 'Calculator',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: 'b0d3c943-541f-42be-915f-ea47a2782f7c',
    slug: 'science',
    nameAr: 'العلوم',
    description: 'القوى والحركة، الطاقة الضوئية، الكون، والتكاثر واستمرار النوع.',
    icon: 'FlaskConical',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 3,
    isPublished: true,
  },
  {
    id: '2df71d70-c4a0-402b-b190-2624f32808e1',
    slug: 'islamic-studies',
    nameAr: 'التربية الدينية',
    description: 'القرآن الكريم، العقيدة، العبادات، والشخصيات الإسلامية.',
    icon: 'Moon',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 4,
    isPublished: true,
  },
  {
    id: '2935bf69-8442-4e99-82e0-bfdcee4c8cda',
    slug: 'art-education',
    nameAr: 'التربية الفنية',
    description: 'التراث الشعبي والقبطي، والتصميم الابتكاري والأشغال الفنية.',
    icon: 'Palette',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 5,
    isPublished: true,
  },
  {
    id: '3d5b8afd-03f1-4389-8fae-477b14b0b630',
    slug: 'english',
    nameAr: 'اللغة الإنجليزية',
    description: 'منهج New Hello! Prep 3: القواعد والكلمات والمحادثات.',
    icon: 'Languages',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 6,
    isPublished: true,
  },
  {
    id: '380e2983-5bff-4865-ae4c-82f044c9cfb0',
    slug: 'social-studies',
    nameAr: 'الدراسات الاجتماعية',
    description: 'جغرافية العالم الطبيعية وتاريخ مصر الحديث والمعاصر.',
    icon: 'Globe',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 7,
    isPublished: true,
  },
  {
    id: '97225f15-9565-42f6-a06e-a69d2fb8b1ac',
    slug: 'computer-it',
    nameAr: 'الحاسب وتكنولوجيا المعلومات',
    description: 'حل المشكلات وخرائط التدفق ولغة البرمجة Visual Basic.NET.',
    icon: 'Cpu',
    colorPrimary: '#06b6d4',
    colorSecondary: '#0284c7',
    orderIndex: 8,
    isPublished: true,
  },
];

export const INITIAL_UNITS: Unit[] = [
  {
    id: '528704a3-e7a2-4a4f-a170-292a9b8a32d2',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f146e',
    title: 'الوحدة الأولى: المشتقات وأعمالها الأدبية',
    orderIndex: 1,
    description: 'اسم الفاعل وصوغه، صيغ المبالغة، واسم المفعول وفق المنهج الوزاري المصري.',
  },
  {
    id: '64e6de64-4b40-41ab-a213-8eeae2083134',
    subjectId: 'b0d3c943-541f-42be-915f-ea47a2782f7c',
    title: 'الوحدة الأولى: القوى والحركة',
    orderIndex: 1,
    description: 'الحركة في اتجاه واحد، السرعة القياسية والمتجهة، التمثيل البياني للعجلة المنتظمة.',
  },
  {
    id: '78ee0491-793f-4e3f-80eb-9ae2c8605d7e',
    subjectId: '52f516bd-80b0-4294-9b92-56caf8d76ddb',
    title: 'الوحدة الأولى: العلاقات والدوال',
    orderIndex: 1,
    description: 'حاصل الضرب الديكارتي، العلاقات والدوال، ودوال كثيرات الحدود.',
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  {
    id: '1ce597cf-d445-4f2a-b408-a777a60518d8',
    unitId: '528704a3-e7a2-4a4f-a170-292a9b8a32d2',
    subjectId: '782537e8-0db9-47b7-9296-60d7a21f146e',
    title: 'اسم الفاعل وصوغه وإعماله',
    orderIndex: 1,
    teacherName: 'أ/ مصطفى عثمان',
    summary: 'شرح طريقة صوغ اسم الفاعل من الثلاثي وغير الثلاثي وشروط إعماله عمل فعله مع أمثلة إعرابية كاملة.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">مفهوم اسم الفاعل:</h3>
      <p class="text-sm leading-relaxed text-slate-200">اسم الفاعل هو اسم مشتق من حروف الفعل المبني للمعلوم ليدل على من قام بالفعل أو اتصف به.</p>
      <h4 class="text-sm font-bold text-amber-300">أولاً: صوغه من الثلاثي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">يُصاغ على وزن «فَاعِل» مثل: (كتب ➔ كاتب)، (جلس ➔ جالس). وإذا كان أجوف قلبت عينه همزة: (قال ➔ قائل)، (صام ➔ صائم).</p>
      <h4 class="text-sm font-bold text-purple-300">ثانياً: صوغه من غير الثلاثي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">يأتي على وزن مضارعه مع إبدال حرف المضارعة ميماً مضمومة وكسر ما قبل الآخر مثل: (انطلق ➔ يَنطَلِق ➔ مُنطَلِق)، (أكرم ➔ يُكرِم ➔ مُكرِم).</p>
      <h4 class="text-sm font-bold text-emerald-300">شروط الإعمال:</h4>
      <p class="text-sm leading-relaxed text-slate-300">المحلى بـ (أل) يعمل بلا شروط. أما المجرد منها فيشترط دلالته على الحال أو الاستقبال وأن يعتمد على: نفي، استفهام، مبتدأ، موصوف، أو نداء.</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    pdfUrl: 'https://example.com/arabic-lesson-1.pdf',
    durationMinutes: 25,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: '6a9ad0ed-a7dd-4426-8249-c52274eac5bb',
    unitId: '64e6de64-4b40-41ab-a213-8eeae2083134',
    subjectId: 'b0d3c943-541f-42be-915f-ea47a2782f7c',
    title: 'الحركة في اتجاه واحد والسرعة المنتظمة',
    orderIndex: 1,
    teacherName: 'أ/ محمد محمود',
    summary: 'مفهوم السرعة وعواملها، والفرق الدقيق بين السرعة المنتظمة والسرعة المتوسطة والنسبية.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">ما هي الحركة؟</h3>
      <p class="text-sm leading-relaxed text-slate-200">الحركة هي تغير موضع الجسم بمرور الزمن بالنسبة لموضع جسم آخر ثابت. وأبسط أنواع الحركة هي الحركة في اتجاه واحد وفي خط مستقيم مثل حركة القطار.</p>
      <h4 class="text-sm font-bold text-amber-300">قانون السرعة الأساسي:</h4>
      <p class="text-sm leading-relaxed text-slate-300">السرعة (ع) = المسافة (ف) ÷ الزمن (ز). وتقاس بوحدة (متر / ثانية) أو (كم / ساعة).</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    pdfUrl: 'https://example.com/science-lesson-1.pdf',
    durationMinutes: 20,
    isFreePreview: true,
    isPublished: true,
  },
  {
    id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380131',
    unitId: '78ee0491-793f-4e3f-80eb-9ae2c8605d7e',
    subjectId: '52f516bd-80b0-4294-9b92-56caf8d76ddb',
    title: 'حاصل الضرب الديكارتي',
    orderIndex: 1,
    teacherName: 'أ/ طارق أحمد',
    summary: 'الزوج المرتب وتساوي زوجين مرتبين، وحاصل الضرب الديكارتي لمجموعتين س × ص وتمثيله بالمخطط السهمي والبياني.',
    contentHtml: `<div class="space-y-4">
      <h3 class="text-base font-bold text-cyan-300">الزوج المرتب:</h3>
      <p class="text-sm leading-relaxed text-slate-200">الزوج المرتب (أ ، ب) يتكون من مسقط أول ومسقط ثانٍ.</p>
    </div>`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoType: 'youtube',
    durationMinutes: 30,
    isFreePreview: true,
    isPublished: true,
  },
];

export class CurriculumService {
  // ── SUBJECTS ─────────────────────────────────────────────────────────────
  public getSubjects(): Subject[] {
    const subs = storageEngine.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    const units = this.getUnits();
    const lessons = this.getLessons();
    return subs
      .map((s) => ({
        ...s,
        unitsCount: units.filter((u) => u.subjectId === s.id).length,
        lessonsCount: lessons.filter((l) => l.subjectId === s.id).length,
      }))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getSubjectById(idOrSlug: string): Subject | null {
    const subs = this.getSubjects();
    return subs.find((s) => s.id === idOrSlug || s.slug === idOrSlug) || null;
  }

  public saveSubject(subject: Partial<Subject>): Subject {
    const subs = storageEngine.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    if (subject.id) {
      const idx = subs.findIndex((s) => s.id === subject.id);
      if (idx !== -1) {
        subs[idx] = { ...subs[idx], ...subject } as Subject;
        storageEngine.set(STORAGE_KEYS.SUBJECTS, subs);
        storageEngine.notifyDataChanged();
        sbSaveSubject(subs[idx]).catch((e) => console.warn('[saveSubject] Cloud sync error:', e));
        return subs[idx];
      }
    }
    const newSubId =
      subject.id && isValidUUID(subject.id)
        ? subject.id
        : subject.slug && KNOWN_SUBJECT_UUIDS[subject.slug]
        ? KNOWN_SUBJECT_UUIDS[subject.slug]
        : generateUUID();

    const newSub: Subject = {
      id: newSubId,
      slug: subject.slug || `sub-${Date.now()}`,
      nameAr: subject.nameAr || 'مادة جديدة',
      description: subject.description || '',
      icon: subject.icon || 'BookOpen',
      colorPrimary: subject.colorPrimary || '#22d3ee',
      colorSecondary: subject.colorSecondary || '#0891b2',
      orderIndex: subs.length + 1,
      isPublished: subject.isPublished ?? true,
    };
    subs.push(newSub);
    storageEngine.set(STORAGE_KEYS.SUBJECTS, subs);
    storageEngine.notifyDataChanged();
    sbSaveSubject(newSub).catch((e) => console.warn('[saveSubject] Cloud sync error:', e));
    return newSub;
  }

  public deleteSubject(id: string): void {
    const subs = storageEngine.get<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS).filter((s) => s.id !== id);
    storageEngine.set(STORAGE_KEYS.SUBJECTS, subs);
    storageEngine.notifyDataChanged();
  }

  public syncSubjectsFromCloud(cloudSubjects: Subject[]): void {
    if (!cloudSubjects || cloudSubjects.length === 0) return;
    storageEngine.set(STORAGE_KEYS.SUBJECTS, cloudSubjects);
    storageEngine.notifyDataChanged();
  }

  // ── UNITS ────────────────────────────────────────────────────────────────
  public getUnits(subjectId?: string): Unit[] {
    const units = storageEngine.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
    if (subjectId) {
      return units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return units.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public saveUnit(unit: Partial<Unit>): Unit {
    const units = storageEngine.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS);
    if (unit.id) {
      const idx = units.findIndex((u) => u.id === unit.id);
      if (idx !== -1) {
        units[idx] = { ...units[idx], ...unit } as Unit;
        storageEngine.set(STORAGE_KEYS.UNITS, units);
        storageEngine.notifyDataChanged();
        sbSaveUnitToCloud(units[idx] as Unit).catch((e) => console.warn('[saveUnit] Cloud sync error:', e));
        return units[idx];
      }
    }
    const newUnitId = unit.id && isValidUUID(unit.id) ? unit.id : generateUUID();
    const newUnit: Unit = {
      id: newUnitId,
      subjectId: unit.subjectId ? ensureUUID(unit.subjectId) : '',
      title: unit.title || 'وحدة جديدة',
      orderIndex: units.length + 1,
      description: unit.description,
    };
    units.push(newUnit);
    storageEngine.set(STORAGE_KEYS.UNITS, units);
    storageEngine.notifyDataChanged();
    sbSaveUnitToCloud(newUnit).catch((e) => console.warn('[saveUnit] Cloud sync error:', e));
    return newUnit;
  }

  public deleteUnit(id: string): void {
    const units = storageEngine.get<Unit[]>(STORAGE_KEYS.UNITS, INITIAL_UNITS).filter((u) => u.id !== id);
    storageEngine.set(STORAGE_KEYS.UNITS, units);
    storageEngine.notifyDataChanged();
    sbDeleteUnit(id).catch((e) => console.warn('[deleteUnit] Cloud sync error:', e));
  }

  // ── LESSONS ──────────────────────────────────────────────────────────────
  public getLessons(subjectId?: string, unitId?: string): Lesson[] {
    let lessons = storageEngine.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    if (subjectId) lessons = lessons.filter((l) => l.subjectId === subjectId);
    if (unitId) lessons = lessons.filter((l) => l.unitId === unitId);
    return lessons.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public getLessonById(id: string): Lesson | null {
    const lessons = storageEngine.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    return lessons.find((l) => l.id === id) || null;
  }

  public saveLesson(lesson: Partial<Lesson>): Lesson {
    const lessons = storageEngine.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS);
    let targetLesson: Lesson;
    if (lesson.id) {
      const idx = lessons.findIndex((l) => l.id === lesson.id);
      if (idx !== -1) {
        lessons[idx] = { ...lessons[idx], ...lesson } as Lesson;
        targetLesson = lessons[idx];
      } else {
        targetLesson = lesson as Lesson;
        lessons.push(targetLesson);
      }
    } else {
      const newLessonId = generateUUID();
      targetLesson = {
        id: newLessonId,
        unitId: lesson.unitId || '',
        subjectId: lesson.subjectId ? ensureUUID(lesson.subjectId) : '',
        title: lesson.title || 'درس جديد',
        teacherName: lesson.teacherName || 'أستاذ المادة',
        orderIndex: lessons.length + 1,
        contentHtml: lesson.contentHtml || '',
        summary: lesson.summary,
        videoUrl: lesson.videoUrl,
        videoType: lesson.videoType || 'youtube',
        pdfUrl: lesson.pdfUrl,
        images: lesson.images || [],
        durationMinutes: lesson.durationMinutes || 20,
        isFreePreview: lesson.isFreePreview ?? false,
        isPublished: lesson.isPublished ?? true,
      };
      lessons.push(targetLesson);
    }

    storageEngine.set(STORAGE_KEYS.LESSONS, lessons);
    storageEngine.notifyDataChanged();

    sbSaveLessonToCloud(targetLesson)
      .then((ok) => {
        if (ok) {
          storageEngine.notifyDataChanged();
        }
      })
      .catch((e) => console.warn('[saveLesson] Cloud sync error:', e));

    return targetLesson;
  }

  public deleteLesson(id: string): void {
    const lessons = storageEngine.get<Lesson[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS).filter((l) => l.id !== id);
    storageEngine.set(STORAGE_KEYS.LESSONS, lessons);
    storageEngine.notifyDataChanged();
    sbDeleteLesson(id)
      .then(() => {
        storageEngine.notifyDataChanged();
      })
      .catch((e) => console.warn('[deleteLesson] Cloud sync error:', e));
  }

  public syncLessonsFromCloud(cloudLessons: Lesson[]): void {
    if (!cloudLessons || cloudLessons.length === 0) return;
    storageEngine.set(STORAGE_KEYS.LESSONS, cloudLessons);
    storageEngine.notifyDataChanged();
  }

  // ── PROGRESS & NOTES ─────────────────────────────────────────────────────
  public getLessonProgress(studentId: string, lessonId?: string): LessonProgress[] {
    const list = storageEngine.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    if (lessonId) {
      return list.filter((p) => p.studentId === studentId && p.lessonId === lessonId);
    }
    return list.filter((p) => p.studentId === studentId);
  }

  public isLessonCompleted(studentId: string, lessonId: string): boolean {
    const p = this.getLessonProgress(studentId, lessonId);
    return Boolean(p.length > 0 && p[0].completed);
  }

  public completeLesson(lessonId: string, studentId: string): void {
    const list = storageEngine.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    const existing = list.find((p) => p.studentId === studentId && p.lessonId === lessonId);
    if (existing) {
      existing.completed = true;
      existing.completedAt = new Date().toISOString();
    } else {
      list.push({
        id: `prog-${Date.now()}`,
        studentId,
        lessonId,
        completed: true,
        completedAt: new Date().toISOString(),
      });
    }
    storageEngine.set(STORAGE_KEYS.PROGRESS, list);
    storageEngine.notifyDataChanged();
  }

  public markLessonComplete(studentId: string, lessonId: string): LessonProgress {
    this.completeLesson(lessonId, studentId);
    const list = storageEngine.get<LessonProgress[]>(STORAGE_KEYS.PROGRESS, []);
    sbMarkLessonComplete(studentId, lessonId).catch(() => {});
    return list.find((p) => p.studentId === studentId && p.lessonId === lessonId)!;
  }

  public getLessonNote(lessonId: string, studentId: string): LessonNote | null {
    const notes = storageEngine.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    return notes.find((n) => n.studentId === studentId && n.lessonId === lessonId) || null;
  }

  public saveLessonNote(lessonId: string, studentId: string, content: string): LessonNote {
    const notes = storageEngine.get<LessonNote[]>(STORAGE_KEYS.NOTES, []);
    const idx = notes.findIndex((n) => n.studentId === studentId && n.lessonId === lessonId);
    if (idx !== -1) {
      notes[idx].content = content;
      notes[idx].updatedAt = new Date().toISOString();
      storageEngine.set(STORAGE_KEYS.NOTES, notes);
      storageEngine.notifyDataChanged();
      return notes[idx];
    }
    const newNote: LessonNote = {
      id: `note-${Date.now()}`,
      studentId,
      lessonId,
      content,
      updatedAt: new Date().toISOString(),
    };
    notes.push(newNote);
    storageEngine.set(STORAGE_KEYS.NOTES, notes);
    storageEngine.notifyDataChanged();
    return newNote;
  }
}

export const curriculumService = new CurriculumService();
