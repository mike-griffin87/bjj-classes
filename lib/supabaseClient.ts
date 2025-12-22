// lib/supabaseClient.ts (server/admin only)
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getAdminSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// (Optional helpers if you still need them elsewhere)
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_PROJECT_REF = (() => {
  try {
    const host = new URL(SUPABASE_URL).hostname; // e.g. abcdefgh.supabase.co
    return host.split('.')[0];
  } catch {
    return '';
  }
})();