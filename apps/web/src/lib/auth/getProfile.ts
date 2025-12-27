import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../supabase/server';

type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export const getCurrentProfile = async (): Promise<ProfileRow | null> => {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, company, location, created_at, updated_at')
    .eq('id', userData.user.id)
    .single();
  if (error) {
    return null;
  }
  return data;
};
