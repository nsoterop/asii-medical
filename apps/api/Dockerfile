FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /repo/node_modules /repo/node_modules
COPY . .
RUN pnpm -C packages/shared build
RUN pnpm -C apps/api build
RUN pnpm -C apps/api prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
