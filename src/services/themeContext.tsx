import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type Language = 'ar' | 'en';

interface ThemeContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  isDark: boolean;
  isArabic: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  language: 'ar',
  toggleTheme: () => {},
  toggleLanguage: () => {},
  isDark: true,
  isArabic: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('kawkab_theme') as Theme) || 'dark';
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('kawkab_language') as Language) || 'ar';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
    localStorage.setItem('kawkab_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', language);
    localStorage.setItem('kawkab_language', language);
  }, [language]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const toggleLanguage = () => setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));

  return (
    <ThemeContext.Provider
      value={{ theme, language, toggleTheme, toggleLanguage, isDark: theme === 'dark', isArabic: language === 'ar' }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
