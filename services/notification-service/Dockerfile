FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/notification-service/package.json services/notification-service/package.json
RUN corepack enable && pnpm install --filter ./services/notification-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/notification-service services/notification-service
WORKDIR /app/services/notification-service
CMD ["pnpm", "start"]
