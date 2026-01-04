import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

if (!process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER) {
  process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER = process.env.NODE_ENV === 'test' ? 'mock' : 'square';
}

const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SQUARE_APP_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    NEXT_PUBLIC_SQUARE_LOCATION_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    NEXT_PUBLIC_SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    NEXT_PUBLIC_API_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    NEXT_PUBLIC_PAYMENTS_PROVIDER: z.enum(['square', 'mock']).default('square'),
  })
  .superRefine((value, ctx) => {
    if (value.NEXT_PUBLIC_PAYMENTS_PROVIDER !== 'mock') {
      if (!value.NEXT_PUBLIC_SQUARE_APP_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'NEXT_PUBLIC_SQUARE_APP_ID is required when NEXT_PUBLIC_PAYMENTS_PROVIDER is not mock.',
          path: ['NEXT_PUBLIC_SQUARE_APP_ID'],
        });
      }
      if (!value.NEXT_PUBLIC_SQUARE_LOCATION_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'NEXT_PUBLIC_SQUARE_LOCATION_ID is required when NEXT_PUBLIC_PAYMENTS_PROVIDER is not mock.',
          path: ['NEXT_PUBLIC_SQUARE_LOCATION_ID'],
        });
      }
    }
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
