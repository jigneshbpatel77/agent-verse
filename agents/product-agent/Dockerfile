FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY agents/product-agent/package.json agents/product-agent/package.json
RUN corepack enable && pnpm install --filter ./agents/product-agent --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY agents/product-agent agents/product-agent
WORKDIR /app/agents/product-agent
CMD ["pnpm", "start"]
