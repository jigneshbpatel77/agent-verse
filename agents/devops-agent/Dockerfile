FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY agents/devops-agent/package.json agents/devops-agent/package.json
RUN corepack enable && pnpm install --filter ./agents/devops-agent --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY agents/devops-agent agents/devops-agent
WORKDIR /app/agents/devops-agent
CMD ["pnpm", "start"]
