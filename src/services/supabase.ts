import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey: string = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl.startsWith('https://') &&
    supabasePublishableKey.length > 20
  );
};

// Singleton Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (isSupabaseConfigured()) {
  console.info(`[Supabase] تم ربط منصة كوكب تالتة إعدادي بالسحابة بنجاح: ${supabaseUrl}`);
} else {
  console.warn(
    '[Supabase] لم يتم العثور على إعدادات Supabase مكتملة (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). تعمل المنصة حالياً عبر محرك التخزين المحلي الآمن (Offline / Local Storage Engine).'
  );
}

export interface BackendStatus {
  isConfigured: boolean;
  url: string;
  mode: 'supabase_cloud' | 'local_storage_engine';
  message: string;
}

export const getBackendStatus = (): BackendStatus => {
  const configured = isSupabaseConfigured();
  return {
    isConfigured: configured,
    url: configured ? supabaseUrl : 'Local Storage Engine',
    mode: configured ? 'supabase_cloud' : 'local_storage_engine',
    message: configured
      ? `متصل بسحابة Supabase (${supabaseUrl})`
      : 'غير متصل بسحابة Supabase — المنصة تعمل في وضع التخزين المحلي الآمن (Offline-First)',
  };
};

/**
 * Health check helper to test active connectivity without any data mutation.
 */
export async function checkSupabaseHealth(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Supabase غير مهيأ (متغيرات البيئة غير متوفرة).',
    };
  }
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, message: `تعذر الاتصال بـ Supabase Auth: ${error.message}` };
    }
    return { ok: true, message: 'الاتصال بـ Supabase نشط ويعمل بنجاح.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `خطأ في الاتصال: ${msg}` };
  }
}
