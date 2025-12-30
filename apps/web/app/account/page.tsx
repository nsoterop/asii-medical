'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import styles from '../signup/SignupPage.module.css';

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  company?: string;
  location?: string;
};

const namePattern = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
type LocationOption = {
  id: string;
  label: string;
};

const formatProfileError = (message?: string | null) => {
  if (!message) {
    return 'Unable to save profile details. Please try again.';
  }
  if (message.includes('schema cache') || message.includes('relation') || message.includes('profiles')) {
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
}): FieldErrors => {
  const errors: FieldErrors = {};
  const trimmedFirstName = values.firstName.trim();
  const trimmedLastName = values.lastName.trim();
  const trimmedCompany = values.company.trim();
  const trimmedLocation = values.location.trim();
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
  return errors;
};

export default function AccountPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationSelected, setLocationSelected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    firstName: false,
    lastName: false,
    company: false,
    location: false,
    email: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fieldErrors = useMemo(
    () =>
      buildFieldErrors({
        firstName,
        lastName,
        company,
        location,
        locationSelected
      }),
    [firstName, lastName, company, location, locationSelected]
  );

  const shouldShowError = (field: keyof FieldErrors) =>
    Boolean((touched[field] || submitted) && fieldErrors[field]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoadingProfile(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !userData.user) {
        setError('Unable to load your account details.');
        setLoadingProfile(false);
        return;
      }
      const user = userData.user;
      setUserId(user.id);
      const nextEmail = user.email ?? '';
      setEmail((prev) => prev || nextEmail);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name,last_name,company,location')
        .eq('id', user.id)
        .single();

      if (!active) return;

      if (profileData) {
        setFirstName((prev) => prev || profileData.first_name || '');
        setLastName((prev) => prev || profileData.last_name || '');
        setCompany((prev) => prev || profileData.company || '');
        setLocation((prev) => prev || profileData.location || '');
        setLocationSelected((prev) => prev || Boolean(profileData.location));
      }
      setLoadingProfile(false);
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    const query = location.trim();
    if (query.length < 3 || locationSelected) {
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
  }, [location, locationSelected]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitted(true);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }
    if (!userId) {
      setError('Unable to update your account. Please try again.');
      return;
    }
    setLoading(true);
    const trimmed = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company.trim(),
      location: location.trim(),
    };
    const updatePayload: {
      data: {
        first_name: string;
        last_name: string;
        company: string;
        location: string;
      };
    } = {
      data: {
        first_name: trimmed.firstName,
        last_name: trimmed.lastName,
        company: trimmed.company,
        location: trimmed.location
      }
    };

    const { error: updateError } = await supabase.auth.updateUser(updatePayload);
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
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
    setSuccess('Account updated.');
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Account details</h1>
          <p className={styles.subtitle}>Update your ASii Medical profile.</p>
        </div>
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
              disabled={loadingProfile}
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
              disabled={loadingProfile}
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
              disabled={loadingProfile}
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
                disabled={loadingProfile}
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
              disabled
              className={styles.input}
            />
            {shouldShowError('email') ? (
              <span className={styles.fieldError}>{fieldErrors.email}</span>
            ) : null}
          </label>
          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{success}</div> : null}
          <button type="submit" disabled={loading || loadingProfile} className={styles.submit}>
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
