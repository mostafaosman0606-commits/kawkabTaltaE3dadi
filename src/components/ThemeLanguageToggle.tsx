import React from 'react';
import { Moon, Sun, Globe } from 'lucide-react';
import { useTheme } from '../services/themeContext';

export const ThemeLanguageToggle: React.FC = () => {
  const { theme, language, toggleTheme, toggleLanguage } = useTheme();

  return (
    <div className="flex items-center gap-1">
      {/* Light/Dark Toggle — with visible label on hover */}
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all border text-xs font-bold ${
          theme === 'dark'
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
            : 'text-indigo-600 bg-indigo-100 border-indigo-300 hover:bg-indigo-200'
        }`}
        title={theme === 'dark' ? 'تفعيل الوضع النهاري ☀️' : 'تفعيل الوضع الليلي 🌙'}
      >
        {theme === 'dark' ? (
          <Sun className="w-3.5 h-3.5" />
        ) : (
          <Moon className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {theme === 'dark' ? 'نهاري' : 'ليلي'}
        </span>
      </button>

      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700 text-[10px] font-bold"
        title={language === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{language === 'ar' ? 'EN' : 'ع'}</span>
      </button>
    </div>
  );
};
