FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api-gateway/package.json apps/api-gateway/package.json
RUN corepack enable && pnpm install --filter ./apps/api-gateway --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api-gateway apps/api-gateway
WORKDIR /app/apps/api-gateway
CMD ["pnpm", "start"]
