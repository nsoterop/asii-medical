import type { CartItem } from './cart';

export type CartResponse = {
  items: CartItem[];
  totals: {
    subtotal: number;
    totalQuantity: number;
  };
  shipping?: string;
  tax?: number;
};

export const fetchCart = async (): Promise<CartResponse> => {
  const response = await fetch('/api/cart', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load cart');
  }
  return (await response.json()) as CartResponse;
};

export const addCartItemAuthed = async (item: CartItem) => {
  const body = {
    productId: item.productId ? String(item.productId) : String(item.itemId),
    variantId: String(item.itemId),
    qty: item.quantity,
    unitPrice: item.unitPrice ?? 0,
    currency: 'USD',
    meta: {
      productName: item.productName ?? null,
      itemDescription: item.itemDescription ?? null,
      manufacturerName: item.manufacturerName ?? null,
      availabilityRaw: item.availabilityRaw ?? null,
      pkg: item.pkg ?? null,
      ndcItemCode: item.ndcItemCode ?? null,
      imageUrl: item.imageUrl ?? null,
    },
  };

  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Unable to add to cart');
  }
};

export const updateCartItemQtyAuthed = async (itemId: number, qty: number) => {
  const response = await fetch(`/api/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qty }),
  });

  if (!response.ok) {
    throw new Error('Unable to update cart');
  }
};

export const removeCartItemAuthed = async (itemId: number) => {
  const response = await fetch(`/api/cart/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Unable to remove item');
  }
};

export const mergeGuestCart = async (items: CartItem[]) => {
  if (!items.length) return;
  const payload = {
    items: items.map((item) => ({
      productId: item.productId ? String(item.productId) : String(item.itemId),
      variantId: String(item.itemId),
      qty: item.quantity,
      unitPrice: item.unitPrice ?? 0,
      currency: 'USD',
      meta: {
        productName: item.productName ?? null,
        itemDescription: item.itemDescription ?? null,
        manufacturerName: item.manufacturerName ?? null,
        availabilityRaw: item.availabilityRaw ?? null,
        pkg: item.pkg ?? null,
        ndcItemCode: item.ndcItemCode ?? null,
        imageUrl: item.imageUrl ?? null,
      },
    })),
  };

  const response = await fetch('/api/cart/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Unable to merge cart');
  }
};
