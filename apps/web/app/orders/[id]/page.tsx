'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './OrderDetailsPage.module.css';
import { fetchOrder, type OrderResponse } from '../../../src/lib/orders-api';
import { formatCurrency } from '../../../src/lib/format';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending payment',
  PAID: 'Paid',
  FULFILLING: 'Fulfilling',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
  FAILED: 'Failed',
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
};

const formatStatus = (status: string) => STATUS_LABELS[status] ?? status.toLowerCase();
const formatShipmentStatus = (status: string) =>
  SHIPMENT_STATUS_LABELS[status] ?? status.toLowerCase();

const getItemName = (item: OrderResponse['items'][number]) => {
  const meta = item.meta as Record<string, unknown> | null | undefined;
  const metaName = typeof meta?.productName === 'string' ? meta.productName : null;
  if (metaName && metaName.trim().length > 0) {
    return metaName;
  }
  return item.name;
};

const getStatusTone = (status: string) => {
  if (['PAID', 'FULFILLING'].includes(status)) return styles.statusSuccess;
  if (['SHIPPED', 'DELIVERED'].includes(status)) return styles.statusInfo;
  if (['FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(status)) {
    return styles.statusProblem;
  }
  return styles.statusPending;
};

const getShipmentTone = (status: string) => {
  if (['SHIPPED', 'DELIVERED'].includes(status)) return styles.statusInfo;
  if (status === 'CANCELED') return styles.statusProblem;
  return styles.statusPending;
};

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [order, setOrder] = useState<OrderResponse | null>(null);
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
      setLoading(true);
      setError('');
      try {
        const response = await fetchOrder(orderId);
        if (active) {
          setOrder(response);
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

  const total = order ? toNumber(order.total) : 0;

  return (
    <div className={styles.page}>
      <Link href="/orders" className={styles.backLink}>
        &lt;- Back to orders
      </Link>

      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>{order ? `Order ${order.id}` : 'Order details'}</h1>
          <p className={styles.subtitle}>Placed {order ? formatDate(order.createdAt) : '--'}</p>
        </div>
        {order ? (
          <div className={styles.headerMeta}>
            <span className={`${styles.statusBadge} ${getStatusTone(order.status)}`}>
              {formatStatus(order.status)}
            </span>
            <span className={styles.total}>{formatCurrency(total)}</span>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className={styles.stateCard}>Loading order...</div>
      ) : error ? (
        <div className={`${styles.stateCard} ${styles.stateError}`}>{error}</div>
      ) : order ? (
        <div className={styles.layout}>
          <div className={styles.column}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Items</h2>
              {order.items.length === 0 ? (
                <p className={styles.muted}>No items were found for this order.</p>
              ) : (
                <div className={styles.itemsList}>
                  {order.items.map((item) => {
                    const unitPrice = toNumber(item.unitPrice);
                    const name = getItemName(item);
                    const description =
                      item.description && item.description !== name ? item.description : null;
                    return (
                      <div key={item.id} className={styles.itemRow}>
                        <div className={styles.itemDetails}>
                          <div className={styles.itemName}>{name}</div>
                          {description ? (
                            <div className={styles.itemDescription}>{description}</div>
                          ) : null}
                          <div className={styles.itemMeta}>
                            Qty {item.qty} - {formatCurrency(unitPrice)} each
                          </div>
                        </div>
                        <div className={styles.itemTotal}>
                          {formatCurrency(unitPrice * item.qty)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Shipping</h2>
              {order.shipments.length === 0 ? (
                <p className={styles.muted}>No shipment updates yet.</p>
              ) : (
                <div className={styles.shipments}>
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className={styles.shipmentRow}>
                      <div className={styles.shipmentDetails}>
                        <div className={styles.shipmentHeader}>
                          <span
                            className={`${styles.statusBadge} ${getShipmentTone(shipment.status)}`}
                          >
                            {formatShipmentStatus(shipment.status)}
                          </span>
                          {shipment.carrier || shipment.service ? (
                            <span className={styles.shipmentCarrier}>
                              {[shipment.carrier, shipment.service].filter(Boolean).join(' - ')}
                            </span>
                          ) : null}
                        </div>
                        {shipment.trackingNo ? (
                          <div className={styles.shipmentMeta}>
                            Tracking:{' '}
                            {shipment.trackingUrl ? (
                              <a
                                href={shipment.trackingUrl}
                                className={styles.trackingLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {shipment.trackingNo}
                              </a>
                            ) : (
                              shipment.trackingNo
                            )}
                          </div>
                        ) : null}
                        {shipment.shippedAt ? (
                          <div className={styles.shipmentMeta}>
                            Shipped {formatDate(shipment.shippedAt)}
                          </div>
                        ) : null}
                        {shipment.deliveredAt ? (
                          <div className={styles.shipmentMeta}>
                            Delivered {formatDate(shipment.deliveredAt)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.summaryColumn}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Summary</h2>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Status</span>
                  <span>{formatStatus(order.status)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Items</span>
                  <span>{order.items.length}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Placed</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
