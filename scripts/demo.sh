#!/usr/bin/env bash
set -euo pipefail

# util: pretty print JSON if jq exists
pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

BASE="http://localhost:3000"

echo
echo "=== 1) Vérifier la mercuriale (/merc/items) ==="
curl -sS "$BASE/merc/items" | pretty || true

echo
echo "=== 2) Ajouter du stock (tomate, pommes, fromage) ==="
curl -sS -X POST "$BASE/inventory/add" -H "Content-Type: application/json" -d '{"name":"tomate","qty":5}' | pretty || true
curl -sS -X POST "$BASE/inventory/add" -H "Content-Type: application/json" -d '{"name":"pommes","qty":3}' | pretty || true
curl -sS -X POST "$BASE/inventory/add" -H "Content-Type: application/json" -d '{"name":"fromage","qty":2}' | pretty || true

echo
echo "=== 3) Inventaire après ajout (/inventory) ==="
curl -sS "$BASE/inventory" | pretty || true

echo
echo "=== 4) Importer une fiche légère (POST /fiches-techniques/import) ==="
curl -sS -X POST "$BASE/fiches-techniques/import" \
  -H "Content-Type: application/json" \
  -d '{"name":"Salade demo","text":"tomate\npommes\nfromage"}' | pretty || true

echo
echo "=== 5) Inventaire après import (devrait être décrémenté) ==="
curl -sS "$BASE/inventory" | pretty || true

echo
echo "=== 6) Bilan résumé (/bilan/summary) ==="
curl -sS "$BASE/bilan/summary" | pretty || true

echo
echo "Demo terminée."
