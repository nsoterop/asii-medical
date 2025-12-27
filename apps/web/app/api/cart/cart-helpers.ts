import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../../../src/lib/supabase/server';

export type CartItemInput = {
  productId: string;
  variantId?: string | null;
  qty: number;
  unitPrice: number;
  currency?: string;
  meta?: Record<string, unknown> | null;
};

export const getAuthedUser = async () => {
  try {
    const cookieStore = cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
};

export const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export const getOrCreateActiveCart = async (userId: string) => {
  const supabaseAdmin = getAdminClient();
  const { data: existing, error } = await supabaseAdmin
    .from('carts')
    .select('id, user_id, status, updated_at')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) {
    await supabaseAdmin
      .from('carts')
      .update({ status: 'ABANDONED', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .neq('id', existing.id);
    return existing;
  }

  const now = new Date().toISOString();
  const { data: created, error: createError } = await supabaseAdmin
    .from('carts')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    })
    .select('id, user_id, status')
    .single();

  if (createError || !created) {
    throw createError || new Error('Unable to create cart.');
  }

  return created;
};

export const addItemToCart = async (cartId: string, input: CartItemInput) => {
  const supabaseAdmin = getAdminClient();
  const normalizedQty = Math.max(1, Math.min(999, Math.floor(input.qty)));
  const variantId = input.variantId ?? null;
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('cart_items')
    .select('id, qty')
    .eq('cart_id', cartId)
    .eq('product_id', input.productId)
    .eq('variant_id', variantId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('cart_items')
      .update({ qty: existing.qty + normalizedQty })
      .eq('id', existing.id);
    if (updateError) {
      throw updateError;
    }
    return;
  }

  const { error: insertError } = await supabaseAdmin.from('cart_items').insert({
    id: crypto.randomUUID(),
    cart_id: cartId,
    product_id: input.productId,
    variant_id: variantId,
    qty: normalizedQty,
    unit_price: input.unitPrice,
    currency: input.currency ?? 'USD',
    meta: input.meta ?? null,
    created_at: now,
    updated_at: now
  });

  if (insertError) {
    throw insertError;
  }
};

export const fetchCartItems = async (cartId: string) => {
  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin
    .from('cart_items')
    .select('id, product_id, variant_id, qty, unit_price, currency, meta')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
};
