import React from 'react';
import {
  Home,
  BookOpen,
  Trophy,
  Swords,
  Bot,
  User,
  MessageCircle,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Briefcase,
  X,
  Layers,
  Users,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { db } from '../services/storage';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { role, user } = useAuth();

  const studentNavItems: NavItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'schedule', label: 'جدولي وتنظيم الوقت', icon: Calendar },
    { id: 'homework', label: 'الواجبات والتكليفات', icon: CheckSquare },
    { id: 'group-chat', label: 'مجتمع المتابعة الأكاديمية', icon: Users },
    { id: 'subjects', label: 'المواد الدراسية', icon: BookOpen },
    { id: 'leaderboard', label: 'الترتيب والأوائل', icon: Trophy },
    { id: 'challenges', label: 'تحدي كوكب تالتة', icon: Swords },
    { id: 'robo', label: 'المساعد الذكي (روبو)', icon: Bot },
    { id: 'flashcards', label: 'بطاقات المراجعة', icon: Layers },
    { id: 'certificates', label: 'شهاداتي', icon: GraduationCap },
    { id: 'profile', label: 'حسابي والاشتراك', icon: User },
    { id: 'contact', label: 'تواصل معنا', icon: MessageCircle },
  ];

  const adminItem: NavItem = {
    id: 'admin',
    label: 'لوحة الإدارة العامة',
    icon: ShieldCheck,
  };

  const teacherItem: NavItem = {
    id: 'teacher',
    label: 'لوحة تحكم المعلم',
    icon: Briefcase,
  };

  let navItems: NavItem[] = [];
  if (role === 'admin') {
    navItems = [adminItem, teacherItem, ...studentNavItems];
  } else if (role === 'teacher') {
    navItems = [teacherItem, ...studentNavItems];
  } else {
    navItems = studentNavItems;
  }

  const renderNavButtons = (onItemClick?: () => void) => (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => {
              onSelectTab(item.id);
              if (onItemClick) onItemClick();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </div>

            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Full-Height Extended Sidebar (Flush with top, spanning full length of page) */}
      <aside className="w-64 shrink-0 hidden md:flex flex-col border-l border-cyan-500/15 bg-[#080d1a]/95 backdrop-blur-xl h-screen sticky top-0 overflow-y-auto z-30 shadow-2xl">
        {/* Top Branding Section (No detached gap, flush with the top edge) */}
        <div
          onClick={() => onSelectTab('dashboard')}
          className="p-5 border-b border-slate-800/80 flex items-center gap-3 cursor-pointer group hover:bg-slate-900/40 transition-colors shrink-0"
        >
          <div className="w-10 h-10 rounded-2xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0 overflow-hidden border border-cyan-400/30">
            <img src="/logo.jpg" alt="كوكب تالتة إعدادي" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base text-white font-alexandria truncate block">
              كوكب تالتة إعدادي
            </span>
            <p className="text-[10px] text-cyan-400 font-medium">معاك الامتحان</p>
          </div>
        </div>

        {/* Navigation Items (Middle) */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          {renderNavButtons()}
        </div>

        {/* Bottom User Card / Footer */}
        <div className="p-4 border-t border-slate-800/80 shrink-0 space-y-2">
          {role === 'student' && user && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/20 text-center">
              <span className="text-[10px] text-cyan-300 font-medium block">الباقة المفعلة:</span>
              <div className="text-xs font-bold text-white mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {user.subscriptionTier === 'premium'
                  ? 'الباقة المميزة'
                  : user.subscriptionTier === 'standard'
                  ? 'الباقة القياسية'
                  : 'الباقة المجانية'}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 text-center">
            كوكب تالتة إعدادي v2.0 • 2026/2027
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (When Opened) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-[#080d1a] border-l border-cyan-500/20 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-cyan-400/30 shadow-md">
                  <img src="/logo.jpg" alt="كوكب تالتة إعدادي" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white font-alexandria block">
                    كوكب تالتة إعدادي
                  </span>
                  <p className="text-[10px] text-cyan-400 font-medium">معاك الامتحان</p>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto">
              {renderNavButtons(onCloseMobile)}
            </div>

            <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              العام الدراسي 2026/2027
            </div>
          </div>
        </div>
      )}
    </>
  );
};
