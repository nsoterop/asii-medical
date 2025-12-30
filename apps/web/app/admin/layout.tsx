import './admin.css';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUserIsAdmin } from '../../src/lib/auth/isAdmin';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await getCurrentUserIsAdmin();
  if (!isAdmin) {
    redirect('/');
  }

  return <>{children}</>;
}
