import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '../env';
import { getSupabaseStorageKey } from './storage-key';

export const createBrowserSupabaseClient = () => {
  const env = getPublicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storageKey: getSupabaseStorageKey(env.NEXT_PUBLIC_SUPABASE_URL),
    },
  });
};
