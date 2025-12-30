import { verifySupabaseJwt } from '../src/auth/supabase-jwt';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'jwks'),
  jwtVerify: jest.fn().mockResolvedValue({
    payload: { sub: 'supabase_123', email: 'user@example.com' },
  }),
}));

describe('verifySupabaseJwt', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_JWKS_URL = 'https://example.supabase.co/auth/v1/.well-known/jwks.json';
    process.env.SUPABASE_ISSUER = 'https://example.supabase.co/auth/v1';
    process.env.SUPABASE_AUDIENCE = 'authenticated';
  });

  it('returns parsed payload', async () => {
    const payload = await verifySupabaseJwt('token');
    expect(payload.sub).toBe('supabase_123');
    expect(payload.email).toBe('user@example.com');
  });
});
