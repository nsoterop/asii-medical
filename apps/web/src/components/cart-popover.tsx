'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './header.module.css';
import {
  CartItem,
  clearCartItems,
  dispatchCartUpdate,
  getCartTotals,
  readCartItems
} from '../lib/cart';
import { createBrowserSupabaseClient } from '../lib/supabase/browser';
import { fetchCart, mergeGuestCart } from '../lib/cart-api';

export default function CartPopover() {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastFetchRef = useRef(0);

  const refresh = async (force = false) => {
    if (isLoggedIn) {
      try {
        const now = Date.now();
        if (!force && hasLoaded && now - lastFetchRef.current < 60 * 60 * 1000) {
          return;
        }
        const response = await fetchCart();
        setItems(response.items);
        lastFetchRef.current = Date.now();
        return;
      } catch {
        setItems([]);
      } finally {
        setHasLoaded(true);
      }
    }
    setItems(readCartItems());
    setHasLoaded(true);
  };

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextLoggedIn = Boolean(session?.user);
      setIsLoggedIn(nextLoggedIn);
      if (nextLoggedIn) {
        const guestItems = readCartItems();
        if (guestItems.length > 0) {
          await mergeGuestCart(guestItems);
          clearCartItems();
          dispatchCartUpdate();
        }
      }
      refresh(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    refresh(true);
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== 'cartItems') return;
      refresh(true);
    };
    const handleUpdate = () => {
      refresh(true);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cart:updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cart:updated', handleUpdate);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const totals = useMemo(() => getCartTotals(items), [items]);

  const openPopover = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (!nextOpen) {
      return;
    }
    if (!hasLoaded) {
      setIsLoading(true);
      refresh().finally(() => setIsLoading(false));
      return;
    }
    refresh();
  };

  const onViewCart = () => {
    setIsOpen(false);
    router.push('/cart');
  };

  return (
    <div className={styles.cartWrap} ref={wrapperRef}>
      <button
        type="button"
        className={styles.cartButton}
        onClick={openPopover}
        aria-label="Cart"
        data-testid="cart-button"
      >
        <svg
          viewBox="0 0 24 24"
          className={styles.cartIcon}
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M3 5h2l2.4 9.6a2 2 0 0 0 2 1.4h7.7a2 2 0 0 0 2-1.5l1.4-6.5H7.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="20" r="1.6" fill="currentColor" />
          <circle cx="18" cy="20" r="1.6" fill="currentColor" />
        </svg>
        {totals.totalQuantity > 0 ? (
          <span className={styles.cartBadge} data-testid="cart-count">
            {totals.totalQuantity}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div className={styles.cartPopover} data-testid="cart-popover">
          <div className={styles.cartHeader}>
            <span>Cart</span>
          </div>
          {isLoading && items.length === 0 ? (
            <div className={styles.cartEmpty}>Loading…</div>
          ) : items.length === 0 ? (
            <div className={styles.cartEmpty}>Your cart is empty.</div>
          ) : (
            <div className={styles.cartList}>
              {items.map((item) => {
                const label =
                  item.productName || item.itemDescription || `Item ${item.itemId}`;
                const lineTotal =
                  item.unitPrice !== null && item.unitPrice !== undefined
                    ? item.unitPrice * item.quantity
                    : null;
                return (
                  <div key={item.itemId} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <div className={styles.cartItemName}>{label}</div>
                      <div className={styles.cartItemMeta}>Qty: {item.quantity}</div>
                    </div>
                    <div className={styles.cartItemMeta}>
                      {lineTotal !== null ? `$${lineTotal.toFixed(2)}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.cartFooter}>
            <div className={styles.cartSubtotal}>
              <span>Subtotal</span>
              <span>
                {totals.subtotal > 0 ? `$${totals.subtotal.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className={styles.cartActions}>
              <button type="button" className={styles.cartViewButton} onClick={onViewCart}>
                View cart
              </button>
              <button type="button" className={styles.cartCheckoutButton} disabled>
                Checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
