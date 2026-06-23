FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/memory-service/package.json services/memory-service/package.json
RUN corepack enable && pnpm install --filter ./services/memory-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/memory-service services/memory-service
WORKDIR /app/services/memory-service
CMD ["pnpm", "start"]
