import { createBrowserSupabaseClient } from '../supabase/browser';

export const authedFetch = async (input: RequestInfo, init?: RequestInit) => {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
};
