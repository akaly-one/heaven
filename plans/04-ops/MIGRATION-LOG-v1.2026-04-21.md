# Migration Log — Avril 2026

> **Mise à jour 2026-04-21** : ajout du batch messagerie unifiée + IG ops (migrations 030, 032 → 038b).
> **Mise à jour 2026-04-19** : merge back Turborepo → single Next.js (`d32a53f`).

---

## Partie 1 — Restructure Standard (2026-04-17)

Branch : `restructure/standard-2026-04`
HEAD pre-migration : `9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8`

### Objectif initial
Passer Heaven vers le Standard :
- `plans/` (10 annexes + `plans/models/` YUMI/RUBY/PALOMA)
- `docs/` reforgé (USER only)
- Monorepo Turborepo `apps/web` + `apps/cp` + `apps/ui` + `apps/lib`
- `config/entities/{yumi,ruby,paloma}.ts` (seul lieu de singularité)
- `config/roles/{model,admin}.ts` + `permissions.ts`
- RLS policies scopées par `model_id`

### Phases livrées
- [x] **Phase A — P0 Purge** (`1737c99`, `6dbd73c`) — vrais prénoms + leak URL
- [x] **Phase B — Turborepo Structure** (`d29ad54`) — apps/web/cp/ui/lib
- [x] **Phase C — Docs + Plans Standard** (`e9b4753`)
- [x] **Phase D — 8 Fixes partiels** (`5c5030e`, `3e3d226`)
- [x] **Phase E — Finitions + RLS policies** (`0b1741a`)
- [x] **Phase F — Rollback Turborepo** (`d32a53f`, 2026-04-19) — merge vers single Next.js (bug vendor-chunks récurrent, complexité disproportionnée)

---

## Partie 2 — Messagerie unifiée + IG ops (2026-04-20)

Branch : `main`
Batch de 9 migrations appliquées via **Supabase MCP** (pas de CLI locale).

### Migrations (ordre d'application)

| # | Fichier | Description | Status |
|---|---------|-------------|--------|
| 030 | `030_instagram_agent.sql` | Tables `instagram_config` / `instagram_conversations` / `instagram_messages` | ✅ |
| 032 | `032_yumi_unified_messaging.sql` | Hierarchy root/model + `agence_fans` + RLS helpers `can_see_model_id()` / `can_write_model_id()` + vue `agence_messages_timeline` | ✅ |
| 033 | `033_realign_model_ids.sql` | YUMI `m2 → m1`, PALOMA `m4 → m2` | ✅ |
| 034 | `034_realign_agence_accounts.sql` | Auth locale SSOT + `login_aliases` | ✅ |
| 035 | `035_align_instagram_to_model_id.sql` | Scope IG tables à `model_id` | ✅ |
| 036 | `036_sync_model_number.sql` | Colonne dérivée pour tri | ✅ |
| 037 | `037_realign_media_config.sql` | Config média par `model_id` | ✅ |
| 038 | `038_yumi_full_ops.sql` | `agence_feed_items` polymorphe + `agence_outreach_leads` + `ig_reply_queue` + `agence_ops_metrics` + UNIQUE(`ig_message_id`) + RPC `ig_conv_increment_count` | ✅ |
| 038b | `038b_claim_jobs_rpc.sql` | RPC `claim_ig_reply_jobs` (FOR UPDATE SKIP LOCKED) | ✅ |

### Points clés

- **Idempotence webhook IG** : `UNIQUE(ig_message_id)` + RPC atomique
- **Feed polymorphe** : `agence_feed_items.source_type` ∈ {manual, instagram, wall}
- **Inbox unifiée** : vue `agence_messages_timeline` UNION ALL web + IG
- **Queue multi-worker** : `claim_ig_reply_jobs` avec `FOR UPDATE SKIP LOCKED`
- **Rétention ops_metrics 7j** : purge daily 4h via `/api/cron/purge-ops-metrics`
- **Model IDs canoniques** : m1=YUMI (root), m2=PALOMA, m3=RUBY (slug = alias front seul)

### À venir

- `048_agence_ai_replies.sql` — table IA agent (Phase 6, cf. `plans/operations/SPEC-agent-ia-v1.2026-04-21.md`) — **en attente D-5**
- Migration Phase 2 (Navigation refactor) — selon D-1/D-2/D-3

---

## Partie 4 — Phases 4 + 5 multi-agent (2026-04-21 20:34)

Batch de 2 migrations appliquées par 5 agents parallèles (Phase 4 Agents 4.A/4.B + Phase 5 Agents 5.A/5.B/5.C).

### Migrations

| # | Fichier | Agent | Description | Status |
|---|---------|-------|-------------|--------|
| 046 | `046_agence_fans_handles_multi.sql` | **4.A** | `agence_fans` étendu : `handles jsonb`, `fingerprint_hash`, `merge_history`. Index GIN sur handles + trigram GIN. Extension `pg_trgm 1.6`. Backfill 3 fans depuis flat columns (pseudo_web/insta/snap/fanvue) | ✅ |
| 047 | `047_pack_visibility_rules.sql` | **5.B** | `agence_packs` étendu : `visibility_rule` enum (public/if_purchased/preview_blur), `blur_intensity` 0-20, `preview_count` int + CHECK + index `idx_packs_visibility(model, visibility_rule)` | ✅ |

### Script backfill

- `supabase/scripts/backfill-fans-2026-04-21.sql` (Agent 4.A, idempotent) — **15 clients legacy → 0 orphan** après 4-step link (résout P2-1)

### Points clés Phase 4 + 5

- **Fusion contacts multi-canal** : helper `fan-matcher.ts` (fingerprint SHA-256 + bigram similarity + trigram search). Auto-merge seuil ≥ 0.95 (review seulement), manuel admin au-dessous
- **Messagerie UI refondue** : layout 3-colonnes (conversations + thread + drawer fan), timer IG 24h visible, fallback reply web si expiré
- **Drag&drop natif HTML5** (découverte clé Agent 5.A) : pas de lib externe ajoutée, architecture existante était monolithique pas cassée
- **Règles visibilité packs** : 6 scénarios testés (fan null/acheteur/non-acheteur × 3 règles). Helper `computeFeedItemState` + API feed enrichie avec `visibility_computed`
- **Upload Cloudinary direct** : signed URL SHA-1 TTL 5min, scope folder `heaven/{model_id}/...` forcé
- **Cross-post IG** : helper `instagram-publish.ts` avec flow 2-étapes, classe `InstagramPublishError` flag DevMode (limité jusqu'à App Review Phase 11)
- **Mirror Cloudinary IG** : cron sync-instagram re-upload URLs Meta CDN avant expiration 24h (résout P2-3)

### Rapport horodaté
`plans/_reports/UPDATE-REPORT-2026-04-21-2034-phase4-5.md`

### ADRs à créer
- ADR-010 : drag&drop HTML5 native (pas de dnd-kit)
- ADR-011 : backfill auto-merge fans depuis agence_clients legacy
- ADR-012 : metadata IG sur `agence_feed_items.source_payload.ig`

### Briefs livrés
- ✅ B7 (Messagerie fusion contacts) — livré Phase 4
- ✅ B8 (Contenu drop&drag + règles) — livré Phase 5
- ✅ B9 partiel (sidebar nettoyée)

### Défauts résolus
P0-11, P1-3, P1-5, P1-8 (partiel), P2-1, P2-3

---

## Partie 3 — Phase 1 multi-agent (2026-04-21 20:05)

Batch de 7 migrations appliquées par 3 agents parallèles selon `plans/operations/ROADMAP-multiagent-execution-v1.2026-04-21.md` §Phase 1.

### Migrations

| # | Fichier | Agent | Description | Status |
|---|---------|-------|-------------|--------|
| 039 | `039_agence_models_business_fields.sql` | **1.A** | +16 colonnes business `agence_models` (mode_operation A/B/C, identity_plan Découverte/Shadow, palier_remuneration P1-P4, fiscal_voie, statut_initial*, caming_*, release_form_*, contract_*, revenue_monthly_avg_3m, palier_escalation_locked_until) + seed m1=A / m2=B+shadow / m3=B+discovery | ✅ |
| 040 | `040_agence_releaseform_dossier.sql` | **1.A** | Table DMCA 1/modèle/plateforme (fanvue/onlyfans/mym) + 6 URLs signées + lifecycle | ✅ |
| 041 | `041_agence_caming_sessions.sql` | **1.A** | Table sessions cam (stripchat/bongacams/chaturbate) + `duration_minutes` GENERATED + attribution UTM Fanvue. Création `agence_revenus_modele` (absente en DB) | ✅ |
| 042 | `042_agence_commission_calcul.sql` | **1.A** | Matview mensuelle : commission 15% Fanvue + TVA 21% si P4 + frais forfait 80€ + split A=100% / B=70/30 + flag escalation | ✅ |
| 043 | `043_agence_accounts_refonte.sql` | **1.B** | Colonne `scopes jsonb` + fusion `yumi` = admin agence + modèle IA + JWT enrichi `model_id`+`scopes`. Compat `role='root'` préservée | ✅ |
| 044 | `044_rls_scopes_extended.sql` | **1.C** | 5 helpers PG STABLE : `auth_scopes()`, `has_scope()`, `can_access_dmca()`, `can_view_contract()`, `can_view_identity()` | ✅ |
| 045 | `045_log_tables_append_only.sql` | **1.C** | 5 tables log immutables : `agence_dmca_access_log`, `agence_consent_log`, `agence_identity_plan_changes`, `agence_palier_history`, `agence_contracts_versions`. 16 policies RLS, append-only enforced (zéro UPDATE/DELETE) | ✅ |

### Points clés Phase 1

- **Data model BP Cowork** : 3 Modes A/B/C + 2 Plans Identité + 4 Paliers P1-P4 opérationnels en DB
- **Caming tracking** : base posée pour Phase 9 (attribution UTM J+7)
- **Commission auto** : matview prête pour cron mensuel Phase 8.B
- **Auth fusion yumi admin+IA** : 1 seul compte admin principal Heaven (vs 2 comptes séparés avant)
- **Scopes granulaires** : `dmca:read/write`, `contract:view`, `identity:view_legal`, `palier:escalate`, `caming:operate`, `*` (wildcard admin)
- **RLS append-only** : traçabilité complète sans altération possible (Nygard-style)

### Rapport horodaté
`plans/_reports/UPDATE-REPORT-2026-04-21-2005.md`

### ADRs à créer
- ADR-008 racine : fusion yumi admin + modèle IA
- ADR-009 racine : conservation `role='root'` alias `admin` (compat 30+ fichiers)

### Code modifié (Agent 1.B)

Fichiers src/ touchés :
- `src/shared/lib/jwt.ts` — payload enrichi
- `src/app/api/auth/login/route.ts` — hydrate JWT avec scopes DB
- `src/shared/rbac.ts` — `hasScope()`, `isAdmin()` (root|admin)
- `src/shared/config/permissions.ts` — matrice scopes granulaires
- `src/shared/config/roles/{admin,model}.ts` — `default_scopes`

`tsc --noEmit` : 0 erreur. Tests curl 5/5 comptes OK.

---

## Table de correspondance old → new

### Commits structurels (historique)

| SHA | Phase | Description |
|---|---|---|
| `1737c99` | A | `security(heaven): purge P0 — vrais prénoms backups + leak + alias gret` |
| `d29ad54` | B | `refactor(heaven): Turborepo apps/web + apps/cp + apps/ui + apps/lib` |
| `e9b4753` | C | `docs(heaven): plans/ standard + README + CHANGELOG racine` |
| `5c5030e` | D | `feat(heaven): 8 fixes — story TTL 24h + close button + déconnexion` |
| `3e3d226` | D | `docs(heaven): scrub civil name pattern` |
| `6dbd73c` | A | `security(heaven): P0 purge — _backups legacy` |
| `0b1741a` | E | `chore(heaven): finitions standard + RLS policies` |
| `d32a53f` | F | `refactor(heaven): merge Turborepo → single Next.js app` |
| `f4df11e` | — | `chore: update sqwensy-os ref — MTlé Sazón + Tigualo added` |

### Moves principaux (structurels)

| Ancien chemin | Nouveau chemin | Phase |
|---|---|---|
| `apps/web/src/app/m/` | `src/app/m/` | F (rollback) |
| `apps/cp/src/app/agence/` | `src/app/agence/` | F |
| `apps/lib/src/` | `src/shared/`, `src/cp/lib/` | F |
| `apps/ui/src/` | `src/shared/components/`, `src/cp/components/` | F |
| `config/entities/` | `src/config/entities/` | F |
| `apps/cp/src/middleware.ts` | `src/middleware.ts` | F |
| (absent) | `src/app/privacy/` + `/terms/` + `/data-deletion/` | Module C |
| (absent) | `public/meta/yumi-ai-icon.svg` | Module C |
| (absent) | `src/app/api/cron/{sync-instagram,process-ig-replies,purge-ops-metrics}/` | Module F |
| (absent) | `src/app/api/meta/data-deletion/` | Module C |
| (absent) | `src/app/agence/ops/` | Module E |

---

## Rollback

SHA ultime pre-restructure (état stable `main` avant Turborepo) :
```bash
git reset --hard 9cb065fc510d89b81553bfbdfc1ff6877aa3a0f8
```

SHA pre-messaging-batch (avant migrations 030+) : voir `git log --oneline main --before=2026-04-19`

Rollback DB migration-by-migration : les 9 migrations du batch sont additives (CREATE TABLE / ADD COLUMN / CREATE INDEX) → safe `DROP` réversible. **Exception** : migration 033 réaligne YUMI `m2 → m1` → downgrade casserait toutes les FK. Préserver.

---

## Flags P0 critiques (résolus)
- ~~vrais prénoms `_backups/`~~ → PURGÉ `1737c99` + `6dbd73c`
- ~~leak `SQWENSY_URL` dans `NEXT_PUBLIC_*`~~ → fix confidentialité
- ~~alias `gret1` compte admin actif~~ → désactivé via `UPDATE agence_accounts SET active=false`

## Flags en attente (post-batch)
- Business Verification SQWENSY (BCE docs) — bloque App Review Meta
- Rotation clés Supabase leakées historique git (cf. MEMORY alerte 18 avril)
