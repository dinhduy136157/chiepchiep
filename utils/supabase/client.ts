import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "flashcard-chiep-auth";
const AUTH_STORAGE_BACKUP_KEY = "flashcard-chiep-auth-backup";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

let browserClient: SupabaseClient | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (!isBrowser()) return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function removeCookie(name: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

const durableAuthStorage = {
  getItem(key: string): string | null {
    if (!isBrowser()) return null;

    try {
      const primary = localStorage.getItem(key);
      if (primary) return primary;

      if (key === AUTH_STORAGE_KEY) {
        const backup = localStorage.getItem(AUTH_STORAGE_BACKUP_KEY);
        if (backup) return backup;
      }
    } catch {
      // Ignore and fallback to cookie.
    }

    const fromCookie = readCookie(key);
    if (fromCookie) return fromCookie;

    if (key === AUTH_STORAGE_KEY) {
      return readCookie(AUTH_STORAGE_BACKUP_KEY);
    }

    return null;
  },

  setItem(key: string, value: string): void {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(key, value);
      if (key === AUTH_STORAGE_KEY) {
        localStorage.setItem(AUTH_STORAGE_BACKUP_KEY, value);
      }
    } catch {
      // Ignore and keep cookie persistence.
    }

    writeCookie(key, value);
    if (key === AUTH_STORAGE_KEY) {
      writeCookie(AUTH_STORAGE_BACKUP_KEY, value);
    }
  },

  removeItem(key: string): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(key);
      if (key === AUTH_STORAGE_KEY) {
        localStorage.removeItem(AUTH_STORAGE_BACKUP_KEY);
      }
    } catch {
      // Ignore storage errors.
    }

    removeCookie(key);
    if (key === AUTH_STORAGE_KEY) {
      removeCookie(AUTH_STORAGE_BACKUP_KEY);
    }
  },
};

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: durableAuthStorage,
      },
    }
  );

  return browserClient;
}
