export const getSupabaseStorageKey = (supabaseUrl: string) => {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
};
