import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

if (!process.env.SQUARE_ENV && process.env.SQUARE_ENVIRONMENT) {
  process.env.SQUARE_ENV = process.env.SQUARE_ENVIRONMENT;
}

if (!process.env.MEILI_URL && process.env.MEILISEARCH_HOST) {
  process.env.MEILI_URL = process.env.MEILISEARCH_HOST;
}

if (!process.env.MEILI_MASTER_KEY && process.env.MEILISEARCH_API_KEY) {
  process.env.MEILI_MASTER_KEY = process.env.MEILISEARCH_API_KEY;
}

if (!process.env.PAYMENTS_PROVIDER) {
  process.env.PAYMENTS_PROVIDER = process.env.NODE_ENV === 'test' ? 'mock' : 'square';
}

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
if (supabaseUrl) {
  if (!process.env.SUPABASE_JWKS_URL || process.env.SUPABASE_JWKS_URL.includes('${')) {
    process.env.SUPABASE_JWKS_URL = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  }
  if (!process.env.SUPABASE_ISSUER || process.env.SUPABASE_ISSUER.includes('${')) {
    process.env.SUPABASE_ISSUER = `${supabaseUrl}/auth/v1`;
  }
}

const envSchema = z
  .object({
    API_PORT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    ADMIN_SHARED_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    REDIS_URL: z.preprocess(emptyToUndefined, z.string().min(1)),
    MEILI_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    MEILI_MASTER_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url()),
    SUPABASE_JWKS_URL: z.preprocess(emptyToUndefined, z.string().url()),
    SUPABASE_ISSUER: z.preprocess(emptyToUndefined, z.string().url()),
    SUPABASE_AUDIENCE: z.preprocess(emptyToUndefined, z.string().min(1)),
    SUPABASE_JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    PAYMENTS_PROVIDER: z.enum(['square', 'mock']).default('square'),
    SQUARE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
    SQUARE_ACCESS_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SQUARE_LOCATION_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SQUARE_WEBHOOK_SIGNATURE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SQUARE_APP_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SQUARE_CURRENCY: z.preprocess(emptyToUndefined, z.string().min(1)).default('USD'),
    TAX_PROVIDER: z.enum(['none', 'manual']).default('none'),
    TAX_STATE_RATES: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    TAX_ORIGIN_COUNTRY: z.preprocess(emptyToUndefined, z.string().min(2)).default('US'),
    TAX_ORIGIN_STATE: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    TAX_ORIGIN_ZIP: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    TAX_ORIGIN_CITY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    TAX_ORIGIN_STREET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    EMAIL_PROVIDER: z.enum(['log', 'resend']).default('log'),
    EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    IMPORT_BATCH_SIZE: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    IMPORT_CONCURRENCY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    IMPORT_RUN_STUCK_MINUTES: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    IMPORT_WORKER_ENABLED: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  })
  .superRefine((value, ctx) => {
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL is required.',
        path: ['DATABASE_URL'],
      });
    }

    if (value.PAYMENTS_PROVIDER !== 'mock') {
      if (!value.SQUARE_ACCESS_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SQUARE_ACCESS_TOKEN is required when PAYMENTS_PROVIDER is not mock.',
          path: ['SQUARE_ACCESS_TOKEN'],
        });
      }
      if (!value.SQUARE_LOCATION_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SQUARE_LOCATION_ID is required when PAYMENTS_PROVIDER is not mock.',
          path: ['SQUARE_LOCATION_ID'],
        });
      }
    }
  });

export type ApiEnv = z.infer<typeof envSchema>;

const parseEnv = () => envSchema.parse(process.env);
const cachedEnv = parseEnv();

export const env = cachedEnv;
export const getEnv = () => (process.env.NODE_ENV === 'test' ? parseEnv() : cachedEnv);
