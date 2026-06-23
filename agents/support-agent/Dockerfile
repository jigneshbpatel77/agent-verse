FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY agents/support-agent/package.json agents/support-agent/package.json
RUN corepack enable && pnpm install --filter ./agents/support-agent --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY agents/support-agent agents/support-agent
WORKDIR /app/agents/support-agent
CMD ["pnpm", "start"]
