import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
};

const getAccessTokenFromCookies = () => {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const cookieMap = new Map(allCookies.map((cookie) => [cookie.name, cookie.value]));

  const keys = allCookies
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith('sb-') && name.includes('auth-token'));

  if (!keys.length) {
    return null;
  }

  const baseKey = keys.find((name) => !/\.\d+$/.test(name)) ?? keys[0].replace(/\.\d+$/, '');

  const parts: string[] = [];
  if (cookieMap.has(baseKey)) {
    parts.push(cookieMap.get(baseKey) ?? '');
  }

  for (let index = 0; cookieMap.has(`${baseKey}.${index}`); index += 1) {
    parts.push(cookieMap.get(`${baseKey}.${index}`) ?? '');
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

const getApiBaseUrl = () => {
  const base =
    process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return base.replace(/\/+$/, '');
};

const buildTargetUrl = (request: NextRequest, path: string) => {
  const base = getApiBaseUrl();
  const url = new URL(`${base}${path}`);
  url.search = request.nextUrl.search;
  return url;
};

export const proxyRequest = async (request: NextRequest, path: string) => {
  const targetUrl = buildTargetUrl(request, path);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('content-length');

  const token = getAccessTokenFromCookies();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
    init.duplex = 'half';
  }

  const response = await fetch(targetUrl, init);
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
};
