import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ISSUER: z.string().url(),
  SUPABASE_AUDIENCE: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SQUARE_ENV: z.enum(['sandbox', 'production']),
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_LOCATION_ID: z.string().min(1),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1).optional(),
  SQUARE_APP_ID: z.string().min(1).optional(),
  SQUARE_CURRENCY: z.string().min(1).default('USD'),
  TAX_PROVIDER: z.enum(['none', 'manual']).default('none'),
  TAX_STATE_RATES: z.string().min(1).optional(),
  TAX_ORIGIN_COUNTRY: z.string().min(2).default('US'),
  TAX_ORIGIN_STATE: z.string().min(1).optional(),
  TAX_ORIGIN_ZIP: z.string().min(1).optional(),
  TAX_ORIGIN_CITY: z.string().min(1).optional(),
  TAX_ORIGIN_STREET: z.string().min(1).optional(),
  EMAIL_PROVIDER: z.enum(['log', 'resend']).default('log'),
  EMAIL_FROM: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional()
});

export type ApiEnv = z.infer<typeof envSchema>;

export const getEnv = () => envSchema.parse(process.env);
