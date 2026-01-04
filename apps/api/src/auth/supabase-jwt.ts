import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { getEnv } from '../env';

export type SupabaseJwtPayload = {
  sub: string;
  email: string | null;
};

const buildIssuerAliases = (issuer: string) => {
  try {
    const url = new URL(issuer);
    const aliases = new Set([issuer]);
    const host = url.hostname;
    const altHosts = new Set<string>();

    if (host === 'localhost') {
      altHosts.add('127.0.0.1');
      altHosts.add('host.docker.internal');
    } else if (host === '127.0.0.1') {
      altHosts.add('localhost');
      altHosts.add('host.docker.internal');
    } else if (host === 'host.docker.internal') {
      altHosts.add('localhost');
      altHosts.add('127.0.0.1');
    }

    for (const altHost of altHosts) {
      const aliasUrl = new URL(url.toString());
      aliasUrl.hostname = altHost;
      aliases.add(aliasUrl.toString());
    }

    return Array.from(aliases);
  } catch {
    return [issuer];
  }
};

export const verifySupabaseJwt = async (token: string): Promise<SupabaseJwtPayload> => {
  const env = getEnv();
  const header = decodeProtectedHeader(token);
  const alg = typeof header.alg === 'string' ? header.alg : '';
  const issuers = buildIssuerAliases(env.SUPABASE_ISSUER);

  if (alg.startsWith('HS')) {
    if (env.SUPABASE_JWT_SECRET) {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(env.SUPABASE_JWT_SECRET),
        {
          issuer: issuers,
          audience: env.SUPABASE_AUDIENCE,
        },
      );

      if (!payload.sub) {
        throw new Error('Missing sub claim');
      }

      const email = typeof payload.email === 'string' ? payload.email : null;
      return { sub: payload.sub, email };
    }

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to validate HS tokens');
    }

    const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase token validation failed (${response.status})`);
    }

    const user = (await response.json()) as { id?: string; email?: string | null };
    if (!user.id) {
      throw new Error('Supabase user payload missing id');
    }

    return { sub: user.id, email: user.email ?? null };
  }

  const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: issuers,
    audience: env.SUPABASE_AUDIENCE,
  });

  if (!payload.sub) {
    throw new Error('Missing sub claim');
  }

  const email = typeof payload.email === 'string' ? payload.email : null;
  return { sub: payload.sub, email };
};
