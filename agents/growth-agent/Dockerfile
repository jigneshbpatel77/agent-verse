FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY agents/growth-agent/package.json agents/growth-agent/package.json
RUN corepack enable && pnpm install --filter ./agents/growth-agent --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY agents/growth-agent agents/growth-agent
WORKDIR /app/agents/growth-agent
CMD ["pnpm", "start"]
