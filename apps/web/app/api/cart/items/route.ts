import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { addItemToCart, getAuthedUser, getOrCreateActiveCart } from '../cart-helpers';

const bodySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  qty: z.number().int().min(1).max(999),
  unitPrice: z.number().min(0),
  currency: z.string().min(1).optional(),
  meta: z.record(z.any()).optional().nullable()
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

  const cart = await getOrCreateActiveCart(user.id);
  await addItemToCart(cart.id, parsed.data);

  return NextResponse.json({ ok: true });
}
