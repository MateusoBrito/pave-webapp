#!/usr/bin/env bash
#
# Sobe o ambiente de desenvolvimento inteiro, na ordem certa:
#
#   1. Postgres (docker compose do pave-pipeline)
#   2. Diagnóstico — diz quais telas terão dados antes de você abrir o navegador
#   3. API (FastAPI)
#   4. Front (Vite)
#
# Ctrl+C derruba API e front. O Postgres fica de pé (é container); use --parar.
#
#   ./dev.sh                    sobe tudo
#   ./dev.sh --sem-banco        não mexe no Docker (Postgres já rodando)
#   ./dev.sh --sem-diagnostico  pula a checagem de dados
#   ./dev.sh --parar            derruba tudo, inclusive o Postgres
#
set -euo pipefail

FRONT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$FRONT_DIR/api"
PIPELINE_DIR="${PAVE_PIPELINE_DIR:-$(dirname "$FRONT_DIR")/pave-pipeline}"

PORTA_API="${PORTA_API:-8000}"
PORTA_FRONT="${PORTA_FRONT:-5173}"
ESPERA_MAX=90

VERDE=$'\033[32m'; VERMELHO=$'\033[31m'; AMARELO=$'\033[33m'; AZUL=$'\033[36m'; FIM=$'\033[0m'
info() { printf '%s==>%s %s\n' "$AZUL" "$FIM" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$VERDE" "$FIM" "$*"; }
aviso(){ printf '%s aviso%s %s\n' "$AMARELO" "$FIM" "$*"; }
erro() { printf '%s erro%s %s\n' "$VERMELHO" "$FIM" "$*" >&2; }

morrer() { erro "$*"; exit 1; }

SEM_BANCO=0; SEM_DIAGNOSTICO=0; PARAR=0
for arg in "$@"; do
  case "$arg" in
    --sem-banco)       SEM_BANCO=1 ;;
    --sem-diagnostico) SEM_DIAGNOSTICO=1 ;;
    --parar)           PARAR=1 ;;
    -h|--help)
                       awk 'NR>1 && /^#/ {sub(/^# ?/, ""); print; next} NR>1 {exit}' \
                         "${BASH_SOURCE[0]}"; exit 0 ;;
    *)                 morrer "argumento desconhecido: $arg (use --help)" ;;
  esac
done

matar_porta() {
  local porta=$1 nome=$2 pids
  pids=$(lsof -ti "tcp:$porta" -sTCP:LISTEN 2>/dev/null || true)
  [ -n "$pids" ] || return 0

  echo "$pids" | xargs -r kill 2>/dev/null || true
  sleep 1
  pids=$(lsof -ti "tcp:$porta" -sTCP:LISTEN 2>/dev/null || true)
  [ -n "$pids" ] && echo "$pids" | xargs -r kill -9 2>/dev/null || true
  ok "$nome (porta $porta) derrubado"
}

if [ "$PARAR" = 1 ]; then
  info "Derrubando o ambiente"
  matar_porta "$PORTA_FRONT" "front"
  matar_porta "$PORTA_API" "API"
  if [ -d "$PIPELINE_DIR" ] && command -v docker >/dev/null; then
    (cd "$PIPELINE_DIR" && docker compose stop postgres >/dev/null 2>&1) && ok "Postgres parado"
  fi
  exit 0
fi

info "Conferindo o ambiente"

[ -x "$API_DIR/.venv/bin/uvicorn" ] || morrer \
  "venv da API não encontrado. Rode:
     cd $API_DIR && python3 -m venv .venv && .venv/bin/pip install -e ."

[ -d "$FRONT_DIR/node_modules" ] || morrer \
  "node_modules ausente. Rode: cd $FRONT_DIR && npm install"

if [ ! -f "$API_DIR/.env" ]; then
  morrer "api/.env não existe. Rode:
     cp $API_DIR/.env.example $API_DIR/.env
   e preencha PAVE_DATABASE_URL com a senha do Postgres (veja $PIPELINE_DIR/.env)"
fi

if [ ! -f "$FRONT_DIR/.env" ]; then
  morrer "'.env' do front não existe. Rode:
     cp $FRONT_DIR/.env.example $FRONT_DIR/.env
     echo 'VITE_API_BASE_URL=http://localhost:$PORTA_API' >> $FRONT_DIR/.env
   e preencha as variáveis VITE_FIREBASE_* (sem elas o app não passa do login)"
fi

if ! grep -q '^VITE_API_BASE_URL=' "$FRONT_DIR/.env"; then
  aviso "VITE_API_BASE_URL não está no .env do front — ele chamaria a própria origem"
fi

if ! grep -qE '^VITE_FIREBASE_API_KEY=.+' "$FRONT_DIR/.env"; then
  aviso "VITE_FIREBASE_API_KEY vazia — o app vai parar na tela de login"
fi

ok "arquivos de configuração no lugar"

porta_aberta() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

if [ "$SEM_BANCO" = 0 ]; then
  info "Subindo o Postgres"
  if porta_aberta 5432; then
    ok "já havia algo escutando em 5432 — reaproveitando"
  else
    command -v docker >/dev/null || morrer \
      "docker não encontrado. Suba o Postgres por fora e use --sem-banco"
    [ -f "$PIPELINE_DIR/docker-compose.yml" ] || morrer \
      "não achei o docker-compose em $PIPELINE_DIR
   defina PAVE_PIPELINE_DIR=/caminho/do/pave-pipeline"

    (cd "$PIPELINE_DIR" && docker compose up -d postgres) \
      || morrer "docker compose falhou (o daemon está rodando?)"

    printf '     aguardando'
    for _ in $(seq "$ESPERA_MAX"); do
      porta_aberta 5432 && break
      printf '.'; sleep 1
    done
    printf '\n'
    porta_aberta 5432 || morrer "Postgres não respondeu em ${ESPERA_MAX}s"
    ok "Postgres de pé"
  fi
else
  porta_aberta 5432 || aviso "nada escutando em 5432 — a API não vai conectar"
fi

if [ "$SEM_DIAGNOSTICO" = 0 ]; then
  info "Conferindo quais telas terão dados"
  set +e
  (cd "$API_DIR" && timeout 45 .venv/bin/python tools/diagnostico.py 2>&1 | sed 's/^/     /')
  if [ "${PIPESTATUS[0]:-0}" = 124 ]; then
    aviso "o diagnóstico não respondeu em 45s — seguindo sem ele"
  fi
  set -e
fi

PIDS=()
limpar() {
  echo
  info "Encerrando"
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  sleep 1
  matar_porta "$PORTA_API" "API" >/dev/null 2>&1 || true
  matar_porta "$PORTA_FRONT" "front" >/dev/null 2>&1 || true
  wait 2>/dev/null || true
  ok "API e front encerrados (o Postgres continua de pé; use ./dev.sh --parar)"
}
trap limpar INT TERM EXIT

info "Subindo a API na porta $PORTA_API"
if porta_aberta "$PORTA_API"; then
  morrer "porta $PORTA_API ocupada. Use ./dev.sh --parar ou PORTA_API=8001 ./dev.sh"
fi

LOG_API="${TMPDIR:-/tmp}/pave-api.log"
(cd "$API_DIR" && exec .venv/bin/uvicorn app.main:app --reload --port "$PORTA_API" \
   >"$LOG_API" 2>&1) &
PIDS+=($!)

printf '     processo'
viva=0
for _ in $(seq 30); do
  curl -s -m 2 "http://localhost:$PORTA_API/health" >/dev/null 2>&1 && { viva=1; break; }
  printf '.'; sleep 1
done
printf '\n'
if [ "$viva" = 0 ]; then
  erro "a API não subiu. Últimas linhas de $LOG_API:"
  tail -15 "$LOG_API" >&2
  exit 1
fi

printf '     banco'
pronta=0
for _ in $(seq 20); do
  if curl -s -m 3 "http://localhost:$PORTA_API/ready" 2>/dev/null | grep -q '"ready"'; then
    pronta=1; break
  fi
  printf '.'; sleep 1
done
printf '\n'
if [ "$pronta" = 0 ]; then
  erro "a API está no ar, mas o banco não responde."
  erro "Confira PAVE_DATABASE_URL em api/.env — e se o Postgres está de pé."
  erro "Detalhe: $(curl -s -m 3 "http://localhost:$PORTA_API/ready" 2>/dev/null | head -c 120)"
  exit 1
fi
ok "API respondendo — http://localhost:$PORTA_API/docs"

info "Subindo o front na porta $PORTA_FRONT"
if porta_aberta "$PORTA_FRONT"; then
  morrer "porta $PORTA_FRONT ocupada. Use ./dev.sh --parar ou PORTA_FRONT=5174 ./dev.sh"
fi

LOG_FRONT="${TMPDIR:-/tmp}/pave-front.log"
(cd "$FRONT_DIR" && exec npm run dev -- --port "$PORTA_FRONT" --strictPort \
   >"$LOG_FRONT" 2>&1) &
PIDS+=($!)

printf '     aguardando'
subiu=0
for _ in $(seq 60); do
  curl -s -m 2 "http://localhost:$PORTA_FRONT" >/dev/null 2>&1 && { subiu=1; break; }
  printf '.'; sleep 1
done
printf '\n'
if [ "$subiu" = 0 ]; then
  erro "o front não subiu. Últimas linhas de $LOG_FRONT:"
  tail -15 "$LOG_FRONT" >&2
  exit 1
fi
ok "front no ar"

echo
printf '%s─────────────────────────────────────────────%s\n' "$AZUL" "$FIM"
printf '  painel   http://localhost:%s\n' "$PORTA_FRONT"
printf '  API      http://localhost:%s/docs\n' "$PORTA_API"
printf '\n  logs     %s\n           %s\n' "$LOG_API" "$LOG_FRONT"
printf '\n  Ctrl+C encerra API e front.\n'
printf '%s─────────────────────────────────────────────%s\n' "$AZUL" "$FIM"

wait
