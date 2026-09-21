#!/bin/bash
# Publica o EscalaVale: valida, commita e envia ao GitHub (o Cloudflare faz deploy sozinho).
# Uso: ./publicar.sh ["mensagem do commit"]
set -e
cd "$(dirname "$0")"

echo "== Rodando Testes Unitários =="
node --test test/*.test.mjs

echo "== Validando JS =="
for f in js/*.js js/views/*.js; do node --check "$f"; done

git add -A
if git diff --cached --quiet; then
  echo "Nada a publicar."
  exit 0
fi

MSG="${1:-Atualização $(date '+%d/%m/%Y %H:%M')}"
git commit -m "$MSG"
git push -u origin main
echo "== Publicado. Deploy no ar em ~1-2 min. =="
