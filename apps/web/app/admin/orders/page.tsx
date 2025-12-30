'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  cancelAdminOrder,
  fulfillAdminOrder,
  listAdminOrders,
  markAdminOrderDelivered,
  type AdminOrder,
  type AdminShipment
} from '../../../lib/admin-api';
import { formatCurrency } from '../../../src/lib/format';

type ShipmentForm = {
  carrier: string;
  service: string;
  trackingNo: string;
  trackingUrl: string;
};

const statusOptions = [
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' }
];

const formatStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase();

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-US');
};

const getLatestShipment = (shipments: AdminShipment[]) => {
  if (!shipments.length) return null;
  const sorted = [...shipments].sort((a, b) => {
    const aTime = new Date(a.shippedAt || a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.shippedAt || b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  return sorted[0] ?? null;
};

const getItemName = (item: AdminOrder['items'][number]) => {
  const meta = item.meta as Record<string, unknown> | null | undefined;
  const metaName = typeof meta?.productName === 'string' ? meta.productName : null;
  if (metaName && metaName.trim().length > 0) {
    return metaName;
  }
  return item.name;
};

const buildItemSummary = (order: AdminOrder) => {
  if (!order.items.length) return 'No items';
  const names = order.items
    .slice(0, 2)
    .map((item) => getItemName(item))
    .filter(Boolean);
  const suffix = order.items.length > 2 ? ` +${order.items.length - 2} more` : '';
  if (!names.length) {
    return `${order.items.length} items`;
  }
  return `${names.join(', ')}${suffix}`;
};

const isShipmentFormComplete = (form?: ShipmentForm) => {
  if (!form) return false;
  return (
    form.carrier.trim().length > 0 &&
    form.service.trim().length > 0 &&
    form.trackingNo.trim().length > 0 &&
    form.trackingUrl.trim().length > 0
  );
};

const canMarkShipped = (status: string) => status === 'PAID' || status === 'FULFILLING';
const canMarkDelivered = (status: string) => status === 'SHIPPED';
const canCancel = (status: string) =>
  status === 'PAID' || status === 'FULFILLING' || status === 'PENDING_PAYMENT' || status === 'FAILED';
const isTerminal = (status: string) =>
  status === 'DELIVERED' || status === 'CANCELED' || status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('paid');
  const [searchInput, setSearchInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, ShipmentForm>>({});
  const searchReady = useRef(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await listAdminOrders(filter, {
        query: searchInput.trim() || undefined,
        date: dateInput || undefined
      });
      setOrders(data);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  useEffect(() => {
    if (!searchReady.current) {
      searchReady.current = true;
      return;
    }
    const handle = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, dateInput]);

  useEffect(() => {
    setFormState((prev) => {
      const next = { ...prev };
      orders.forEach((order) => {
        if (next[order.id]) return;
        const latest = getLatestShipment(order.shipments);
        next[order.id] = {
          carrier: latest?.carrier ?? '',
          service: latest?.service ?? '',
          trackingNo: latest?.trackingNo ?? '',
          trackingUrl: latest?.trackingUrl ?? ''
        };
      });
      return next;
    });
  }, [orders]);

  const totals = useMemo(
    () => orders.reduce((acc, order) => acc + toNumber(order.total), 0),
    [orders]
  );

  const updateField = (orderId: string, field: keyof ShipmentForm, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value }
    }));
  };

  const onFulfill = async (orderId: string) => {
    const form = formState[orderId];
    if (!form) return;
    if (!isShipmentFormComplete(form)) {
      setError('Fill out carrier, service, tracking number, and tracking URL before marking shipped.');
      return;
    }
    try {
      setSavingId(orderId);
      await fulfillAdminOrder(orderId, {
        carrier: form.carrier || undefined,
        service: form.service || undefined,
        trackingNo: form.trackingNo || undefined,
        trackingUrl: form.trackingUrl || undefined
      });
      await fetchOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update shipment.';
      setError(message);
    } finally {
      setSavingId(null);
    }
  };

  const onDelivered = async (orderId: string) => {
    try {
      setDeliveringId(orderId);
      await markAdminOrderDelivered(orderId);
      await fetchOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark delivered.';
      setError(message);
    } finally {
      setDeliveringId(null);
    }
  };

  const onCancel = async (orderId: string) => {
    try {
      setCancelingId(orderId);
      await cancelAdminOrder(orderId);
      await fetchOrders();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel order.';
      setError(message);
    } finally {
      setCancelingId(null);
    }
  };

  const onClearSearch = () => {
    setSearchInput('');
    setDateInput('');
  };

  return (
    <div className="admin-shell">
      <div className="admin-row" style={{ justifyContent: 'space-between' }}>
        <div className="admin-row">
          <Link href="/admin/imports" className="admin-link">
            Imports
          </Link>
          <Link href="/admin/orders" className="admin-link active">
            Orders
          </Link>
          <Link href="/admin/products" className="admin-link">
            Product Updates
          </Link>
        </div>
        <span className="admin-muted">Total shown: {formatCurrency(totals)}</span>
      </div>

      <h1>Orders</h1>

      <div className="admin-card">
        <div className="admin-row">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-button secondary ${filter === option.value ? 'active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {error ? <p className="admin-muted">{error}</p> : null}
      </div>

      <div className="admin-card">
        <div className="admin-row">
          <input
            className="admin-input"
            placeholder="Search by order id, item name, or tracking"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <input
            className="admin-input"
            type="date"
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            style={{ maxWidth: '200px' }}
          />
          <button type="button" className="admin-button secondary" onClick={onClearSearch}>
            Clear
          </button>
        </div>
        <p className="admin-muted">
          Matches order id, item name, tracking number, and the selected date.
        </p>
      </div>

      <div className="admin-card">
        {loading ? (
          <p className="admin-muted">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="admin-muted">No orders found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Created</th>
                <th>Total</th>
                <th>Items</th>
                <th>Shipment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const latestShipment = getLatestShipment(order.shipments);
                const form = formState[order.id];
                const canShip = canMarkShipped(order.status);
                const shipmentReady = isShipmentFormComplete(form);
                const showActions = !isTerminal(order.status);
                const showForm = showActions && canShip;
                return (
                  <tr key={order.id}>
                    <td>
                      <div>{order.id}</div>
                      <div className="admin-muted">{order.userId}</div>
                    </td>
                    <td>{formatStatus(order.status)}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{formatCurrency(toNumber(order.total))}</td>
                    <td>{buildItemSummary(order)}</td>
                    <td>
                      <div className="admin-muted">
                        {latestShipment ? formatStatus(latestShipment.status) : 'No shipment'}
                      </div>
                      <div className="admin-muted">
                        {latestShipment?.trackingNo ? `Tracking: ${latestShipment.trackingNo}` : ''}
                      </div>
                    </td>
                    <td>
                      {showActions ? (
                        <div className="admin-form">
                          {showForm ? (
                            <>
                              <input
                                className="admin-input"
                                placeholder="Carrier"
                                value={form?.carrier ?? ''}
                                onChange={(event) =>
                                  updateField(order.id, 'carrier', event.target.value)
                                }
                              />
                              <input
                                className="admin-input"
                                placeholder="Service"
                                value={form?.service ?? ''}
                                onChange={(event) =>
                                  updateField(order.id, 'service', event.target.value)
                                }
                              />
                              <input
                                className="admin-input"
                                placeholder="Tracking number"
                                value={form?.trackingNo ?? ''}
                                onChange={(event) =>
                                  updateField(order.id, 'trackingNo', event.target.value)
                                }
                              />
                              <input
                                className="admin-input"
                                placeholder="Tracking URL"
                                value={form?.trackingUrl ?? ''}
                                onChange={(event) =>
                                  updateField(order.id, 'trackingUrl', event.target.value)
                                }
                              />
                            </>
                          ) : null}
                          <div className="admin-actions">
                            {canMarkShipped(order.status) ? (
                              <button
                                type="button"
                                className="admin-button"
                                onClick={() => onFulfill(order.id)}
                                disabled={savingId === order.id || !shipmentReady}
                              >
                                {savingId === order.id ? 'Saving...' : 'Mark shipped'}
                              </button>
                            ) : null}
                            {canMarkDelivered(order.status) ? (
                              <button
                                type="button"
                                className="admin-button secondary"
                                onClick={() => onDelivered(order.id)}
                                disabled={deliveringId === order.id}
                              >
                                {deliveringId === order.id ? 'Updating...' : 'Mark delivered'}
                              </button>
                            ) : null}
                            {canCancel(order.status) ? (
                              <button
                                type="button"
                                className="admin-button danger"
                                onClick={() => onCancel(order.id)}
                                disabled={cancelingId === order.id}
                              >
                                {cancelingId === order.id ? 'Canceling...' : 'Cancel order'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="admin-muted">No actions</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
