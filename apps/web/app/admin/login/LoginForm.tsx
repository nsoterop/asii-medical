'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStoredAdminSecret } from '../AdminGate';

export default function LoginForm({ defaultSecret }: { defaultSecret?: string }) {
  const router = useRouter();
  const [secret, setSecret] = useState(defaultSecret ?? '');
  const [error, setError] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!secret.trim()) {
      setError('Enter the admin secret.');
      return;
    }

    setStoredAdminSecret(secret.trim());
    router.push('/admin/imports');
  };

  return (
    <div className="admin-shell">
      <h1>Admin Login</h1>
      <div className="admin-card">
        <form onSubmit={onSubmit} className="admin-row">
          <input
            className="admin-input"
            type="password"
            placeholder="Admin shared secret"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
          <button className="admin-button" type="submit">
            Continue
          </button>
        </form>
        {error ? <p className="admin-muted">{error}</p> : null}
      </div>
    </div>
  );
}
