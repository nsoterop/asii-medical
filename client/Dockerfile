# syntax=docker.io/docker/dockerfile:1

FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /client

COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

FROM base AS builder
WORKDIR /client
COPY --from=deps /client/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
WORKDIR /client

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /client/public ./public
COPY --from=builder --chown=nextjs:nodejs /client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /client/.next/static ./.next/static

USER nextjs

EXPOSE 4000

ENV PORT=4000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
