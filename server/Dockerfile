FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /server

RUN echo "********* INSTALL DEPENDENCIES *********""
COPY package*.json ./
RUN npm ci
COPY . .

RUN echo "********* RUN CODE CHECKS *********""
RUN npm run format:check
RUN npm run lint:check
RUN npm run test

RUN echo "********* BUILD SERVER *********""
RUN npm run build

FROM base AS runner
WORKDIR /server
COPY --from=builder /server/dist ./dist
COPY --from=builder /server/node_modules ./node_modules
COPY --from=builder /server/package*.json ./
ENV NODE_ENV production
EXPOSE 3001
CMD ["node", "dist/main.js"]
