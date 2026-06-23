FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/file-service/package.json services/file-service/package.json
RUN corepack enable && pnpm install --filter ./services/file-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/file-service services/file-service
WORKDIR /app/services/file-service
CMD ["pnpm", "start"]
