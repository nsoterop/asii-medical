import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getServerEnv } from '../env';

export const createServerSupabaseClient = (cookiesStore: {
  get: (name: string) => { value: string } | undefined;
  set: (options: { name: string; value: string } & CookieOptions) => void;
}) => {
  const env = getServerEnv();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookiesStore.get(name)?.value;
      },
      set(name, value, options) {
        cookiesStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookiesStore.set({ name, value: '', ...options, maxAge: 0 });
      }
    }
  });
};
