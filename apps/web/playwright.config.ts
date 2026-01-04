import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

loadEnvFile(path.resolve(__dirname, '.env.local'));
loadEnvFile(path.resolve(__dirname, '..', '..', '.env'));

const forcedEnv: Record<string, string> = {
  REDIS_URL: 'memory',
  IMPORT_WORKER_ENABLED: 'false',
  PAYMENTS_PROVIDER: 'mock',
  NEXT_PUBLIC_PAYMENTS_PROVIDER: 'mock',
  E2E: 'true',
  PLAYWRIGHT: 'true',
};

Object.entries(forcedEnv).forEach(([key, value]) => {
  process.env[key] = value;
});

const requiredEnv: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key',
  NEXT_PUBLIC_SQUARE_ENV: 'sandbox',
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_PAYMENTS_PROVIDER: 'mock',
  PAYMENTS_PROVIDER: 'mock',
  REDIS_URL: 'memory',
  IMPORT_WORKER_ENABLED: 'false',
  API_PORT: process.env.API_PORT ?? '3001',
  API_PROXY_TARGET: process.env.API_PROXY_TARGET ?? 'http://localhost:3001',
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
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

const runAllTests = process.env.PW_FULL === 'true';
const webDir = path.resolve(__dirname);
const pnpmExecPath = process.env.npm_execpath;
const pnpmCommand = pnpmExecPath
  ? `${process.execPath} ${pnpmExecPath}`
  : 'pnpm';

export default defineConfig({
  testDir: './tests',
  testMatch: runAllTests ? '**/*.spec.ts' : '**/*.e2e.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
    headless: !!process.env.CI,
  },
  webServer: {
    command: `${pnpmCommand} -C ${webDir} dev`,
    url: 'http://localhost:3000/health',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120000,
    env: serverEnv,
  },
});
