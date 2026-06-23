FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/integration-service/package.json services/integration-service/package.json
RUN corepack enable && pnpm install --filter ./services/integration-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/integration-service services/integration-service
WORKDIR /app/services/integration-service
CMD ["pnpm", "start"]
