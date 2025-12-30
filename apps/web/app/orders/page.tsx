'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './OrdersPage.module.css';
import { fetchOrders, type OrderResponse } from '../../src/lib/orders-api';
import { formatCurrency } from '../../src/lib/format';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending payment',
  PAID: 'Paid',
  FULFILLING: 'Fulfilling',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
  FAILED: 'Failed'
};

const formatStatus = (status: string) => STATUS_LABELS[status] ?? status.toLowerCase();

const getStatusTone = (status: string) => {
  if (['PAID', 'FULFILLING'].includes(status)) return styles.statusSuccess;
  if (['SHIPPED', 'DELIVERED'].includes(status)) return styles.statusInfo;
  if (['FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(status)) {
    return styles.statusProblem;
  }
  return styles.statusPending;
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getItemName = (item: OrderResponse['items'][number]) => {
  const meta = item.meta as Record<string, unknown> | null | undefined;
  const metaName = typeof meta?.productName === 'string' ? meta.productName : null;
  if (metaName && metaName.trim().length > 0) {
    return metaName;
  }
  return item.name;
};

const buildItemSummary = (items: OrderResponse['items']) => {
  if (!items.length) return 'No items';
  const names = items
    .slice(0, 2)
    .map((item) => getItemName(item))
    .filter(Boolean);
  const suffix = items.length > 2 ? ` +${items.length - 2} more` : '';
  if (!names.length) {
    return `${items.length} items`;
  }
  return `${names.join(', ')}${suffix}`;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchOrders(filter);
        if (active) {
          setOrders(response);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load orders.';
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
  }, [filter]);

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>Track your recent purchases and shipments.</p>
        </div>
        <div className={styles.filterGroup}>
          <button
            type="button"
            className={`${styles.filterButton} ${filter === 'open' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('open')}
          >
            Open orders
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All orders
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.stateCard}>Loading your orders...</div>
      ) : error ? (
        <div className={`${styles.stateCard} ${styles.stateError}`}>{error}</div>
      ) : orders.length === 0 ? (
        <div className={styles.stateCard}>
          <p className={styles.stateTitle}>No orders yet.</p>
          <p className={styles.stateText}>Once you place an order, you will see it here.</p>
          <Link href="/search" className={styles.stateLink}>
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {orders.map((order) => {
            const total = toNumber(order.total);
            return (
              <div key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardTitle}>Order {order.id}</p>
                    <p className={styles.cardMeta}>
                      Placed {formatDate(order.createdAt)} - {order.items.length} items
                    </p>
                  </div>
                  <div className={styles.cardMetaRight}>
                    <span className={`${styles.statusBadge} ${getStatusTone(order.status)}`}>
                      {formatStatus(order.status)}
                    </span>
                    <span className={styles.total}>{formatCurrency(total)}</span>
                  </div>
                </div>
                <p className={styles.itemPreview}>{buildItemSummary(order.items)}</p>
                <Link href={`/orders/${order.id}`} className={styles.detailLink}>
                  View details
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
