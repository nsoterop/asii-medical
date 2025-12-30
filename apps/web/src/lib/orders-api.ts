import { authedFetch } from './api/authedFetch';

export type OrderItem = {
  id: string;
  name: string;
  description?: string | null;
  qty: number;
  unitPrice: number | string;
  currency: string;
  meta?: Record<string, unknown> | null;
};

export type Shipment = {
  id: string;
  carrier?: string | null;
  service?: string | null;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  status: string;
};

export type OrderResponse = {
  id: string;
  status: string;
  currency: string;
  total: number | string;
  createdAt: string;
  items: OrderItem[];
  shipments: Shipment[];
};

const parseError = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(' ');
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  }
  return response.text();
};

export const fetchOrders = async (status = 'open'): Promise<OrderResponse[]> => {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  const response = await authedFetch(`/api/orders?${params.toString()}`);
  if (!response.ok) {
    throw new Error((await parseError(response)) || 'Unable to load orders.');
  }
  return (await response.json()) as OrderResponse[];
};

export const fetchOrder = async (orderId: string): Promise<OrderResponse> => {
  const response = await authedFetch(`/api/orders/${orderId}`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error((await parseError(response)) || 'Unable to load order.');
  }
  return (await response.json()) as OrderResponse;
};
