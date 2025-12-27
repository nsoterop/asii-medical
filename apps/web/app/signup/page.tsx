'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import styles from './SignupPage.module.css';

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  company?: string;
  location?: string;
  email?: string;
  password?: string;
};

const namePattern = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LocationOption = {
  id: string;
  label: string;
};

const formatProfileError = (message?: string | null) => {
  if (!message) {
    return 'Unable to save profile details. Please try again.';
  }
  if (message.includes("schema cache") || message.includes('relation') || message.includes('profiles')) {
    return 'Profile storage is not configured. Please run the profiles.sql script in Supabase and reload the schema cache.';
  }
  return message;
};

const buildFieldErrors = (values: {
  firstName: string;
  lastName: string;
  company: string;
  location: string;
  locationSelected: boolean;
  email: string;
  password: string;
}): FieldErrors => {
  const errors: FieldErrors = {};
  const trimmedFirstName = values.firstName.trim();
  const trimmedLastName = values.lastName.trim();
  const trimmedCompany = values.company.trim();
  const trimmedLocation = values.location.trim();
  const trimmedEmail = values.email.trim();

  if (!trimmedFirstName) {
    errors.firstName = 'First name is required.';
  } else if (!namePattern.test(trimmedFirstName)) {
    errors.firstName = 'First name must be letters only.';
  }
  if (!trimmedLastName) {
    errors.lastName = 'Last name is required.';
  } else if (!namePattern.test(trimmedLastName)) {
    errors.lastName = 'Last name must be letters only.';
  }
  if (!trimmedCompany) {
    errors.company = 'Company is required.';
  }
  if (!trimmedLocation) {
    errors.location = 'Location is required.';
  } else if (!values.locationSelected) {
    errors.location = 'Select a valid address from the list.';
  }
  if (!trimmedEmail) {
    errors.email = 'Email is required.';
  } else if (!emailPattern.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.password) {
    errors.password = 'Password is required.';
  }
  return errors;
};

export default function SignupPage() {
  const supabase = createBrowserSupabaseClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationSelected, setLocationSelected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    firstName: false,
    lastName: false,
    company: false,
    location: false,
    email: false,
    password: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const fieldErrors = useMemo(
    () =>
      buildFieldErrors({
        firstName,
        lastName,
        company,
        location,
        locationSelected,
        email,
        password
      }),
    [firstName, lastName, company, location, locationSelected, email, password]
  );

  const shouldShowError = (field: keyof FieldErrors) =>
    Boolean((touched[field] || submitted) && fieldErrors[field]);

  useEffect(() => {
    const query = location.trim();
    if (query.length < 3) {
      setLocationOptions([]);
      setLocationLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      setLocationLoading(true);
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Location lookup failed');
        }
        const data = (await response.json()) as LocationOption[];
        if (!active) return;
        setLocationOptions(data);
      } catch {
        if (!active) return;
        setLocationOptions([]);
      } finally {
        if (!active) return;
        setLocationLoading(false);
      }
    };
    run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [location]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitted(true);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }
    setLoading(true);
    const trimmed = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company.trim(),
      location: location.trim()
    };
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent('/search')}`
        : undefined;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          first_name: trimmed.firstName,
          last_name: trimmed.lastName,
          company: trimmed.company,
          location: trimmed.location
        }
      }
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      setError('Unable to create profile. Please try again.');
      return;
    }
    const profileResponse = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        firstName: trimmed.firstName,
        lastName: trimmed.lastName,
        company: trimmed.company,
        location: trimmed.location
      })
    });
    if (!profileResponse.ok) {
      let message: string | undefined;
      try {
        const payload = (await profileResponse.json()) as { error?: string };
        message = payload.error;
      } catch {
        message = undefined;
      }
      setLoading(false);
      setError(formatProfileError(message));
      return;
    }
    setLoading(false);
    setSuccess(true);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Sign up</h1>
            <p className={styles.subtitle}>Create your ASii Medical account</p>
          </div>
          {success ? (
            <div className={styles.success}>
              Check your email to confirm your account.
            </div>
          ) : (
            <form onSubmit={onSubmit} className={styles.form}>
              <label className={styles.label}>
                First name
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                  required
                  className={styles.input}
                />
                {shouldShowError('firstName') ? (
                  <span className={styles.fieldError}>{fieldErrors.firstName}</span>
                ) : null}
              </label>
              <label className={styles.label}>
                Last name
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))}
                  required
                  className={`${styles.input} ${styles.locationInput}`}
                />
                {shouldShowError('lastName') ? (
                  <span className={styles.fieldError}>{fieldErrors.lastName}</span>
                ) : null}
              </label>
              <label className={styles.label}>
                Company
                <input
                  type="text"
                  placeholder="Company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, company: true }))}
                  required
                  className={styles.input}
                />
                {shouldShowError('company') ? (
                  <span className={styles.fieldError}>{fieldErrors.company}</span>
                ) : null}
              </label>
              <label className={styles.label}>
                Location
                <div className={styles.locationWrap}>
                  <input
                  type="text"
                  placeholder="Start typing your address"
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setIsLocationOpen(true);
                    setLocationSelected(false);
                  }}
                  onFocus={() => setIsLocationOpen(true)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, location: true }));
                    setTimeout(() => setIsLocationOpen(false), 100);
                  }}
                  required
                  className={styles.input}
                />
                  {isLocationOpen && location.trim().length >= 3 ? (
                    <div className={styles.locationList} role="listbox">
                      {locationOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={styles.locationOption}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setLocation(option.label);
                            setLocationSelected(true);
                            setIsLocationOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                      {!locationLoading && locationOptions.length === 0 ? (
                        <div className={styles.locationEmpty}>No matches found.</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {shouldShowError('location') ? (
                  <span className={styles.fieldError}>{fieldErrors.location}</span>
                ) : null}
              </label>
              <label className={styles.label}>
                Email
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  required
                  className={styles.input}
                />
                {shouldShowError('email') ? (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                ) : null}
              </label>
              <label className={styles.label}>
                Password
                <input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  required
                  className={styles.input}
                />
                {shouldShowError('password') ? (
                  <span className={styles.fieldError}>{fieldErrors.password}</span>
                ) : null}
              </label>
              {error ? <div className={styles.error}>{error}</div> : null}
              <button type="submit" disabled={loading} className={styles.submit}>
                {loading ? 'Creating...' : 'Create account'}
              </button>
            </form>
          )}
          <div className={styles.footer}>
            <span>Already have an account?</span>{' '}
            <Link href="/login" className="text-link">Log in</Link>
          </div>
      </div>
    </div>
  );
}
