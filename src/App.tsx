import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Starfield } from './components/Starfield';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './services/authContext';

// Core Initial Views (Loaded Instantly)
import { StudentDashboard } from './views/student/StudentDashboard';
import { SubjectsView } from './views/student/SubjectsView';
import { SubjectDetailView } from './views/student/SubjectDetailView';
import { LessonView } from './views/student/LessonView';
import { WelcomeLandingView } from './views/WelcomeLandingView';

// Heavy Secondary Views (Code-Split & Loaded On-Demand via lazy())
const ExamEngineView = lazy(() => import('./views/student/ExamEngineView').then((m) => ({ default: m.ExamEngineView })));
const RoboAiView = lazy(() => import('./views/student/RoboAiView').then((m) => ({ default: m.RoboAiView })));
const ChallengesView = lazy(() => import('./views/student/ChallengesView').then((m) => ({ default: m.ChallengesView })));
const CertificatesView = lazy(() => import('./views/student/CertificatesView').then((m) => ({ default: m.CertificatesView })));
const FlashcardsView = lazy(() => import('./views/student/FlashcardsView').then((m) => ({ default: m.FlashcardsView })));
const StudentGroupChatView = lazy(() => import('./views/student/StudentGroupChatView').then((m) => ({ default: m.StudentGroupChatView })));
const StudentHomeworkView = lazy(() => import('./views/student/StudentHomeworkView').then((m) => ({ default: m.StudentHomeworkView })));
const StudentScheduleView = lazy(() => import('./views/student/StudentScheduleView').then((m) => ({ default: m.StudentScheduleView })));
const LeaderboardView = lazy(() => import('./views/student/LeaderboardView').then((m) => ({ default: m.LeaderboardView })));
const ProfileView = lazy(() => import('./views/student/ProfileView').then((m) => ({ default: m.ProfileView })));
const ContactView = lazy(() => import('./views/student/ContactView').then((m) => ({ default: m.ContactView })));

// Staff Management Views (Loaded Only When Staff Logs In)
const TeacherDashboard = lazy(() => import('./views/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./views/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

// Lightweight View Skeleton Spinner
const ViewLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 space-y-3">
    <div className="w-9 h-9 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
    <span className="text-[11px] text-slate-400 font-alexandria animate-pulse">
      جارٍ تجهيز المحتوى الفضائي... 🚀
    </span>
  </div>
);

export const AppContent: React.FC = () => {
  const { user, role, isAuthenticated } = useAuth();

  // Navigation State
  const [hasEnteredPlatform, setHasEnteredPlatform] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'teacher' | 'student'>('student');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [activeSubjectId, setActiveSubjectId] = useState<string>('sub-arabic');
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [activeExamId, setActiveExamId] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Set initial default view mode based on role when logged in
  useEffect(() => {
    if (role === 'admin') {
      setViewMode('admin');
    } else if (role === 'teacher') {
      setViewMode('teacher');
    } else {
      setViewMode('student');
    }
  }, [role]);

  // Return to landing screen when logged out
  useEffect(() => {
    if (!isAuthenticated && hasEnteredPlatform) {
      setHasEnteredPlatform(false);
      setViewMode('student');
    }
  }, [isAuthenticated]);

  // Always reset scroll to top on any view or tab transition
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [viewMode, activeTab, adminTab]);

  const handleNavigate = (tab: string, context?: any) => {
    if (tab === 'auth') {
      setShowAuthModal(true);
      return;
    }

    if (tab === 'teacher' || tab.startsWith('teacher-')) {
      setViewMode('teacher');
      setActiveTab('teacher');
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    if (tab === 'admin' || tab.startsWith('admin-')) {
      setViewMode('admin');
      const cleanSub = tab.startsWith('admin-') ? tab.replace('admin-', '') : adminTab || 'overview';
      setAdminTab(cleanSub);
      setActiveTab(cleanSub);
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    // Student Navigation
    setViewMode('student');
    if (tab === 'subject-detail' && context?.subjectId) {
      setActiveSubjectId(context.subjectId);
    } else if (tab === 'lesson' && context?.lessonId) {
      setActiveLessonId(context.lessonId);
    } else if (tab === 'exam' && context?.examId) {
      setActiveExamId(context.examId);
    }

    setActiveTab(tab);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const renderCurrentView = () => {
    // 1. Teacher Management Dashboard
    if (viewMode === 'teacher' && (role === 'teacher' || role === 'admin')) {
      return (
        <TeacherDashboard
          onNavigateToStudent={() => {
            setViewMode('student');
            setActiveTab('dashboard');
          }}
          onNavigateToAdmin={() => {
            setViewMode('admin');
            setAdminTab('overview');
          }}
          onNavigate={handleNavigate}
        />
      );
    }

    // 2. Admin System Dashboard
    if (viewMode === 'admin' && role === 'admin') {
      return (
        <AdminDashboard
          activeTab={adminTab}
          onSelectTab={(tabId) => {
            setAdminTab(tabId);
          }}
          onNavigateToStudent={() => {
            setViewMode('student');
            setActiveTab('dashboard');
          }}
          onNavigateToTeacher={() => {
            setViewMode('teacher');
          }}
          onNavigate={handleNavigate}
        />
      );
    }

    // 3. Student views
    switch (activeTab) {
      case 'dashboard':
        return <StudentDashboard onNavigate={handleNavigate} />;

      case 'subjects':
        return (
          <SubjectsView
            onSelectSubject={(subId) => {
              setActiveSubjectId(subId);
              setActiveTab('subject-detail');
            }}
          />
        );

      case 'subject-detail':
        return (
          <SubjectDetailView
            subjectId={activeSubjectId}
            onBack={() => setActiveTab('subjects')}
            onSelectLesson={(lesId) => {
              setActiveLessonId(lesId);
              setActiveTab('lesson');
            }}
            onSelectExam={(exId) => {
              setActiveExamId(exId);
              setActiveTab('exam');
            }}
            onUpgradeClick={() => setActiveTab('profile')}
          />
        );

      case 'lesson':
        return (
          <LessonView
            lessonId={activeLessonId}
            onBack={() => setActiveTab('subject-detail')}
            onUpgradeClick={() => setActiveTab('profile')}
          />
        );

      case 'exam':
        return (
          <ExamEngineView
            examId={activeExamId}
            onBack={() => setActiveTab('subject-detail')}
            onViewCertificates={() => setActiveTab('certificates')}
            onUpgradeClick={() => setActiveTab('profile')}
          />
        );

      case 'certificates':
        return <CertificatesView />;

      case 'robo':
        return <RoboAiView onUpgradeClick={() => setActiveTab('profile')} />;

      case 'challenges':
        return <ChallengesView />;

      case 'leaderboard':
        return <LeaderboardView />;

      case 'profile':
        return <ProfileView />;

      case 'contact':
        return <ContactView />;

      case 'flashcards':
        return <FlashcardsView onNavigate={handleNavigate} />;

      case 'group-chat':
        return <StudentGroupChatView onBack={() => setActiveTab('dashboard')} />;

      case 'homework':
        return <StudentHomeworkView onBack={() => setActiveTab('dashboard')} />;

      case 'schedule':
        return <StudentScheduleView onBack={() => setActiveTab('dashboard')} />;

      default:
        return <StudentDashboard onNavigate={handleNavigate} />;
    }
  };

  // Initial Welcome Landing Screen
  if (!hasEnteredPlatform) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 relative font-cairo flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
        <Starfield />

        <WelcomeLandingView
          onEnterPlatform={() => setHasEnteredPlatform(true)}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            if (user) {
              setHasEnteredPlatform(true);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative font-cairo flex selection:bg-cyan-500/30 selection:text-cyan-200 w-full">
      {/* Space Starfield Canvas */}
      <Starfield />

      {/* ============================================================ */}
      {/* Teacher View — Full two-pane layout (sidebar + content)      */}
      {/* ============================================================ */}
      {(viewMode === 'teacher' || viewMode === 'admin') ? (
        <div key={viewMode} className="flex-1 flex min-h-screen relative z-10 w-full">
          <Suspense fallback={<ViewLoader />}>
            {renderCurrentView()}
          </Suspense>
        </div>
      ) : (
        <>
          {/* Student Sidebar (shown in student view mode) */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={handleNavigate}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Main Content Area Column */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
            {/* Top Navbar */}
            <Navbar
              onNavigate={handleNavigate}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            />

            <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
              {/* Supervisor / Admin Student Preview Banner */}
              {role === 'teacher' && viewMode === 'student' && (
                <div className="mb-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-200 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👨‍🏫</span>
                    <span>
                      أنت تتصفح المنصة الآن <strong>بمعاينة واجهة الطالب</strong> بصلاحيات المعلم والمشرف الأكاديمي.
                    </span>
                  </div>
                  <button
                    onClick={() => setViewMode('teacher')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <span>العودة للوحة تحكم المعلم</span>
                    <span>↩</span>
                  </button>
                </div>
              )}

              {role === 'admin' && viewMode === 'student' && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <span>
                      أنت تتصفح المنصة الآن <strong>بمعاينة واجهة الطالب</strong> بصلاحيات الإدارة العامة.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('teacher')}
                      className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-bold transition-all shadow-sm"
                    >
                      <span>لوحة المعلم 👨‍🏫</span>
                    </button>
                    <button
                      onClick={() => setViewMode('admin')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
                    >
                      <span>لوحة الإدارة</span>
                      <span>↩</span>
                    </button>
                  </div>
                </div>
              )}

              <div key={`${viewMode}-${activeTab}`} className="animate-page-in w-full">
                <Suspense fallback={<ViewLoader />}>
                  {renderCurrentView()}
                </Suspense>
              </div>
            </main>
          </div>
        </>
      )}

      {/* Auth Modal (Login / Register) */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
