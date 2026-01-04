import dotenv from 'dotenv';
import path from 'path';
import { Prisma, PrismaClient, UserStatus } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

type SupabaseUser = {
  id: string;
  email?: string | null;
};

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSeedPassword = () => process.env.SEED_USER_PASSWORD ?? 'Password123!';

const listSupabaseUsersByEmail = async (email: string, headers: Record<string, string>) => {
  const lookupResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers },
  );

  if (!lookupResponse.ok) {
    return [];
  }

  const data = (await lookupResponse.json()) as { users?: SupabaseUser[] } | SupabaseUser;
  if (Array.isArray((data as { users?: SupabaseUser[] }).users)) {
    return (data as { users?: SupabaseUser[] }).users?.filter((user) => Boolean(user?.id)) ?? [];
  }
  return (data as SupabaseUser)?.id ? [data as SupabaseUser] : [];
};

const deleteSupabaseUsersByEmail = async (
  email: string,
  headers: Record<string, string>,
) => {
  const users = await listSupabaseUsersByEmail(email, headers);
  if (!users.length) {
    return;
  }

  await Promise.all(
    users.map(async (user) => {
      if (!user.id) {
        return;
      }
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers,
      });
    }),
  );
};

const createSupabaseUser = async (
  email: string,
  password: string,
  metadata: Record<string, unknown>,
  attempt = 0
): Promise<SupabaseUser> => {
  if (attempt > 2) {
    throw new Error(`Supabase user creation exceeded retry limit for ${email}.`);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for seeding users.');
  }

  const headers = {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };

  const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });

  if (createResponse.ok) {
    const data = (await createResponse.json()) as { user?: SupabaseUser } | SupabaseUser;
    const created = 'user' in data ? data.user : data;
    if (!created?.id) {
      throw new Error(`Supabase user response missing id for ${email}`);
    }
    return created;
  }

  const existingUsers = await listSupabaseUsersByEmail(email, headers);
  const existing = existingUsers[0];
  if (existing?.id) {
    const updateResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      }),
    });
    if (updateResponse.ok) {
      return existing;
    }
    const updateError = await updateResponse.text();
    if (
      updateError.includes('users_email_partial_key') ||
      updateError.includes('duplicate key value')
    ) {
      await deleteSupabaseUsersByEmail(email, headers);
      return createSupabaseUser(email, password, metadata, attempt + 1);
    }
    throw new Error(`Supabase update user failed for ${email}: ${updateError}`);
  }

  const errorText = await createResponse.text();
  if (
    errorText.includes('users_email_partial_key') ||
    errorText.includes('duplicate key value')
  ) {
    await deleteSupabaseUsersByEmail(email, headers);
    return createSupabaseUser(email, password, metadata, attempt + 1);
  }
  throw new Error(`Supabase create user failed for ${email}: ${errorText}`);
};

const upsertProfile = async (input: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  location: string;
  isAdmin: boolean;
}) => {
  await prisma.profile.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      location: input.location,
    },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      company: input.company,
      location: input.location,
    },
  });

  try {
    await prisma.$executeRaw`UPDATE public.profiles SET is_admin = ${input.isAdmin} WHERE id = ${input.id}::uuid`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    // eslint-disable-next-line no-console
    console.warn(`Skipping is_admin update for ${input.email}: ${message}`);
  }

  const existingBySupabase = await prisma.user.findUnique({
    where: { supabaseUserId: input.id },
  });
  const existingByEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingBySupabase) {
    if (existingByEmail && existingByEmail.id !== existingBySupabase.id) {
      await prisma.user.delete({ where: { id: existingByEmail.id } });
    }

    await prisma.user.update({
      where: { id: existingBySupabase.id },
      data: {
        email: input.email,
        supabaseUserId: input.id,
        status: UserStatus.ACTIVE,
      },
    });

    return;
  }

  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        email: input.email,
        supabaseUserId: input.id,
        status: UserStatus.ACTIVE,
      },
    });
    return;
  }

  await prisma.user.create({
    data: {
      email: input.email,
      supabaseUserId: input.id,
      status: UserStatus.ACTIVE,
    },
  });
};

const seedProfiles = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const userEmail = process.env.SEED_USER_EMAIL ?? 'user@example.com';

  const seedPassword = getSeedPassword();
  const adminUser = await createSupabaseUser(adminEmail, seedPassword, {
    first_name: 'Admin',
    last_name: 'User',
  });
  const normalUser = await createSupabaseUser(userEmail, seedPassword, {
    first_name: 'Sample',
    last_name: 'User',
  });

  await upsertProfile({
    id: adminUser.id,
    email: adminEmail,
    firstName: 'Admin',
    lastName: 'User',
    company: 'ASii Medical',
    location: 'Raleigh, NC',
    isAdmin: true,
  });

  await upsertProfile({
    id: normalUser.id,
    email: userEmail,
    firstName: 'Sample',
    lastName: 'User',
    company: 'Sample Clinic',
    location: 'Charlotte, NC',
    isAdmin: false,
  });
};

const seedCatalog = async () => {
  await prisma.manufacturer.upsert({
    where: { manufacturerId: 1 },
    update: { name: 'Acme Medical' },
    create: { manufacturerId: 1, name: 'Acme Medical' },
  });

  await prisma.categoryPath.upsert({
    where: { categoryPathId: 'general' },
    update: { categoryPathName: 'General Supplies' },
    create: { categoryPathId: 'general', categoryPathName: 'General Supplies' },
  });

  await prisma.product.upsert({
    where: { productId: 1001 },
    update: {
      productName: 'Demo Medical Supply',
      productDescription: 'Sample product for local development',
      manufacturerId: 1,
      primaryCategoryPathId: 'general',
    },
    create: {
      productId: 1001,
      productName: 'Demo Medical Supply',
      productDescription: 'Sample product for local development',
      manufacturerId: 1,
      primaryCategoryPathId: 'general',
    },
  });

  await prisma.sku.upsert({
    where: { itemId: 2001 },
    update: {
      productId: 1001,
      itemDescription: 'Demo supply - single unit',
      itemImageUrl: 'https://placehold.co/640x480?text=ASii+Demo',
      unitPrice: new Prisma.Decimal('12.50'),
      isActive: true,
      lastSeenAt: new Date(),
    },
    create: {
      itemId: 2001,
      productId: 1001,
      itemDescription: 'Demo supply - single unit',
      itemImageUrl: 'https://placehold.co/640x480?text=ASii+Demo',
      unitPrice: new Prisma.Decimal('12.50'),
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  await prisma.category.upsert({
    where: { path: 'general' },
    update: { name: 'General Supplies', depth: 0, parentPath: null },
    create: { name: 'General Supplies', path: 'general', depth: 0 },
  });
};

export const runSeed = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before seeding.');
  }

  await seedProfiles();
  await seedCatalog();
};

const run = async () => {
  try {
    await runSeed();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  void run();
}
