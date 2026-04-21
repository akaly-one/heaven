# 04 — Roles & Entities

> **Mise à jour 2026-04-21** : chemins alignés sur single Next.js + scopes DMCA/DPO (BP).

---

## Entités (profils publics)

Configurées dans `src/config/entities/`.

| Slug | model_id | Display | Couleur | Mode | Plan Identité | Palier | Statut |
|------|----------|---------|---------|------|----------------|--------|--------|
| `yumi` | `m1` | YUMI | `#E84393` | **A — IA pur** | N/A | N/A | Actif |
| `paloma` | `m2` | PALOMA | `#D4A574` | **B — Hub annexe** | Shadow (défaut) | P1 | À activer |
| `ruby` | `m3` | RUBY | `#9B6BFF` | **B — Hub annexe** | Découverte (défaut) | P1 | À activer |

> **Note identité** : aucun vrai prénom (civil/personnel) n'est stocké dans le code, la DB, les commits, les commentaires ou les docs. Les entités sont toujours référencées par leur alias public uniquement.

---

## Rôles

Configurés dans `src/config/roles/`.

| Slug | Label | Scope |
|------|-------|-------|
| `admin` | Admin Master (root) | Tous profils, paramètres, finances, purge, DMCA, DPO |
| `model` | Modèle | Son propre profil uniquement (+ accès read-only revenus, tier, PPV, KPIs) |
| `dev` | Dev Root | Override scope, Dev Center (Architecture map, env vars, migrations log) |
| `public` | Visiteur | Lecture page profil selon Plan Identité — pas d'accès CP |
| `dpo` *(futur)* | Data Protection Officer | Accès bucket chiffré DMCA + logs RGPD (pas les finances) |

---

## 4 modes d'accès (Phase 10 Agent 10.B — B5)

La matrice des rôles DB (`root`/`model`) reste la source de vérité JWT, mais
l'UX distingue 4 **modes d'accès** dérivés de `(role, model_id)` :

| Mode | Qui | Détection | JWT attendu | Badge UI |
|------|-----|-----------|-------------|----------|
| **dev** | Dev SQWENSY (root) | `role='root' && !model_id` | `scopes=['*']` | Rouge `#DC2626` |
| **agence** | Yumi admin (fusion) | `role='root' && model_id='m1'` | `scopes=['*']` ou explicites | Gradient Heaven |
| **model** | Paloma (m2), Ruby (m3) | `role='model'` | `scopes=['contract:view','caming:operate','view_revenue_self']` | Couleur modèle |
| **public** | Visiteur | Pas de JWT | — | Pas de badge (anti-leak) |

Implémentation :
- `src/shared/lib/access-mode.ts` — `getAccessMode(session)` (source de vérité)
- `src/shared/rbac.ts` — `getMode()`, `isDevMode()`, `isAgenceMode()`, `isModelMode()`, `canAccessMode()`
- `src/shared/config/permissions.ts` — `MODE_PERMISSIONS` matrice orientée mode + `modeCan()`
- `src/shared/components/mode-badge.tsx` — `<ModeBadge compact? />` (null en mode public)

Matrice `MODE_PERMISSIONS` :

| Permission | dev | agence | model | public |
|---|:-:|:-:|:-:|:-:|
| `*` (override) | ✅ | ❌ | ❌ | ❌ |
| `manage_entities` | ✅ | ✅ | ❌ | ❌ |
| `view_all_models` | ✅ | ✅ | ❌ | ❌ |
| `activate_modules` | ✅ | ✅ | ❌ | ❌ |
| `manage_finance` | ✅ | ✅ | ❌ | ❌ |
| `dmca:*` | ✅ | ✅ | ❌ | ❌ |
| `contract:view` | ✅ | ✅ | ✅ own | ❌ |
| `caming:operate` | ✅ | ✅ | ✅ own | ❌ |
| `view_revenue_self` | ✅ | ✅ | ✅ own | ❌ |
| `post_wall` | ✅ | ✅ | ✅ | ❌ |
| `send_messages` | ✅ | ✅ | ✅ | ❌ |
| `manage_packs` | ✅ | ✅ | ✅ own | ❌ |
| `dev:architecture_map` | ✅ | ❌ | ❌ | ❌ |
| `dev:env_vars` | ✅ | ❌ | ❌ | ❌ |
| `dev:migrations_log` | ✅ | ❌ | ❌ | ❌ |

**Règle P0 anti-leak** : `ModeBadge` ne s'affiche JAMAIS en mode `public`
(aucune indication côté UI à un visiteur qu'un mode admin existe).

**Enforcement** : le scope est vérifié côté serveur via JWT (`hasScope`,
`authorize`) — `modeCan()` sert de garde-fou UX complémentaire, pas de
source de vérité sécurité.

---

## Matrice de permissions

Source : `src/config/permissions.ts`.

| Permission | admin | model | dpo |
|------------|:-----:|:-----:|:----:|
| `manage_entities` | ✅ | ❌ | ❌ |
| `manage_codes` | ✅ | ❌ | ❌ |
| `manage_finances` | ✅ | ❌ | ❌ |
| `manage_packs` | ✅ | ✅ | ❌ |
| `view_all_profiles` | ✅ | ❌ | ❌ |
| `post_wall` | ✅ | ✅ | ❌ |
| `send_messages` | ✅ | ✅ | ❌ |
| `purge` | ✅ | ❌ | ❌ |
| `dmca:read` | ✅ | ❌ | ✅ |
| `dmca:write` | ✅ | ❌ | ❌ |
| `identity_plan:switch` | ✅ | via request (approval admin) | ❌ |
| `palier:escalate` | ✅ | ❌ (notif only) | ❌ |
| `contract:view` | ✅ | ✅ (own only) | ✅ |
| `caming:operate` | ✅ | ✅ (own sessions) | ❌ |
| `view_revenue_self` | ✅ | ✅ (own only) | ❌ |

---

## Scopes de données (nouveau — issu BP)

### Scope `dmca:*`
Protège les documents d'identité et Release Forms :
- Bucket Supabase privé `dmca-dossiers`
- URLs signées 15 min (pas de signed URL long-lived)
- RLS Postgres : accès uniquement si JWT claim contient `scope: 'dmca:read'`
- Log immuable de tous les accès (table `agence_dmca_access_log`)

### Scope `identity:view_legal`
Protège le nom légal + adresse + infos sensibles modèles :
- Champ `legal_name_encrypted` (pgsodium) — JAMAIS exposé en lecture par défaut
- Accès admin uniquement avec double auth (code TOTP)
- Chaque accès journalisé

### Scope `contract:*`
- Bucket `contracts-private` chiffré
- URLs signées 15 min
- Versioning obligatoire (jamais overwrite)

---

## RBAC helpers

`src/shared/lib/rbac.ts` :
- `isAdmin(session)` — bool
- `canAccessEntity(session, slug)` — enforce scoping `model_id`
- `authorize(session, permission)` — check perm
- `hasScope(session, scope)` — nouveau : check scopes granulaires (`dmca:read`, `identity:view_legal`, etc.)

## RLS helpers Postgres (migration 032)

- `can_see_model_id(target text)` — lecture scopée via JWT claim
- `can_write_model_id(target text)` — écriture scopée
- (à ajouter Sprint 3) `can_access_dmca(target text)` — contrôle scope DMCA

---

## Session JWT

Payload :
```ts
{
  sub: string,          // user id agence_accounts
  role: 'admin' | 'model' | 'dpo',
  scope: string,        // legacy (ex: 'm1')
  model_id: string,     // nouveau (canonical backend id 'm1'/'m2'/'m3')
  display_name: string,
  scopes?: string[]     // nouveau : ['dmca:read', 'contract:view', ...]
}
```

Cookie `heaven_session` HttpOnly + Secure + SameSite=Strict, 24h TTL. Signed HMAC-SHA256 via `jose` + `HEAVEN_JWT_SECRET`.

---

## Workflows d'escalade

### Bascule Plan Identité (Découverte ↔ Shadow)
1. Modèle request via CP own panel → status `requested`
2. Admin review + approuve → status `approved`
3. Retrait automatique contenu non-compatible avec nouveau plan (ex : visage visible retiré si bascule → Shadow)
4. Avenant au contrat signé (nouveau doc dans `agence_contracts_versions`)

### Escalade palier (P2 → P3)
1. Cron mensuel détecte 3 mois consécutifs > 750 €
2. Notif admin avec template pré-rempli guichet d'entreprise BE
3. Pas de bascule forcée — admin confirme manuellement + modèle signe avenant
4. Date limite : `palier_escalation_locked_until` = 60 jours max

### Retrait de consentement
1. Modèle écrit (email / CP ticket) → status `consent_withdrawal_pending`
2. Admin ouvre ticket → retrait contenu sous 7 jours
3. Confirmation email + log immuable (`agence_consent_log`)
4. Dernier versement normal du mois en cours

---

## Data model sécurité additionnel (dérivé BP §§RGPD)

| Table | Rôle |
|---|---|
| `agence_dmca_access_log` | Log immuable accès bucket dmca-dossiers |
| `agence_consent_log` | Log immuable retraits de consentement (RGPD Art. 7) |
| `agence_identity_plan_changes` | Historique bascules Plan Identité |
| `agence_palier_history` | Historique paliers rémunération |
| `agence_contracts_versions` | Versioning contrats privés signés |

RLS : toutes ces tables en append-only pour admin + lecture DPO uniquement.

---

## Conformité RGPD (BP §P0)

- ID docs = données personnelles sensibles → **chiffrement au repos** (Supabase pgsodium)
- Politique de rétention : contrat = 10 ans après résiliation (obligation comptable BE)
- Bouton « Export mes données » dans espace modèle
- Bouton « Demander effacement » → workflow manuel (conservation comptable obligatoire)
- Journalisation tous accès données sensibles (tables log ci-dessus)
