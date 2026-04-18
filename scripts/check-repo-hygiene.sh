#!/bin/bash
# check-repo-hygiene.sh — audit + remediation automatique des corruptions repo
#
# Source de vérité : sqwensy-os/scripts/check-repo-hygiene.sh
# Règle mémoire : feedback_prevent_corruption_and_loss.md (10 règles)
#
# Détecte et corrige :
#   1. Duplicats macOS " 2" (move vers _archive-YYYY-MM-DD/)
#   2. Artefacts Git .git/index N + .lock orphelins (delete)
#   3. .DS_Store macOS litter (delete)
#   4. Fichiers vides suspects (report)
#   5. .env trackés par git (URGENT report)
#   6. node_modules/typescript manquant (suggest npm install)
#
# Usage :
#   bash scripts/check-repo-hygiene.sh              # mode audit (dry-run)
#   bash scripts/check-repo-hygiene.sh --fix        # mode remediation (applique les fixes safe)
#   bash scripts/check-repo-hygiene.sh --fix --yes  # sans confirmation interactive
#
set -e

MODE="audit"
SKIP_CONFIRM=0
for arg in "$@"; do
  case "$arg" in
    --fix) MODE="fix" ;;
    --yes) SKIP_CONFIRM=1 ;;
  esac
done

REPO_ROOT="$(pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
TODAY="$(date +%Y-%m-%d)"
ARCHIVE_DIR="$REPO_ROOT/_archive-$TODAY"

echo "🔍 Hygiene check — $REPO_NAME ($MODE mode)"
echo "   Repo: $REPO_ROOT"
echo ""

ERRORS=0
WARNINGS=0
FIXED=0

# ─────────────────────────────────────────────
# 1. Duplicats " 2" macOS Finder
# ─────────────────────────────────────────────
echo "[1/6] Duplicats macOS ' 2'..."
DUPES=$(find "$REPO_ROOT" -name "* 2*" \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/_archive-*" \
  -not -path "*/.git/*" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$DUPES" -gt 0 ]; then
  echo "   ❌ $DUPES duplicats trouvés"
  WARNINGS=$((WARNINGS+1))
  if [ "$MODE" = "fix" ]; then
    if [ "$SKIP_CONFIRM" = "0" ]; then
      read -p "   Move les $DUPES duplicats vers $ARCHIVE_DIR/ ? [y/N] " CONFIRM
      [ "$CONFIRM" != "y" ] && echo "   Skipped." && DUPES=0
    fi
    if [ "$DUPES" -gt 0 ]; then
      mkdir -p "$ARCHIVE_DIR"
      MOVED=0
      while IFS= read -r -d '' f; do
        rel="${f#$REPO_ROOT/}"
        target="$ARCHIVE_DIR/$rel"
        mkdir -p "$(dirname "$target")"
        mv "$f" "$target" 2>/dev/null && MOVED=$((MOVED+1))
      done < <(find "$REPO_ROOT" -name "* 2*" \
        -not -path "*/node_modules/*" \
        -not -path "*/.next/*" \
        -not -path "*/_archive-*" \
        -not -path "*/.git/*" \
        -print0 2>/dev/null)
      echo "   ✅ $MOVED duplicats déplacés vers $ARCHIVE_DIR/"
      FIXED=$((FIXED+MOVED))
    fi
  fi
else
  echo "   ✅ Aucun duplicat"
fi
echo ""

# ─────────────────────────────────────────────
# 2. Artefacts Git corrompus
# ─────────────────────────────────────────────
echo "[2/6] Artefacts Git orphelins (.git/index N, .lock)..."
GIT_ARTS=$(find "$REPO_ROOT/.git" \
  \( -name "index *" -o -name "index.lock" \) \
  -not -name "index" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$GIT_ARTS" -gt 0 ]; then
  echo "   ❌ $GIT_ARTS artefacts Git orphelins"
  WARNINGS=$((WARNINGS+1))
  if [ "$MODE" = "fix" ]; then
    DELETED=0
    while IFS= read -r -d '' f; do
      rm "$f" 2>/dev/null && DELETED=$((DELETED+1))
    done < <(find "$REPO_ROOT/.git" \
      \( -name "index *" -o -name "index.lock" \) \
      -not -name "index" \
      -print0 2>/dev/null)
    echo "   ✅ $DELETED artefacts supprimés (Git les régénère)"
    FIXED=$((FIXED+DELETED))
  fi
else
  echo "   ✅ Clean"
fi
echo ""

# ─────────────────────────────────────────────
# 3. .DS_Store macOS litter
# ─────────────────────────────────────────────
echo "[3/6] .DS_Store macOS litter..."
DS_COUNT=$(find "$REPO_ROOT" -name ".DS_Store" \
  -not -path "*/node_modules/*" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$DS_COUNT" -gt 0 ]; then
  echo "   ⚠️  $DS_COUNT .DS_Store"
  if [ "$MODE" = "fix" ]; then
    find "$REPO_ROOT" -name ".DS_Store" \
      -not -path "*/node_modules/*" \
      -delete 2>/dev/null
    echo "   ✅ $DS_COUNT supprimés"
    FIXED=$((FIXED+DS_COUNT))
  fi
else
  echo "   ✅ Clean"
fi
echo ""

# ─────────────────────────────────────────────
# 4. Fichiers vides suspects (report only)
# ─────────────────────────────────────────────
echo "[4/6] Fichiers vides suspects..."
EMPTY=$(find "$REPO_ROOT" -type f -empty \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.next/*" \
  -not -name ".gitkeep" \
  -not -name ".keep" \
  -not -path "*/_archive-*" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$EMPTY" -gt 0 ]; then
  echo "   ⚠️  $EMPTY fichiers vides (à investiguer manuellement)"
  find "$REPO_ROOT" -type f -empty \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/.next/*" \
    -not -name ".gitkeep" \
    -not -name ".keep" \
    -not -path "*/_archive-*" \
    2>/dev/null | head -5 | sed 's|^|      |'
else
  echo "   ✅ Clean"
fi
echo ""

# ─────────────────────────────────────────────
# 5. .env trackés par git (SÉCURITÉ)
# ─────────────────────────────────────────────
echo "[5/6] .env trackés par git (sécurité)..."
if [ -d "$REPO_ROOT/.git" ]; then
  ENV_TRACKED=$(cd "$REPO_ROOT" && git ls-files 2>/dev/null | grep -E "^\.env$|^\.env\.local$|^\.env\.production$" | wc -l | tr -d ' ')
  if [ "$ENV_TRACKED" -gt 0 ]; then
    echo "   🔴 $ENV_TRACKED .env trackés — URGENT à retirer :"
    cd "$REPO_ROOT" && git ls-files | grep -E "^\.env$|^\.env\.local$|^\.env\.production$" | sed 's|^|      |'
    echo "   → git rm --cached <file> + ajoute à .gitignore + rotation des secrets"
    ERRORS=$((ERRORS+1))
  else
    echo "   ✅ Aucun .env tracké"
  fi
else
  echo "   ⏭  Pas de dépôt Git — skipped"
fi
echo ""

# ─────────────────────────────────────────────
# 6. node_modules/typescript installed
# ─────────────────────────────────────────────
echo "[6/6] node_modules/typescript..."
if [ -f "$REPO_ROOT/package.json" ]; then
  if [ ! -f "$REPO_ROOT/node_modules/.bin/tsc" ]; then
    echo "   ⚠️  node_modules/.bin/tsc manquant — lance 'npm install'"
    WARNINGS=$((WARNINGS+1))
  else
    echo "   ✅ tsc installé"
  fi
else
  echo "   ⏭  Pas de package.json — skipped"
fi
echo ""

# ─────────────────────────────────────────────
# Résumé
# ─────────────────────────────────────────────
echo "═══════════════════════════════════════"
echo "Résumé hygiene check — $REPO_NAME"
echo "═══════════════════════════════════════"
echo "Errors (🔴 bloquants)   : $ERRORS"
echo "Warnings (⚠️ à corriger) : $WARNINGS"
if [ "$MODE" = "fix" ]; then
  echo "Fixed (✅ corrigés)      : $FIXED"
fi
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "❌ Corruption critique détectée — intervention requise"
  exit 2
elif [ "$WARNINGS" -gt 0 ] && [ "$MODE" != "fix" ]; then
  echo "⚠️  Warnings détectés — lance avec --fix pour remediation auto"
  exit 1
else
  echo "✅ Repo hygiene OK"
  exit 0
fi
