#!/usr/bin/env node
/**
 * check-env.mjs
 *
 * Extrait toutes les refs `process.env.X` de `src/` et compare avec `.env.example`.
 * Sert à détecter les env vars utilisées mais non déclarées — cause classique
 * de crash runtime sur Vercel.
 *
 * Exit 1 si des vars manquent, 0 sinon.
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Extraire toutes les refs process.env.X dans src/ (regex stricte: commence par lettre majuscule)
const grep = execSync(
  'grep -rhoE "process\\.env\\.[A-Z][A-Z0-9_]*" src/ 2>/dev/null || true',
  { encoding: 'utf8' }
);

const usedVars = [
  ...new Set(
    (grep.match(/process\.env\.[A-Z][A-Z0-9_]*/g) || []).map((m) =>
      m.replace('process.env.', '')
    )
  ),
].sort();

// Lire .env.example
const envExample = existsSync('.env.example')
  ? readFileSync('.env.example', 'utf8')
  : '';

const declared = new Set(
  envExample
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim())
    .filter((k) => /^[A-Z][A-Z0-9_]*$/.test(k))
);

// Env vars standard fournies par Next.js/Vercel — OK si absentes de .env.example
const STANDARD = new Set([
  'NODE_ENV',
  'VERCEL',
  'VERCEL_URL',
  'VERCEL_ENV',
  'VERCEL_REGION',
  'VERCEL_GIT_COMMIT_SHA',
  'VERCEL_GIT_COMMIT_REF',
  'NEXT_RUNTIME',
  'NEXT_PHASE',
  'PORT',
  'CI',
]);

const missing = usedVars.filter((v) => !declared.has(v) && !STANDARD.has(v));

if (missing.length > 0) {
  console.warn('⚠️  Env vars utilisées dans src/ mais absentes de .env.example :');
  for (const v of missing) console.warn(`   - ${v}`);
  console.warn('');
  console.warn('→ Ajoute ces vars à .env.example (même vide) pour éviter crash Vercel.');
  process.exit(1);
}

console.log(`✅ Toutes les env vars utilisées (${usedVars.length}) sont déclarées dans .env.example`);
process.exit(0);
