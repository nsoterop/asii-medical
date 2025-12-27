'use client';

import { useEffect, useMemo, useState } from 'react';
import HeroSection from '../hero/HeroSection';
import AboutCta from './AboutCta';
import GetStartedCta from './GetStartedCta';
import { createBrowserSupabaseClient } from '../../lib/supabase/browser';

type LandingContentProps = {
  initialIsLoggedIn: boolean;
};

export default function LandingContent({ initialIsLoggedIn }: LandingContentProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setIsLoggedIn(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <>
      <HeroSection isLoggedIn={isLoggedIn} />
      {isLoggedIn ? <AboutCta /> : null}
      {!isLoggedIn ? <GetStartedCta /> : null}
    </>
  );
}
