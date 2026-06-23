FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY services/report-service/package.json services/report-service/package.json
RUN corepack enable && pnpm install --filter ./services/report-service --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY services/report-service services/report-service
WORKDIR /app/services/report-service
CMD ["pnpm", "start"]
