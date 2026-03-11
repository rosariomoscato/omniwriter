# ============================================
# OmniWriter - Multi-stage Dockerfile
# ============================================

# --- Stage 1: Build del frontend (React + Vite) ---
FROM node:20-alpine AS frontend-build

WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# In production, le API sono servite dallo stesso dominio
ENV VITE_API_URL=/api
RUN npm run build

# --- Stage 2: Build del backend (TypeScript → JavaScript) ---
FROM node:20-alpine AS backend-build

WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- Stage 3: Production image ---
FROM node:20-alpine AS production

# Installa le dipendenze di sistema necessarie per better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia package.json e installa solo le dipendenze di produzione
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copia il backend compilato
COPY --from=backend-build /build/server/dist ./dist

# Copia il frontend buildato nella cartella public (servito da Express)
COPY --from=frontend-build /build/client/dist ./public

# Crea le directory per dati persistenti
# /app/data - SQLite database + sources + human-model-sources
# /uploads  - covers + marketplace-epub (usati da export.ts e marketplace.ts con __dirname)
RUN mkdir -p /app/data/sources /app/data/human-model-sources \
             /uploads/covers /uploads/marketplace-epub

# Variabili d'ambiente di default
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/omniwriter.db
ENV UPLOAD_DIR=/uploads

# Esponi la porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Avvia il server
CMD ["node", "dist/index.js"]
