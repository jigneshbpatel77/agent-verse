FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/orchestrator-service/package.json apps/orchestrator-service/package.json
RUN corepack enable && pnpm install --filter ./apps/orchestrator-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/orchestrator-service apps/orchestrator-service
WORKDIR /app/apps/orchestrator-service
CMD ["pnpm", "start"]
