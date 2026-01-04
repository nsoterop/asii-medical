import { authedFetch } from './api/authedFetch';

export type CheckoutCreateResponse = {
  cartId: string;
  subtotalCents: number;
  taxCents: number;
  amountCents: number;
  currency: string;
};

export type CheckoutPayResponse = {
  status: 'PAID';
  orderId: string;
  squarePaymentId: string;
  receiptUrl?: string | null;
};

export type CheckoutStatusResponse = {
  orderId: string;
  status:
    | 'PENDING'
    | 'PENDING_PAYMENT'
    | 'PAID'
    | 'FULFILLING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED'
    | 'FAILED';
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

export const createCheckoutOrder = async (params: {
  shippingAddress: string;
}): Promise<CheckoutCreateResponse> => {
  const response = await authedFetch('/api/checkout/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error((await parseError(response)) || 'Unable to start checkout.');
  }

  return (await response.json()) as CheckoutCreateResponse;
};

export const payCheckoutOrder = async (params: {
  cartId: string;
  sourceId?: string;
  buyerEmail?: string;
  shippingAddress: string;
}): Promise<CheckoutPayResponse> => {
  const payload: Record<string, unknown> = {
    cartId: params.cartId,
    buyerEmail: params.buyerEmail,
    shippingAddress: params.shippingAddress,
  };
  if (params.sourceId) {
    payload.sourceId = params.sourceId;
  }

  const response = await authedFetch('/api/checkout/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error((await parseError(response)) || 'Payment failed.');
  }

  return (await response.json()) as CheckoutPayResponse;
};

export const fetchCheckoutStatus = async (orderId: string): Promise<CheckoutStatusResponse> => {
  const response = await authedFetch(`/api/checkout/${orderId}/status`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error((await parseError(response)) || 'Unable to load order status.');
  }

  return (await response.json()) as CheckoutStatusResponse;
};
