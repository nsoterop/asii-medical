import { authedFetch } from '../src/lib/api/authedFetch';

export type ImportRun = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'FAILED' | 'SUCCEEDED';
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalRows: number;
  inserted: number;
  updated: number;
  deactivated: number;
  errorCount: number;
  originalFilename?: string;
  storedPath?: string;
};

export type ImportRowError = {
  id: string;
  importRunId: string;
  rowNumber: number;
  field: string | null;
  message: string;
  createdAt: string;
};

export type ImportErrorPage = {
  items: ImportRowError[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
};

export type AdminOrderItem = {
  id: string;
  name: string;
  description?: string | null;
  qty: number;
  unitPrice: string | number;
  currency: string;
  meta?: Record<string, unknown> | null;
};

export type AdminShipment = {
  id: string;
  carrier?: string | null;
  service?: string | null;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminOrder = {
  id: string;
  userId: string;
  cartId: string;
  status: string;
  currency: string;
  subtotal: string | number;
  total: string | number;
  createdAt: string;
  items: AdminOrderItem[];
  shipments: AdminShipment[];
};

export type AdminProductUpdate = {
  itemId: number;
  skuId: number;
  productId: number;
  productName: string;
  itemName: string;
  manufacturerName?: string | null;
  ndcItemCode?: string | null;
  categoryPathName?: string | null;
  imageUrl?: string | null;
  price: number | null;
  currency: string;
};

const BASE_URL = '/api';

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authedFetch(`${BASE_URL}${path}`, options);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function listImportRuns() {
  return adminFetch<ImportRun[]>('/admin/imports');
}

export function getImportRun(id: string) {
  return adminFetch<ImportRun>(`/admin/imports/${id}`);
}

export function getImportErrors(id: string, page: number, pageSize: number) {
  return adminFetch<ImportErrorPage>(
    `/admin/imports/${id}/errors?page=${page}&pageSize=${pageSize}`
  );
}

export async function uploadImport(file: File, priceMarginPercent?: number) {
  const formData = new FormData();
  formData.append('file', file);
  if (typeof priceMarginPercent === 'number' && Number.isFinite(priceMarginPercent)) {
    formData.append('priceMarginPercent', String(priceMarginPercent));
  }

  const response = await authedFetch(`${BASE_URL}/admin/imports`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<ImportRun>;
}

export function markImportFailed(id: string) {
  return adminFetch<ImportRun>(`/admin/imports/${id}/mark-failed`, {
    method: 'POST'
  });
}

export function listAdminOrders(
  status = 'paid',
  options?: { query?: string; date?: string }
) {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  if (options?.query) {
    params.set('q', options.query);
  }
  if (options?.date) {
    params.set('date', options.date);
  }
  return adminFetch<AdminOrder[]>(`/admin/orders?${params.toString()}`);
}

export function fulfillAdminOrder(
  id: string,
  payload: { carrier?: string; service?: string; trackingNo?: string; trackingUrl?: string }
) {
  return adminFetch<{ status: string }>(`/admin/orders/${id}/fulfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function markAdminOrderDelivered(id: string) {
  return adminFetch<{ status: string }>(`/admin/orders/${id}/mark-delivered`, {
    method: 'POST'
  });
}

export function cancelAdminOrder(id: string) {
  return adminFetch<{ status: string }>(`/admin/orders/${id}/cancel`, {
    method: 'POST'
  });
}

export function getAdminProductByItemId(itemId: string | number) {
  return adminFetch<AdminProductUpdate>(`/admin/products/by-item/${itemId}`);
}

export function updateAdminProductByItemId(
  itemId: string | number,
  payload: { price?: number; imageUrl?: string | null }
) {
  return adminFetch<AdminProductUpdate>(`/admin/products/by-item/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
