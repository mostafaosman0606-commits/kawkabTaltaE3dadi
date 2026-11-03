import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { db } from './storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  sbSignIn,
  sbSignUp,
  sbSignOut,
  sbGetSession,
  sbGetProfile,
  sbUpsertProfile,
  syncCloudDataToLocal,
} from './supabaseDb';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { fullName: string; email: string; password?: string; phone: string; governorate: string; school: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleQuick: (targetRole: UserRole) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'kawkab_current_user_id_v9';

// Translate Supabase English error messages to Arabic
function translateAuthError(msg: string): string {
  if (!msg) return 'حدث خطأ غير متوقع';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password') || m.includes('incorrect password'))
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (m.includes('email not confirmed') || m.includes('email already confirmed'))
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  if (m.includes('user already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'هذا البريد الإلكتروني مسجل بالفعل';
  if (m.includes('password should be') || m.includes('password must be'))
    return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'محاولات كثيرة — يرجى الانتظار قليلاً ثم المحاولة مجدداً';
  if (m.includes('network') || m.includes('fetch'))
    return 'تعذر الاتصال بالخادم — تحقق من الإنترنت';
  return msg;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── REFRESH USER ──────────────────────────────────────────────────────────
  const refreshUser = () => {
    if (isSupabaseConfigured()) {
      // Async: check active Supabase session first, then fall back to localStorage
      sbGetSession().then(async (userId) => {
        if (userId) {
          const profile = await sbGetProfile(userId);
          if (profile && !profile.isSuspended) {
            localStorage.setItem(CURRENT_USER_KEY, userId);
            db.syncProfilesFromCloud([profile]);
            setUser(profile);
            setIsLoading(false);
            syncCloudDataToLocal(userId).catch(() => {});
            return;
          }
        }
        // Even if guest or no active user session, hydrate global cloud data (subjects, lessons, leaderboard)
        syncCloudDataToLocal('').catch(() => {});
        // Fallback: check if local seeded session exists
        const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
        if (savedUserId) {
          const found = db.getProfileById(savedUserId);
          if (found && !found.isSuspended) {
            setUser(found);
            setIsLoading(false);
            return;
          }
        }
        // No valid session — clear
        localStorage.removeItem(CURRENT_USER_KEY);
        setUser(null);
        setIsLoading(false);
      });
      return;
    }

    // Pure localStorage mode
    let savedUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (!savedUserId) {
      savedUserId = localStorage.getItem('kawkab_current_user_id_v8');
      if (savedUserId) localStorage.setItem(CURRENT_USER_KEY, savedUserId);
    }
    if (savedUserId) {
      const found = db.getProfileById(savedUserId);
      if (found && !found.isSuspended) {
        setUser(found);
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  // Initial load
  useEffect(() => {
    refreshUser();
    // Hydrate cloud profiles and leaderboard data across all devices on start
    syncCloudDataToLocal('').catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multi-device focus sync: keep cloud data updated when user switches windows/tabs
  useEffect(() => {
    const handleFocus = () => {
      syncCloudDataToLocal(user?.id || '').catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id]);

  // Supabase auth state listener (only when Supabase is configured)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        const profile = await sbGetProfile(session.user.id);
        if (profile && !profile.isSuspended) {
          localStorage.setItem(CURRENT_USER_KEY, session.user.id);
          db.syncProfilesFromCloud([profile]);
          setUser(profile);
          syncCloudDataToLocal(session.user.id).catch(() => {});
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(CURRENT_USER_KEY);
        setUser(null);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const { userId, error } = await sbSignIn(email.trim(), pass.trim());
      if (!error && userId) {
        const profile = await sbGetProfile(userId);
        if (profile) {
          if (profile.isSuspended) {
            await sbSignOut();
            return { success: false, error: 'هذا الحساب موقوف حالياً. يرجى التواصل مع إدارة المنصة.' };
          }
          localStorage.setItem(CURRENT_USER_KEY, userId);
          setUser(profile);
          syncCloudDataToLocal(userId).catch(() => {});
          return { success: true };
        }
      }

      // Fallback: If not found in Supabase Auth or offline, check local accounts (e.g. seeded admin)
      const profiles = db.getProfiles();
      const found = profiles.find((p) => p.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (found) {
        if (found.isSuspended) return { success: false, error: 'هذا الحساب موقوف حالياً. يرجى التواصل مع إدارة المنصة.' };
        if (found.password && found.password !== pass.trim()) return { success: false, error: 'كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.' };
        localStorage.setItem(CURRENT_USER_KEY, found.id);
        setUser(found);
        return { success: true };
      }

      if (error) return { success: false, error: translateAuthError(error) };
      if (!userId) return { success: false, error: 'فشل تسجيل الدخول — يرجى المحاولة مجدداً' };
    }

    // localStorage mode
    const profiles = db.getProfiles();
    const found = profiles.find((p) => p.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (!found) return { success: false, error: 'البريد الإلكتروني غير مسجل بالمنصة' };
    if (found.isSuspended) return { success: false, error: 'هذا الحساب موقوف حالياً. يرجى التواصل مع إدارة المنصة.' };
    if (found.password && found.password !== pass.trim()) return { success: false, error: 'كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.' };

    localStorage.setItem(CURRENT_USER_KEY, found.id);
    setUser(found);
    return { success: true };
  };

  // ── REGISTER ──────────────────────────────────────────────────────────────
  const register = async (data: {
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    governorate: string;
    school: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      if (!data.password || data.password.trim().length < 6) {
        return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
      }

      const { userId, error } = await sbSignUp(
        data.email.trim(),
        data.password.trim(),
        data.fullName.trim(),
        data.phone,
        data.governorate,
        data.school
      );
      if (error) return { success: false, error: translateAuthError(error) };
      if (!userId) return { success: false, error: 'فشل إنشاء الحساب — يرجى المحاولة مجدداً' };

      // Check if profile was created by DB trigger, or upsert it
      let profile = await sbGetProfile(userId);
      if (!profile) {
        await sbUpsertProfile({
          id: userId,
          email: data.email.trim(),
          fullName: data.fullName.trim(),
          phoneNumber: data.phone,
          governorate: data.governorate,
          schoolName: data.school,
          role: 'student',
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          isSuspended: false,
        });
        profile = await sbGetProfile(userId);
      }

      // Also ensure local db has this profile for seamless fallback
      const localProfile = db.createProfile({
        id: userId,
        email: data.email.trim(),
        fullName: data.fullName.trim(),
        role: 'student',
        phoneNumber: data.phone,
        governorate: data.governorate,
        schoolName: data.school,
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        isSuspended: false,
      });

      const effectiveProfile = profile || localProfile;
      localStorage.setItem(CURRENT_USER_KEY, effectiveProfile.id);
      setUser(effectiveProfile);
      syncCloudDataToLocal(userId).catch(() => {});
      return { success: true };
    }

    // localStorage mode
    const profiles = db.getProfiles();
    const existing = profiles.find((p) => p.email.toLowerCase().trim() === data.email.toLowerCase().trim());
    if (existing) return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل' };

    // STRICT RULE: New registrations NEVER receive admin or teacher privileges automatically!
    const newProfile = db.createProfile({
      email: data.email.trim(),
      password: data.password ? data.password.trim() : undefined,
      fullName: data.fullName.trim(),
      role: 'student', // Always student
      phoneNumber: data.phone,
      governorate: data.governorate,
      schoolName: data.school,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      isSuspended: false,
    });

    localStorage.setItem(CURRENT_USER_KEY, newProfile.id);
    setUser(newProfile);
    return { success: true };
  };

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
    sbSignOut(); // fire and forget
  };

  // ── DEV ONLY: switch role quick (localStorage only) ───────────────────────
  const switchRoleQuick = (targetRole: UserRole) => {
    const profiles = db.getProfiles();
    const match = profiles.find((p) => p.role === targetRole && !p.isSuspended);
    if (match) {
      localStorage.setItem(CURRENT_USER_KEY, match.id);
      setUser(match);
    }
  };

  const role: UserRole = user?.role || 'student';
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchRoleQuick,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
