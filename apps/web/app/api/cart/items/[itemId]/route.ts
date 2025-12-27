import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminClient, getAuthedUser, getOrCreateActiveCart } from '../../cart-helpers';

const patchSchema = z.object({
  qty: z.number().int().min(0).max(999)
});

export async function PATCH(request: NextRequest, { params }: { params: { itemId: string } }) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cart = await getOrCreateActiveCart(user.id);
  const supabaseAdmin = getAdminClient();

  if (parsed.data.qty <= 0) {
    await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .or(`id.eq.${params.itemId},variant_id.eq.${params.itemId}`);
    return NextResponse.json({ ok: true });
  }

  await supabaseAdmin
    .from('cart_items')
    .update({ qty: parsed.data.qty })
    .eq('cart_id', cart.id)
    .or(`id.eq.${params.itemId},variant_id.eq.${params.itemId}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { itemId: string } }) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cart = await getOrCreateActiveCart(user.id);
  const supabaseAdmin = getAdminClient();
  await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id)
    .or(`id.eq.${params.itemId},variant_id.eq.${params.itemId}`);

  return NextResponse.json({ ok: true });
}
