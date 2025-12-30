'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CartItemCard from '../../src/components/cart/cart-item-card';
import OrderSummaryCard from '../../src/components/cart/order-summary-card';
import {
  CartItem,
  clearCartItems,
  dispatchCartUpdate,
  getCartTotals,
  readCartItems,
  removeCartItem,
  updateCartItemQuantity
} from '../../src/lib/cart';
import { createBrowserSupabaseClient } from '../../src/lib/supabase/browser';
import { fetchCart, mergeGuestCart, removeCartItemAuthed, updateCartItemQtyAuthed } from '../../src/lib/cart-api';
import styles from './CartPage.module.css';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (isLoggedIn) {
        try {
          const response = await fetchCart();
          setItems(response.items);
        } catch {
          setItems([]);
        }
      } else {
        setItems(readCartItems());
      }
    };
    load();
    const handleUpdate = () => {
      load();
    };
    window.addEventListener('cart:updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cart:updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [isLoggedIn]);

  const totals = useMemo(() => getCartTotals(items), [items]);
  const canCheckout = items.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Cart</h1>
      </div>
      <div className={styles.layout}>
        <div>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Your cart is empty.</p>
              <p>Find products and add them to your cart.</p>
              <Link href="/search" className={styles.emptyButton}>
                Continue shopping
              </Link>
            </div>
          ) : (
            <div className={styles.items} data-testid="cart-list">
              {items.map((item) => (
                <CartItemCard
                  key={item.itemId}
                  item={item}
                  onQuantityChange={async (itemId, quantity) => {
                    if (isLoggedIn) {
                      await updateCartItemQtyAuthed(itemId, quantity);
                      dispatchCartUpdate();
                      return;
                    }
                    updateCartItemQuantity(itemId, quantity);
                  }}
                  onRemove={async (itemId) => {
                    if (isLoggedIn) {
                      await removeCartItemAuthed(itemId);
                      dispatchCartUpdate();
                      return;
                    }
                    removeCartItem(itemId);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className={styles.summaryColumn}>
          <OrderSummaryCard subtotal={totals.subtotal} canCheckout={canCheckout} />
        </div>
      </div>
    </div>
  );
}
