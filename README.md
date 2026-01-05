# asii-medical

TypeScript monorepo with pnpm workspaces + Turborepo.

## Requirements
- Node.js 18+ (20 recommended)
- pnpm 8+

## Setup
```bash
pnpm install
```

## Development
```bash
pnpm infra:up
pnpm dev
```

### Square checkout env (sandbox-first)
API (`apps/api/.env`):
- `SQUARE_ENV` (`sandbox` or `production`)
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY` (recommended for webhook verification)
- `SQUARE_APP_ID`
- `SQUARE_CURRENCY` (for example, `USD`)

Web (`apps/web/.env.local`):
- `NEXT_PUBLIC_SQUARE_APP_ID`
- `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- `NEXT_PUBLIC_SQUARE_ENV` (`sandbox` or `production`)

### Order processing env
API (`apps/api/.env`):
- `EMAIL_PROVIDER` (`log` or `resend`, default `log`)
- `EMAIL_FROM` (required for `resend`)
- `RESEND_API_KEY` (required for `resend`)

### Square webhooks
Configure a Square webhook subscription pointing to:
- `https://<domain>/api/webhooks/square`

Recommended events:
- `payment.updated`
- `refund.created`
- `refund.updated`

## Database (Supabase Postgres)
This repo uses a single database: Supabase Postgres. Prisma is the ORM and migration tool.

Recommended setup:
- Dev: local Supabase via CLI.
- Prod: hosted Supabase project.

Set `DATABASE_URL` in `.env` to your Supabase connection string (direct connection is preferred for Prisma).

Apply schema to Supabase:
```bash
pnpm --filter api db:migrate
pnpm --filter api db:generate
```

### Local Supabase (CLI).
Install the Supabase CLI, then from the repo root:
```bash
supabase init # one-time if supabase/config.toml is missing
pnpm supabase:start
pnpm supabase:status
```

Update local env files with the values from `supabase status`:
- `apps/api/.env.docker` (DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- `apps/web/.env.docker` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

If you are running without Docker, set these instead:
- `apps/api/.env` (use `http://localhost:54321` and port `54322`)
- `apps/web/.env.local` (use `http://localhost:54321`)

Apply SQL in `supabase/` to your local Supabase database (if needed):
```bash
psql "$DATABASE_URL" -f supabase/profiles.sql
```

Then apply Prisma migrations + seed:
```bash
pnpm --filter @asii/api db:migrate:dev
pnpm --filter @asii/api db:seed
```

### Data migration (old DB -> Supabase)
Stop API/worker to avoid writes during migration. Then:
```bash
pg_dump --data-only --inserts --disable-triggers --no-owner --no-privileges \
  --exclude-table-data='_prisma_migrations' \
  "$OLD_DATABASE_URL" > old_data.sql

psql "$DATABASE_URL" -f old_data.sql
```

Optional: verify counts
```bash
psql "$DATABASE_URL" -c "select count(*) from products;"
psql "$DATABASE_URL" -c "select count(*) from skus;"
```

## Build
```bash
pnpm build
```

## Lint
```bash
pnpm lint
```

## Test
```bash
pnpm test
```

## Production deployment (AWS Lightsail or EC2)
Minimal single-server setup with Docker Compose and Caddy TLS.

### 1) Provision a server
- Ubuntu 22.04 on Lightsail or EC2
- Open inbound ports 80 and 443

### 2) Install Docker + Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker
```

### 3) Upload code and configure env
```bash
git clone <your-repo-url> asii-medical
cd asii-medical
cp .env.example .env.prod
```

Edit `.env.prod` with production values:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_AUDIENCE`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `MEILI_URL` (optional)
- `MEILI_MASTER_KEY` (optional)
- `STORAGE_DRIVER` (`local` or `s3`)
- `S3_BUCKET`
- `AWS_REGION`
- `SQUARE_ENV` (`sandbox` or `production`)
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
- `SQUARE_APP_ID`
- `SQUARE_CURRENCY`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SQUARE_APP_ID`
- `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- `NEXT_PUBLIC_SQUARE_ENV`
- `DOMAIN` (public hostname for HTTPS)

Tip: use your Supabase Postgres connection string for `DATABASE_URL`.

### 4) Build and start
```bash
pnpm deploy:build
pnpm deploy:up
```

Web is available at `https://$DOMAIN`, and API is served under `/api`.

If you prefer not to install pnpm on the server, use:
```bash
docker compose -f infra/compose.prod.yml build
docker compose -f infra/compose.prod.yml up -d
```

To enable Meilisearch, run:
```bash
docker compose -f infra/compose.prod.yml --profile search up -d
```

## Structure
- `apps/web` Next.js App Router
- `apps/api` NestJS API
- `packages/shared` shared types/utils
