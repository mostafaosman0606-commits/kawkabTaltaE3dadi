import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Users,
  Layers,
  BookOpen,
  ClipboardList,
  FileCheck,
  CreditCard,
  Award,
  Bell,
  ArrowRight,
  Plus,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Bot,
  ExternalLink,
  Lock,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Pencil,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';
import { EGYPT_GOVERNORATES } from '../../constants/governorates';
import { generateQuestionsFromText, gradeEssayWithAi } from '../../services/aiService';
import { sendBrowserNotification } from '../../services/notifications';
import { sbUploadLessonImage, sbDeleteLessonImage } from '../../services/supabaseDb';
import {
  Subject,
  Lesson,
  Examination,
  Question,
  UserProfile,
  SubscriptionTier,
  AnswerChoice,
} from '../../types';
import { Navbar } from '../../components/Navbar';

interface AdminDashboardProps {
  initialSubTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateToStudent?: () => void;
  onNavigateToTeacher?: () => void;
  onNavigate?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialSubTab = 'overview',
  activeTab: propActiveTab,
  onSelectTab,
  onNavigateToStudent,
  onNavigateToTeacher,
  onNavigate,
}) => {
  const { user, logout } = useAuth();

  const VALID_ADMIN_TABS = [
    'overview',
    'students',
    'subjects',
    'lessons',
    'exams',
    'grading',
    'payments',
    'certificates',
    'notifications',
  ];

  const resolveTab = (t?: string) => {
    if (!t) return 'overview';
    const clean = t.replace('admin-', '').replace('teacher-', '');
    return VALID_ADMIN_TABS.includes(clean) ? clean : 'overview';
  };

  const [localActiveTab, setLocalActiveTab] = useState<string>(() =>
    resolveTab(propActiveTab || initialSubTab)
  );

  React.useEffect(() => {
    if (propActiveTab) {
      setLocalActiveTab(resolveTab(propActiveTab));
    }
  }, [propActiveTab]);

  const activeTab = propActiveTab ? resolveTab(propActiveTab) : localActiveTab;
  const currentTab = VALID_ADMIN_TABS.includes(activeTab) ? activeTab : 'overview';

  const handleTabChange = (tabId: string) => {
    const clean = resolveTab(tabId);
    setLocalActiveTab(clean);
    if (onSelectTab) {
      onSelectTab(clean);
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Trigger state refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const forceRefresh = () => setRefreshKey((k) => k + 1);

  // Always reset scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentTab]);

  // Strict role guard: 403 Forbidden for students (accessible by admin and teacher)
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-3xl bg-[#0b1329] p-8 border border-rose-500/40 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl">
          ⛔
        </div>
        <h2 className="text-xl font-bold text-white font-alexandria">403 Forbidden — غير مصرح بالوصول</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          لوحة الإدارة والمعلم مقتصرة حصرياً على مديري النظام والمشرفين والمعلمين المصرح لهم.
        </p>
      </div>
    );
  }

  // Live Database Queries — depend on refreshKey so re-reads after mutations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profiles = React.useMemo(() => db.getProfiles(), [refreshKey]);
  const students = profiles.filter((p) => p.role === 'student');
  const supervisors = profiles.filter((p) => p.role === 'teacher');
  const allStudentsAndSupervisors = profiles.filter((p) => p.role === 'student' || p.role === 'teacher');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subjects = React.useMemo(() => db.getSubjects(), [refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lessons = React.useMemo(() => db.getLessons(), [refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const exams = React.useMemo(() => db.getExaminations(), [refreshKey]);
  const requests = db.getSubscriptionRequests();
  const certs = db.getCertificates();
  const notifs = db.getNotifications('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const attempts = React.useMemo(() => db.getExamAttempts(), [refreshKey]);
  const pendingEssays = attempts.filter((a) => a.status === 'under_review');
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  // Stats for distribution
  const freeStudents = students.filter((s) => s.subscriptionTier === 'free').length;
  const premiumStudents = students.filter((s) => s.subscriptionTier === 'premium').length;
  const freePercent = students.length > 0 ? Math.round((freeStudents / students.length) * 100) : 50;
  const premiumPercent = students.length > 0 ? Math.round((premiumStudents / students.length) * 100) : 50;

  // Student & Supervisor Filter & Modal State
  const [studentTabFilter, setStudentTabFilter] = useState<'all' | 'students' | 'supervisors'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddSupervisorModal, setShowAddSupervisorModal] = useState(false);
  const [supFullName, setSupFullName] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPassword, setSupPassword] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supGovernorate, setSupGovernorate] = useState('القاهرة');

  // Desktop Sidebar Collapse & Mobile Drawer States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Student Promotion to Supervisor Modal State
  const [promoteTargetStudent, setPromoteTargetStudent] = useState<UserProfile | null>(null);
  const [promoteSubjectId, setPromoteSubjectId] = useState<string>('sub-arabic');

  // Form states: New Subject
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('BookOpen');
  const [newSubColor, setNewSubColor] = useState('#22d3ee');

  // Form states: New Lesson
  const [lessonSubjectId, setLessonSubjectId] = useState(subjects[0]?.id || '');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTeacher, setLessonTeacher] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonPdfUrl, setLessonPdfUrl] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonImages, setLessonImages] = useState<string[]>([]);
  const [isUploadingLessonImages, setIsUploadingLessonImages] = useState(false);
  const [lessonFilterSubject, setLessonFilterSubject] = useState<string>('all');

  // Form states: AI Question Bank
  const [aiSubjectId, setAiSubjectId] = useState(subjects[0]?.id || '');
  const [aiBankTitle, setAiBankTitle] = useState('');
  const [aiArticleText, setAiArticleText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  // Form states: New Exam Manual (Supports 3 Question Types + Images)
  interface AdminExamQuestionItem {
    text: string;
    type: 'mcq' | 'fill_blank' | 'essay';
    choices: string[];
    correctIdx: number;
    correctBlankAnswer?: string;
    modelAnswer?: string;
    imageUrl?: string;
    points: number;
  }

  const [examSubjectId, setExamSubjectId] = useState(subjects[0]?.id || '');
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState('10');
  const [examPassing, setExamPassing] = useState('50');
  const [antiTabSwitch, setAntiTabSwitch] = useState(true);
  const [randomizeOrder, setRandomizeOrder] = useState(true);
  const [manualQuestions, setManualQuestions] = useState<AdminExamQuestionItem[]>([
    { text: '', type: 'mcq', choices: ['', '', '', ''], correctIdx: 0, points: 5 },
  ]);

  const handleAdminQuestionImageUpload = (qIdx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setManualQuestions((prev) =>
        prev.map((item, i) => (i === qIdx ? { ...item, imageUrl: dataUrl } : item))
      );
    };
    reader.readAsDataURL(file);
  };

  // Form states: New Notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('announcement');

  // Payments review tab state
  const [paymentsSubTab, setPaymentsSubTab] = useState<'pending' | 'history'>('pending');

  // Student details modal state
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<UserProfile | null>(null);

  // Lesson video type state
  const [lessonVideoType, setLessonVideoType] = useState<'youtube' | 'direct'>('youtube');

  // Essay Grading states
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({});
  const [aiGradingLoading, setAiGradingLoading] = useState<Record<string, boolean>>({});

  const handleAiAutoGrade = async (
    attemptId: string,
    questionId: string,
    questionText: string,
    modelAnswer: string,
    studentAnswer: string,
    points: number
  ) => {
    const key = `${attemptId}_${questionId}`;
    setAiGradingLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await gradeEssayWithAi(questionText, modelAnswer, studentAnswer, points);
      setGradingScores((prev) => ({ ...prev, [key]: res.suggestedScore }));
      setGradingFeedbacks((prev) => ({ ...prev, [key]: res.feedback }));
    } finally {
      setAiGradingLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleConfirmGrade = (
    attemptId: string,
    questionId: string,
    maxPoints: number
  ) => {
    if (!user) return;
    const key = `${attemptId}_${questionId}`;
    const score = gradingScores[key] !== undefined ? gradingScores[key] : maxPoints;
    const feedback = gradingFeedbacks[key] || 'تم تصحيح الإجابة واعتمادها بنجاح.';

    db.gradeEssaySubmission(attemptId, questionId, score, feedback, user.id);
    forceRefresh();
    alert('تم اعتماد الدرجة وحفظ النتيجة النهائية وإشعار الطالب! 🎉');
  };

  // --- Handlers ---
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    db.saveSubject({
      nameAr: newSubName.trim(),
      icon: newSubIcon,
      colorPrimary: newSubColor,
      colorSecondary: newSubColor,
    });
    setNewSubName('');
    forceRefresh();
  };

  const handleDeleteSubject = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
      db.deleteSubject(id);
      forceRefresh();
    }
  };

  const handleLessonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingLessonImages(true);
    try {
      for (const file of Array.from(files)) {
        const { url, error } = await sbUploadLessonImage(file);
        if (error) {
          alert(`تعذر رفع الصورة (${file.name}): ${error}`);
        } else if (url) {
          setLessonImages((prev) => [...prev, url]);
        }
      }
    } finally {
      setIsUploadingLessonImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveLessonImage = async (idx: number) => {
    const targetUrl = lessonImages[idx];
    setLessonImages((prev) => prev.filter((_, i) => i !== idx));
    if (targetUrl) {
      await sbDeleteLessonImage(targetUrl);
    }
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      alert('يرجى كتابة عنوان الدرس');
      return;
    }
    const targetSubId = lessonSubjectId || subjects[0]?.id;
    db.saveLesson({
      subjectId: targetSubId,
      title: lessonTitle.trim(),
      teacherName: lessonTeacher.trim() || 'أستاذ المادة',
      videoUrl: lessonVideoUrl.trim(),
      videoType: lessonVideoType,
      pdfUrl: lessonPdfUrl.trim(),
      contentHtml: `<div class="space-y-4 text-slate-200 leading-relaxed"><p>${lessonContent.replace(/\n/g, '<br/>')}</p></div>`,
      summary: lessonSummary.trim() || 'ملخص الدرس مضاف من لوحة الإدارة.',
      images: lessonImages,
      isPublished: true,
      isFreePreview: true,
    });

    setLessonTitle('');
    setLessonTeacher('');
    setLessonVideoUrl('');
    setLessonPdfUrl('');
    setLessonContent('');
    setLessonSummary('');
    setLessonImages([]);
    forceRefresh();
    alert('تم إضافة الدرس بنجاح!');
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
  const [editLessonTeacher, setEditLessonTeacher] = useState('');
  const [editLessonSubId, setEditLessonSubId] = useState('');
  const [editLessonVideo, setEditLessonVideo] = useState('');
  const [editLessonPdf, setEditLessonPdf] = useState('');
  const [editLessonSummary, setEditLessonSummary] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');
  const [editLessonDuration, setEditLessonDuration] = useState(20);
  const [editLessonImages, setEditLessonImages] = useState<string[]>([]);
  const [isUploadingEditImages, setIsUploadingEditImages] = useState(false);

  const handleEditLessonImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingEditImages(true);
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
      setIsUploadingEditImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveEditLessonImage = async (idx: number) => {
    const targetUrl = editLessonImages[idx];
    setEditLessonImages((prev) => prev.filter((_, i) => i !== idx));
    if (targetUrl) {
      await sbDeleteLessonImage(targetUrl);
    }
  };

  const handleStartEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setEditLessonTitle(lesson.title);
    setEditLessonTeacher(lesson.teacherName || 'مشرف المادة');
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

    const targetSub = subjects.find((s) => s.id === (editLessonSubId || editingLesson.subjectId));

    const updated = db.saveLesson({
      id: editingLesson.id,
      subjectId: editLessonSubId || editingLesson.subjectId,
      title: editLessonTitle.trim(),
      teacherName: editLessonTeacher.trim() || 'مشرف المادة',
      videoUrl: editLessonVideo.trim() || undefined,
      videoType: 'youtube',
      pdfUrl: editLessonPdf.trim() || undefined,
      images: editLessonImages,
      summary: editLessonSummary.trim() || undefined,
      contentHtml: editLessonContent.trim()
        ? `<div class="space-y-4 text-slate-200 leading-relaxed"><p>${editLessonContent.trim().replace(/\n/g, '<br/>')}</p></div>`
        : editingLesson.contentHtml,
      durationMinutes: Number(editLessonDuration) || 20,
    });

    // Broadcast in-app notification to students
    const allStudentsList = db.getProfiles().filter((p) => p.role === 'student');
    allStudentsList.forEach((s) => {
      db.createNotification({
        userId: s.id,
        title: `تعديل وإشعار في درس: ${updated.title} 📚`,
        message: `قام المشرف بتحديث محتوى وشرح درس "${updated.title}" في مادة ${targetSub?.nameAr || 'المادة'}. اطّلع على الشرح والتحديثات الجديدة الآن!`,
        type: 'info',
        linkUrl: `/lesson/${updated.id}`,
      });
    });

    // Browser Push Notification
    sendBrowserNotification(
      'تحديث محتوى دراسي 📚',
      `قام المشرف بتحديث درس "${updated.title}" في مادة ${targetSub?.nameAr || 'المادة'}`
    );

    alert(`تم تعديل الدرس بنجاح وإرسال إشعار فوري لجميع الطلاب! 🔔`);
    setEditingLesson(null);
    forceRefresh();
  };

  const handleGenerateAiQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiArticleText.trim()) {
      alert('يرجى لصق نص أو ملزمة لتحليلها');
      return;
    }
    setAiGenerating(true);
    setAiSuccessMsg('');

    try {
      const sub = db.getSubjectById(aiSubjectId) || subjects[0];
      const questionsData = await generateQuestionsFromText(aiArticleText, sub?.nameAr || 'المادة');

      // Create exam
      const newExam = db.saveExamination({
        subjectId: sub?.id || 'sub-arabic',
        title: aiBankTitle.trim() || `بنك أسئلة ذكي — ${sub?.nameAr}`,
        description: 'بنك أسئلة تم إنشاؤه وتوليده بالذكاء الاصطناعي من مذكرات المنهج.',
        timeLimitMinutes: 10,
        passingPercentage: 50,
        randomizeQuestions: true,
        antiCheatingTabSwitch: true,
        allowsCertificate: true,
      });

      // Save questions
      questionsData.forEach((q, idx) => {
        db.saveQuestion({
          examId: newExam.id,
          questionText: q.questionText,
          questionType: q.questionType || 'mcq',
          points: q.points || (q.questionType === 'essay' ? 5.0 : 2.0),
          orderIndex: idx + 1,
          explanation: q.explanation,
          modelAnswer: q.modelAnswer || '',
          choices: (q.choices || []).map((text, cIdx) => ({
            id: `c-${Date.now()}-${idx}-${cIdx}`,
            questionId: '',
            choiceText: text,
            isCorrect: cIdx === q.correctAnswerIndex,
            orderIndex: cIdx + 1,
          })),
        });
      });

      setAiSuccessMsg(`تم بنجاح توليد وحفظ ${questionsData.length} أسئلة في بنك الأسئلة!`);
      setAiArticleText('');
      setAiBankTitle('');
      forceRefresh();
    } catch (err) {
      alert('حدث خطأ أثناء توليد الأسئلة، يرجى المحاولة مرة أخرى.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateManualExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      alert('يرجى كتابة عنوان الاختبار');
      return;
    }
    const sub = db.getSubjectById(examSubjectId) || subjects[0];
    const newExam = db.saveExamination({
      subjectId: sub?.id || 'sub-arabic',
      title: examTitle.trim(),
      description: 'اختبار رسمي شامل تم إعداده من قبل الإدارة.',
      timeLimitMinutes: parseInt(examDuration) || 10,
      passingPercentage: parseInt(examPassing) || 50,
      antiCheatingTabSwitch: antiTabSwitch,
      randomizeQuestions: randomizeOrder,
      allowsCertificate: true,
    });

    manualQuestions.forEach((q, idx) => {
      if (!q.text.trim()) return;
      if (q.type === 'essay') {
        db.saveQuestion({
          examId: newExam.id,
          questionText: q.text.trim(),
          questionType: 'essay',
          points: q.points || 10,
          orderIndex: idx + 1,
          imageUrl: q.imageUrl || undefined,
          modelAnswer: q.modelAnswer?.trim() || 'نموذج الإجابة الوزاري المعتمد',
        });
      } else if (q.type === 'fill_blank') {
        db.saveQuestion({
          examId: newExam.id,
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
          examId: newExam.id,
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

    setExamTitle('');
    setManualQuestions([{ text: '', type: 'mcq', choices: ['', '', '', ''], correctIdx: 0, points: 5 }]);
    forceRefresh();
    alert('تم حفظ الاختبار بنجاح!');
  };

  const handleDeleteExam = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
      db.deleteExamination(id);
      forceRefresh();
    }
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    db.createNotification({
      userId: '', // Broadcast to all
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: 'info',
    });
    setNotifTitle('');
    setNotifMessage('');
    forceRefresh();
    alert('تم إرسال الإشعار لجميع الطلاب بنجاح!');
  };

  const handleToggleSuspendStudent = (studentId: string, currentStatus: boolean) => {
    db.updateProfile(studentId, { isSuspended: !currentStatus });
    forceRefresh();
  };

  const handleChangeStudentTier = (studentId: string, tier: SubscriptionTier) => {
    db.updateProfile(studentId, { subscriptionTier: tier });
    forceRefresh();
  };

  const handleOpenPromoteModal = (student: UserProfile) => {
    setPromoteTargetStudent(student);
    setPromoteSubjectId(subjects[0]?.id || 'sub-arabic');
  };

  const handleConfirmPromote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promoteTargetStudent) return;

    db.updateProfile(promoteTargetStudent.id, { role: 'teacher' });

    if (promoteSubjectId === 'all') {
      subjects.forEach((s) => db.assignTeacherToSubject(promoteTargetStudent.id, s.id));
    } else {
      db.assignTeacherToSubject(promoteTargetStudent.id, promoteSubjectId);
    }

    const subName =
      promoteSubjectId === 'all'
        ? 'كافة المواد'
        : (subjects.find((s) => s.id === promoteSubjectId)?.nameAr || 'المادة');

    forceRefresh();
    setPromoteTargetStudent(null);
    alert(`تمت ترقية "${promoteTargetStudent.fullName}" بنجاح ليصبح مشرفاً ومعلماً لمادة (${subName})! 🎉`);
  };

  const handlePromoteStudent = (studentId: string) => {
    const student = profiles.find((p) => p.id === studentId);
    if (student) {
      handleOpenPromoteModal(student);
    }
  };

  const handleDemoteSupervisor = (supervisorId: string) => {
    if (confirm('هل تريد بالتأكيد إرجاع هذا المشرف إلى رتبة طالب؟')) {
      db.updateProfile(supervisorId, { role: 'student' });
      // Remove teacher assignments
      const list = db.getTeacherAssignments().filter((a) => a.teacherId !== supervisorId);
      db.saveTeacherAssignments(list);
      forceRefresh();
      alert('تم إرجاع الحساب إلى رتبة طالب بنجاح.');
    }
  };

  const handleCreateSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supFullName.trim() || !supEmail.trim() || !supPassword.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم، البريد، كلمة المرور)');
      return;
    }
    const cleanEmail = supEmail.trim().toLowerCase();
    const existing = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      alert('هذا البريد الإلكتروني مسجل بالفعل بحساب آخر');
      return;
    }

    db.createProfile({
      fullName: supFullName.trim(),
      email: cleanEmail,
      password: supPassword,
      role: 'teacher',
      phoneNumber: supPhone.trim() || '01000000000',
      governorate: supGovernorate,
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
      isSuspended: false,
    });

    setSupFullName('');
    setSupEmail('');
    setSupPassword('');
    setSupPhone('');
    setShowAddSupervisorModal(false);
    forceRefresh();
    alert('تم إضافة حساب المشرف بنجاح!');
  };

  const handleDeleteStudent = (studentId: string) => {
    const target = profiles.find((p) => p.id === studentId);
    const name = target?.fullName || 'هذا الحساب';
    if (confirm(`⚠️ هل تريد بالتأكيد حذف حساب "${name}" نهائياً من المنصة وقاعدة البيانات؟\nسيتم حذف حسابه وكافة درجاته ومحاولاته فوراً وبشكل دائم.`)) {
      db.deleteProfile(studentId);
      forceRefresh();
      alert(`تم حذف حساب "${name}" نهائياً بنجاح.`);
    }
  };

  const filteredUsers = allStudentsAndSupervisors.filter((u) => {
    if (studentTabFilter === 'students' && u.role !== 'student') return false;
    if (studentTabFilter === 'supervisors' && u.role !== 'teacher') return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = (u.phoneNumber || '').includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  // Nav Items (9 exact tabs)
  const navTabs = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutGrid },
    { id: 'students', label: 'الطلاب والمشرفون', icon: Users },
    { id: 'subjects', label: 'المواد', icon: Layers },
    { id: 'lessons', label: 'الدروس', icon: BookOpen },
    { id: 'exams', label: 'الاختبارات', icon: ClipboardList },
    { id: 'grading', label: 'التصحيح', icon: FileCheck },
    { id: 'payments', label: 'المدفوعات', icon: CreditCard },
    { id: 'certificates', label: 'الشهادات', icon: Award },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
  ];

  return (
    <div className="w-full flex-1 flex min-h-screen">
      
      {/* 1. Admin Sidebar (Right side in RTL, Desktop sticky full-height, Collapsible) */}
      <aside
        className={`shrink-0 hidden md:flex flex-col justify-between bg-[#080d1a]/95 backdrop-blur-xl border-l border-cyan-500/15 h-screen sticky top-0 z-30 shadow-2xl transition-all duration-300 overflow-y-auto ${
          isDesktopCollapsed ? 'w-20 p-3' : 'w-64 p-4'
        }`}
      >
        <div className="space-y-5">
          {/* Top Logo & Platform Name + Collapse Toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15">
            <div className={`flex items-center gap-3 overflow-hidden ${isDesktopCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
                🪐
              </div>
              {!isDesktopCollapsed && (
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white tracking-wide truncate">كوكب تالتة إعدادي</div>
                  <div className="text-[11px] text-cyan-400 flex items-center gap-1 mt-0.5 font-bold truncate">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>لوحة الإدارة</span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button */}
            {!isDesktopCollapsed && (
              <button
                onClick={() => setIsDesktopCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors shrink-0"
                title="طي الشريط الجانبي"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand Button When Collapsed */}
          {isDesktopCollapsed && (
            <div className="flex justify-center">
              <button
                onClick={() => setIsDesktopCollapsed(false)}
                className="p-1.5 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors"
                title="توسيع الشريط الجانبي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 9 Navigation Tabs */}
          <nav className="space-y-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              let badgeCount = 0;
              if (tab.id === 'grading') badgeCount = pendingEssays.length;
              if (tab.id === 'payments') badgeCount = pendingRequests.length;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={isDesktopCollapsed ? tab.label : undefined}
                  className={`w-full flex items-center ${
                    isDesktopCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    {!isDesktopCollapsed && <span>{tab.label}</span>}
                  </div>
                  {badgeCount > 0 && (
                    isDesktopCollapsed ? (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {badgeCount}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                        {badgeCount}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Teacher Dashboard & Student View & Logout */}
        <div className={`pt-4 border-t border-cyan-500/15 space-y-2 ${isDesktopCollapsed ? 'px-0' : 'px-2'}`}>
          {onNavigateToTeacher && (
            <button
              onClick={onNavigateToTeacher}
              title="لوحة تحكم المعلم"
              className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-purple-950/40 text-purple-300 border border-purple-500/30 transition-all shadow-sm ${
                isDesktopCollapsed ? 'p-2.5' : 'px-3 py-2.5'
              }`}
            >
              <span>👨‍🏫</span>
              {!isDesktopCollapsed && <span>لوحة المعلم</span>}
            </button>
          )}

          <button
            onClick={() => onNavigateToStudent && onNavigateToStudent()}
            title="رجوع لواجهة الطالب"
            className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 transition-all shadow-sm ${
              isDesktopCollapsed ? 'p-2.5' : 'px-3 py-2.5'
            }`}
          >
            <span>↩</span>
            {!isDesktopCollapsed && <span>واجهة الطالب</span>}
          </button>

          <button
            onClick={() => logout()}
            title="تسجيل الخروج"
            className={`w-full flex items-center justify-center gap-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all shadow-sm ${
              isDesktopCollapsed ? 'p-2.5' : 'px-3 py-2'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isDesktopCollapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Matches Student Sidebar behavior, replaces old cramped horizontal bar) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#080d1a] border-l border-cyan-500/20 shadow-2xl flex flex-col justify-between p-4 z-10 overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md text-white font-black text-lg">
                    🪐
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white font-alexandria">كوكب تالتة إعدادي</div>
                    <div className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>لوحة الإدارة والمعلم</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="space-y-1">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  let badgeCount = 0;
                  if (tab.id === 'grading') badgeCount = pendingEssays.length;
                  if (tab.id === 'payments') badgeCount = pendingRequests.length;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleTabChange(tab.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                      {badgeCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
              {onNavigateToTeacher && (
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    onNavigateToTeacher();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-purple-950/40 text-purple-300 border border-purple-500/30 transition-all"
                >
                  <span>لوحة تحكم المعلم 👨‍🏫</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  if (onNavigateToStudent) onNavigateToStudent();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#0c1427] hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 transition-all"
              >
                <span>رجوع لواجهة الطالب ↩</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main View Content Area (Left side in RTL) */}
      <div className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Navbar inside content column */}
        <Navbar onNavigate={onNavigate || (() => {})} onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="admin-content-area flex-1 p-4 sm:p-6 lg:p-8">
        <div key={currentTab} className="animate-page-in w-full space-y-6">
        
        {/* TAB 1: نظرة عامة (Matches Screenshot 2026-10-15 184102.png) */}
        {currentTab === 'overview' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              نظرة عامة على المنصة
            </h1>

            {/* Top 5 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-md">
                <Users className="w-5 h-5 mx-auto text-cyan-400" />
                <div className="text-2xl font-extrabold text-white font-mono">{students.length}</div>
                <div className="text-[11px] text-slate-400">إجمالي الطلاب</div>
              </div>

              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-md">
                <BookOpen className="w-5 h-5 mx-auto text-cyan-400" />
                <div className="text-2xl font-extrabold text-white font-mono">{lessons.length}</div>
                <div className="text-[11px] text-slate-400">الدروس</div>
              </div>

              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-md">
                <ClipboardList className="w-5 h-5 mx-auto text-cyan-400" />
                <div className="text-2xl font-extrabold text-white font-mono">{exams.length}</div>
                <div className="text-[11px] text-slate-400">الاختبارات</div>
              </div>

              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-md">
                <CreditCard className="w-5 h-5 mx-auto text-cyan-400" />
                <div className="text-2xl font-extrabold text-white font-mono">{pendingRequests.length}</div>
                <div className="text-[11px] text-slate-400">مدفوعات معلقة</div>
              </div>

              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 shadow-md">
                <Award className="w-5 h-5 mx-auto text-cyan-400" />
                <div className="text-2xl font-extrabold text-white font-mono">{certs.length}</div>
                <div className="text-[11px] text-slate-400">الشهادات الصادرة</div>
              </div>
            </div>

            {/* جدول توزيع الباقات (Matches Screenshot 2026-10-15 184102.png) */}
            <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-5">
              <h2 className="text-sm font-bold text-slate-200">جدول توزيع الباقات</h2>
              
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
                <span>الباقة</span>
                <span>إجمالي الطلاب: {students.length}</span>
              </div>

              <div className="space-y-4">
                {/* المجانية */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs text-slate-300 font-medium">المجانية</span>
                  </div>

                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${freePercent}%` }}
                    />
                  </div>

                  <span className="text-xs text-slate-400 font-mono w-24 text-left">
                    {freeStudents} طالب - {freePercent}%
                  </span>
                </div>

                {/* المميزة */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="text-xs text-slate-300 font-medium">المميزة</span>
                  </div>

                  <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${premiumPercent}%` }}
                    />
                  </div>

                  <span className="text-xs text-slate-400 font-mono w-24 text-left">
                    {premiumStudents} طالب - {premiumPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: الطلاب والمشرفون */}
        {currentTab === 'students' && (
          <div className="space-y-6 max-w-5xl">
            {/* Header + Add Supervisor Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">
                  إدارة الطلاب والمشرفين ({allStudentsAndSupervisors.length})
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  متابعة حسابات الطلاب، ترقية المشرفين والمعلمين، وإدارة الصلاحيات والاشتراكات
                </p>
              </div>

              <button
                onClick={() => setShowAddSupervisorModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مشرف جديد</span>
              </button>
            </div>

            {/* Search & Filter Pills */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0c1427]/80 p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setStudentTabFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    studentTabFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل ({allStudentsAndSupervisors.length})
                </button>
                <button
                  onClick={() => setStudentTabFilter('students')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    studentTabFilter === 'students'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🎓 الطلاب فقط ({students.length})
                </button>
                <button
                  onClick={() => setStudentTabFilter('supervisors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    studentTabFilter === 'supervisors'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🛡️ المشرفون والمعلمون ({supervisors.length})
                </button>
              </div>
            </div>

            {/* Accounts List */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-[#0c1427]/60 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  لا توجد نتائج مطابقة لبحثك.
                </div>
              ) : (
                filteredUsers.map((item) => {
                  const initial = item.fullName.charAt(0).toUpperCase() || 'U';
                  const isSupervisor = item.role === 'teacher';

                  return (
                    <div
                      key={item.id}
                      className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all hover:border-slate-700/80"
                    >
                      {/* Right side in RTL: Avatar, Name, Email, Badges */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 border ${
                            isSupervisor
                              ? 'bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                              : 'bg-[#162744] text-cyan-300 border-cyan-500/20'
                          }`}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{item.fullName}</span>
                            {isSupervisor ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-bold flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-cyan-400" />
                                  <span>مشرف ومعلم</span>
                                </span>
                                {(() => {
                                  const assignments = db.getTeacherAssignments(item.id);
                                  const subjectNames = assignments.map((a) => a.subjectName).join(' • ');
                                  return (
                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-medium">
                                      📚 {subjectNames || 'مشرف عام'}
                                    </span>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                                طالب
                              </span>
                            )}
                            {item.governorate && (
                              <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                                {item.governorate}
                              </span>
                            )}
                            {item.isSuspended && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
                                موقوف مؤقتاً
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                            <span>{item.email}</span>
                            <span>✉</span>
                            {item.phoneNumber && (
                              <span className="text-slate-500">| {item.phoneNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Left side in RTL: Dropdown, Buttons, Delete */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedStudentForDetails(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all shadow-sm"
                          title="عرض الملف الشامل للحساب"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>التفاصيل</span>
                        </button>

                        {/* Subscription Tier Dropdown (For Students) */}
                        {!isSupervisor && (
                          <select
                            value={item.subscriptionTier}
                            onChange={(e) => handleChangeStudentTier(item.id, e.target.value as SubscriptionTier)}
                            className="bg-[#070b14] border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyan-500 outline-none"
                            title="تعديل باقة الاشتراك"
                          >
                            <option value="free">المجانية</option>
                            <option value="standard">القياسية</option>
                            <option value="premium">المميزة</option>
                          </select>
                        )}

                        {/* Suspend / Activate Button */}
                        <button
                          onClick={() => handleToggleSuspendStudent(item.id, item.isSuspended)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            item.isSuspended
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                        >
                          {item.isSuspended ? 'تفعيل' : 'إيقاف مؤقت'}
                        </button>

                        {/* Supervisor Toggle Actions */}
                        {!isSupervisor ? (
                          <button
                            onClick={() => handleOpenPromoteModal(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-950/60 text-cyan-300 hover:text-white hover:bg-cyan-900/60 border border-cyan-500/30 transition-all shadow-sm"
                            title="ترقية الحساب واختيار المادة التي يشرف عليها"
                          >
                            <Shield className="w-3.5 h-3.5 text-cyan-400" />
                            <span>ترقية لمشرف</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDemoteSupervisor(item.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
                            title="إلغاء صفة الإشراف وتنزيل الحساب إلى طالب"
                          >
                            <ArrowRight className="w-3.5 h-3.5 rotate-180 text-amber-400" />
                            <span>تنزيل لطالب</span>
                          </button>
                        )}

                        {/* Delete Account Button */}
                        <button
                          onClick={() => handleDeleteStudent(item.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: المواد (Matches Screenshot 2026-10-15 184127.png) */}
        {currentTab === 'subjects' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              إدارة المواد
            </h1>

            {/* إضافة مادة جديدة form */}
            <form onSubmit={handleCreateSubject} className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-5 shadow-md space-y-4">
              <h2 className="text-sm font-bold text-slate-200">إضافة مادة جديدة</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="اسم المادة"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="flex-1 w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />

                <select
                  value={newSubIcon}
                  onChange={(e) => setNewSubIcon(e.target.value)}
                  className="w-full sm:w-36 bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                >
                  <option value="BookOpen">BookOpen</option>
                  <option value="Sigma">Sigma</option>
                  <option value="FlaskConical">FlaskConical</option>
                  <option value="Moon">Moon</option>
                  <option value="Palette">Palette</option>
                  <option value="Languages">Languages</option>
                  <option value="Globe">Globe</option>
                  <option value="Cpu">Cpu</option>
                </select>

                <div className="flex items-center gap-2 bg-[#070b14] border border-slate-800 rounded-xl px-3 py-1.5 w-full sm:w-auto">
                  <input
                    type="color"
                    value={newSubColor}
                    onChange={(e) => setNewSubColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{newSubColor}</span>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </form>

            {/* 2-Column Grid of Subjects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: `${sub.colorPrimary}25`, color: sub.colorPrimary }}
                    >
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-white">{sub.nameAr}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="حذف المادة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: الدروس (Matches Screenshot 2026-10-15 184141.png) */}
        {currentTab === 'lessons' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              إدارة الدروس
            </h1>

            {/* إضافة درس جديد Form */}
            <form onSubmit={handleCreateLesson} className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4">
              <h2 className="text-sm font-bold text-slate-200">إضافة درس جديد</h2>

              {/* 1. اختر المادة */}
              <div>
                <select
                  value={lessonSubjectId}
                  onChange={(e) => setLessonSubjectId(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. عنوان الدرس */}
              <div>
                <input
                  type="text"
                  placeholder="عنوان الدرس"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 3. اسم المعلم */}
              <div>
                <input
                  type="text"
                  placeholder="اسم المعلم"
                  value={lessonTeacher}
                  onChange={(e) => setLessonTeacher(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 4. رفع صور للدرس إلى Supabase Storage */}
              <div className="border border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-4 text-center cursor-pointer relative bg-[#070b14]/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={isUploadingLessonImages}
                  onChange={handleLessonImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-center gap-2 text-slate-300 text-xs">
                  {isUploadingLessonImages ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-cyan-400 font-bold">جارٍ رفع الصور وحفظها في Supabase Storage...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span>رفع صور ومخططات الدرس إلى سحابة Supabase Storage (يمكنك اختيار صور متعددة)</span>
                    </>
                  )}
                </div>
              </div>

              {/* Uploaded images previews */}
              {lessonImages.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">الصور المرفوعة المحفوظة في الدرس ({lessonImages.length}):</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {lessonImages.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-cyan-500/30 group shadow-md bg-slate-900">
                        <img src={img} alt="lesson" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveLessonImage(idx)}
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

              {/* 5. نوع ورابط الفيديو (YouTube أو مباشر) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={lessonVideoType}
                  onChange={(e: any) => setLessonVideoType(e.target.value)}
                  className="bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:border-cyan-500 outline-none"
                >
                  <option value="youtube">يوتيوب (YouTube)</option>
                  <option value="direct">فيديو مباشر (MP4 / WebM)</option>
                </select>

                <input
                  type="text"
                  placeholder={lessonVideoType === 'youtube' ? 'رابط فيديو يوتيوب (https://...)' : 'رابط ملف الفيديو المباشر (.mp4)'}
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="sm:col-span-2 w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                />
              </div>

              {/* 6. رابط ملف PDF */}
              <div>
                <input
                  type="text"
                  placeholder="رابط ملف PDF"
                  value={lessonPdfUrl}
                  onChange={(e) => setLessonPdfUrl(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                />
              </div>

              {/* 7. الشرح */}
              <div>
                <textarea
                  rows={4}
                  placeholder="الشرح"
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* 8. الملخص */}
              <div>
                <textarea
                  rows={2}
                  placeholder="الملخص"
                  value={lessonSummary}
                  onChange={(e) => setLessonSummary(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Submit button on left in RTL */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm transition-all shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </form>

            {/* Filter by subject */}
            <div className="flex justify-start">
              <select
                value={lessonFilterSubject}
                onChange={(e) => setLessonFilterSubject(e.target.value)}
                className="bg-[#0c1427] border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:border-cyan-500 outline-none"
              >
                <option value="all">كل المواد</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Added lessons list */}
            <div className="space-y-3">
              {lessons
                .filter((l) => lessonFilterSubject === 'all' || l.subjectId === lessonFilterSubject)
                .map((les) => {
                  const sub = subjects.find((s) => s.id === les.subjectId);

                  return (
                    <div
                      key={les.id}
                      className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{les.title}</span>
                          <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                            {sub?.nameAr || 'المادة'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>المعلم: {les.teacherName || 'الإدارة'}</span>
                          {les.videoUrl && <span>🎥 فيديو متوفر</span>}
                          {les.pdfUrl && <span>📄 ملف PDF</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditLesson(les)}
                          className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="تعديل الدرس وإشعار الطلاب"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(les.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="حذف الدرس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Edit Lesson Modal */}
            {editingLesson && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
                        className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">المادة:</label>
                        <select
                          value={editLessonSubId}
                          onChange={(e) => setEditLessonSubId(e.target.value)}
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.nameAr}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">اسم المعلم / الموجه:</label>
                        <input
                          type="text"
                          value={editLessonTeacher}
                          onChange={(e) => setEditLessonTeacher(e.target.value)}
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">المدة التقريبية (دقيقة):</label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={editLessonDuration}
                          onChange={(e) => setEditLessonDuration(Number(e.target.value))}
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
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
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-300 font-bold block">رابط ملزمة الشرح (PDF):</label>
                        <input
                          type="url"
                          value={editLessonPdf}
                          onChange={(e) => setEditLessonPdf(e.target.value)}
                          placeholder="https://.../lesson.pdf"
                          className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block">ملخص الدرس:</label>
                      <textarea
                        rows={2}
                        value={editLessonSummary}
                        onChange={(e) => setEditLessonSummary(e.target.value)}
                        placeholder="ملخص يظهر للطلاب..."
                        className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-300 font-bold block">المحتوى النصي المفصل:</label>
                      <textarea
                        rows={4}
                        value={editLessonContent}
                        onChange={(e) => setEditLessonContent(e.target.value)}
                        placeholder="الشرح المكتوب..."
                        className="w-full bg-[#070b14] border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                      />
                    </div>

                    {/* الصور التوضيحية المرفقة بالدرس (Supabase Storage) */}
                    <div className="space-y-2">
                      <label className="text-slate-300 font-bold block">الرسومات والصور التوضيحية (Supabase Storage):</label>
                      <div className="border border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-xl p-3 text-center cursor-pointer relative bg-[#070b14]/50 transition-colors">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={isUploadingEditImages}
                          onChange={handleEditLessonImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                        />
                        <div className="flex items-center justify-center gap-2 text-slate-300 text-xs">
                          {isUploadingEditImages ? (
                            <>
                              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-cyan-400 font-bold">جارٍ رفع وتحديث الصور في Supabase Storage...</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 text-cyan-400" />
                              <span>إضافة صور ومخططات جديدة إلى الدرس</span>
                            </>
                          )}
                        </div>
                      </div>

                      {editLessonImages.length > 0 && (
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          {editLessonImages.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-cyan-500/30 group shadow-md bg-slate-900">
                              <img src={img} alt="lesson" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveEditLessonImage(idx)}
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

                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-2 text-cyan-300 text-[11px]">
                      <Bell className="w-4 h-4 shrink-0 text-cyan-400" />
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
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
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

        {/* TAB 5: الاختبارات (Matches Screenshot 2026-10-15 184153.png) */}
        {currentTab === 'exams' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              إدارة الاختبارات
            </h1>

            {/* 1. AI Question Bank Box (Matches Screenshot 2026-10-15 184153.png) */}
            <div className="bg-[#0c1427]/90 border border-purple-500/30 rounded-2xl p-6 shadow-md space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="text-base font-bold text-white">توليد بنك أسئلة من مقال بالذكاء الاصطناعي</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  انسخ أي ملزمة أو مقال يحتوي على أسئلة وإجاباتها وسيحللها الذكاء الاصطناعي ويحولها تلقائياً إلى أسئلة اختيار من متعدد جاهزة للمراجعة والحفظ في بنك الأسئلة.
                </p>
              </div>

              {aiSuccessMsg && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold">
                  {aiSuccessMsg}
                </div>
              )}

              <form onSubmit={handleGenerateAiQuestions} className="space-y-3.5">
                <div>
                  <select
                    value={aiSubjectId}
                    onChange={(e) => setAiSubjectId(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-purple-500 outline-none"
                  >
                    {subjects.map((s) => (
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
                    value={aiBankTitle}
                    onChange={(e) => setAiBankTitle(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <textarea
                    rows={4}
                    placeholder="الصق هنا النص / الملزمة التي تحتوي على الأسئلة وإجاباتها..."
                    value={aiArticleText}
                    onChange={(e) => setAiArticleText(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={aiGenerating}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {aiGenerating ? 'جاري التحليل وتوليد الأسئلة...' : 'تحليل وإنشاء الأسئلة'}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Create Exam Manual Box (Matches Screenshot 2026-10-15 184153.png) */}
            <form onSubmit={handleCreateManualExam} className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4">
              <h2 className="text-sm font-bold text-slate-200">إنشاء اختبار جديد</h2>

              <div>
                <select
                  value={examSubjectId}
                  onChange={(e) => setExamSubjectId(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                >
                  {subjects.map((s) => (
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
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">مدة الاختبار (بالدقائق)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={(e) => setExamDuration(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">نسبة النجاح (%)</label>
                  <input
                    type="number"
                    value={examPassing}
                    onChange={(e) => setExamPassing(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Checkboxes matching Screenshot 2026-10-15 184153.png */}
              <div className="flex items-center gap-6 pt-1 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiTabSwitch}
                    onChange={(e) => setAntiTabSwitch(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0"
                  />
                  <span>⚠️ منع التبديل بين التبويبات</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeOrder}
                    onChange={(e) => setRandomizeOrder(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0"
                  />
                  <span>إعادة ترتيب الأسئلة والأجوبة عشوائياً لكل طالب</span>
                </label>
              </div>

              {/* Questions builder with 3 Types + Image Support */}
              <div className="space-y-4 pt-3 border-t border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">الأسئلة ({manualQuestions.length})</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setManualQuestions((prev) => [
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
                        setManualQuestions((prev) => [
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
                        setManualQuestions((prev) => [
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

                {manualQuestions.map((q, qIdx) => (
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
                              setManualQuestions((prev) =>
                                prev.map((item, i) => (i === qIdx ? { ...item, points: val } : item))
                              );
                            }}
                            className="w-14 bg-[#0c1427] border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono text-center"
                          />
                        </div>

                        {manualQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setManualQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
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
                        setManualQuestions((prev) =>
                          prev.map((item, i) => (i === qIdx ? { ...item, text: val } : item))
                        );
                      }}
                      required
                      className="w-full bg-[#0c1427] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                    />

                    {/* Image Attachment (e.g. Electrical Circuit diagram) */}
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
                              if (file) handleAdminQuestionImageUpload(qIdx, file);
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
                            setManualQuestions((prev) =>
                              prev.map((item, i) => (i === qIdx ? { ...item, imageUrl: val } : item))
                            );
                          }}
                          className="flex-1 bg-[#0c1427] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                        />
                        {q.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setManualQuestions((prev) =>
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
                              name={`correct-admin-${qIdx}`}
                              checked={q.correctIdx === cIdx}
                              onChange={() => {
                                setManualQuestions((prev) =>
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
                                setManualQuestions((prev) =>
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
                            setManualQuestions((prev) =>
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
                            setManualQuestions((prev) =>
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
                  <span>حفظ الاختبار</span>
                </button>
              </div>
            </form>

            {/* List of existing exams */}
            <div className="space-y-3">
              {exams.map((ex) => {
                const sub = subjects.find((s) => s.id === ex.subjectId);

                return (
                  <div
                    key={ex.id}
                    className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{ex.title}</span>
                        <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                          {sub?.nameAr || 'المادة'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-4">
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
              })}
            </div>
          </div>
        )}

        {/* TAB 6: التصحيح (Matches Screenshot 2026-10-15 184208.png) */}
        {currentTab === 'grading' && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                تصحيح الأسئلة المقالية
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                كل ما دون يُصحح تلقائياً عدا الأسئلة المقالية، وهنا تُصححها يدوياً أو بنقرة واحدة بالذكاء الاصطناعي.
              </p>
            </div>

            {pendingEssays.length === 0 ? (
              /* Empty state box from Screenshot 2026-10-15 184208.png */
              <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3 shadow-md">
                <FileCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-400">
                  لا توجد إجابات مقالية بانتظار التصحيح 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingEssays.map((att) => {
                  const examQuestions = db.getQuestionsByExam(att.examId);
                  const essayQuestions = examQuestions.filter((q) => q.questionType === 'essay');

                  return (
                    <div
                      key={att.id}
                      className="bg-[#0c1427]/95 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl"
                    >
                      {/* Attempt Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-white">{att.studentName}</span>
                            <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                              {att.subjectName || 'المادة'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 mt-1 block">
                            الاختبار: {att.examTitle} • تاريخ التسليم: {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString('ar-EG') : 'اليوم'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            قيد مراجعة المقالي
                          </span>
                          {att.violationCount > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                              مخالفات: {att.violationCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Essay Questions List */}
                      <div className="space-y-5">
                        {essayQuestions.map((q, qIndex) => {
                          const ans = att.answers?.[q.id];
                          const key = `${att.id}_${q.id}`;
                          const isAiLoading = !!aiGradingLoading[key];
                          const currentScore = gradingScores[key] !== undefined ? gradingScores[key] : (ans?.scoreAwarded ?? q.points);
                          const currentFeedback = gradingFeedbacks[key] !== undefined ? gradingFeedbacks[key] : (ans?.teacherFeedback ?? '');
                          const isAlreadyGraded = ans?.gradedBy !== undefined;

                          return (
                            <div
                              key={q.id}
                              className="rounded-2xl bg-[#070b14] border border-slate-800/80 p-5 space-y-4"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-cyan-400">
                                  سؤال مقالي {qIndex + 1} (الدرجة القصوى: {q.points})
                                </span>
                                {isAlreadyGraded && (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    تم الاعتماد مسبقاً ({ans?.scoreAwarded} درجة)
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-semibold text-white leading-relaxed">
                                {q.questionText}
                              </p>

                              {/* Student Answer */}
                              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 space-y-1">
                                <span className="text-[11px] text-slate-400 block font-bold">إجابة الطالب:</span>
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {ans?.essayAnswerText || '(لم يكتب الطالب إجابة)'}
                                </p>
                              </div>

                              {/* Model Answer */}
                              {q.modelAnswer && (
                                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                                  <span className="text-[11px] text-emerald-400 block font-bold">نموذج الإجابة الوزاري:</span>
                                  <p className="whitespace-pre-wrap leading-relaxed">{q.modelAnswer}</p>
                                </div>
                              )}

                              {/* AI One-Click Auto-Grading Button */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAiAutoGrade(
                                      att.id,
                                      q.id,
                                      q.questionText,
                                      q.modelAnswer || '',
                                      ans?.essayAnswerText || '',
                                      q.points
                                    )
                                  }
                                  disabled={isAiLoading}
                                  className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Bot className="w-4 h-4 text-purple-400" />
                                  <span>
                                    {isAiLoading
                                      ? 'جاري التحليل بالذكاء الاصطناعي...'
                                      : '🤖 تصحيح تلقائي بالذكاء الاصطناعي بنقرة واحدة'}
                                  </span>
                                </button>
                              </div>

                              {/* Grade inputs */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                                <div>
                                  <label className="text-[11px] text-slate-400 block mb-1">
                                    الدرجة المستحقة (من {q.points}):
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={q.points}
                                    step="0.5"
                                    value={currentScore}
                                    onChange={(e) =>
                                      setGradingScores((prev) => ({
                                        ...prev,
                                        [key]: Math.min(q.points, Math.max(0, parseFloat(e.target.value) || 0)),
                                      }))
                                    }
                                    className="w-full bg-[#0c1427] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 outline-none"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="text-[11px] text-slate-400 block mb-1">
                                    ملاحظات وتعليق المعلم:
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="اكتب ملاحظة أو تشجيع للطالب..."
                                    value={currentFeedback}
                                    onChange={(e) =>
                                      setGradingFeedbacks((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    className="w-full bg-[#0c1427] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                                  />
                                </div>
                              </div>

                              {/* Confirm single question button */}
                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmGrade(att.id, q.id, q.points)}
                                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>اعتماد الدرجة وإرسالها للطالب</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: المدفوعات (Matches Screenshot 2026-10-15 184219.png) */}
        {currentTab === 'payments' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              مراجعة المدفوعات
            </h1>

            {/* Sub-tabs: قيد المراجعة / سجل المراجعات */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
              <button
                onClick={() => setPaymentsSubTab('pending')}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                  paymentsSubTab === 'pending'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                قيد المراجعة ({pendingRequests.length})
              </button>
              <button
                onClick={() => setPaymentsSubTab('history')}
                className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                  paymentsSubTab === 'history'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                سجل المراجعات
              </button>
            </div>

            {paymentsSubTab === 'pending' && (
              <div>
                {pendingRequests.length === 0 ? (
                  <div className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3 shadow-md">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
                    <p className="text-sm font-bold text-slate-400">
                      لا توجد طلبات معلّقة 🎉
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="bg-[#0c1427] border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-white">{req.studentName}</div>
                          <div className="text-xs text-slate-400">{req.tier === 'premium' ? 'الباقة المميزة' : 'الباقة القياسية'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              db.reviewSubscriptionRequest(req.id, 'approved', 'تم الاعتماد بنجاح', user.id);
                              forceRefresh();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            موافقة
                          </button>
                          <button
                            onClick={() => {
                              db.reviewSubscriptionRequest(req.id, 'rejected', 'بيانات التحويل غير مطابقة', user.id);
                              forceRefresh();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs"
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paymentsSubTab === 'history' && (
              <div className="text-center py-8 text-slate-500 text-xs">
                سجل المراجعات السابقة فارغ حالياً.
              </div>
            )}
          </div>
        )}

        {/* TAB 8: الشهادات (Matches Screenshot 2026-10-15 184228.png) */}
        {currentTab === 'certificates' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              الشهادات الصادرة
            </h1>

            {certs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-[#0c1427]/50 border border-slate-800 rounded-2xl p-6">
                لا توجد شهادات تقدير صادرة حتى الآن. تصدر الشهادات الرسمية تلقائياً عند اجتياز الطلاب لاختبارات الوحدات المقررة بنجاح.
              </div>
            ) : (
              <div className="space-y-3">
                {certs.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-white">
                        {c.studentName} — {c.subjectName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {c.examTitle} - {c.scorePercentage}% - {new Date(c.issuedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    <div className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      {c.certificateNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: الإشعارات (Matches Screenshot 2026-10-15 184238.png) */}
        {currentTab === 'notifications' && (
          <div className="space-y-6 max-w-5xl">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              إرسال إشعار
            </h1>

            {/* إرسال إشعار form */}
            <form onSubmit={handleSendNotification} className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-6 shadow-md space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="عنوان الإشعار"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder="نص الإشعار"
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="bg-[#070b14] border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:border-cyan-500 outline-none font-mono"
                >
                  <option value="announcement">announcement</option>
                  <option value="system">system</option>
                  <option value="exam">exam</option>
                </select>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-all shadow-md"
                >
                  إرسال
                </button>
              </div>
            </form>

            {/* Sent notifications list */}
            <div className="space-y-3">
              {notifs.map((n) => (
                <div
                  key={n.id}
                  className="bg-[#0c1427]/90 border border-slate-800/80 rounded-2xl p-4 shadow-md space-y-1"
                >
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{n.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
        </main>
      </div>

      {/* Comprehensive Student Details Modal */}
      {selectedStudentForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedStudentForDetails.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                  alt={selectedStudentForDetails.fullName}
                  className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white font-alexandria">
                      {selectedStudentForDetails.fullName}
                    </h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        selectedStudentForDetails.subscriptionTier === 'premium'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : selectedStudentForDetails.subscriptionTier === 'standard'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {selectedStudentForDetails.subscriptionTier === 'premium'
                        ? 'الباقة المميزة'
                        : selectedStudentForDetails.subscriptionTier === 'standard'
                        ? 'الباقة القياسية'
                        : 'الباقة المجانية'}
                    </span>
                    {selectedStudentForDetails.isSuspended && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40 font-bold">
                        حساب موقوف
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>✉ {selectedStudentForDetails.email}</span>
                    <span>📞 {selectedStudentForDetails.phoneNumber || 'لا يوجد هاتف'}</span>
                    <span>🏫 {selectedStudentForDetails.schoolName || 'مدرسة عامة'}</span>
                    <span>📍 محافظة {selectedStudentForDetails.governorate || 'القاهرة'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForDetails(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            {(() => {
              const studentProgress = db.getLessonProgress(selectedStudentForDetails.id);
              const completedLessons = studentProgress.filter((p) => p.completed);
              const studentAttempts = db.getExamAttempts().filter((a) => a.studentId === selectedStudentForDetails.id);
              const studentCerts = db.getCertificates(selectedStudentForDetails.id);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#070b14] p-3.5 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">الدروس المكتملة</span>
                      <span className="text-xl font-extrabold text-cyan-400 font-mono">
                        {completedLessons.length}
                      </span>
                    </div>

                    <div className="bg-[#070b14] p-3.5 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">الاختبارات المنجزة</span>
                      <span className="text-xl font-extrabold text-indigo-400 font-mono">
                        {studentAttempts.length}
                      </span>
                    </div>

                    <div className="bg-[#070b14] p-3.5 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">الشهادات الصادرة</span>
                      <span className="text-xl font-extrabold text-amber-400 font-mono">
                        {studentCerts.length}
                      </span>
                    </div>

                    <div className="bg-[#070b14] p-3.5 rounded-2xl border border-slate-800 text-center">
                      <span className="text-[11px] text-slate-400 block">أسئلة روبو المستخدمة</span>
                      <span className="text-xl font-extrabold text-purple-400 font-mono">
                        {selectedStudentForDetails.aiQuestionsUsedThisMonth || 0}
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Completed Lessons */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      الدروس المكتملة ({completedLessons.length})
                    </h4>
                    {completedLessons.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-[#070b14] p-3 rounded-xl border border-slate-800">
                        لم يقم الطالب بإتمام أي دروس حتى الآن.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-2">
                        {completedLessons.map((p) => {
                          const les = db.getLessonById(p.lessonId);
                          const sub = les ? db.getSubjectById(les.subjectId) : null;
                          return (
                            <div
                              key={p.id}
                              className="bg-[#070b14] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{les?.title || 'درس محذوف'}</span>
                                <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full">
                                  {sub?.nameAr || 'المادة'}
                                </span>
                              </div>
                              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {new Date(p.completedAt).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Exam History */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-indigo-400" />
                      سجل الاختبارات والنتائج ({studentAttempts.length})
                    </h4>
                    {studentAttempts.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-[#070b14] p-3 rounded-xl border border-slate-800">
                        لا توجد محاولات اختبارات مسجلة لهذا الطالب.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {studentAttempts.map((att) => (
                          <div
                            key={att.id}
                            className="bg-[#070b14] p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{att.examTitle}</span>
                                <span className="text-[10px] text-slate-400">({att.subjectName || 'عام'})</span>
                              </div>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                مدة الحل: {Math.round(att.timeSpentSeconds / 60)} دقيقة • مخالفات الشاشة: {att.violationCount}
                              </span>
                            </div>

                            <div className="text-left flex items-center gap-3">
                              <span className="font-mono text-sm font-extrabold text-white">
                                {att.totalScore} / {att.maxScore}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.passed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {att.percentage}% ({att.passed ? 'ناجح' : 'لم يوفق'})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Certificates */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      الشهادات الرسمية المعتمدة ({studentCerts.length})
                    </h4>
                    {studentCerts.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-[#070b14] p-3 rounded-xl border border-slate-800">
                        لم تصدر أي شهادات بعد (تصدر تلقائياً عند اجتياز الاختبارات بنجاح).
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {studentCerts.map((c) => (
                          <div
                            key={c.id}
                            className="bg-[#070b14] p-3 rounded-xl border border-amber-500/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-white block">{c.examTitle}</span>
                              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                                رقم الشهادة: {c.certificateNumber}
                              </span>
                            </div>
                            <span className="text-xs font-bold font-mono text-amber-400">
                              {c.scorePercentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedStudentForDetails.subscriptionTier}
                        onChange={(e) => {
                          const newTier = e.target.value as SubscriptionTier;
                          handleChangeStudentTier(selectedStudentForDetails.id, newTier);
                          setSelectedStudentForDetails((prev) =>
                            prev ? { ...prev, subscriptionTier: newTier } : null
                          );
                        }}
                        className="bg-[#070b14] border border-slate-700 text-white text-xs rounded-xl px-3 py-2"
                      >
                        <option value="free">الباقة المجانية</option>
                        <option value="standard">الباقة القياسية</option>
                        <option value="premium">الباقة المميزة</option>
                      </select>

                      <button
                        onClick={() => {
                          handleToggleSuspendStudent(
                            selectedStudentForDetails.id,
                            selectedStudentForDetails.isSuspended
                          );
                          setSelectedStudentForDetails((prev) =>
                            prev ? { ...prev, isSuspended: !prev.isSuspended } : null
                          );
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedStudentForDetails.isSuspended
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {selectedStudentForDetails.isSuspended ? 'تفعيل الحساب' : 'إيقاف الحساب مؤقتاً'}
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedStudentForDetails(null)}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Supervisor Modal */}
      {showAddSupervisorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">إضافة مشرف / معلم جديد</h3>
                  <p className="text-[11px] text-slate-400">إنشاء حساب إشرافي بصلاحيات المعلم والإدارة</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSupervisorModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupervisor} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">الاسم بالكامل:</label>
                <input
                  type="text"
                  required
                  value={supFullName}
                  onChange={(e) => setSupFullName(e.target.value)}
                  placeholder="أ. مصطفى عثمان"
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">البريد الإلكتروني:</label>
                <input
                  type="email"
                  required
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="teacher@kawkab.com"
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono text-left"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">كلمة المرور:</label>
                <input
                  type="password"
                  required
                  value={supPassword}
                  onChange={(e) => setSupPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">رقم الهاتف (واتساب):</label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">المحافظة:</label>
                  <select
                    value={supGovernorate}
                    onChange={(e) => setSupGovernorate(e.target.value)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-cyan-500 outline-none"
                  >
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSupervisorModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء حساب المشرف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Promotion to Supervisor & Subject Assignment Modal */}
      {promoteTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0c1427] border border-cyan-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">ترقية الطالب إلى مشرف ومعلم 👨‍🏫</h3>
                  <p className="text-xs text-slate-400">{promoteTargetStudent.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setPromoteTargetStudent(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPromote} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <p className="font-bold text-cyan-300">اختر المادة التي ترغب بتعيينه مشرفاً ومعلماً لها:</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  سيتمكن المشرف من إضافة أسئلة وبنوك أسئلة، تصحيح الاختبارات المقالية، ومتابعة الطلاب في جروب مادة التخصص.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">المادة المخصصة:</label>
                <select
                  value={promoteSubjectId}
                  onChange={(e) => setPromoteSubjectId(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3.5 py-3 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                >
                  <option value="all">🌟 مشرف أكاديمي عام (كافة المواد الدراسية)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPromoteTargetStudent(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4" />
                  <span>تأكيد الترقية وتعيين المادة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
