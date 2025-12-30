import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

process.env.SQUARE_ENV = process.env.SQUARE_ENV ?? 'sandbox';
process.env.SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN ?? 'test-square-token';
process.env.SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? 'test-square-location';
process.env.SQUARE_CURRENCY = process.env.SQUARE_CURRENCY ?? 'USD';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
process.env.SUPABASE_JWKS_URL =
  process.env.SUPABASE_JWKS_URL ?? 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
process.env.SUPABASE_ISSUER = process.env.SUPABASE_ISSUER ?? 'https://example.supabase.co/auth/v1';
process.env.SUPABASE_AUDIENCE = process.env.SUPABASE_AUDIENCE ?? 'authenticated';
