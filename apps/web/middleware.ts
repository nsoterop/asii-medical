import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPublicEnv } from './src/lib/env';

const PUBLIC_ROUTES = new Set(['/', '/about', '/terms']);
const AUTH_ROUTES = new Set(['/login', '/signup']);

const applyAuthCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const env = getPublicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (!PUBLIC_ROUTES.has(pathname) && !AUTH_ROUTES.has(pathname)) {
      const redirect = NextResponse.redirect(new URL('/', request.url));
      applyAuthCookies(response, redirect);
      return redirect;
    }
    return response;
  }

  if (AUTH_ROUTES.has(pathname)) {
    const redirect = NextResponse.redirect(new URL('/', request.url));
    applyAuthCookies(response, redirect);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api|admin|.*\\..*).*)']
};
