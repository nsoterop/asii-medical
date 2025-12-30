'use client';

import Link from 'next/link';

export default function LoginForm() {
  return (
    <div className="admin-shell">
      <h1>Admin</h1>
      <div className="admin-card">
        <p className="admin-muted">
          Admin access is now tied to your account. Sign in with your account and request admin
          access if needed.
        </p>
        <div className="admin-row" style={{ marginTop: 12 }}>
          <Link href="/login" className="admin-button secondary">
            Go to login
          </Link>
          <Link href="/admin" className="admin-button">
            Go to admin
          </Link>
        </div>
      </div>
    </div>
  );
}
