'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import styles from './CheckoutPage.module.css';
import { formatCurrency } from '../../src/lib/format';
import { fetchCart, type CartResponse } from '../../src/lib/cart-api';
import { clearCartItems, dispatchCartUpdate } from '../../src/lib/cart';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import {
  createCheckoutOrder,
  payCheckoutOrder,
  type CheckoutCreateResponse
} from '../../src/lib/checkout-api';

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
  destroy?: () => Promise<void> | void;
};

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

type CheckoutDetails = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  shippingAddress: string;
};

type LocationOption = {
  id: string;
  label: string;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

const US_STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY'
]);

const US_STATE_NAMES: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  NEW_HAMPSHIRE: 'NH',
  NEW_JERSEY: 'NJ',
  NEW_MEXICO: 'NM',
  NEW_YORK: 'NY',
  NORTH_CAROLINA: 'NC',
  NORTH_DAKOTA: 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  RHODE_ISLAND: 'RI',
  SOUTH_CAROLINA: 'SC',
  SOUTH_DAKOTA: 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  WEST_VIRGINIA: 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY'
};

const extractUsStateFromAddress = (value: string) => {
  const upper = value.toUpperCase();
  const matches = upper.match(/\b[A-Z]{2}\b/g) ?? [];
  for (const match of matches) {
    if (US_STATE_CODES.has(match)) {
      return match;
    }
  }
  for (const [name, code] of Object.entries(US_STATE_NAMES)) {
    const pattern = new RegExp(`\\b${name.replace(/_/g, '\\s+')}\\b`);
    if (pattern.test(upper)) {
      return code;
    }
  }
  return null;
};

const isTaxAddressReady = (value: string) => Boolean(extractUsStateFromAddress(value));

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [checkout, setCheckout] = useState<CheckoutCreateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [squareReady, setSquareReady] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [details, setDetails] = useState<CheckoutDetails>({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    shippingAddress: ''
  });
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const cardRef = useRef<SquareCard | null>(null);
  const debouncedShippingAddress = useDebouncedValue(details.shippingAddress, 500);

  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APP_ID;
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  const squareEnv = process.env.NEXT_PUBLIC_SQUARE_ENV === 'production' ? 'production' : 'sandbox';
  const squareScriptUrl =
    squareEnv === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const cartResponse = await fetchCart();
        if (!active) return;
        setCart(cartResponse);

        if (cartResponse.items.length === 0) {
          setError('Your cart is empty.');
          return;
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to start checkout.';
        if (active) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      const email = user?.email ?? '';
      let profile: {
        first_name: string;
        last_name: string;
        company: string;
        location: string;
      } | null = null;
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name,last_name,company,location')
          .eq('id', user.id)
          .single();
        profile = profileData ?? null;
      }

      if (!active) {
        return;
      }

      setDetails((prev) => ({
        firstName: prev.firstName || profile?.first_name || '',
        lastName: prev.lastName || profile?.last_name || '',
        company: prev.company || profile?.company || '',
        email: prev.email || email || '',
        shippingAddress: prev.shippingAddress || profile?.location || ''
      }));
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const address = debouncedShippingAddress.trim();
    if (!address || !isTaxAddressReady(address)) {
      setCheckout(null);
      setQuoteLoading(false);
      return;
    }

    let active = true;
    const run = async () => {
      try {
        setQuoteLoading(true);
        const checkoutResponse = await createCheckoutOrder({
          shippingAddress: address
        });
        if (!active) return;
        setCheckout(checkoutResponse);
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to calculate tax.';
        if (!active) return;
        setCheckout(null);
        setError(message);
      } finally {
        if (active) {
          setQuoteLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [cart, debouncedShippingAddress]);

  useEffect(() => {
    const query = details.shippingAddress.trim();
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
  }, [details.shippingAddress]);

  useEffect(() => {
    let cancelled = false;

    const initCard = async () => {
      if (!squareReady || cardRef.current) {
        return;
      }

      if (!squareAppId || !squareLocationId) {
        setError('Square configuration is missing.');
        return;
      }

      if (!window.Square) {
        setError('Square SDK failed to load.');
        return;
      }

      try {
        const payments = window.Square.payments(squareAppId, squareLocationId);
        const card = await payments.card();
        await card.attach('#card-container');
        if (!cancelled) {
          cardRef.current = card;
          setCardReady(true);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to initialize payment form.';
        if (!cancelled) {
          setError(message);
        }
      }
    };

    initCard();

    return () => {
      cancelled = true;
      if (cardRef.current?.destroy) {
        cardRef.current.destroy();
      }
      setCardReady(false);
    };
  }, [squareReady, squareAppId, squareLocationId]);

  const handlePay = async () => {
    const address = details.shippingAddress.trim();
    if (!isTaxAddressReady(address)) {
      setError('Enter a full shipping address to calculate tax.');
      return;
    }

    if (!checkout || !cardRef.current) {
      return;
    }

    setPaying(true);
    setError('');

    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== 'OK' || !result.token) {
        const message = result.errors?.[0]?.message || 'Card details could not be verified.';
        throw new Error(message);
      }

      const payment = await payCheckoutOrder({
        cartId: checkout.cartId,
        sourceId: result.token,
        buyerEmail: details.email.trim() || undefined,
        shippingAddress: address
      });

      clearCartItems();
      dispatchCartUpdate();
      router.push(`/order/success?orderId=${payment.orderId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed.';
      setError(message);
    } finally {
      setPaying(false);
    }
  };

  const showSummary = cart && cart.items.length > 0;
  const subtotal = checkout ? checkout.subtotalCents / 100 : cart?.totals.subtotal ?? 0;
  const taxAmount = checkout ? checkout.taxCents / 100 : null;
  const totalAmount = checkout ? checkout.amountCents / 100 : subtotal;
  const hasAddress = details.shippingAddress.trim().length > 0;
  const hasState = Boolean(extractUsStateFromAddress(details.shippingAddress));

  return (
    <div className={styles.page}>
      <Script src={squareScriptUrl} strategy="afterInteractive" onLoad={() => setSquareReady(true)} />
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Checkout</h1>
      </div>
      <div className={styles.layout}>
        <div className={styles.column}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Contact &amp; shipping</h2>
            <p className={styles.muted}>Confirm the details we should use for your order.</p>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="checkout-first-name">
                  First name
                </label>
                <input
                  id="checkout-first-name"
                  className={styles.input}
                  value={details.firstName}
                  onChange={(event) =>
                    setDetails((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  autoComplete="given-name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="checkout-last-name">
                  Last name
                </label>
                <input
                  id="checkout-last-name"
                  className={styles.input}
                  value={details.lastName}
                  onChange={(event) =>
                    setDetails((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  autoComplete="family-name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="checkout-company">
                  Company
                </label>
                <input
                  id="checkout-company"
                  className={styles.input}
                  value={details.company}
                  onChange={(event) =>
                    setDetails((prev) => ({ ...prev, company: event.target.value }))
                  }
                  autoComplete="organization"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="checkout-email">
                  Email
                </label>
                <input
                  id="checkout-email"
                  className={styles.input}
                  type="email"
                  value={details.email}
                  onChange={(event) =>
                    setDetails((prev) => ({ ...prev, email: event.target.value }))
                  }
                  autoComplete="email"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="checkout-shipping-address">
                  Shipping address
                </label>
                <div className={styles.locationWrap}>
                  <input
                    id="checkout-shipping-address"
                    className={`${styles.input} ${styles.locationInput}`}
                    type="text"
                    placeholder="Start typing your address"
                    value={details.shippingAddress}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setDetails((prev) => ({ ...prev, shippingAddress: nextValue }));
                      setCheckout(null);
                      setError('');
                      setIsLocationOpen(true);
                    }}
                    onFocus={() => setIsLocationOpen(true)}
                    onBlur={() => setTimeout(() => setIsLocationOpen(false), 100)}
                    autoComplete="shipping street-address"
                  />
                  {isLocationOpen && details.shippingAddress.trim().length >= 3 ? (
                    <div className={styles.locationList} role="listbox">
                      {locationOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={styles.locationOption}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setDetails((prev) => ({ ...prev, shippingAddress: option.label }));
                            setCheckout(null);
                            setError('');
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
              </div>
            </div>
          </div>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Payment</h2>
            <p className={styles.muted}>Enter your card details to complete the order.</p>
            <div id="card-container" className={styles.cardContainer} />
            {error ? <div className={styles.error}>{error}</div> : null}
            <button
              type="button"
              className={styles.payButton}
              onClick={handlePay}
              disabled={loading || quoteLoading || paying || !checkout || !cardReady}
            >
              {paying ? 'Processing...' : 'Pay now'}
            </button>
            <p className={styles.disclaimer}>Payments are processed securely by Square.</p>
          </div>
        </div>
        <div className={styles.summaryColumn}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Order summary</h2>
            {loading ? (
              <p className={styles.muted}>Loading cart...</p>
            ) : showSummary ? (
              <>
                <div className={styles.summaryRows}>
                  {cart?.items.map((item) => (
                    <div key={item.itemId} className={styles.summaryRow}>
                      <span>
                        {item.itemDescription || item.productName || `Item ${item.itemId}`} × {item.quantity}
                      </span>
                      <span>
                        {formatCurrency((item.unitPrice ?? 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Sales tax</span>
                  <span>
                    {checkout
                      ? formatCurrency(taxAmount ?? 0)
                      : quoteLoading
                        ? 'Calculating...'
                        : hasAddress
                          ? hasState
                            ? 'Calculating...'
                            : 'Add state to calculate tax'
                          : 'Enter shipping address'}
                  </span>
                </div>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </>
            ) : (
              <>
                <p className={styles.muted}>Your cart is empty.</p>
                <Link href="/cart" className={styles.secondaryLink}>
                  Return to cart
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
