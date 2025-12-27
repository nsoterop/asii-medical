import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const profileSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile payload.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server is missing Supabase credentials.' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id: parsed.data.userId,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      company: parsed.data.company,
      location: parsed.data.location
    },
    { onConflict: 'id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
