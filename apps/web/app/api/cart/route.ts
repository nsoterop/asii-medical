import { NextResponse, type NextRequest } from 'next/server';
import { fetchCartItems, getAuthedUser, getOrCreateActiveCart } from './cart-helpers';

const mapItems = (items: any[]) => {
  return items.map((item) => {
    const meta = (item.meta ?? {}) as Record<string, unknown>;
    const variantId = item.variant_id ? String(item.variant_id) : null;
    return {
      itemId: variantId ? Number(variantId) : Number(item.product_id),
      quantity: item.qty,
      productId: item.product_id ? Number(item.product_id) : null,
      unitPrice: item.unit_price !== null ? Number(item.unit_price) : null,
      currency: item.currency ?? 'USD',
      productName: meta.productName ?? null,
      itemDescription: meta.itemDescription ?? null,
      manufacturerName: meta.manufacturerName ?? null,
      availabilityRaw: meta.availabilityRaw ?? null,
      pkg: meta.pkg ?? null,
      ndcItemCode: meta.ndcItemCode ?? null,
      imageUrl: meta.imageUrl ?? null
    };
  });
};

export async function GET(_request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cart = await getOrCreateActiveCart(user.id);
  const items = await fetchCartItems(cart.id);
  const normalized = mapItems(items);
  const subtotal = normalized.reduce((acc, item) => {
    if (item.unitPrice === null || item.unitPrice === undefined) return acc;
    return acc + item.unitPrice * item.quantity;
  }, 0);
  const totalQuantity = normalized.reduce((acc, item) => acc + item.quantity, 0);

  return NextResponse.json({
    items: normalized,
    totals: { subtotal, totalQuantity },
    shipping: 'Calculated at checkout',
    tax: 0
  });
}
