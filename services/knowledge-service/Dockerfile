FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/knowledge-service/package.json services/knowledge-service/package.json
RUN corepack enable && pnpm install --filter ./services/knowledge-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/knowledge-service services/knowledge-service
WORKDIR /app/services/knowledge-service
CMD ["pnpm", "start"]
