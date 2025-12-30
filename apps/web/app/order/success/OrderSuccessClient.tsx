'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './OrderSuccessPage.module.css';
import { fetchCheckoutStatus, type CheckoutStatusResponse } from '../../../src/lib/checkout-api';

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [status, setStatus] = useState<CheckoutStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!orderId) {
        setError('Missing order details.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetchCheckoutStatus(orderId);
        if (active) {
          setStatus(response);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load order.';
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
  }, [orderId]);

  let title = 'Order confirmation';
  let message = 'We have received your order.';

  if (loading) {
    message = 'Checking your payment status...';
  } else if (error) {
    title = 'Order status unavailable';
    message = error;
  } else if (
    status?.status === 'PAID' ||
    status?.status === 'FULFILLING' ||
    status?.status === 'SHIPPED' ||
    status?.status === 'DELIVERED'
  ) {
    title = 'Payment complete';
    message = 'Thank you for your order. Your payment was successful.';
  } else if (status?.status === 'PENDING' || status?.status === 'PENDING_PAYMENT') {
    title = 'Payment processing';
    message = 'We are still confirming your payment. Please refresh in a moment.';
  } else if (status?.status === 'FAILED') {
    title = 'Payment failed';
    message = 'Your payment did not go through. Please return to checkout.';
  } else if (status?.status === 'CANCELED') {
    title = 'Payment canceled';
    message = 'Your payment was canceled. Please return to checkout if needed.';
  } else if (status?.status === 'REFUNDED' || status?.status === 'PARTIALLY_REFUNDED') {
    title = 'Payment refunded';
    message = 'Your payment was refunded. Please contact support if you need help.';
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {orderId ? <p className={styles.orderId}>Order ID: {orderId}</p> : null}
        <div className={styles.actions}>
          <Link href="/search" className={styles.primaryLink}>
            Continue shopping
          </Link>
          <Link href="/orders" className={styles.secondaryLink}>
            View orders
          </Link>
        </div>
      </div>
    </div>
  );
}
