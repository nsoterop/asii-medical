import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../supabase/server';

export const getCurrentUserIsAdmin = async (): Promise<boolean> => {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (error) {
    return false;
  }

  return Boolean(data?.is_admin);
};
