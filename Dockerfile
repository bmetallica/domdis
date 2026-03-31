# ═══════════════════════════════════════════════════════════════
#  DOMDIS — Domoticz Dashboard
#  Multi-stage build: deps → production image
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Install production dependencies ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS production

# su-exec: lightweight tool to drop privileges in entrypoint
RUN apk add --no-cache su-exec

# Non-root user for running the app
RUN addgroup -S domdis && adduser -S domdis -G domdis

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY server.js ./
COPY routes/   ./routes/
COPY public/   ./public/

# Default configs go to a separate directory so the volume
# mount on /app/config does NOT hide them
RUN mkdir -p /app/config-defaults /app/config
COPY config/defaults/ /app/config-defaults/

# Entrypoint: copies defaults on first start, fixes permissions
COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Entrypoint runs as root (to fix volume permissions),
# then drops to domdis via su-exec
ENV PORT=3001
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/ > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
