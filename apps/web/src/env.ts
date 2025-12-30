import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SQUARE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_LOCATION_ID: z.string().min(1),
  NEXT_PUBLIC_SQUARE_ENV: z.enum(['sandbox', 'production']),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_PAYMENTS_PROVIDER: z.string().min(1).optional(),
});

export type WebEnv = z.infer<typeof envSchema>;

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SQUARE_APP_ID: process.env.NEXT_PUBLIC_SQUARE_APP_ID,
  NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
  NEXT_PUBLIC_SQUARE_ENV: process.env.NEXT_PUBLIC_SQUARE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_PAYMENTS_PROVIDER: process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER,
};

export const env = envSchema.parse(rawEnv);
