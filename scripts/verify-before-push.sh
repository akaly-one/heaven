#!/bin/bash
# verify-before-push.sh
# Standard de vérification pré-push — bloque si typecheck/build/env vars fail.
# Appelé par `npm run verify` et par `.githooks/pre-push`.
set -e

echo "🔍 Verification pre-push..."
echo ""

echo "1. TypeScript check..."
npx tsc --noEmit || { echo "❌ TypeScript failed"; exit 1; }
echo "✅ TypeScript OK"
echo ""

echo "2. Env vars check..."
node scripts/check-env.mjs || { echo "⚠️  Env vars manquantes — corrige .env.example avant push"; exit 1; }
echo ""

echo "3. Build..."
npm run build || { echo "❌ Build failed"; exit 1; }
echo "✅ Build OK"
echo ""

echo "✅ Prêt à push"
