'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SECRET_KEY = 'adminSecret';

export function getStoredAdminSecret() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(SECRET_KEY);
}

export function setStoredAdminSecret(secret: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SECRET_KEY, secret);
  }
}

export function clearStoredAdminSecret() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SECRET_KEY);
  }
}

export default function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin/login')) {
      setReady(true);
      return;
    }

    const secret = getStoredAdminSecret();
    if (!secret) {
      router.replace('/admin/login');
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
