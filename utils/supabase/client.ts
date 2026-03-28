import { createClient as createSupabaseClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "flashcard-chiep-auth";
const LONG_SESSION_BACKUP_KEY = "flashcard-chiep-auth-backup";

let browserClient: SupabaseClient | null = null;
let isSessionBootstrapDone = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function saveSessionBackup(session: Session | null): void {
  if (!isBrowser()) return;

  try {
    if (session) {
      localStorage.setItem(LONG_SESSION_BACKUP_KEY, JSON.stringify(session));
      return;
    }

    localStorage.removeItem(LONG_SESSION_BACKUP_KEY);
  } catch {
    // Ignore storage errors on restricted environments.
  }
}

function readSessionBackup(): Session | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(LONG_SESSION_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

async function bootstrapLongSession(client: SupabaseClient): Promise<void> {
  if (!isBrowser() || isSessionBootstrapDone) return;
  isSessionBootstrapDone = true;

  client.auth.onAuthStateChange((_event, session) => {
    saveSessionBackup(session);
  });

  const { data } = await client.auth.getSession();
  if (data.session) {
    saveSessionBackup(data.session);
    return;
  }

  const backupSession = readSessionBackup();
  if (!backupSession?.access_token || !backupSession?.refresh_token) return;

  await client.auth.setSession({
    access_token: backupSession.access_token,
    refresh_token: backupSession.refresh_token,
  });
}

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
      },
    }
  );

  void bootstrapLongSession(browserClient);
  return browserClient;
}
