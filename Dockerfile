# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci


# ── Stage 2: Builder (production bundle) ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig.json ./
COPY src/ ./src/
RUN npm run build


# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled bundle
COPY --from=builder /app/dist ./dist

# Copy src + tsconfig for ts-node dev mode (used by docker-compose dev target)
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src/ ./src/

USER appuser

EXPOSE 3000

# Default: run compiled bundle (production-like)
# Override CMD in docker-compose for dev: ["npx", "ts-node", "src/dev.ts"]
CMD ["node", "dist/server.js"]
