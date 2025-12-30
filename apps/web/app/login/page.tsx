'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/search');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Log in</h1>
          <p className={styles.subtitle}>Access your ASii Medical account</p>
        </div>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={styles.input}
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={styles.input}
            />
          </label>
          <div className={styles.forgotRow}>
            <Link href="/forgot-password" className={`${styles.link} text-link`}>
              Forgot password?
            </Link>
          </div>
          {error ? <div className={styles.error}>{error}</div> : null}
          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className={styles.footer}>
          <span>Need an account?</span>{' '}
          <Link href="/signup" className="text-link">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
