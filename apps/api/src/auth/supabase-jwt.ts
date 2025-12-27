import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getEnv } from '../env';

export type SupabaseJwtPayload = {
  sub: string;
  email: string | null;
};

export const verifySupabaseJwt = async (token: string): Promise<SupabaseJwtPayload> => {
  const env = getEnv();
  const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.SUPABASE_ISSUER,
    audience: env.SUPABASE_AUDIENCE
  });

  if (!payload.sub) {
    throw new Error('Missing sub claim');
  }

  const email = typeof payload.email === 'string' ? payload.email : null;
  return { sub: payload.sub, email };
};
