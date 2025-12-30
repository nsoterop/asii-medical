import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPublicEnv } from '../../../src/lib/env';

export async function GET(request: NextRequest) {
  const env = getPublicEnv();
  const nextParam = request.nextUrl.searchParams.get('next');
  const redirectPath =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { [key: string]: unknown }) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: { [key: string]: unknown }) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    },
  );

  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
