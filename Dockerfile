# ---------------------------------------------------------------------------
# Imagem de produção do Controle Financeiro.
#
# Multi-stage para que a imagem final não carregue toolchain de build. O
# `output: 'standalone'` do Next empacota só o necessário para rodar, o que
# leva a imagem de ~1.2 GB para ~200 MB.
# ---------------------------------------------------------------------------

FROM node:22-slim AS base
# openssl é exigido pelo engine do Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ------------------------------------------------------------- dependências
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# -------------------------------------------------------------------- build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O build valida o ambiente; um valor descartável basta, já que nada é
# assinado aqui — o segredo real vem por variável em runtime.
ENV AUTH_SECRET="build-time-placeholder-nao-usado-em-runtime-ok"
ENV DATABASE_URL="file:./build.db"
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ----------------------------------------------------------------- runtime
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Rodar como não-root: se alguém escapar do processo, não é root no contêiner.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs financeiro

COPY --from=builder /app/public ./public
COPY --from=builder --chown=financeiro:nodejs /app/.next/standalone ./
COPY --from=builder --chown=financeiro:nodejs /app/.next/static ./.next/static

# O CLI do Prisma e o schema ficam na imagem para permitir `migrate deploy`.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Diretório do banco, montado como volume no compose.
RUN mkdir -p /dados && chown financeiro:nodejs /dados
VOLUME /dados

USER financeiro
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/entrar').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
