import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../supabase/server';

export const getSessionUser = async () => {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};
