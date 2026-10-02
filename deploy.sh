#!/bin/bash
# deploy.sh — Compila o front e instala a API em produção, depois recarrega o PM2.
# Uso: ./deploy.sh
set -euo pipefail

FRONT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SRC="$FRONT_SRC/api"
PROD_DIR="/home/labpi/pave-producao"

VERDE=$'\033[32m'; AZUL=$'\033[36m'; FIM=$'\033[0m'
info() { printf '%s==>%s %s\n' "$AZUL" "$FIM" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$VERDE" "$FIM" "$*"; }

# ── 1. Build do Frontend ──────────────────────────────────────────────────────
info "Construindo Frontend (npm run build)..."
cd "$FRONT_SRC"
npm run build
ok "Build concluído: dist/"

info "Copiando dist/ para produção..."
rm -rf "$PROD_DIR/front/dist"
cp -r dist "$PROD_DIR/front/dist"
ok "Front copiado para $PROD_DIR/front/dist"

# ── 2. Instalar / Atualizar a API ─────────────────────────────────────────────
info "Instalando/atualizando API em produção..."
cd "$API_SRC"

PROD_API="$PROD_DIR/api"

# Cria venv de produção se não existir
if [ ! -f "$PROD_API/.venv/bin/uvicorn" ]; then
  info "Criando venv de produção para a API..."
  python3 -m venv "$PROD_API/.venv"
  ok "Venv criada"
fi

# Instala/atualiza dependências (sem -e para evitar conflito de pacotes múltiplos)
"$PROD_API/.venv/bin/pip" install -q \
  fastapi "uvicorn[standard]" pydantic "pydantic-settings" \
  "sqlalchemy[asyncio]" asyncpg firebase-admin
ok "Dependências da API instaladas"

# Copia o código-fonte da API (exceto .venv e caches)
info "Sincronizando código da API..."
mkdir -p "$PROD_API/src"
rsync -a --delete \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.pytest_cache' \
  --exclude='pave_api.egg-info' \
  --exclude='dist' \
  "$API_SRC/" "$PROD_API/src/"
ok "Código da API sincronizado em $PROD_API/src"

# Copia o .env da API
if [ -f "$API_SRC/.env" ]; then
  cp "$API_SRC/.env" "$PROD_API/src/.env"
  ok ".env da API copiado"
fi

# ── 3. Recarregar PM2 ────────────────────────────────────────────────────────
info "Recarregando serviços no PM2..."
cd "$PROD_DIR"

if pm2 list | grep -q "pave-front"; then
  pm2 reload ecosystem.config.js
  ok "Processos recarregados"
else
  pm2 start ecosystem.config.js
  pm2 save
  ok "Processos iniciados e salvos no PM2"
fi

echo ""
printf '%s─────────────────────────────────────────────%s\n' "$AZUL" "$FIM"
printf '  painel   http://localhost:3000/pave/\n'
printf '  API      http://localhost:8000/docs\n'
printf '\n  pm2 list         → ver status dos processos\n'
printf '  pm2 logs pave-api → ver logs da API\n'
printf '%s─────────────────────────────────────────────%s\n' "$AZUL" "$FIM"
