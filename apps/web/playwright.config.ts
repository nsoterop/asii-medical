import { defineConfig } from '@playwright/test';

const requiredEnv: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NEXT_PUBLIC_SQUARE_APP_ID: 'test-square-app-id',
  NEXT_PUBLIC_SQUARE_LOCATION_ID: 'test-location-id',
  NEXT_PUBLIC_SQUARE_ENV: 'sandbox',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
  NEXT_PUBLIC_PAYMENTS_PROVIDER: 'mock',
};

Object.entries(requiredEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

const serverEnv: Record<string, string> = {};
Object.entries(process.env).forEach(([key, value]) => {
  if (typeof value === 'string') {
    serverEnv[key] = value;
  }
});
Object.entries(requiredEnv).forEach(([key, value]) => {
  serverEnv[key] = value;
});

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120000,
    env: serverEnv,
  },
});
