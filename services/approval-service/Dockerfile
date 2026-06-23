FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/approval-service/package.json services/approval-service/package.json
RUN corepack enable && pnpm install --filter ./services/approval-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/approval-service services/approval-service
WORKDIR /app/services/approval-service
CMD ["pnpm", "start"]
