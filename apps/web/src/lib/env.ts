import { z } from 'zod';

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SQUARE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_LOCATION_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_ENV: z.enum(['sandbox', 'production'])
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
});

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SQUARE_APP_ID: process.env.NEXT_PUBLIC_SQUARE_APP_ID,
  NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  NEXT_PUBLIC_SQUARE_ENV: process.env.NEXT_PUBLIC_SQUARE_ENV
};

const serverEnv = {
  ...publicEnv,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

export const getPublicEnv = () => publicSchema.parse(publicEnv);
export const getServerEnv = () => serverSchema.parse(serverEnv);
