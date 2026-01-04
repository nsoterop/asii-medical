import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getServerEnv } from '../env';
import { getSupabaseStorageKey } from './storage-key';

export const createServerSupabaseClient = (cookiesStore: {
  get: (name: string) => { value: string } | undefined;
  set: (options: { name: string; value: string } & CookieOptions) => void;
}) => {
  const env = getServerEnv();
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL;
  return createServerClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storageKey: getSupabaseStorageKey(env.NEXT_PUBLIC_SUPABASE_URL),
    },
    cookies: {
      get(name: string) {
        return cookiesStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookiesStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookiesStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
};
