import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPublicEnv } from './src/lib/env';
import { getSupabaseStorageKey } from './src/lib/supabase/storage-key';

type CookieOptions = {
  [key: string]: unknown;
};

const PUBLIC_ROUTES = new Set(['/', '/about', '/terms', '/auth/callback', '/health']);
const PUBLIC_PREFIXES: string[] = [];
const AUTH_ROUTES = new Set(['/login', '/signup']);
const SESSION_COOKIE_NAME = 'asii_session_started_at';
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const applyAuthCookies = (from: NextResponse, to: NextResponse) => {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (process.env.E2E === 'true') {
    return response;
  }
  const env = getPublicEnv();

  const cookies = {
    get(name: string) {
      return request.cookies.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      response.cookies.set({ name, value, ...options });
    },
    remove(name: string, options: CookieOptions) {
      response.cookies.set({ name, value: '', ...options, maxAge: 0 });
    }
  };

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL;
  const storageKey = getSupabaseStorageKey(env.NEXT_PUBLIC_SUPABASE_URL);
  const supabase = createServerClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storageKey,
    },
    cookies
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const emailConfirmed = user
    ? Boolean(
        (user as { email_confirmed_at?: string | null; confirmed_at?: string | null })
          .email_confirmed_at ??
          (user as { confirmed_at?: string | null }).confirmed_at
      )
    : false;
  let isAuthenticated = Boolean(user && emailConfirmed);

  const { pathname } = request.nextUrl;

  const isPublicPath =
    PUBLIC_ROUTES.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isAuthenticated) {
    const now = Date.now();
    const sessionStartedRaw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionStarted = sessionStartedRaw ? Number(sessionStartedRaw) : Number.NaN;
    const shouldReset = !sessionStartedRaw || Number.isNaN(sessionStarted);
    const expired = !shouldReset && now - sessionStarted > SESSION_MAX_AGE_MS;

    if (expired) {
      isAuthenticated = false;
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: '',
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: request.nextUrl.protocol === 'https:'
      });
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name === storageKey || cookie.name.startsWith(`${storageKey}.`)) {
          response.cookies.set({
            name: cookie.name,
            value: '',
            maxAge: 0,
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            secure: request.nextUrl.protocol === 'https:'
          });
        }
      });
    } else if (shouldReset) {
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: String(now),
        maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: request.nextUrl.protocol === 'https:'
      });
    }
  }

  if (!isAuthenticated) {
    if (!isPublicPath && !AUTH_ROUTES.has(pathname)) {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api|.*\\..*).*)']
};
