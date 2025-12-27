import { z } from 'zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_ISSUER: z.string().url(),
  SUPABASE_AUDIENCE: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
});

export type ApiEnv = z.infer<typeof envSchema>;

export const getEnv = () => envSchema.parse(process.env);
