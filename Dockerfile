# ── Stage 1: build frontend assets ──
FROM docker.arvancloud.ir/library/node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: production runtime ──
FROM docker.arvancloud.ir/library/node:20-alpine
# Build tools needed only to compile better-sqlite3/sharp native modules
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY --from=frontend-build /app/dist ./dist
COPY server/ ./server/
RUN cd server && npm install --omit=dev && npm cache clean --force \
    && rm -rf server/backups server/data 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3001

# Run as a non-root user; volume mount points must be writable by uid 1001
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup \
    && mkdir -p /app/server/data /app/server/backups \
    && chown -R appuser:appgroup /app/server/data /app/server/backups
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider -q http://localhost:3001/api/version || exit 1

# Graceful shutdown: node forwards SIGTERM to the express server which closes connections
STOPSIGNAL SIGTERM
CMD ["node", "server/index.js"]
