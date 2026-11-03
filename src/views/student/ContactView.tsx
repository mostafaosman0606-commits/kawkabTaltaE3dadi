import React, { useState } from 'react';
import {
  Phone,
  Users,
  Send,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../services/authContext';

export const ContactView: React.FC = () => {
  const { user } = useAuth();
  const contact = db.getContactSettings();
  const [copied, setCopied] = useState(false);

  // Calculate student educational progress
  const allLessons = db.getLessons();
  const totalLessons = allLessons.length;
  const userProgress = user ? db.getLessonProgress(user.id) : [];
  const completedLessonsCount = userProgress.filter((p) => p.completed).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(contact.whatsappDirectNumber || '01103075485');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-cairo">
      
      {/* 1. Top Section: Educational Progress (Matches Screenshot 2026-10-15 183057.png) */}
      <div className="bg-[#0b1329]/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-200">مسارك التعليمي نحو التفوق</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              نسبة الإنجاز - {completedLessonsCount} من {totalLessons} درس
            </p>
          </div>
          <span className="text-cyan-400 font-extrabold text-sm font-mono">
            {progressPercent}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progressPercent, 2)}%` }}
          />
        </div>
      </div>

      {/* 2. Header & Subtitle */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-wide">
          تواصل معنا
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          نسعد بتواصلك وتلقي استفساراتك واقتراحاتك في أي وقت 🚀
        </p>
      </div>

      {/* 3. Four Stacked Channels (Exact match to Screenshot 2026-10-15 183057.png) */}
      <div className="space-y-3.5">
        
        {/* Channel 1: واتساب مباشر */}
        <div
          onClick={() => window.open(contact.whatsappDirectUrl || 'https://wa.me/201103075485', '_blank')}
          className="group cursor-pointer bg-[#0c1427]/80 hover:bg-[#111c38]/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 transition-all flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">واتساب مباشر</h3>
              <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                {contact.whatsappDirectNumber || '01103075485'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-sm text-slate-300 font-semibold">
              {contact.whatsappDirectNumber || '01103075485'}
            </span>
            <button
              onClick={handleCopyPhone}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
              title="نسخ رقم الهاتف"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Channel 2: قناة الواتساب */}
        <a
          href="https://whatsapp.com/channel/0029Vb79XC0EKyZFm37c5P0R"
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-[#0c1427]/80 hover:bg-[#111c38]/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">قناة الواتساب الرسمية</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تابع كل التحديثات والدروس على القناة الرسمية
                </p>
              </div>
            </div>

            <div className="text-slate-500 group-hover:text-emerald-400 transition-colors p-2">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </a>

        {/* Channel 3: صفحة الفيسبوك */}
        <a
          href="https://www.facebook.com/share/1DQc2gf9fs/"
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-[#0c1427]/80 hover:bg-[#111c38]/90 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xl font-serif group-hover:scale-105 transition-transform">
                f
              </div>
              <div>
                <h3 className="font-bold text-base text-white">صفحة الفيسبوك</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  صفحة كوكب تالتة إعدادي الرسمية
                </p>
              </div>
            </div>

            <div className="text-slate-500 group-hover:text-blue-400 transition-colors p-2">
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </a>

        {/* Channel 4: قناة التيليجرام */}
        <a
          href="https://t.me/planet_of_3rd_prep"
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-[#0c1427]/80 hover:bg-[#111c38]/90 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">قناة التيليجرام</h3>
                <p className="text-xs text-slate-400 mt-0.5 sm:hidden">
                  @planet_of_3rd_prep
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="hidden sm:inline font-mono text-xs text-slate-400 group-hover:text-cyan-300 transition-colors">
                @planet_of_3rd_prep
              </span>
              <div className="text-slate-500 group-hover:text-cyan-400 transition-colors p-2">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
          </div>
        </a>

      </div>

      {/* 4. Bottom Motivational Note (Matches Screenshot 2026-10-15 183057.png) */}
      <div className="text-center pt-4">
        <p className="text-xs text-slate-400">
          نحن هنا لمساعدتك على التفوق — راسلنا في أي وقت وسنرد عليك بأسرع ما يمكن 💙
        </p>
      </div>

    </div>
  );
};
