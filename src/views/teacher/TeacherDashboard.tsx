import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  Users,
  Search,
  Bot,
  Send,
  AlertCircle,
  Eye,
  ChevronLeft,
  LayoutGrid,
  ClipboardList,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Upload,
  ArrowRight,
  Filter,
  LogOut,
  MessageSquare,
  Bell,
  Calendar,
  BarChart2,
  ClipboardCheck,
  UserCheck,
  UserX,
  Download,
  TrendingUp,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Star,
  X,
  Layers,
  Loader2,
  ImageIcon,
  Pencil,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { generateQuestionsFromText, gradeEssayWithAi, generateLessonFlashcardsWithAi } from '../../services/aiService';
import { ExamAttempt, Question, Subject, Lesson, Examination, TeacherHomework, TeacherMessage, TeacherScheduleSlot, AttendanceRecord, Flashcard } from '../../types';
import { Navbar } from '../../components/Navbar';
import { sendBrowserNotification } from '../../services/notifications';
import { sbUploadLessonImage, sbDeleteLessonImage } from '../../services/supabaseDb';

interface TeacherDashboardProps {
  onNavigateToStudent?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigate?: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigateToStudent,
  onNavigateToAdmin,
  onNavigate,
}) => {
  const { user, logout } = useAuth();

  // STRICT SECURITY GUARD: Students cannot access teacher dashboard
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-3xl bg-[#0b1329] p-8 border border-rose-500/40 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl">
          ⛔
        </div>
        <h2 className="text-xl font-bold text-white font-alexandria">غير مصرح بالوصول (403 Forbidden)</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          لوحة المعلم مخصصة فقط للمشرفين والمعلمين المصرح لهم بتصحيح ومتابعة المواد الدراسية.
        </p>
      </div>
    );
  }

  // Active Tab state inside Teacher Dashboard
  const [activeTab, setActiveTab] = useState<'overview' | 'grading' | 'ai-bank' | 'lessons' | 'exams' | 'students' | 'reports' | 'homework' | 'messages' | 'schedule'>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Always reset scroll to top whenever the supervisor changes tab
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Live Database Queries
  const allSubjects = db.getSubjects();
  const assignments = db.getTeacherAssignments(user.id);
  const assignedSubjectIds = assignments.length > 0 ? assignments.map((a) => a.subjectId) : allSubjects.map((s) => s.id);
  const teacherSubjects = allSubjects.filter((s) => assignedSubjectIds.includes(s.id));

  const allLessons = db.getLessons();
  const teacherLessons = allLessons.filter((l) => assignedSubjectIds.includes(l.subjectId));

  const allExams = db.getExaminations();
  const teacherExams = allExams.filter((e) => assignedSubjectIds.includes(e.subjectId));

  const allAttempts = db.getExamAttempts();
  const teacherAttempts = allAttempts.filter((a) => {
    const exam = db.getExaminationById(a.examId);
    return exam && assignedSubjectIds.includes(exam.subjectId);
  });

  const pendingEssayAttempts = teacherAttempts.filter((a) => a.status === 'under_review');
  const gradedAttempts = teacherAttempts.filter((a) => a.status === 'graded');

  // --- TAB: Essay Grading Modal State ---
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [scoreInput, setScoreInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradingSuccessMsg, setGradingSuccessMsg] = useState(false);
  const [isAiGradingLoading, setIsAiGradingLoading] = useState(false);

  const handleOpenGrading = (attempt: ExamAttempt, questionId: string) => {
    setSelectedAttempt(attempt);
    setSelectedQuestionId(questionId);
    const existingAns = attempt.answers?.[questionId];
    setScoreInput(existingAns?.scoreAwarded || existingAns?.aiSuggestedScore || 0);
    setFeedbackInput(existingAns?.teacherFeedback || existingAns?.aiFeedback || '');
  };

  const handleAiAutoEvaluate = async (q: Question, studentAnsText: string) => {
    if (!q) return;
    setIsAiGradingLoading(true);
    try {
      const res = await gradeEssayWithAi(
        q.questionText,
        q.modelAnswer || 'نموذج الإجابة الوزاري القياسي',
        studentAnsText,
        q.points
      );
      setScoreInput(res.suggestedScore);
      setFeedbackInput(res.feedback);
    } finally {
      setIsAiGradingLoading(false);
    }
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAttempt || !selectedQuestionId) return;

    const updated = db.gradeEssaySubmission(
      selectedAttempt.id,
      selectedQuestionId,
      Number(scoreInput),
      feedbackInput || 'تم اعتماد النتيجة والتصحيح بنجاح من قبل المعلم.',
      user.id
    );

    if (updated) {
      setSelectedAttempt(updated);
      setGradingSuccessMsg(true);
      forceRefresh();
      setTimeout(() => {
        setGradingSuccessMsg(false);
        setSelectedAttempt(null);
      }, 1500);
    }
  };

  // --- TAB: AI Question Bank State ---
  const [aiSubjectId, setAiSubjectId] = useState<string>(teacherSubjects[0]?.id || 'sub-arabic');
  const [aiTopicTitle, setAiTopicTitle] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [aiQuestionType, setAiQuestionType] = useState<'all' | 'mcq' | 'essay' | 'fill_blank'>('all');
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);

  const handleGenerateAiQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSourceText.trim()) return;
    setAiLoading(true);
    setAiSaveSuccess(false);
    try {
      const sub = allSubjects.find((s) => s.id === aiSubjectId);
      const qs = await generateQuestionsFromText(aiSourceText, sub?.nameAr || 'المادة', aiQuestionType);
      setGeneratedQuestions(qs);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveGeneratedToExam = () => {
    if (generatedQuestions.length === 0) return;
    const sub = allSubjects.find((s) => s.id === aiSubjectId);
    const newExam = db.saveExamination({
      subjectId: aiSubjectId,
      subjectName: sub?.nameAr || 'المادة الدراسية',
      title: aiTopicTitle.trim() || `بنك أسئلة ذكي: ${sub?.nameAr || 'المادة'}`,
      description: 'تم توليد هذا الاختبار بواسطة المساعد الذكي للمعلم وفق المقرر الوزاري.',
      timeLimitMinutes: 15,
      passingPercentage: 60,
      randomizeQuestions: true,
      randomizeAnswers: true,
      antiCheatingTabSwitch: true,
      maxAttempts: 3,
      isPublished: true,
      allowsCertificate: true,
      examType: 'practice',
    });

    generatedQuestions.forEach((gq, idx) => {
      const qType = gq.questionType === 'essay' ? 'essay' : gq.questionType === 'fill_blank' ? 'fill_blank' : 'mcq';
      const choices = (gq.choices || []).map((c: any, cIdx: number) => {
        const text = typeof c === 'string' ? c : (c.choiceText || '');
        const isCorrect = typeof c === 'string' ? (cIdx === gq.correctAnswerIndex) : Boolean(c.isCorrect);
        return {
          id: `c-${Date.now()}-${idx}-${cIdx}`,
          questionId: '',
          choiceText: text,
          isCorrect,
          orderIndex: cIdx + 1,
        };
      });

      db.saveQuestion({
        examId: newExam.id,
        questionText: gq.questionText,
        questionType: qType,
        points: gq.points || (qType === 'essay' ? 5 : 2),
        orderIndex: idx + 1,
        explanation: gq.explanation || '',
        modelAnswer: gq.modelAnswer || '',
        choices,
      });
    });

    setAiSaveSuccess(true);
    forceRefresh();
    setTimeout(() => {
      setAiSaveSuccess(false);
      setGeneratedQuestions([]);
      setAiSourceText('');
      setAiTopicTitle('');
    }, 4000);
  };

  // --- TAB: Lessons Management State & AI Flashcard Generation ---
  const [newLessonSubId, setNewLessonSubId] = useState(teacherSubjects[0]?.id || 'sub-arabic');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonVideo, setNewLessonVideo] = useState('');
  const [newLessonPdf, setNewLessonPdf] = useState('');
  const [newLessonContent, setNewLessonContent] = useState('');
  const [newLessonSummary, setNewLessonSummary] = useState('');
  const [newLessonImages, setNewLessonImages] = useState<string[]>([]);
  const [isUploadingTeacherLessonImages, setIsUploadingTeacherLessonImages] = useState(false);
  const [autoGenCardsOnAdd, setAutoGenCardsOnAdd] = useState(true);

  const handleTeacherLessonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingTeacherLessonImages(true);
    try {
      for (const file of Array.from(files)) {
        const { url, error } = await sbUploadLessonImage(file);
        if (error) {
          alert(`تعذر رفع الصورة (${file.name}): ${error}`);
        } else if (url) {
          setNewLessonImages((prev) => [...prev, url]);
        }
      }
    } finally {
      setIsUploadingTeacherLessonImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveTeacherLessonImage = async (idx: number) => {
    const targetUrl = newLessonImages[idx];
    setNewLessonImages((prev) => prev.filter((_, i) => i !== idx));
    if (targetUrl) {
      await sbDeleteLessonImage(targetUrl);
    }
  };

  // AI Flashcards Modal & Generation State
  const [activeGeneratingLessonId, setActiveGeneratingLessonId] = useState<string | null>(null);
  const [flashcardModalLesson, setFlashcardModalLesson] = useState<Lesson | null>(null);
  const [previewCards, setPreviewCards] = useState<Array<{ front: string; back: string }>>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [savedSuccessFlashcards, setSavedSuccessFlashcards] = useState(false);

  // Batch AI Essay Grading State
  const [isBatchGrading, setIsBatchGrading] = useState(false);
  const [batchGradingProgress, setBatchGradingProgress] = useState({ current: 0, total: 0 });

  const handleBatchAiGrading = async () => {
    if (pendingEssayAttempts.length === 0 || isBatchGrading) return;
    setIsBatchGrading(true);
    let totalGraded = 0;
    try {
      for (let i = 0; i < pendingEssayAttempts.length; i++) {
        const attempt = pendingEssayAttempts[i];
        const questions = db.getQuestionsByExam(attempt.examId);
        const essayQs = questions.filter((q) => q.questionType === 'essay');

        for (const eq of essayQs) {
          const studentAnsText = attempt.answers?.[eq.id]?.essayAnswerText || '';
          const res = await gradeEssayWithAi(
            eq.questionText,
            eq.modelAnswer || 'نموذج الإجابة الوزاري القياسي',
            studentAnsText,
            eq.points
          );
          db.gradeEssaySubmission(
            attempt.id,
            eq.id,
            res.score,
            res.feedback,
            'المصحح الذكي (Gemini AI)'
          );
          totalGraded++;
        }
        setBatchGradingProgress({ current: i + 1, total: pendingEssayAttempts.length });
      }
      forceRefresh();
      alert(`تم الانتهاء بنجاح! تم تصحيح ${totalGraded} إجابة مقالية بالذكاء الاصطناعي واحتساب الدرجات وحفظ الملاحظات للطلاب.`);
    } catch (err) {
      console.error('Batch grading error:', err);
      alert('حدث خطأ أثناء التصحيح التلقائي، تم حفظ ما تم تصحيحه.');
    } finally {
      setIsBatchGrading(false);
      setBatchGradingProgress({ current: 0, total: 0 });
    }
  };

  const handleOpenFlashcardGenerator = async (lesson: Lesson) => {
    const sub = allSubjects.find((s) => s.id === lesson.subjectId);
    setFlashcardModalLesson(lesson);
    setIsGeneratingFlashcards(true);
    setActiveGeneratingLessonId(lesson.id);
    setSavedSuccessFlashcards(false);
    try {
      const lessonText = `${lesson.title}\n${lesson.summary || ''}\n${lesson.contentHtml?.replace(/<[^>]+>/g, ' ') || ''}`;
      const cards = await generateLessonFlashcardsWithAi(
        lesson.title,
        lessonText,
        sub?.nameAr || 'المادة'
      );
      setPreviewCards(cards);
    } catch (err) {
      console.error('Flashcards generation error:', err);
      alert('تعذر استخراج الفلاش كاردز تلقائياً. تأكد من إدخال نص كافي للدرس وحاول مجدداً.');
    } finally {
      setIsGeneratingFlashcards(false);
      setActiveGeneratingLessonId(null);
    }
  };

  const handleSaveGeneratedFlashcards = () => {
    if (!flashcardModalLesson || previewCards.length === 0) return;
    const cardsToSave: Flashcard[] = previewCards.map((c, i) => ({
      id: `fc_${flashcardModalLesson.id}_${Date.now()}_${i}`,
      subjectId: flashcardModalLesson.subjectId,
      lessonId: flashcardModalLesson.id,
      front: c.front.trim(),
      back: c.back.trim(),
      createdBy: 'ai',
      createdAt: new Date().toISOString(),
    }));

    db.saveFlashcards(cardsToSave);
    setSavedSuccessFlashcards(true);
    setTimeout(() => {
      setSavedSuccessFlashcards(false);
      setFlashcardModalLesson(null);
      setPreviewCards([]);
    }, 1500);
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    const saved = db.saveLesson({
      subjectId: newLessonSubId,
      title: newLessonTitle.trim(),
      teacherName: user.fullName,
      videoUrl: newLessonVideo.trim() || undefined,
      videoType: 'youtube',
      pdfUrl: newLessonPdf.trim() || undefined,
      images: newLessonImages,
      contentHtml: newLessonContent.trim() ? `<p>${newLessonContent.trim().replace(/\n/g, '<br/>')}</p>` : '<p>محتوى الدرس قيد التحديث...</p>',
      summary: newLessonSummary.trim() || undefined,
      isPublished: true,
      isFreePreview: true,
    });

    // Auto-generate flashcards if enabled
    if (autoGenCardsOnAdd && (newLessonContent.trim() || newLessonSummary.trim())) {
      const sub = allSubjects.find((s) => s.id === newLessonSubId);
      try {
        const generated = await generateLessonFlashcardsWithAi(
          saved.title,
          `${saved.title}\n${newLessonSummary}\n${newLessonContent}`,
          sub?.nameAr || 'المادة'
        );
        if (generated.length > 0) {
          const flashcards: Flashcard[] = generated.map((c, i) => ({
            id: `fc_${saved.id}_${Date.now()}_${i}`,
            subjectId: saved.subjectId,
            lessonId: saved.id,
            front: c.front,
            back: c.back,
            createdBy: 'ai',
            createdAt: new Date().toISOString(),
          }));
          db.saveFlashcards(flashcards);
        }
      } catch (err) {
        console.warn('Auto flashcards on add lesson:', err);
      }
    }

    setNewLessonTitle('');
    setNewLessonVideo('');
    setNewLessonPdf('');
    setNewLessonContent('');
    setNewLessonSummary('');
    setNewLessonImages([]);
    forceRefresh();
    alert('تم حفظ ونشر الدرس وتوليد الفلاش كاردز بنجاح للطلاب! 🎉');
  };

  const handleDeleteLesson = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
      db.deleteLesson(id);
      forceRefresh();
    }
  };

  // --- TAB: Lesson Edit & Student Notification State ---
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonSubId, setEditLessonSubId] = useState('');
  const [editLessonVideo, setEditLessonVideo] = useState('');
  const [editLessonPdf, setEditLessonPdf] = useState('');
  const [editLessonSummary, setEditLessonSummary] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');
  const [editLessonDuration, setEditLessonDuration] = useState(20);
  const [editLessonImages, setEditLessonImages] = useState<string[]>([]);
  const [isUploadingTeacherEditImages, setIsUploadingTeacherEditImages] = useState(false);

  const handleTeacherEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingTeacherEditImages(true);
    try {
      for (const file of Array.from(files)) {
        const { url, error } = await sbUploadLessonImage(file);
        if (error) {
          alert(`تعذر رفع الصورة (${file.name}): ${error}`);
        } else if (url) {
          setEditLessonImages((prev) => [...prev, url]);
        }
      }
    } finally {
      setIsUploadingTeacherEditImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveTeacherEditImage = async (idx: number) => {
    const targetUrl = editLessonImages[idx];
    setEditLessonImages((prev) => prev.filter((_, i) => i !== idx));
    if (targetUrl) {
      await sbDeleteLessonImage(targetUrl);
    }
  };

  const handleStartEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonSubId(lesson.subjectId);
    setEditLessonVideo(lesson.videoUrl || '');
    setEditLessonPdf(lesson.pdfUrl || '');
    setEditLessonSummary(lesson.summary || '');
    setEditLessonContent(lesson.contentHtml?.replace(/<[^>]+>/g, '') || '');
    setEditLessonDuration(lesson.durationMinutes || 20);
    setEditLessonImages(lesson.images || []);
  };

  const handleSaveLessonEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editLessonTitle.trim()) return;

    const targetSub = allSubjects.find((s) => s.id === (editLessonSubId || editingLesson.subjectId));

    const updated = db.saveLesson({
      id: editingLesson.id,
      subjectId: editLessonSubId || editingLesson.subjectId,
      title: editLessonTitle.trim(),
      teacherName: user.fullName,
      videoUrl: editLessonVideo.trim() || undefined,
      videoType: 'youtube',
      pdfUrl: editLessonPdf.trim() || undefined,
      images: editLessonImages,
      summary: editLessonSummary.trim() || undefined,
      contentHtml: editLessonContent.trim()
        ? `<p>${editLessonContent.trim().replace(/\n/g, '<br/>')}</p>`
        : editingLesson.contentHtml,
      durationMinutes: Number(editLessonDuration) || 20,
    });

    // Notify all students in the platform
    const allStudentsList = db.getProfiles().filter((p) => p.role === 'student');
    allStudentsList.forEach((s) => {
      db.createNotification({
        userId: s.id,
        title: `تعديل درس: ${updated.title} 📚`,
        message: `قام المعلم ${user.fullName} بتحديث محتوى وشرح درس "${updated.title}" في مادة ${targetSub?.nameAr || 'المادة'}. اطّلع على الجديد الآن!`,
        type: 'info',
        linkUrl: `/lesson/${updated.id}`,
      });
    });

    sendBrowserNotification(
      'تحديث محتوى دراسي 📚',
      `قام المعلم ${user.fullName} بتحديث درس "${updated.title}" في مادة ${targetSub?.nameAr || 'المادة'}`
    );

    alert(`تم تحديث الدرس بنجاح وإرسال إشعار فوري لجميع الطلاب! 🔔`);
    setEditingLesson(null);
    forceRefresh();
  };

  // --- TAB: Exams Management State (Mirrors Admin with 3 Question Types + Image Support) ---
  interface TeacherExamQuestionItem {
    text: string;
    type: 'mcq' | 'fill_blank' | 'essay';
    choices: string[];
    correctIdx: number;
    correctBlankAnswer?: string;
    modelAnswer?: string;
    imageUrl?: string;
    points: number;
  }

  const [newExamSubId, setNewExamSubId] = useState(teacherSubjects[0]?.id || 'sub-arabic');
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('15');
  const [newExamPassing, setNewExamPassing] = useState('60');
  const [newExamAntiTab, setNewExamAntiTab] = useState(true);
  const [newExamRandomize, setNewExamRandomize] = useState(true);

  // AI Exam Bank Generation inside Exams tab (Matching Admin)
  const [teacherAiExamSubjectId, setTeacherAiExamSubjectId] = useState(teacherSubjects[0]?.id || 'sub-arabic');
  const [teacherAiExamBankTitle, setTeacherAiExamBankTitle] = useState('');
  const [teacherAiExamArticleText, setTeacherAiExamArticleText] = useState('');
  const [teacherAiExamGenerating, setTeacherAiExamGenerating] = useState(false);
  const [teacherAiExamSuccessMsg, setTeacherAiExamSuccessMsg] = useState('');

  const [newExamQuestions, setNewExamQuestions] = useState<TeacherExamQuestionItem[]>([
    { text: '', type: 'mcq', choices: ['', '', '', ''], correctIdx: 0, points: 5 },
  ]);

  const handleQuestionImageUpload = (qIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setNewExamQuestions((prev) =>
        prev.map((item, i) => (i === qIdx ? { ...item, imageUrl: dataUrl } : item))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleTeacherGenerateAiExamBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherAiExamArticleText.trim()) {
      alert('يرجى لصق نص أو ملزمة لتحليلها بالذكاء الاصطناعي.');
      return;
    }
    setTeacherAiExamGenerating(true);
    setTeacherAiExamSuccessMsg('');
    try {
      const sub = allSubjects.find((s) => s.id === teacherAiExamSubjectId);
      const generated = await generateQuestionsFromText(
        teacherAiExamArticleText,
        sub?.nameAr || 'المادة'
      );
      if (generated && generated.length > 0) {
        const exam = db.saveExamination({
          subjectId: teacherAiExamSubjectId,
          subjectName: sub?.nameAr || 'المادة',
          title: teacherAiExamBankTitle.trim() || `بنك أسئلة ذكي — ${sub?.nameAr}`,
          description: `تم توليده آلياً بواسطة الذكاء الاصطناعي للمشرف ${user.fullName}`,
          timeLimitMinutes: 15,
          passingPercentage: 60,
          randomizeQuestions: true,
          randomizeAnswers: true,
          antiCheatingTabSwitch: true,
          maxAttempts: 3,
          isPublished: true,
          allowsCertificate: true,
          examType: 'official',
        });

        generated.forEach((gq: any, idx: number) => {
          db.saveQuestion({
            examId: exam.id,
            questionText: gq.questionText,
            questionType: gq.questionType === 'essay' ? 'essay' : 'mcq',
            points: gq.points || 5,
            orderIndex: idx + 1,
            explanation: gq.explanation || '',
            modelAnswer: gq.modelAnswer || '',
            choices: (gq.choices || []).map((c: any, cIdx: number) => ({
              id: `c-${Date.now()}-${idx}-${cIdx}`,
              questionId: '',
              choiceText: typeof c === 'string' ? c : (c.choiceText || ''),
              isCorrect: typeof c === 'string' ? (cIdx === gq.correctAnswerIndex) : (c.isCorrect ?? false),
              orderIndex: cIdx + 1,
            })),
          });
        });

        setTeacherAiExamSuccessMsg(`تم توليد وحفظ ${generated.length} أسئلة بنجاح في بنك أسئلة الاختبارات! 🎉`);
        setTeacherAiExamArticleText('');
        setTeacherAiExamBankTitle('');
        forceRefresh();
        setTimeout(() => setTeacherAiExamSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('AI question generation error:', err);
      alert('تعذر استخراج الأسئلة. تأكد من أن النص كافٍ وحاول مجدداً.');
    } finally {
      setTeacherAiExamGenerating(false);
    }
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const sub = allSubjects.find((s) => s.id === newExamSubId);
    const parsedDuration = Math.min(60, Math.max(1, parseInt(newExamDuration) || 15));

    const exam = db.saveExamination({
      subjectId: newExamSubId,
      subjectName: sub?.nameAr || 'المادة',
      title: newExamTitle.trim(),
      description: `اختبار مقدم من ${user.fullName}`,
      timeLimitMinutes: parsedDuration,
      passingPercentage: parseInt(newExamPassing) || 60,
      randomizeQuestions: newExamRandomize,
      randomizeAnswers: newExamRandomize,
      antiCheatingTabSwitch: newExamAntiTab,
      maxAttempts: 3,
      isPublished: true,
      allowsCertificate: true,
      examType: 'official',
    });

    newExamQuestions.forEach((q, idx) => {
      if (!q.text.trim()) return;
      if (q.type === 'essay') {
        db.saveQuestion({
          examId: exam.id,
          questionText: q.text.trim(),
          questionType: 'essay',
          points: q.points || 10,
          orderIndex: idx + 1,
          imageUrl: q.imageUrl || undefined,
          modelAnswer: q.modelAnswer?.trim() || 'نموذج الإجابة الوزاري القياسي',
        });
      } else if (q.type === 'fill_blank') {
        db.saveQuestion({
          examId: exam.id,
          questionText: q.text.trim(),
          questionType: 'fill_blank',
          points: q.points || 5,
          orderIndex: idx + 1,
          imageUrl: q.imageUrl || undefined,
          correctBlankAnswer: q.correctBlankAnswer?.trim() || '',
          modelAnswer: q.correctBlankAnswer?.trim() || '',
        });
      } else {
        db.saveQuestion({
          examId: exam.id,
          questionText: q.text.trim(),
          questionType: 'mcq',
          points: q.points || 5,
          orderIndex: idx + 1,
          imageUrl: q.imageUrl || undefined,
          choices: q.choices.map((cText, cIdx) => ({
            id: `c-${Date.now()}-${idx}-${cIdx}`,
            questionId: '',
            choiceText: cText.trim() || `خيار ${cIdx + 1}`,
            isCorrect: cIdx === q.correctIdx,
            orderIndex: cIdx + 1,
          })),
        });
      }
    });

    setNewExamTitle('');
    setNewExamQuestions([{ text: '', type: 'mcq', choices: ['', '', '', ''], correctIdx: 0, points: 5 }]);
    forceRefresh();
    alert('تم حفظ الاختبار والأسئلة بنجاح! 🎉');
  };

  const handleDeleteExam = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
      db.deleteExamination(id);
      forceRefresh();
    }
  };

  // --- TAB: Student Attempts View State ---
  const [selectedAttemptForView, setSelectedAttemptForView] = useState<ExamAttempt | null>(null);

  // --- NEW FEATURES STATE ---

  // Homework
  const homeworks = db.getTeacherHomeworks(user.id);
  const [hwSubjectId, setHwSubjectId] = useState(teacherSubjects[0]?.id || 'sub-arabic');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwMaxScore, setHwMaxScore] = useState('10');
  const [selectedHwForGrade, setSelectedHwForGrade] = useState<TeacherHomework | null>(null);
  const [hwGradeStudentId, setHwGradeStudentId] = useState('');
  const [hwGradeScore, setHwGradeScore] = useState(0);
  const [hwGradeFeedback, setHwGradeFeedback] = useState('');

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;
    const sub = teacherSubjects.find((s) => s.id === hwSubjectId);
    db.saveTeacherHomework({
      teacherId: user.id,
      subjectId: hwSubjectId,
      subjectName: sub?.nameAr || 'المادة',
      title: hwTitle.trim(),
      description: hwDescription.trim(),
      deadlineAt: hwDeadline ? new Date(hwDeadline).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: parseInt(hwMaxScore) || 10,
    });
    setHwTitle(''); setHwDescription(''); setHwDeadline(''); setHwMaxScore('10');
    forceRefresh();
    alert('تم نشر الواجب المنزلي للطلاب بنجاح! 🎉');
  };

  const handleSaveHwGrade = () => {
    if (!selectedHwForGrade || !hwGradeStudentId) return;
    db.gradeHomeworkSubmission(selectedHwForGrade.id, hwGradeStudentId, hwGradeScore, hwGradeFeedback);
    setSelectedHwForGrade(null);
    setHwGradeStudentId('');
    setHwGradeScore(0);
    setHwGradeFeedback('');
    forceRefresh();
  };

  // Messages
  const allStudents = db.getProfiles().filter((p) => p.role === 'student');
  const [messages, setMessages] = useState(() => db.getTeacherMessages(user.id));
  const [msgToId, setMsgToId] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgConversationWith, setMsgConversationWith] = useState<string | null>(null);
  const reloadMessages = () => setMessages(db.getTeacherMessages(user.id));
  const conversationMessages = msgConversationWith
    ? messages.filter((m) => m.fromId === msgConversationWith || m.toId === msgConversationWith)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];
  const unreadCount = db.getUnreadMessageCount(user.id);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const toStudent = allStudents.find((s) => s.id === (msgConversationWith || msgToId));
    if (!toStudent || !msgText.trim()) return;
    db.sendTeacherMessage({
      fromId: user.id,
      fromName: user.fullName,
      fromRole: user.role,
      toId: toStudent.id,
      toName: toStudent.fullName,
      text: msgText.trim(),
    });
    setMsgText('');
    reloadMessages();
  };

  // Schedule
  const [schedule, setSchedule] = useState(() => db.getTeacherSchedule(user.id));
  const reloadSchedule = () => setSchedule(db.getTeacherSchedule(user.id));
  const [slotDay, setSlotDay] = useState<number>(0);
  const [slotStart, setSlotStart] = useState('08:00');
  const [slotEnd, setSlotEnd] = useState('09:00');
  const [slotSubject, setSlotSubject] = useState(teacherSubjects[0]?.nameAr || '');
  const [slotTitle, setSlotTitle] = useState('');
  const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveScheduleSlot({
      teacherId: user.id,
      dayOfWeek: slotDay as any,
      startTime: slotStart,
      endTime: slotEnd,
      subjectName: slotSubject,
      title: slotTitle || slotSubject,
    });
    setSlotTitle('');
    reloadSchedule();
  };

  // Export CSV helper
  const exportCSV = (data: string[][], filename: string) => {
    const bom = '\uFEFF'; // UTF-8 BOM for Arabic in Excel
    const csv = bom + data.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportStudentResults = () => {
    const header = ['اسم الطالب', 'المادة', 'الاختبار', 'الدرجة', 'أعلى درجة', 'النسبة%', 'النتيجة', 'التاريخ'];
    const rows = teacherAttempts.map((a) => [
      a.studentName || '',
      a.subjectName || '',
      a.examTitle || '',
      String(a.totalScore),
      String(a.maxScore),
      String(a.percentage),
      a.passed ? 'ناجح' : 'راسب',
      a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('ar-EG') : '',
    ]);
    exportCSV([header, ...rows], `نتائج_الطلاب_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`);
  };

  // Teacher Navigation Tabs List
  const navTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutGrid, count: 0 },
    { id: 'grading', label: 'تصحيح المقالي', icon: FileCheck, count: pendingEssayAttempts.length },
    { id: 'ai-bank', label: 'بنك الأسئلة AI', icon: Bot, count: 0 },
    { id: 'lessons', label: 'إدارة الدروس', icon: BookOpen, count: teacherLessons.length },
    { id: 'exams', label: 'الاختبارات', icon: ClipboardList, count: teacherExams.length },
    { id: 'homework', label: 'الواجبات المنزلية', icon: CheckSquare, count: homeworks.length },
    { id: 'students', label: 'متابعة الطلاب', icon: Users, count: teacherAttempts.length },
    { id: 'reports', label: 'التقارير والإحصائيات', icon: BarChart2, count: 0 },
    { id: 'messages', label: 'الرسائل', icon: MessageSquare, count: unreadCount },
    { id: 'schedule', label: 'جدول الحصص', icon: Calendar, count: 0 },
  ];

  return (
    <div className="w-full flex-1 flex min-h-screen">

      {/* =====================================================
          MOBILE DRAWER OVERLAY (shown when mobileDrawerOpen)
          ===================================================== */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* MOBILE DRAWER PANEL — slides up from bottom */}
      <div className={`fixed bottom-0 inset-x-0 z-50 md:hidden transition-transform duration-300 ease-out ${
        mobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="bg-[#080d1a] border-t border-purple-500/30 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xl">👨‍🏫</span>
              <div>
                <div className="text-xs font-bold text-white">لوحة المشرف</div>
                <div className="text-[10px] text-purple-300">{user.fullName.split(' ')[0]}</div>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items Grid */}
          <div className="p-3 grid grid-cols-3 gap-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setMobileDrawerOpen(false);
                    window.scrollTo(0, 0);
                  }}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all ${
                    isActive
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-md'
                      : 'text-slate-400 bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {tab.count}
                    </span>
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-bold leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="px-4 pb-5 pt-2 flex flex-col gap-2 border-t border-slate-800 mt-1">
            {onNavigateToStudent && (
              <button
                onClick={() => { onNavigateToStudent(); setMobileDrawerOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 transition-all"
              >
                <span>معاينة واجهة الطالب ↩</span>
              </button>
            )}
            {user.role === 'admin' && onNavigateToAdmin && (
              <button
                onClick={() => { onNavigateToAdmin(); setMobileDrawerOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>لوحة الإدارة</span>
              </button>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          1. DESKTOP SIDEBAR (hidden on mobile)
          ===================================================== */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col justify-between bg-[#080d1a]/95 backdrop-blur-xl border-l border-purple-500/20 h-screen sticky top-0 z-30 shadow-2xl p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Teacher Branding */}
          <div className="flex items-center gap-3 px-2 pt-2 border-b border-purple-500/20 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 text-white font-black text-xl">
              👨‍🏫
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">لوحة تحكم المعلم</div>
              <div className="text-[11px] text-purple-300 flex items-center gap-1 font-bold mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">{user.fullName.split(' ')[0]} (مشرف أكاديمي)</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/30 via-indigo-600/25 to-purple-600/15 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                      tab.id === 'grading'
                        ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 animate-pulse'
                        : 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Switch to Student or Admin or Logout */}
        <div className="pt-4 border-t border-purple-500/20 px-2 space-y-2">
          {user.role === 'admin' && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>لوحة الإدارة العامة</span>
            </button>
          )}

          {onNavigateToStudent && (
            <button
              onClick={onNavigateToStudent}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all shadow-sm"
            >
              <span>معاينة واجهة الطالب</span>
              <span>↩</span>
            </button>
          )}

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          2. MAIN CONTENT AREA
          ===================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile Top Bar — shows current tab name + menu button */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#080d1a]/97 backdrop-blur-xl border-b border-purple-500/20 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👨‍🏫</span>
            <div>
              <div className="text-xs font-bold text-white">
                {navTabs.find(t => t.id === activeTab)?.label || 'لوحة المشرف'}
              </div>
              <div className="text-[10px] text-purple-300">{user.fullName.split(' ')[0]}</div>
            </div>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all hover:bg-purple-600/30"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>القائمة</span>
            {navTabs.reduce((s, t) => s + t.count, 0) > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {navTabs.reduce((s, t) => s + t.count, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Navbar */}
        <div className="hidden md:block">
          <Navbar onNavigate={onNavigate || (() => {})} onOpenMobileSidebar={() => {}} />
        </div>

        <main className="teacher-content-area flex-1 p-3 sm:p-4 lg:p-8 pb-6">
        <div key={activeTab} className="animate-page-in w-full space-y-6 max-w-6xl mx-auto">
          
          {/* ============================================================ */}
          {/* TAB 1: نظرة عامة والمهام الأكاديمية */}
          {/* ============================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top Welcome Banner (Shown only on overview) */}
              <div className="rounded-3xl p-6 sm:p-8 border border-purple-500/30 shadow-xl relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>لوحة تحكم المعلم والمشرف الأكاديمي</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white font-alexandria">
                      أهلاً بك يا {user.fullName} 👨‍🏫
                    </h1>
                    <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                      <span>المواد المسندة إليك:</span>
                      <span className="font-bold text-cyan-300">
                        {teacherSubjects.map((s) => s.nameAr).join(' ، ') || 'جميع المواد الدراسية'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-purple-500/30 text-center shadow-lg">
                      <span className="text-[10px] text-slate-400 block font-medium">إجابات بانتظار تصحيحك</span>
                      <span className="text-2xl font-black text-rose-400 font-mono">
                        {pendingEssayAttempts.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2 shadow-md">
                  <FileCheck className="w-6 h-6 mx-auto text-rose-400" />
                  <div className="text-2xl font-black text-white font-mono">{pendingEssayAttempts.length}</div>
                  <div className="text-xs text-slate-400">إجابات بانتظار التصحيح</div>
                </div>

                <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2 shadow-md">
                  <BookOpen className="w-6 h-6 mx-auto text-cyan-400" />
                  <div className="text-2xl font-black text-white font-mono">{teacherLessons.length}</div>
                  <div className="text-xs text-slate-400">الدروس المنشورة</div>
                </div>

                <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2 shadow-md">
                  <ClipboardList className="w-6 h-6 mx-auto text-purple-400" />
                  <div className="text-2xl font-black text-white font-mono">{teacherExams.length}</div>
                  <div className="text-xs text-slate-400">الاختبارات الفعالة</div>
                </div>

                <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2 shadow-md">
                  <Users className="w-6 h-6 mx-auto text-emerald-400" />
                  <div className="text-2xl font-black text-white font-mono">{teacherAttempts.length}</div>
                  <div className="text-xs text-slate-400">محاولات الطلاب المكتملة</div>
                </div>
              </div>

              {/* Action Quick-Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setActiveTab('grading')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/30 to-purple-950/30 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300">
                      <FileCheck className="w-5 h-5" />
                    </span>
                    <span className="text-xs text-rose-400 font-bold flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                      <span>ابدأ الآن</span>
                      <span>←</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">تصحيح المقالي بالذكاء الاصطناعي</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    مراجعة إجابات الطلاب المحررة، مقارنتها بالنموذج الوزاري، واعتماد الدرجة بنقرة زر.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('ai-bank')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300">
                      <Bot className="w-5 h-5" />
                    </span>
                    <span className="text-xs text-indigo-400 font-bold flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                      <span>توليد</span>
                      <span>←</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">بنك الأسئلة بالذكاء الاصطناعي</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    انسخ أي فقرة من المذكرة أو الكتاب المدرسي لتوليد أسئلة اختيار من متعدد ومقالي فوراً.
                  </p>
                </div>

                <div
                  onClick={() => setActiveTab('lessons')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 hover:border-cyan-500/60 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <span className="text-xs text-cyan-400 font-bold flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                      <span>إضافة</span>
                      <span>←</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">إضافة درس ومذكرة PDF</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    نشر دروس جديدة مع روابط يوتيوب ومذكرات وملخصات لطلاب تالتة إعدادي.
                  </p>
                </div>
              </div>

              {/* Assigned Subjects Summary */}
              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="font-bold text-base text-white">المواد الدراسية المسندة لسيادتكم ({teacherSubjects.length})</h2>
                  <span className="text-xs text-cyan-400">العام الدراسي 2026/2027</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teacherSubjects.map((sub) => {
                    const subLessons = teacherLessons.filter((l) => l.subjectId === sub.id);
                    const subExams = teacherExams.filter((e) => e.subjectId === sub.id);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-white">{sub.nameAr}</h4>
                          <span className="text-[11px] text-slate-400 block">
                            {subLessons.length} دروس • {subExams.length} اختبارات
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setNewLessonSubId(sub.id);
                            setActiveTab('lessons');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition-all"
                        >
                          إدارة الدروس
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: تصحيح الأسئلة المقالية بالذكاء الاصطناعي */}
          {/* ============================================================ */}
          {activeTab === 'grading' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white font-alexandria">
                    تصحيح الأسئلة المقالية للطلاب ✍️
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    تصحيح الإجابات المقالية بدعم الذكاء الاصطناعي ومطابقتها بنموذج الإجابة الوزاري واعتماد الدرجات
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {pendingEssayAttempts.length > 0 && (
                    <button
                      onClick={handleBatchAiGrading}
                      disabled={isBatchGrading}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                    >
                      {isBatchGrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                          <span>جاري التصحيح {batchGradingProgress.current} من {batchGradingProgress.total}...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-purple-300" />
                          <span>⚡ تصحيح جميع المقالي المعلق بالذكاء الاصطناعي (AI Batch)</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold">
                    {pendingEssayAttempts.length} إجابات معلقة
                  </div>
                </div>
              </div>

              {pendingEssayAttempts.length === 0 ? (
                <div className="py-16 text-center bg-[#0c1427]/80 border border-slate-800 rounded-3xl p-8 space-y-3 shadow-md">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
                    🎉
                  </div>
                  <h3 className="text-base font-bold text-white">رائع جداً! تم تصحيح كافة الأسئلة المقالية</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    لا توجد حالياً أي إجابات طلاب معلقة بانتظار التصحيح لموادك المسندة. ستظهر هنا فور إرسال أي طالب لامتحان يحتوي على أسئلة مقالية.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingEssayAttempts.map((attempt) => {
                    const questions = db.getQuestionsByExam(attempt.examId);
                    const essayQs = questions.filter((q) => q.questionType === 'essay');

                    return (
                      <div
                        key={attempt.id}
                        className="bg-[#0c1427]/90 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{attempt.studentName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                              {attempt.subjectName}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                              درجة الموضوعي: {attempt.autoScore}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">{attempt.examTitle}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>تاريخ الإرسال: {new Date(attempt.startedAt).toLocaleString('ar-EG')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {essayQs.map((eq) => (
                            <button
                              key={eq.id}
                              onClick={() => handleOpenGrading(attempt, eq.id)}
                              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                            >
                              <FileCheck className="w-4 h-4" />
                              <span>تصحيح السؤال المقالي ({eq.points} درجات)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: بنك الأسئلة بالذكاء الاصطناعي */}
          {/* ============================================================ */}
          {activeTab === 'ai-bank' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-alexandria">
                  توليد بنك الأسئلة بالذكاء الاصطناعي 🤖
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  قم بلصق نص الدرس أو المذكرة لتوليد أسئلة اختيار من متعدد وأسئلة مقالية مطابقة لمعايير وزارة التربية والتعليم
                </p>
              </div>

              <form onSubmit={handleGenerateAiQuestions} className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">المادة الدراسية:</label>
                    <select
                      value={aiSubjectId}
                      onChange={(e) => setAiSubjectId(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    >
                      {teacherSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">عنوان الدرس / الموضوع:</label>
                    <input
                      type="text"
                      value={aiTopicTitle}
                      onChange={(e) => setAiTopicTitle(e.target.value)}
                      placeholder="مثال: اسم الفاعل وأعماله في اللغة العربية"
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">نوعية الأسئلة المطلوبة:</label>
                    <select
                      value={aiQuestionType}
                      onChange={(e) => setAiQuestionType(e.target.value as any)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="all">🌟 تشكيلة شاملة (اختيارات + مقالي + أكمل)</option>
                      <option value="mcq">🔘 اختيار من متعدد فقط (مع 4 بدائل)</option>
                      <option value="essay">✍️ أسئلة مقالية فقط (مع نموذج الإجابة)</option>
                      <option value="fill_blank">✏️ أكمل الفراغات بكلمة أو مصطلح</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    نص الدرس أو الملخص (المصدر العلمي لتوليد الأسئلة):
                  </label>
                  <textarea
                    rows={6}
                    value={aiSourceText}
                    onChange={(e) => setAiSourceText(e.target.value)}
                    placeholder="الصق هنا نص المقال أو شرح الدرس ليقوم الذكاء الاصطناعي باستخراج الأسئلة والإجابات النموذجية منه..."
                    required
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || !aiSourceText.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Bot className="w-4 h-4" />
                  <span>{aiLoading ? 'جاري التحليل وتوليد الأسئلة...' : 'توليد بنك الأسئلة الآن'}</span>
                </button>
              </form>

              {/* Generated Questions Results */}
              {generatedQuestions.length > 0 && (
                <div className="bg-[#0c1427]/90 border border-purple-500/40 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <h3 className="font-bold text-base text-white">الأسئلة المقترحة الناتجة ({generatedQuestions.length})</h3>
                    </div>
                    <button
                      onClick={handleSaveGeneratedToExam}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ الأسئلة في اختبار جديد</span>
                    </button>
                  </div>

                  {aiSaveSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                      🎉 تم حفظ ونشر الاختبار بالأسئلة المولدة بنجاح للطلاب!
                    </div>
                  )}

                  <div className="space-y-4">
                    {generatedQuestions.map((q, idx) => {
                      const qType = q.questionType === 'essay' ? 'سؤال مقالي' : q.questionType === 'fill_blank' ? 'أكمل الفراغ' : 'اختيار من متعدد';
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                          <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {qType}
                              </span>
                              <span className="text-white text-sm">س{idx + 1}: {q.questionText}</span>
                            </div>
                            <span className="text-purple-400 font-mono">({q.points || 5} درجات)</span>
                          </div>

                          {q.choices && q.choices.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                              {q.choices.map((c: any, cIdx: number) => {
                                const choiceText = typeof c === 'string' ? c : (c.choiceText || '');
                                const isCorrect = typeof c === 'string' ? (cIdx === q.correctAnswerIndex) : Boolean(c.isCorrect);
                                return (
                                  <div
                                    key={cIdx}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                                      isCorrect
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                                        : 'bg-slate-950 border-slate-800 text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center font-bold">
                                        {['أ', 'ب', 'ج', 'د'][cIdx] || cIdx + 1}
                                      </span>
                                      <span>{choiceText}</span>
                                    </div>
                                    {isCorrect && (
                                      <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                        ✓ الإجابة الصحيحة
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                              <span className="font-bold text-emerald-300 block">نموذج الإجابة الوزاري:</span>
                              <p className="leading-relaxed">{q.modelAnswer || 'نموذج الإجابة القياسي'}</p>
                            </div>
                          )}

                          {q.explanation && (
                            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                              <span className="text-cyan-400 font-bold">الشرح والقاعدة: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: إدارة الدروس والمذكرات */}
          {/* ============================================================ */}
          {activeTab === 'lessons' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white font-alexandria">
                    إدارة الدروس والمذكرات الدراسية 📚
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إضافة دروس جديدة مع فيديوهات الشرح المباشرة ومذكرات PDF التابعة لموادك
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  {teacherLessons.length} دروس منشورة
                </div>
              </div>

              {/* Form to Add Lesson */}
              <form onSubmit={handleCreateLesson} className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="font-bold text-sm text-white">إضافة درس جديد</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">المادة الدراسية:</label>
                    <select
                      value={newLessonSubId}
                      onChange={(e) => setNewLessonSubId(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
                    >
                      {teacherSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.nameAr}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">عنوان الدرس:</label>
                    <input
                      type="text"
                      value={newLessonTitle}
                      onChange={(e) => setNewLessonTitle(e.target.value)}
                      placeholder="مثال: صيغ المبالغة وأوزانها القياسية"
                      required
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">رابط فيديو الشرح (يوتيوب أو رابط مباشر):</label>
                    <input
                      type="url"
                      value={newLessonVideo}
                      onChange={(e) => setNewLessonVideo(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-left focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">رابط مذكرة أو ملخص الدرس (PDF):</label>
                    <input
                      type="url"
                      value={newLessonPdf}
                      onChange={(e) => setNewLessonPdf(e.target.value)}
                      placeholder="https://example.com/notes.pdf"
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-left focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-300 font-bold block">ملخص الدرس ونقاط التلخيص السريع:</label>
                  <input
                    type="text"
                    value={newLessonSummary}
                    onChange={(e) => setNewLessonSummary(e.target.value)}
                    placeholder="مثال: يركز هذا الدرس على الأوزان القياسية الخمسة لصيغ المبالغة..."
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-300 font-bold block">شرح تفصيلي للدرس (النص العلمي):</label>
                  <textarea
                    rows={4}
                    value={newLessonContent}
                    onChange={(e) => setNewLessonContent(e.target.value)}
                    placeholder="اكتب هنا الشرح التفصيلي ليكون متاحاً لطلابك للقراءة والمذاكرة..."
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3.5 text-white leading-relaxed focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* رفع صور ومخططات توضيحية للدرس إلى Supabase Storage */}
                <div className="space-y-2 text-xs">
                  <label className="text-slate-300 font-bold block">صور ورسومات توضيحية للدرس (Supabase Storage):</label>
                  <div className="border border-dashed border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-4 text-center cursor-pointer relative bg-[#070b14]/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={isUploadingTeacherLessonImages}
                      onChange={handleTeacherLessonImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                      {isUploadingTeacherLessonImages ? (
                        <>
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-purple-300 font-bold">جارٍ رفع الصور إلى سحابة التخزين Supabase Storage...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                          <span>اضغط لاختيار صور ورسومات للدرس (تُرفع وتُحفظ تلقائياً في سحابة Supabase)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {newLessonImages.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">الصور المرفوعة المحفوظة ({newLessonImages.length}):</span>
                      <div className="flex items-center gap-3 flex-wrap">
                        {newLessonImages.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-purple-500/30 group shadow-md bg-slate-900">
                            <img src={img} alt="lesson-diagram" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveTeacherLessonImage(idx)}
                              className="absolute top-1 left-1 bg-rose-600/90 hover:bg-rose-600 text-white p-1 rounded-full text-xs shadow-md transition-all"
                              title="حذف الصورة"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoGenCards"
                    checked={autoGenCardsOnAdd}
                    onChange={(e) => setAutoGenCardsOnAdd(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="autoGenCards" className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    استخراج وتوليد فلاش كاردز ذكية تلقائياً من محتوى الدرس فور نشره (Auto-Flashcards Generation)
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>نشر الدرس في منصة الطلاب</span>
                </button>
              </form>

              {/* Published Lessons List */}
              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="font-bold text-sm text-white">الدروس المنشورة لموادك ({teacherLessons.length})</h3>

                {teacherLessons.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    لا توجد دروس منشورة حالياً لموادك المسندة. استخدم النموذج أعلاه لإضافة الدرس الأول!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {teacherLessons.map((les) => {
                      const sub = allSubjects.find((s) => s.id === les.subjectId);
                      return (
                        <div
                          key={les.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{les.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                                {sub?.nameAr || 'المادة'}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] line-clamp-1">{les.summary || 'شرح تفصيلي للمقرر'}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenFlashcardGenerator(les)}
                              disabled={activeGeneratingLessonId === les.id}
                              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-300 transition-colors flex items-center gap-1.5 font-bold"
                              title="استخراج وتوليد فلاش كاردز الدرس بالذكاء الاصطناعي"
                            >
                              {activeGeneratingLessonId === les.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span>فلاش كاردز AI</span>
                            </button>

                            {les.videoUrl && (
                              <a
                                href={les.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                                title="مشاهدة الفيديو"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEditLesson(les)}
                              className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition-colors"
                              title="تعديل الدرس وإشعار الطلاب"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(les.id)}
                              className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors"
                              title="حذف الدرس"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Edit Lesson Modal */}
              {editingLesson && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0b1329] border border-purple-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-amber-400" />
                        <h3 className="font-bold text-white text-base">تعديل الدرس: {editingLesson.title}</h3>
                      </div>
                      <button onClick={() => setEditingLesson(null)} className="text-slate-400 hover:text-white p-1">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveLessonEdit} className="space-y-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">عنوان الدرس:</label>
                        <input
                          type="text"
                          value={editLessonTitle}
                          onChange={(e) => setEditLessonTitle(e.target.value)}
                          required
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-bold block">المادة:</label>
                          <select
                            value={editLessonSubId}
                            onChange={(e) => setEditLessonSubId(e.target.value)}
                            className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                          >
                            {teacherSubjects.map((s) => (
                              <option key={s.id} value={s.id}>{s.nameAr}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-bold block">المدة التقريبية (بالدقائق):</label>
                          <input
                            type="number"
                            min={5}
                            max={180}
                            value={editLessonDuration}
                            onChange={(e) => setEditLessonDuration(Number(e.target.value))}
                            className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-bold block">رابط فيديو الشرح (YouTube):</label>
                          <input
                            type="url"
                            value={editLessonVideo}
                            onChange={(e) => setEditLessonVideo(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-slate-300 font-bold block">رابط ملزمة الشرح (PDF):</label>
                          <input
                            type="url"
                            value={editLessonPdf}
                            onChange={(e) => setEditLessonPdf(e.target.value)}
                            placeholder="https://.../lesson.pdf"
                            className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">نبذة وملخص الدرس:</label>
                        <textarea
                          rows={2}
                          value={editLessonSummary}
                          onChange={(e) => setEditLessonSummary(e.target.value)}
                          placeholder="ملخص مختصر يظهر للطلاب..."
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">محتوى الشرح التفصيلي:</label>
                        <textarea
                          rows={4}
                          value={editLessonContent}
                          onChange={(e) => setEditLessonContent(e.target.value)}
                          placeholder="الشرح المكتوب والنقاط الهامة..."
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                        />
                      </div>

                      {/* صور ورسومات الدرس (Supabase Storage) */}
                      <div className="space-y-2">
                        <label className="text-slate-300 font-bold block">صور ورسومات توضيحية للدرس (Supabase Storage):</label>
                        <div className="border border-dashed border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-3 text-center cursor-pointer relative bg-[#070b14]/50 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            disabled={isUploadingTeacherEditImages}
                            onChange={handleTeacherEditImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center justify-center gap-2 text-slate-300">
                            {isUploadingTeacherEditImages ? (
                              <>
                                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-purple-300 font-bold">جارٍ رفع وتحديث الصور في Supabase Storage...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                                <span>إضافة صور ورسومات جديدة إلى الدرس</span>
                              </>
                            )}
                          </div>
                        </div>

                        {editLessonImages.length > 0 && (
                          <div className="flex items-center gap-3 flex-wrap pt-1">
                            {editLessonImages.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-purple-500/30 group shadow-md bg-slate-900">
                                <img src={img} alt="lesson-diagram" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeacherEditImage(idx)}
                                  className="absolute top-1 left-1 bg-rose-600/90 hover:bg-rose-600 text-white p-1 rounded-full text-xs shadow-md transition-all"
                                  title="حذف الصورة"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2 text-purple-300 text-[11px]">
                        <Bell className="w-4 h-4 shrink-0 text-purple-400" />
                        <span>سيتم إرسال إشعار فوري لجميع الطلاب في المنصة لتنبيههم بتعديل وتحديث هذا الدرس.</span>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingLesson(null)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          حفظ التعديلات وإشعار الطلاب
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: إدارة الاختبارات والواجبات */}
          {/* ============================================================ */}
          {activeTab === 'exams' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white tracking-wide font-alexandria">
                  إدارة الاختبارات 📝
                </h1>
                <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  {teacherExams.length} اختبارات منشورة
                </div>
              </div>

              {/* 1. AI Question Bank Box (Matches Admin Dashboard) */}
              <div className="bg-[#0c1427]/90 border border-purple-500/30 rounded-2xl p-6 shadow-md space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <h2 className="text-base font-bold text-white">توليد بنك أسئلة من مقال بالذكاء الاصطناعي</h2>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    انسخ أي ملزمة أو مقال يحتوي على أسئلة وإجاباتها وسيحللها الذكاء الاصطناعي ويحولها تلقائياً إلى أسئلة جاهزة للمراجعة والحفظ في بنك الأسئلة لمادتك.
                  </p>
                </div>

                {teacherAiExamSuccessMsg && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold">
                    {teacherAiExamSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleTeacherGenerateAiExamBank} className="space-y-3.5">
                  <div>
                    <select
                      value={teacherAiExamSubjectId}
                      onChange={(e) => setTeacherAiExamSubjectId(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-purple-500 outline-none"
                    >
                      {teacherSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="عنوان بنك الأسئلة (اختياري)"
                      value={teacherAiExamBankTitle}
                      onChange={(e) => setTeacherAiExamBankTitle(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={4}
                      placeholder="الصق هنا النص / الملزمة التي تحتوي على الأسئلة وإجاباتها..."
                      value={teacherAiExamArticleText}
                      onChange={(e) => setTeacherAiExamArticleText(e.target.value)}
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={teacherAiExamGenerating}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {teacherAiExamGenerating ? 'جاري التحليل وتوليد الأسئلة...' : 'تحليل وإنشاء الأسئلة'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Create Exam Manual Box (Matches Admin Dashboard with 3 Question Types + Images) */}
              <form onSubmit={handleCreateExam} className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4">
                <h2 className="text-sm font-bold text-slate-200">إنشاء اختبار جديد</h2>

                <div>
                  <select
                    value={newExamSubId}
                    onChange={(e) => setNewExamSubId(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                  >
                    {teacherSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="عنوان الاختبار"
                    value={newExamTitle}
                    onChange={(e) => setNewExamTitle(e.target.value)}
                    required
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">مدة الاختبار (بالدقائق)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={newExamDuration}
                      onChange={(e) => {
                        const val = Math.min(60, Math.max(1, parseInt(e.target.value) || 1));
                        setNewExamDuration(val.toString());
                      }}
                      required
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">نسبة النجاح (%)</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={newExamPassing}
                      onChange={(e) => setNewExamPassing(e.target.value)}
                      required
                      className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Anti-Cheating Checkboxes matching Admin */}
                <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExamAntiTab}
                      onChange={(e) => setNewExamAntiTab(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0"
                    />
                    <span>⚠️ منع التبديل بين التبويبات</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExamRandomize}
                      onChange={(e) => setNewExamRandomize(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0"
                    />
                    <span>إعادة ترتيب الأسئلة والأجوبة عشوائياً لكل طالب</span>
                  </label>
                </div>

                {/* Questions Builder with 3 Types + Image Attachment Support */}
                <div className="space-y-4 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      الأسئلة ({newExamQuestions.length})
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNewExamQuestions((prev) => [
                            ...prev,
                            { text: '', type: 'mcq', choices: ['', '', '', ''], correctIdx: 0, points: 5 },
                          ])
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-bold rounded-xl transition-all"
                      >
                        + سؤال اختيار من متعدد
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewExamQuestions((prev) => [
                            ...prev,
                            { text: '', type: 'fill_blank', choices: [], correctIdx: 0, correctBlankAnswer: '', points: 5 },
                          ])
                        }
                        className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 text-xs text-indigo-300 font-bold rounded-xl border border-indigo-500/40 transition-all"
                      >
                        + سؤال أكمل العبارة
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewExamQuestions((prev) => [
                            ...prev,
                            { text: '', type: 'essay', choices: [], correctIdx: 0, modelAnswer: '', points: 10 },
                          ])
                        }
                        className="px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/60 text-xs text-purple-300 font-bold rounded-xl border border-purple-500/40 transition-all"
                      >
                        + سؤال مقالي
                      </button>
                    </div>
                  </div>

                  {newExamQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-xl bg-[#070b14] border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">السؤال {qIdx + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              q.type === 'mcq'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : q.type === 'fill_blank'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {q.type === 'mcq' ? 'اختيار من متعدد' : q.type === 'fill_blank' ? 'أكمل العبارة' : 'سؤال مقالي'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">الدرجة:</span>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={q.points}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                setNewExamQuestions((prev) =>
                                  prev.map((item, i) => (i === qIdx ? { ...item, points: val } : item))
                                );
                              }}
                              className="w-14 bg-[#0c1427] border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono text-center"
                            />
                          </div>

                          {newExamQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewExamQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                              className="text-rose-400 hover:text-rose-300 p-1"
                              title="حذف السؤال"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <input
                        type="text"
                        placeholder={`نص السؤال ${qIdx + 1}...`}
                        value={q.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewExamQuestions((prev) =>
                            prev.map((item, i) => (i === qIdx ? { ...item, text: val } : item))
                          );
                        }}
                        required
                        className="w-full bg-[#0c1427] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                      />

                      {/* Image Attachment (e.g., Electrical Circuit diagram) */}
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                            صورة توضيحية للسؤال (اختياري — دائرة كهربية / رسم بياني / خريطة):
                          </span>

                          <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors">
                            <Upload className="w-3 h-3" />
                            <span>رفع صورة من جهازك</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleQuestionImageUpload(qIdx, file);
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            placeholder="أو الصق رابط الصورة مباشرة هنا (https://...)..."
                            value={q.imageUrl || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewExamQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, imageUrl: val } : item))
                              );
                            }}
                            className="flex-1 bg-[#0c1427] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                          />
                          {q.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setNewExamQuestions((prev) =>
                                  prev.map((item, i) => (i === qIdx ? { ...item, imageUrl: undefined } : item))
                                )
                              }
                              className="px-2 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 text-xs flex items-center gap-1"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>

                        {q.imageUrl && (
                          <div className="relative inline-block mt-1.5 rounded-xl border border-slate-700 bg-black/50 p-2">
                            <img
                              src={q.imageUrl}
                              alt="معاينة رسم السؤال"
                              className="h-28 w-auto max-w-full object-contain rounded-lg"
                            />
                            <span className="text-[10px] text-cyan-300 block mt-1">✓ ستظهر هذه الصورة للطلاب أثناء الإجابة وفي المراجعة</span>
                          </div>
                        )}
                      </div>

                      {/* Type 1: MCQ Choices */}
                      {q.type === 'mcq' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.choices.map((c, cIdx) => (
                            <div key={cIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctIdx === cIdx}
                                onChange={() => {
                                  setNewExamQuestions((prev) =>
                                    prev.map((item, i) => (i === qIdx ? { ...item, correctIdx: cIdx } : item))
                                  );
                                }}
                                title="اختر هذا الخيار كإجابة صحيحة"
                              />
                              <input
                                type="text"
                                placeholder={`الخيار ${cIdx + 1}`}
                                value={c}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewExamQuestions((prev) =>
                                    prev.map((item, i) => {
                                      if (i !== qIdx) return item;
                                      const nextChoices = [...item.choices];
                                      nextChoices[cIdx] = val;
                                      return { ...item, choices: nextChoices };
                                    })
                                  );
                                }}
                                required
                                className="w-full bg-[#0c1427] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Type 2: Fill in the Blank (أكمل) */}
                      {q.type === 'fill_blank' && (
                        <div className="space-y-1 pt-1 text-xs">
                          <label className="text-indigo-300 font-bold block">
                            الإجابة النموذجية الصحيحة (الكلمة أو المصطلح أو الرقم الذي يكتبه الطالب ليكتمل السؤال):
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: الأميتر (أو افصل بين الإجابات المترادفة بفاصلة: الأميتر, الاميتر)"
                            value={q.correctBlankAnswer || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewExamQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, correctBlankAnswer: val } : item))
                              );
                            }}
                            required
                            className="w-full bg-[#0c1427] border border-indigo-500/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-400 outline-none"
                          />
                        </div>
                      )}

                      {/* Type 3: Essay (مقالي) */}
                      {q.type === 'essay' && (
                        <div className="space-y-1 pt-1 text-xs">
                          <label className="text-purple-300 font-bold block">
                            نموذج الإجابة الوزاري ومعايير توزيع الدرجات (Rubric):
                          </label>
                          <textarea
                            rows={3}
                            placeholder="اكتب نموذج الإجابة المعتمد لهذا السؤال المقالي لمقارنة إجابات الطلاب به وتصحيحها..."
                            value={q.modelAnswer || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewExamQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, modelAnswer: val } : item))
                              );
                            }}
                            required
                            className="w-full bg-[#0c1427] border border-purple-500/40 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-400 outline-none leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ ونشر الاختبار للطلاب</span>
                  </button>
                </div>
              </form>

              {/* 3. List of Existing Exams (Matches Admin Dashboard) */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-white">الاختبارات المنشورة لموادك ({teacherExams.length})</h3>

                {teacherExams.length === 0 ? (
                  <div className="py-8 text-center bg-[#0c1427]/80 border border-slate-800 rounded-2xl text-xs text-slate-400">
                    لا توجد اختبارات منشورة حالياً لموادك.
                  </div>
                ) : (
                  teacherExams.map((ex) => {
                    const sub = allSubjects.find((s) => s.id === ex.subjectId);
                    const questions = db.getQuestionsByExam(ex.id);

                    return (
                      <div
                        key={ex.id}
                        className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-md"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{ex.title}</span>
                            <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                              {sub?.nameAr || ex.subjectName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
                            <span>الأسئلة: {questions.length}</span>
                            <span>المدة: {ex.timeLimitMinutes} دقيقة</span>
                            <span>نسبة النجاح: {ex.passingPercentage}%</span>
                            {ex.antiCheatingTabSwitch && <span>⚠️ كاشف تبويبات</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteExam(ex.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف الاختبار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: متابعة درجات الطلاب ومحاولاتهم */}
          {/* ============================================================ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white font-alexandria">
                    سجل نتائج الطلاب ومحاولاتهم 👥
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    متابعة نتائج الطلاب في اختباراتك وتفاصيل إجاباتهم
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  {teacherAttempts.length} محاولات مسجلة
                </div>
              </div>

              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                {teacherAttempts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    لا توجد محاولات اختبارات مسجلة من الطلاب حتى الآن.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-3 pr-2">اسم الطالب</th>
                          <th className="pb-3">المادة والاختبار</th>
                          <th className="pb-3">الدرجة</th>
                          <th className="pb-3">الحالة</th>
                          <th className="pb-3">التاريخ</th>
                          <th className="pb-3 pl-2">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {teacherAttempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3.5 pr-2 font-bold text-white">{att.studentName}</td>
                            <td className="py-3.5">
                              <div>{att.examTitle}</div>
                              <span className="text-[10px] text-cyan-400">{att.subjectName}</span>
                            </td>
                            <td className="py-3.5 font-mono font-bold text-cyan-300">
                              {att.totalScore} / {att.maxScore} ({att.percentage}%)
                            </td>
                            <td className="py-3.5">
                              {att.status === 'graded' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                  معتمد ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold animate-pulse">
                                  قيد التصحيح
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-slate-400 text-[11px]">
                              {new Date(att.startedAt).toLocaleDateString('ar-EG')}
                            </td>
                            <td className="py-3.5 pl-2">
                              <button
                                onClick={() => setSelectedAttemptForView(att)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                              >
                                عرض التفاصيل
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ============================================================ */}
          {/* TAB: الواجبات المنزلية */}
          {/* ============================================================ */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white font-alexandria">الواجبات المنزلية 📝</h2>
                  <p className="text-xs text-slate-400 mt-1">إضافة واجبات منزلية مع تحديد الـ Deadline وتصحيح إجابات الطلاب</p>
                </div>
              </div>
              <form onSubmit={handleCreateHomework} className="bg-[#0c1427]/90 border border-slate-800 rounded-3xl p-6 shadow-md space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">المادة:</label>
                    <select value={hwSubjectId} onChange={(e) => setHwSubjectId(e.target.value)} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none">
                      {teacherSubjects.map((s) => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">عنوان الواجب:</label>
                    <input type="text" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} placeholder="عنوان الواجب" required className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold block">موعد التسليم:</label>
                    <input type="datetime-local" value={hwDeadline} onChange={(e) => setHwDeadline(e.target.value)} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none" />
                  </div>
                </div>
                <textarea rows={3} value={hwDescription} onChange={(e) => setHwDescription(e.target.value)} placeholder="تفاصيل الواجب..." className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none" />
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" />نشر الواجب للطلاب
                </button>
              </form>
              {homeworks.map((hw) => (
                <div key={hw.id} className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white text-sm">{hw.title} <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 mr-1">{hw.subjectName}</span></div>
                    <div className="text-[11px] text-slate-400 mt-1">التسليم: {new Date(hw.deadlineAt).toLocaleString('ar-EG')} • {hw.submissions.length} إجابة</div>
                    {hw.description && <p className="text-xs text-slate-400 mt-1">{hw.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setSelectedHwForGrade(hw)} className="px-3 py-2 bg-purple-600/30 text-purple-300 text-xs font-bold rounded-xl border border-purple-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />تصحيح
                    </button>
                    <button onClick={() => { if(window.confirm('حذف الواجب؟')){db.deleteTeacherHomework(hw.id);forceRefresh();}}} className="p-2 bg-rose-500/15 text-rose-400 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedHwForGrade && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#0b1329] border border-purple-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
                    <div className="flex justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-sm">تصحيح: {selectedHwForGrade.title}</h3>
                      <button onClick={() => setSelectedHwForGrade(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    {selectedHwForGrade.submissions.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">لم يرسل أي طالب إجابته بعد</div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedHwForGrade.submissions.map((sub) => (
                          <div key={sub.studentId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-white">{sub.studentName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sub.score!==undefined?'bg-emerald-500/20 text-emerald-300':'bg-amber-500/20 text-amber-300'}`}>{sub.score!==undefined?`${sub.score}/${selectedHwForGrade.maxScore}`:'لم يُصحح'}</span>
                            </div>
                            <p className="text-xs text-slate-300 bg-slate-950 rounded-lg p-2.5">{sub.answerText}</p>
                            <div className="flex gap-2">
                              <input type="number" min={0} max={selectedHwForGrade.maxScore} defaultValue={sub.score??''} placeholder={`/ ${selectedHwForGrade.maxScore}`}
                                onChange={(e)=>{setHwGradeStudentId(sub.studentId);setHwGradeScore(Number(e.target.value));}}
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                              <input type="text" defaultValue={sub.teacherFeedback||''} placeholder="تعليق المعلم" onChange={(e)=>setHwGradeFeedback(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none" />
                              <button onClick={()=>{setHwGradeStudentId(sub.studentId);setTimeout(handleSaveHwGrade,50);}}
                                className="px-3 py-1.5 bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40">حفظ ✓</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB: التقارير والإحصائيات */}
          {/* ============================================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white font-alexandria">التقارير والإحصائيات 📊</h2>
                  <p className="text-xs text-slate-400 mt-1">تحليل أداء الطلاب ومعدلاتهم ونسب النجاح</p>
                </div>
                <button onClick={handleExportStudentResults} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                  <Download className="w-4 h-4" />تصدير النتائج CSV
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {label:'إجمالي المحاولات',value:teacherAttempts.length,color:'text-cyan-400',icon:'📋'},
                  {label:'ناجحون',value:teacherAttempts.filter(a=>a.passed).length,color:'text-emerald-400',icon:'✅'},
                  {label:'راسبون',value:teacherAttempts.filter(a=>!a.passed).length,color:'text-rose-400',icon:'❌'},
                  {label:'معدل النجاح',value:teacherAttempts.length>0?`${Math.round((teacherAttempts.filter(a=>a.passed).length/teacherAttempts.length)*100)}%`:'0%',color:'text-purple-400',icon:'📈'},
                ].map((card)=>(
                  <div key={card.label} className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 text-center space-y-2 shadow-md">
                    <div className="text-2xl">{card.icon}</div>
                    <div className={`text-2xl font-black font-mono ${card.color}`}>{card.value}</div>
                    <div className="text-[11px] text-slate-400">{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3">أداء الطلاب لكل مادة</h3>
                {teacherSubjects.map((sub)=>{
                  const subAttempts=teacherAttempts.filter(a=>a.subjectName===sub.nameAr);
                  const avg=subAttempts.length>0?Math.round(subAttempts.reduce((s,a)=>s+a.percentage,0)/subAttempts.length):0;
                  const pct=subAttempts.length>0?Math.round((subAttempts.filter(a=>a.passed).length/subAttempts.length)*100):0;
                  return (
                    <div key={sub.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{sub.nameAr}</span>
                        <div className="flex gap-3 text-slate-400">
                          <span>{subAttempts.length} محاولة</span>
                          <span>متوسط: <strong className="text-cyan-300">{avg}%</strong></span>
                          <span>نجاح: <strong className="text-emerald-300">{pct}%</strong></span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{width:`${avg}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
                <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-3">تقرير أداء كل طالب</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-400 border-b border-slate-800">
                      <th className="pb-2 pr-2 text-right">#</th><th className="pb-2 pr-2 text-right">الطالب</th>
                      <th className="pb-2 pr-2 text-right">عدد الاختبارات</th><th className="pb-2 pr-2 text-right">المتوسط</th>
                      <th className="pb-2 pr-2 text-right">ناجح/راسب</th><th className="pb-2 text-right">آخر اختبار</th>
                    </tr></thead>
                    <tbody>
                      {(()=>{
                        const byStudent: Record<string, typeof teacherAttempts>={};
                        teacherAttempts.forEach(a=>{if(!byStudent[a.studentId])byStudent[a.studentId]=[];byStudent[a.studentId].push(a);});
                        return Object.entries(byStudent)
                          .sort((a,b)=>(b[1].reduce((s,x)=>s+x.percentage,0)/b[1].length)-(a[1].reduce((s,x)=>s+x.percentage,0)/a[1].length))
                          .map(([sid,atts],idx)=>{
                            const avg=Math.round(atts.reduce((s,a)=>s+a.percentage,0)/atts.length);
                            const pc=atts.filter(a=>a.passed).length;
                            const last=[...atts].sort((a,b)=>new Date(b.startedAt).getTime()-new Date(a.startedAt).getTime())[0];
                            return (
                              <tr key={sid} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                                <td className="py-2.5 pr-2 font-bold text-amber-300">{idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':idx+1}</td>
                                <td className="py-2.5 pr-2 font-bold text-white">{atts[0]?.studentName||'طالب'}</td>
                                <td className="py-2.5 pr-2 text-slate-400">{atts.length}</td>
                                <td className="py-2.5 pr-2"><span className={avg>=75?'text-emerald-400':avg>=50?'text-amber-400':'text-rose-400'}>{avg}%</span></td>
                                <td className="py-2.5 pr-2"><span className="text-emerald-400">{pc}✓</span><span className="text-slate-500"> / </span><span className="text-rose-400">{atts.length-pc}✗</span></td>
                                <td className="py-2.5 text-slate-400">{last?.submittedAt?new Date(last.submittedAt).toLocaleDateString('ar-EG'):'-'}</td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                  {teacherAttempts.length===0&&<div className="py-8 text-center text-xs text-slate-400">لا توجد بيانات بعد</div>}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB: الرسائل */}
          {/* ============================================================ */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white font-alexandria">الرسائل المباشرة 💬</h2>
                <p className="text-xs text-slate-400 mt-1">تواصل مباشر مع طلابك والرد على أسئلتهم</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{height:'560px'}}>
                <div className="lg:col-span-1 bg-[#0c1427]/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-slate-800">
                    <select value={msgToId} onChange={(e)=>{setMsgToId(e.target.value);setMsgConversationWith(e.target.value);reloadMessages();}}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                      <option value="">اختر طالباً...</option>
                      {allStudents.map(s=><option key={s.id} value={s.id}>{s.fullName}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {Array.from(new Set(messages.map(m=>m.fromId===user.id?m.toId:m.fromId))).map(cid=>{
                      const contact=allStudents.find(s=>s.id===cid);
                      const lastMsg=[...messages].filter(m=>m.fromId===cid||m.toId===cid).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0];
                      const hasUnread=messages.some(m=>m.fromId===cid&&m.toId===user.id&&!m.isRead);
                      return (
                        <button key={cid} onClick={()=>{setMsgConversationWith(cid);setMsgToId(cid);reloadMessages();}}
                          className={`w-full text-right px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${msgConversationWith===cid?'bg-purple-500/20 border border-purple-500/40 text-white':'hover:bg-slate-900 text-slate-300 border border-transparent'}`}>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{contact?.fullName||cid}</div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{lastMsg?.text||'—'}</div>
                          </div>
                          {hasUnread&&<span className="w-2 h-2 rounded-full bg-purple-400 shrink-0 mr-2 animate-pulse"/>}
                        </button>
                      );
                    })}
                    {messages.length===0&&<div className="py-8 text-center text-xs text-slate-500">لا توجد محادثات بعد</div>}
                  </div>
                </div>
                <div className="lg:col-span-2 bg-[#0c1427]/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                  {msgConversationWith ? (
                    <>
                      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm">👤</div>
                        <span className="font-bold text-sm text-white">{allStudents.find(s=>s.id===msgConversationWith)?.fullName}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {[...messages].filter(m=>m.fromId===msgConversationWith||m.toId===msgConversationWith).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()).map(msg=>{
                          const isMe=msg.fromId===user.id;
                          return (
                            <div key={msg.id} className={`flex ${isMe?'flex-row-reverse':'flex-row'} gap-2`}>
                              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${isMe?'bg-purple-600/30 text-white border border-purple-500/30 rounded-tr-none':'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'}`}>
                                {msg.text}
                                <span className="block text-[10px] text-slate-500 mt-1">{new Date(msg.createdAt).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
                        <input type="text" value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="اكتب رسالتك..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"/>
                        <button type="submit" disabled={!msgText.trim()} className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-40"><Send className="w-4 h-4"/></button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                      <div className="text-center space-y-2"><MessageSquare className="w-10 h-10 mx-auto text-slate-700"/><p>اختر طالباً لبدء المحادثة</p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB: جدول الحصص */}
          {/* ============================================================ */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white font-alexandria">جدول الحصص الأسبوعي 📅</h2>
                <p className="text-xs text-slate-400 mt-1">تحديد مواعيد الحصص والمحاضرات لطلابك</p>
              </div>
              <form onSubmit={handleAddSlot} className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="space-y-1.5"><label className="text-slate-300 font-bold block">اليوم:</label>
                    <select value={slotDay} onChange={e=>setSlotDay(Number(e.target.value))} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none">
                      {DAY_NAMES.map((d,i)=><option key={i} value={i}>{d}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><label className="text-slate-300 font-bold block">من:</label>
                    <input type="time" value={slotStart} onChange={e=>setSlotStart(e.target.value)} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-slate-300 font-bold block">إلى:</label>
                    <input type="time" value={slotEnd} onChange={e=>setSlotEnd(e.target.value)} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"/></div>
                  <div className="space-y-1.5"><label className="text-slate-300 font-bold block">المادة:</label>
                    <select value={slotSubject} onChange={e=>setSlotSubject(e.target.value)} className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none">
                      {teacherSubjects.map(s=><option key={s.id} value={s.nameAr}>{s.nameAr}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><label className="text-slate-300 font-bold block">العنوان:</label>
                    <input type="text" value={slotTitle} onChange={e=>setSlotTitle(e.target.value)} placeholder="عنوان الحصة" className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none"/></div>
                </div>
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl flex items-center gap-2"><Plus className="w-4 h-4"/>إضافة للجدول</button>
              </form>
              <div className="bg-[#0c1427]/90 border border-slate-800 rounded-2xl p-4 shadow-md overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                  {DAY_NAMES.map((day,dayIdx)=>{
                    const daySlots=schedule.filter(s=>s.dayOfWeek===dayIdx).sort((a,b)=>a.startTime.localeCompare(b.startTime));
                    return (
                      <div key={dayIdx} className="space-y-2">
                        <div className={`text-center text-[11px] font-bold py-1.5 rounded-lg ${dayIdx===new Date().getDay()?'bg-purple-500/30 text-purple-300 border border-purple-500/40':'bg-slate-900 text-slate-400 border border-slate-800'}`}>{day}</div>
                        {daySlots.length===0?<div className="h-16 rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-700">فارغ</div>
                        :daySlots.map(slot=>(
                          <div key={slot.id} className="relative p-2 rounded-lg bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 text-xs space-y-0.5 group">
                            <div className="font-bold text-white truncate text-[11px]">{slot.title}</div>
                            <div className="text-purple-300 text-[10px]">{slot.subjectName}</div>
                            <div className="text-slate-500 text-[10px]">{slot.startTime} - {slot.endTime}</div>
                            <button onClick={()=>{db.deleteScheduleSlot(slot.id);reloadSchedule();}} className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 p-0.5 text-rose-400"><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. Essay Grading Modal with Rubric & AI Assistant */}
      {/* ============================================================ */}
      {selectedAttempt && selectedQuestionId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1329] border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-alexandria">
                  تصحيح السؤال المقالي — {selectedAttempt.studentName}
                </h3>
                <span className="text-xs text-purple-400">{selectedAttempt.examTitle}</span>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {gradingSuccessMsg ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-lg">تم اعتماد الدرجة ونشرها للطالب بنجاح! 🎉</h4>
                <p className="text-xs text-slate-300">تم تحديث النتيجة وإشعار الطالب بها في حسابه فوراً.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
                {(() => {
                  const q = db.getQuestionsByExam(selectedAttempt.examId).find((x) => x.id === selectedQuestionId);
                  const ans = selectedAttempt.answers?.[selectedQuestionId];

                  return (
                    <>
                      {/* Question Text */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="font-bold text-purple-300 block">نص السؤال المقالي:</span>
                        <p className="text-sm text-white leading-relaxed">{q?.questionText}</p>
                        <span className="text-[10px] text-slate-400 block pt-1">
                          الدرجة القصوى للسؤال: {q?.points} درجات
                        </span>
                      </div>

                      {/* Model Answer Rubric */}
                      {q?.modelAnswer && (
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <span className="font-bold text-emerald-300 block">نموذج الإجابة الوزاري (Rubric):</span>
                          <p className="text-slate-200 leading-relaxed">{q.modelAnswer}</p>
                        </div>
                      )}

                      {/* Student Submitted Answer */}
                      <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 space-y-1.5">
                        <span className="font-bold text-amber-300 block">إجابة الطالب المحررة:</span>
                        <div className="p-3 bg-slate-950 rounded-lg text-slate-100 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {ans?.essayAnswerText || '(لم يحرر الطالب إجابة لهذا السؤال)'}
                        </div>
                      </div>

                      {/* AI Assistance Box */}
                      <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-400" />
                            <span className="font-bold text-purple-300">تقدير الذكاء الاصطناعي الاسترشادي:</span>
                          </div>
                          {q && (
                            <button
                              type="button"
                              disabled={isAiGradingLoading}
                              onClick={() => handleAiAutoEvaluate(q, ans?.essayAnswerText || '')}
                              className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isAiGradingLoading ? 'جاري التحليل...' : 'إعادة التقييم بالـ AI'}</span>
                            </button>
                          )}
                        </div>

                        {ans?.aiSuggestedScore !== undefined && (
                          <p className="text-slate-300 leading-relaxed text-[11px]">
                            الدرجة المقترحة: <strong className="text-purple-300 font-mono text-xs">{ans.aiSuggestedScore}</strong> من {q?.points}. {ans.aiFeedback}
                          </p>
                        )}
                      </div>

                      {/* Teacher Score Input & Feedback */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-white font-bold block">
                            الدرجة المعتمدة من المعلم (من {q?.points}):
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={q?.points || 10}
                            value={scoreInput}
                            onChange={(e) => setScoreInput(Number(e.target.value))}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-purple-500/50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-white font-bold block">
                            توجيهات وملاحظات المعلم للطالب:
                          </label>
                          <input
                            type="text"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            placeholder="مثال: إجابة ممتازة، احرص على ذكر علامة الإعراب..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                          />
                        </div>
                      </div>

                      {/* Modal Footer Buttons */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSelectedAttempt(null)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                        >
                          إلغاء
                        </button>

                        <button
                          type="submit"
                          className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>اعتماد الدرجة النهائية ونشر النتيجة</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. Student Attempt Details Modal */}
      {/* ============================================================ */}
      {selectedAttemptForView && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-alexandria">
                  تفاصيل محاولة: {selectedAttemptForView.studentName}
                </h3>
                <span className="text-xs text-cyan-400">{selectedAttemptForView.examTitle}</span>
              </div>
              <button
                onClick={() => setSelectedAttemptForView(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">الدرجة الكلية</span>
                <span className="text-lg font-bold text-cyan-300 font-mono">
                  {selectedAttemptForView.totalScore} / {selectedAttemptForView.maxScore}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">النسبة المئوية</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {selectedAttemptForView.percentage}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">النتيجة</span>
                <span className={`text-sm font-bold ${selectedAttemptForView.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedAttemptForView.passed ? 'ناجح ✓' : 'لم يحقق النجاح'}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {Object.entries(selectedAttemptForView.answers || {}).map(([qId, ans], idx) => {
                const q = db.getQuestionsByExam(selectedAttemptForView.examId).find((x) => x.id === qId);
                return (
                  <div key={qId} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white">س{idx + 1}: {q?.questionText || 'السؤال'}</span>
                      <span className="text-cyan-300 font-mono">{ans.scoreAwarded} درجات</span>
                    </div>
                    {ans.essayAnswerText ? (
                      <div className="mt-1 p-2.5 rounded-lg bg-slate-950 text-slate-300">
                        <span className="text-amber-300 font-bold block mb-1">إجابة الطالب المحررة:</span>
                        {ans.essayAnswerText}
                      </div>
                    ) : (
                      <div className="text-slate-400">سؤال موضوعي تم تصحيحه تلقائياً.</div>
                    )}
                    {ans.teacherFeedback && (
                      <div className="text-[11px] text-emerald-300 pt-1">
                        تعليق المعلم: {ans.teacherFeedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAttemptForView(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. AI Auto-Flashcards Generator Modal */}
      {/* ============================================================ */}
      {flashcardModalLesson && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1329] border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg">
                  ✨
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-alexandria">
                    توليد فلاش كاردز الدرس (AI Auto-Flashcards)
                  </h3>
                  <span className="text-xs text-purple-400 font-bold">{flashcardModalLesson.title}</span>
                </div>
              </div>
              <button
                onClick={() => setFlashcardModalLesson(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {isGeneratingFlashcards ? (
              <div className="py-14 text-center space-y-3">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
                <h4 className="font-bold text-white text-sm font-alexandria">
                  جاري استخراج أهم المفاهيم والأسئلة بالذكاء الاصطناعي...
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  يقوم Gemini بتحليل محتوى الدرس واستخلاص بطاقات الاستذكار السريع (سؤال / إجابة) تلقائياً.
                </p>
              </div>
            ) : savedSuccessFlashcards ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-base">تم حفظ الفلاش كاردز بنجاح! 🎉</h4>
                <p className="text-xs text-slate-300">أصبحت البطاقات متاحة فوراً لطلابك في قسم بطاقات الاستذكار السريع.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">
                    البطاقات المستخرجة ({previewCards.length} بطاقة):
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewCards((prev) => [...prev, { front: '', back: '' }])}
                    className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة كارت جديد
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {previewCards.map((card, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-300">بطاقة رقم {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setPreviewCards((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          title="حذف البطاقة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block font-bold">وجه البطاقة (السؤال أو المفهوم):</label>
                        <input
                          type="text"
                          value={card.front}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPreviewCards((prev) => prev.map((c, i) => i === idx ? { ...c, front: val } : c));
                          }}
                          placeholder="السؤال أو المصطلح..."
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block font-bold">ظهر البطاقة (الإجابة أو الشرح القصير):</label>
                        <textarea
                          rows={2}
                          value={card.back}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPreviewCards((prev) => prev.map((c, i) => i === idx ? { ...c, back: val } : c));
                          }}
                          placeholder="الإجابة المختصرة المباشرة..."
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-white text-xs leading-relaxed focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFlashcardModalLesson(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGeneratedFlashcards}
                    disabled={previewCards.length === 0}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ الفلاش كاردز في المنصة للطلاب ({previewCards.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

