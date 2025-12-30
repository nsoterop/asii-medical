import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../../../src/lib/supabase/server';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.json({ isAdmin: false, userId: null, email: null });
  }

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    isAdmin: Boolean(data?.is_admin),
    userId: user.id,
    email: user.email ?? null
  });
}
