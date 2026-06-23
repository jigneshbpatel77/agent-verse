FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY agents/orchestration-agent/package.json agents/orchestration-agent/package.json
RUN corepack enable && pnpm install --filter ./agents/orchestration-agent --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY agents/orchestration-agent agents/orchestration-agent
WORKDIR /app/agents/orchestration-agent
CMD ["pnpm", "start"]
