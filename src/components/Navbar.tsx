import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  LogOut,
  Menu,
  Trophy,
  Award,
  BookOpen,
  BellRing,
  X,
  ExternalLink,
  CheckCircle2,
  Info,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { db } from '../services/storage';
import { ThemeLanguageToggle } from './ThemeLanguageToggle';
import { requestNotificationPermission, scheduleStudyReminder, updateLastActivity } from '../services/notifications';
import type { Notification } from '../types';

interface NavbarProps {
  onNavigate?: (tab: string) => void;
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onOpenMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    return ('Notification' in window) ? Notification.permission : 'denied';
  });

  // Update last activity & schedule reminder check on mount
  useEffect(() => {
    if (user) {
      updateLastActivity();
      scheduleStudyReminder();
    }
  }, [user]);

  const handleRequestPushNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  // Live Educational Stats (Progress percentage & Points system)
  const userStats = user ? db.getUserStats(user.id) : null;
  const notifications = user ? db.getNotifications(user.id) : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    db.markNotificationRead(notification.id);
    setSelectedNotification(notification);
    setShowNotifications(false);
  };

  const handleFollowNotificationLink = (linkUrl?: string) => {
    setSelectedNotification(null);
    if (linkUrl && onNavigate) {
      const cleanTab = linkUrl.replace('/', '');
      onNavigate(cleanTab);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/15 bg-[#070b14]/90 backdrop-blur-md">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Right side (RTL): Mobile Hamburger & Logo & Welcome */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="القائمة الرئيسية"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>

          {/* Logo + Greeting */}
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/logo.jpg"
              alt="كوكب تالتة"
              className="w-8 h-8 rounded-xl object-cover border border-cyan-400/40 shadow-sm shadow-cyan-500/20 shrink-0 hidden sm:block"
            />
            <span className="text-xs sm:text-sm font-bold text-white font-alexandria truncate max-w-[110px] sm:max-w-none">
              {user ? `أهلاً، ${(user.fullName || 'بطل').split(' ')[0]} 🚀` : 'كوكب تالتة إعدادي'}
            </span>
          </div>
        </div>

        {/* Center / Left: Educational Progress Bar & Points Badge */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          
          {user && userStats && (
            <>
              {/* 1. الشريط العلوي - شريط الإنجاز الأكاديمي */}
              <div className="hidden md:flex items-center gap-3 bg-slate-900/80 px-3.5 py-1.5 rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex flex-col text-right">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-400 font-medium">مسار الإنجاز</span>
                    <span className="font-extrabold text-cyan-300 font-mono">
                      {userStats.progressPercentage}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-28 sm:w-36 h-2 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-700 shadow-sm shadow-cyan-500/50"
                      style={{ width: `${userStats.progressPercentage}%` }}
                    />
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 font-medium border-r border-slate-800 pr-2.5">
                  {userStats.completedLessonsCount}/{userStats.totalLessonsCount} درس
                </span>
              </div>

              {/* 2. الشريط العلوي - نظام النقاط (Points System) */}
              <div
                onClick={() => onNavigate && onNavigate('leaderboard')}
                className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-amber-500/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-amber-500/30 text-amber-300 font-bold text-xs shadow-md transition-all cursor-pointer group"
                title="نقاطك المكتسبة من إتمام الدروس (+25)، الاختبارات، والتحديات (+30) — اضغط لعرض الترتيب"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner text-xs">
                  ⭐
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-amber-400/80 font-normal leading-tight hidden sm:block">
                    النقاط
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-amber-300 font-mono leading-tight">
                    {userStats.points}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Theme & Language Toggle */}
          <ThemeLanguageToggle />

          {/* Push Notifications enable button (only if not yet granted) */}
          {'Notification' in window && notifPermission !== 'granted' && user && (
            <button
              onClick={handleRequestPushNotif}
              className="hidden sm:flex items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/30"
              title="تفعيل الإشعارات الفورية"
            >
              <BellRing className="w-4 h-4" />
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
              aria-label="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-72 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#0c1427]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm text-white">الإشعارات والتنبيهات</span>
                  </div>
                  <span className="text-xs text-slate-400">{unreadCount} غير مقروء</span>
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      لا توجد إشعارات جديدة حالياً
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                          !n.isRead
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold min-w-0">
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-ping" />
                            )}
                            <span className="truncate">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="pt-0.5 flex justify-end">
                          <span className="text-[10px] text-cyan-400 font-bold hover:underline">
                            عرض التفاصيل 🔍
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile avatar & logout / Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div
                onClick={() => onNavigate && onNavigate('profile')}
                className="flex items-center gap-2.5 p-1 rounded-2xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-slate-800"
              >
                <img
                  src={user.avatarUrl || '/logo.jpg'}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-xl border border-cyan-400/50 object-cover"
                />
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate && onNavigate('auth')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              تسجيل الدخول
            </button>
          )}

        </div>
      </div>
    </header>

    {/* Notification Details Modal */}
    {selectedNotification && (
      <div
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={() => setSelectedNotification(null)}
      >
        <div
          className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20 shrink-0">
                🔔
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base font-alexandria truncate">
                  {selectedNotification.title}
                </h3>
                <span className="text-[11px] text-cyan-300 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {new Date(selectedNotification.createdAt).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(selectedNotification.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedNotification(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full Notification Content */}
          <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800/80 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line shadow-inner max-h-[60vh] overflow-y-auto font-sans">
            {selectedNotification.message}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setSelectedNotification(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              إغلاق
            </button>

            {selectedNotification.linkUrl && onNavigate && (
              <button
                type="button"
                onClick={() => handleFollowNotificationLink(selectedNotification.linkUrl)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>الانتقال إلى المحتوى 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
};
