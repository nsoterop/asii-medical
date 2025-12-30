import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { addItemToCart, getAuthedUser, getOrCreateActiveCart } from '../cart-helpers';

const itemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  qty: z.number().int().min(1).max(999),
  unitPrice: z.number().min(0),
  currency: z.string().min(1).optional(),
  meta: z.record(z.any()).optional().nullable(),
});

const bodySchema = z.object({
  items: z.array(itemSchema),
});

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (parsed.data.items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const cart = await getOrCreateActiveCart(user.id);
  for (const item of parsed.data.items) {
    await addItemToCart(cart.id, item);
  }

  return NextResponse.json({ ok: true });
}
