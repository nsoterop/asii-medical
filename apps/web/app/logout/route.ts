import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../../src/lib/supabase/server';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url));
}
