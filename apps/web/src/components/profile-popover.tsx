'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './profile-popover.module.css';
import { createBrowserSupabaseClient } from '../lib/supabase/browser';

type ProfileData = {
  first_name: string;
  last_name: string;
  company: string;
  location: string;
};

export default function ProfilePopover() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const closePopover = () => setIsOpen(false);

  const fetchProfile = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,last_name,company,location')
        .eq('id', id)
        .single();
      if (error) {
        return null;
      }
      return data;
    },
    [supabase],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    let active = true;
    fetchProfile(userId).then((data) => {
      if (!active) return;
      setProfile(data);
    });
    return () => {
      active = false;
    };
  }, [fetchProfile, userId]);

  const fetchAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/me');
      if (!response.ok) {
        setIsAdmin(false);
        return;
      }
      const data = (await response.json()) as { isAdmin?: boolean };
      setIsAdmin(Boolean(data?.isAdmin));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !userId) {
      return;
    }
    let active = true;
    fetchProfile(userId).then((data) => {
      if (!active) return;
      setProfile(data);
    });
    fetchAdminStatus();
    return () => {
      active = false;
    };
  }, [fetchAdminStatus, fetchProfile, isOpen, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    fetchAdminStatus();
  }, [fetchAdminStatus, userId]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!userEmail) {
    return (
      <Link href="/login" className={styles.profileButton} data-testid="profile-login">
        Login
      </Link>
    );
  }

  return (
    <div className={styles.profileWrap} ref={wrapperRef}>
      <button
        type="button"
        className={styles.profileButton}
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="profile-button"
        aria-label="Profile"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12.2c2.4 0 4.3-2 4.3-4.4S14.4 3.5 12 3.5 7.7 5.4 7.7 7.8 9.6 12.2 12 12.2Zm0 2c-3.3 0-6 1.7-6 3.9V20h12v-1.9c0-2.2-2.7-3.9-6-3.9Z"
            fill="currentColor"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className={styles.profilePopover} data-testid="profile-popover">
          <div className={styles.profileHeader}>Signed in</div>
          {profile ? (
            <div className={styles.profileDetails}>
              <div className={styles.profileName}>
                {profile.first_name} {profile.last_name}
              </div>
              <div className={styles.profileEmail}>{userEmail}</div>
              <div className={styles.profileMeta}>{profile.company}</div>
              <div className={styles.profileMeta}>{profile.location}</div>
            </div>
          ) : (
            <div className={styles.profileEmail}>{userEmail}</div>
          )}
          <div className={styles.profileActions}>
            {isAdmin ? (
              <Link
                href="/admin/imports"
                className={styles.profileActionButton}
                onClick={closePopover}
              >
                Admin
              </Link>
            ) : null}
            <Link href="/account" className={styles.profileActionButton} onClick={closePopover}>
              Account details
            </Link>
            <Link href="/orders" className={styles.profileActionButton} onClick={closePopover}>
              View orders
            </Link>
            <button
              type="button"
              className={styles.logoutButton}
              onClick={async () => {
                closePopover();
                await supabase.auth.signOut();
                setUserEmail(null);
                setUserId(null);
                setProfile(null);
                router.replace('/');
                router.refresh();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
