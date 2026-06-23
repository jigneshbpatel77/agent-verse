FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/audit-service/package.json services/audit-service/package.json
RUN corepack enable && pnpm install --filter ./services/audit-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/audit-service services/audit-service
WORKDIR /app/services/audit-service
CMD ["pnpm", "start"]
