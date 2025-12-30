export type CartItem = {
  itemId: number;
  quantity: number;
  productId?: number | null;
  productName?: string | null;
  itemDescription?: string | null;
  manufacturerName?: string | null;
  availabilityRaw?: string | null;
  pkg?: string | null;
  ndcItemCode?: string | null;
  unitPrice?: number | null;
  imageUrl?: string | null;
};

const CART_KEY = 'cartItems';

export const dispatchCartUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('cart:updated'));
};

export const readCartItems = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeCartItems = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  dispatchCartUpdate();
};

export const clearCartItems = () => {
  writeCartItems([]);
};

export const addCartItem = (item: CartItem) => {
  const current = readCartItems();
  const normalizedQuantity = Math.max(1, item.quantity);
  const index = current.findIndex((entry) => entry.itemId === item.itemId);
  if (index >= 0) {
    const existing = current[index];
    current[index] = {
      ...existing,
      ...item,
      quantity: existing.quantity + normalizedQuantity,
    };
  } else {
    current.push({ ...item, quantity: normalizedQuantity });
  }
  writeCartItems(current);
};

export const updateCartItemQuantity = (itemId: number, quantity: number) => {
  const current = readCartItems();
  const nextQuantity = Math.max(1, quantity);
  const index = current.findIndex((entry) => entry.itemId === itemId);
  if (index >= 0) {
    current[index] = { ...current[index], quantity: nextQuantity };
    writeCartItems(current);
  }
};

export const removeCartItem = (itemId: number) => {
  const current = readCartItems();
  const next = current.filter((entry) => entry.itemId !== itemId);
  writeCartItems(next);
};

export const getCartTotals = (items: CartItem[]) => {
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => {
    if (item.unitPrice === null || item.unitPrice === undefined) return acc;
    return acc + item.unitPrice * item.quantity;
  }, 0);
  return { totalQuantity, subtotal };
};
