import { createBrowserSupabaseClient } from '../supabase/browser';

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  return atob(padded);
};

const getCookieSessionToken = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = Object.fromEntries(
    document.cookie.split('; ').map((cookie) => {
      const index = cookie.indexOf('=');
      return [cookie.slice(0, index), cookie.slice(index + 1)];
    }),
  );

  const keys = Object.keys(cookies).filter(
    (name) => name.startsWith('sb-') && name.includes('auth-token'),
  );
  if (!keys.length) {
    return null;
  }

  const baseKey = keys.find((name) => !/\.\d+$/.test(name)) ?? keys[0].replace(/\.\d+$/, '');
  const parts: string[] = [];

  if (cookies[baseKey]) {
    parts.push(cookies[baseKey]);
  }

  for (let index = 0; cookies[`${baseKey}.${index}`]; index += 1) {
    parts.push(cookies[`${baseKey}.${index}`]);
  }

  let raw = decodeURIComponent(parts.join('')).replace(/^"|"$/g, '');
  if (raw.startsWith('base64-')) {
    raw = raw.slice('base64-'.length);
  }

  try {
    const json = raw.startsWith('{') ? raw : decodeBase64Url(raw);
    const session = JSON.parse(json) as { access_token?: string };
    return session.access_token ?? null;
  } catch {
    return null;
  }
};

export const authedFetch = async (input: RequestInfo, init?: RequestInit) => {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? getCookieSessionToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
};
