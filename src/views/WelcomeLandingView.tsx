import React from 'react';
import { Video, ClipboardList, Award, User, LogOut } from 'lucide-react';
import { useAuth } from '../services/authContext';

interface WelcomeLandingViewProps {
  onEnterPlatform: () => void;
  onOpenAuth: () => void;
}

export const WelcomeLandingView: React.FC<WelcomeLandingViewProps> = ({
  onEnterPlatform,
  onOpenAuth,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center z-10 select-none animate-in fade-in duration-500">
      
      {/* 1. Centered Glowing Circular Badge */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white p-1 shadow-[0_0_60px_rgba(34,211,238,0.5)] border-2 border-cyan-400/60 flex items-center justify-center overflow-hidden">
          <img
            src="/logo.jpg"
            alt="كوكب تالتة إعدادي"
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      </div>

      {/* 2. Platform Title */}
      <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 font-alexandria mb-3.5 tracking-tight drop-shadow-sm">
        كوكب تالتة إعدادي
      </h1>

      {/* 3. Platform Subtitle */}
      <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed mb-8 px-2">
        منصتك التعليمية الفضائية لطلاب الصف الثالث الإعدادي — دروس فيديو، ملخصات، اختبارات فورية، وشهادات إتمام، مع دعم ذكي على مدار الساعة.
      </p>

      {/* 4. Three Feature Pills Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-md w-full mb-8">
        {/* دروس فيديو */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col items-center justify-center shadow-lg hover:border-cyan-500/30 transition-all">
          <Video className="w-5 h-5 text-cyan-400 mb-1.5" />
          <span className="text-[11px] sm:text-xs text-slate-200 font-medium">دروس فيديو</span>
        </div>

        {/* اختبارات فورية */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col items-center justify-center shadow-lg hover:border-cyan-500/30 transition-all">
          <ClipboardList className="w-5 h-5 text-cyan-400 mb-1.5" />
          <span className="text-[11px] sm:text-xs text-slate-200 font-medium">اختبارات فورية</span>
        </div>

        {/* شهادات */}
        <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 flex flex-col items-center justify-center shadow-lg hover:border-cyan-500/30 transition-all">
          <Award className="w-5 h-5 text-cyan-400 mb-1.5" />
          <span className="text-[11px] sm:text-xs text-slate-200 font-medium">شهادات</span>
        </div>
      </div>

      {/* 5. Main Action Button (Conditioned on whether an account is saved) */}
      <div className="w-full max-w-sm sm:max-w-md">
        {user ? (
          // Case 2: User has a saved account in storage (Image 2)
          <div className="space-y-3">
            <button
              onClick={onEnterPlatform}
              className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#06b6d4] hover:from-[#6d28d9] hover:to-[#0891b2] text-white font-black text-sm sm:text-base shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer block"
            >
              الدخول إلى المنصة
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                حسابك المحفوظ:{' '}
                <strong className="text-cyan-300 font-bold">{user.fullName}</strong>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {user.role === 'admin' ? 'الإدارة' : user.role === 'teacher' ? 'معلم ومشرف' : 'طالب'}
                </span>
              </span>
              <span>•</span>
              <button
                onClick={onOpenAuth}
                className="text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
              >
                تبديل الحساب
              </button>
            </div>
          </div>
        ) : (
          // Case 1: User has NOT logged in before (Image 1)
          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#06b6d4] hover:from-[#6d28d9] hover:to-[#0891b2] text-white font-black text-sm sm:text-base shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer block"
          >
            تسجيل الدخول / إنشاء حساب
          </button>
        )}
      </div>

    </div>
  );
};
