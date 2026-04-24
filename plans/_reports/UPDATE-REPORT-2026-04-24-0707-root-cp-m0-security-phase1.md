# UPDATE REPORT — 2026-04-24 07:07 — ROOT CP (m0) + Sécurité Phase 1

> **Protocole** : `feedback_protocole_maj_plans.md` — rapport horodaté auto-gen.
> **Trigger NB** : sessions 24 avril matin (skeleton ROOT, accord édition comptes, règle passwords, sécurité progressive, puis MAJ plans).
> **Statut** : livraison partielle — changements prod-ready, en attente validation NB pour commit git.

---

## 1. Contexte & mandat

NB a piloté cette session selon la directive :
> « charge en mode root le projet heaven » → identifier pourquoi l'app n'affichait pas de skeleton ROOT distinct, refuser les "Aucun CP" et exposer ROOT comme vrai CP m0, aligner usernames/passwords par règle, puis durcir la sécurité sans aller jusqu'au 2FA.

---

## 2. Changements livrés

### 2.1 CP maître ROOT = m0 (nouvelle entité)

**Migrations DB appliquées via MCP Supabase Heaven** :
- `050_seed_root_m0_v2` : INSERT row ROOT (slug=`root`, model_id=`m0`, display_name=`ROOT`, is_active=true) dans `agence_models`
- Update bio spécimen + status `Dev mode`

**Code source** :
- `src/shared/config/entities/root.ts` — nouveau (slug/model_id/display_name/color ambre)
- `src/shared/config/entities/index.ts` — exporte ROOT_ENTITY + l'ajoute à `ENTITIES`

**Impact utils** :
- `toModelId("root")` → `"m0"` (via `SLUG_TO_ID` dérivé de ENTITIES)
- `/api/models` retourne maintenant 4 CPs (ROOT, Yumi, Paloma, Ruby)

### 2.2 Skeleton ROOT spécimen

**Fichier modifié** : `src/app/agence/page.tsx`

Remplacement de l'empty state "Selectionne un modele" par un **template spécimen** complet lorsque `isRoot && !modelSlug` :
- Header "CP ROOT — template de référence" + badge "SPECIMEN / DEV MODE"
- Grille 13 cartes descriptives modules (Dashboard, Messagerie, Instagram, Contenu, Stratégie, Paramètres, Modèles, Ops, AI Agent V1, Voice V2, Content Gen V3, CM IA V3, Storyline V3)
- Pour chaque carte : icône · fonction · rôles · sources DB · statut (done/planned)
- Footer tips dev

### 2.3 Header : selector root amélioré

**Fichier** : `src/shared/components/header.tsx`, `src/cp/components/cockpit/root-cp-selector.tsx`

- `RootCpSelector` rendu dès `auth.role === "root"` OR `auth` null (dev fallback)
- Suppression des gardes `!ready` et `models.length === 0` qui cachaient le bouton
- Label fixe **"ROOT"** (au lieu de "HEAVEN" hardcodé historique)
- Suppression de l'option "Aucun CP (root brut)" du dropdown — ROOT apparaît maintenant comme 1er CP du listing DB

### 2.4 Hiérarchie comptes Root > Yumi > Paloma/Ruby

**Fichier** : `src/app/api/agence/accounts/route.ts`, `src/app/api/agence/accounts/[code]/reset-code/route.ts`

Helper `canEditTarget(user, target)` :
- **Root Master** (role=root, model_slug=null ou slug=root) → modifie tout
- **Yumi root-fusion** (role=root, model_slug=yumi) → modifie Paloma/Ruby mais PAS Root
- **Model** (paloma/ruby) → uniquement son propre compte

Enforce dans PATCH `/api/agence/accounts` (check target avant update) ET POST `/api/agence/accounts/[code]/reset-code`.

### 2.5 Édition inline comptes (admin)

**Fichier** : `src/cp/components/cockpit/settings/accounts-table.tsx`

- **Drawer modal → accordéon inline** par ligne
- Sous-accordéon "Modifier identifiant & mot de passe" (replié par défaut)
- Champs : **nom utilisateur** (login_aliases[0]) + **mot de passe custom** avec eye toggle
- Bouton Enregistrer ambre → 1) PATCH login_aliases 2) POST reset-code avec custom_code
- Validation regex 4-32 chars alphanum + `_ - .`

### 2.6 API accounts : extension PATCH

**Fichier** : `src/app/api/agence/accounts/route.ts`

- Nouveau body accepté : `login_aliases: string[]`, `model_id: string|null`, `model_slug: string|null`
- Validation stricte regex
- Check hiérarchie `canEditTarget()` avant update

**Fichier** : `src/app/api/agence/accounts/[code]/reset-code/route.ts`

- Nouveau body accepté : `custom_code: string` (4-32 chars alphanum + `_ - .`)
- Validation unicité avant write (409 si déjà pris)
- Sinon fallback génération aléatoire historique

### 2.7 Credentials alignés (règle passwords)

Règle NB 2026-04-24 : **1 username unique par CP** · pattern password `Mod{3lettres}2026` pour modèles · Root en exception.

| CP | model_id | Username | Password |
|---|:-:|---|---|
| ROOT | m0 | `root` | `Root2026` |
| YumiClub | m1 | `yumi` | `ModYum2026` |
| Paloma | m2 | `paloma` | `ModPal2026` |
| Ruby | m3 | `ruby` | `ModRub2026` |

Appliqué via API live (PATCH login_aliases + POST reset-code custom_code).

### 2.8 Sécurité Phase 1 (progressive, non-destructive)

**Migration DB appliquée** : `051_security_phase1_audit_and_lock`
- Table `agence_auth_events` (event_type, account_id, ip, user_agent, metadata, created_at) + 3 indexes + RLS
- Colonnes sur `agence_accounts` : `failed_attempts`, `locked_until`, `last_failed_at`, `code_hash` (nullable, pour bcrypt futur)
- Table `auth_rate_limits` (DB-persistant, future Phase 1.5)
- RPC `record_failed_login(p_account_id, p_max_fails, p_lock_minutes)` — incrémente + auto-lock atomique
- RPC `reset_login_attempts(p_account_id)` — reset sur login success

**Code source modifié** : `src/app/api/auth/login/route.ts`
- Helper `logAuthEvent()` (fire-and-forget)
- Check `locked_until` avant validation → renvoie 423 si compte verrouillé
- Sur succès → RPC reset_login_attempts + log `login_success`
- Sur échec → RPC record_failed_login (si account identifié) + log `login_fail` avec reason
- Tout est **defensive** (try/catch) : fonctionne même sans migration 051 appliquée (fallback silencieux)

**Vérifié live** : audit events enregistrés dans `agence_auth_events` (login_success + login_fail).

### 2.9 Plan sécurité progressive

**Nouveau doc** : `plans/03-tech/SECURITY-PROGRESSIVE-2026.md`

5 phases de durcissement :
- **Phase 1** (maintenant) : audit + lock + hash bcrypt + masking + rate limit DB
- **Phase 2** (+1 mois) : CSP + sliding JWT + device fingerprint admin + notifs Telegram + CSRF
- **Phase 3** (+3 mois) : TOTP 2FA + recovery codes + password policy
- **Phase 4** (+6 mois) : Passkeys + IP allowlist + CAPTCHA + geo tracking
- **Phase 5** (+1 an) : YubiKey + biométrie + audit immuable hash chain

---

## 3. Fichiers créés / modifiés

### Créés

- `src/shared/config/entities/root.ts`
- `supabase/migrations/050_seed_root_m0.sql` (v1 — remplacée en DB par v2 ci-dessous)
- `supabase/migrations/051_security_phase1_audit_and_lock.sql`
- `plans/03-tech/SECURITY-PROGRESSIVE-2026.md`
- `plans/_reports/UPDATE-REPORT-2026-04-24-0707-root-cp-m0-security-phase1.md` (ce fichier)

### Modifiés

- `src/shared/config/entities/index.ts`
- `src/shared/components/header.tsx` — label ROOT + rendu selector sans auth + bouton accessible sans models chargés
- `src/cp/components/cockpit/root-cp-selector.tsx` — gardes allégées + dropdown sans "Aucun CP"
- `src/shared/components/sidebar.tsx` — label dynamique ROOT/display_name
- `src/app/agence/page.tsx` — mode ROOT spécimen avec 13 cartes modules
- `src/cp/components/cockpit/settings/general-panel.tsx` — fetch ROOT + overrides "ROOT"/bio/handle
- `src/cp/components/cockpit/settings/accounts-table.tsx` — refonte accordéon inline + édition username+password + useEffect init
- `src/app/api/agence/accounts/route.ts` — PATCH étendu (login_aliases, model_id, model_slug) + canEditTarget()
- `src/app/api/agence/accounts/[code]/reset-code/route.ts` — custom_code + canEditTarget()
- `src/app/api/auth/login/route.ts` — audit events + lock check + RPC wiring defensive

### Migrations DB appliquées (MCP Supabase Heaven)

- `050_seed_root_m0_v2` (INSERT ROOT slug/m0/display_name)
- `051_security_phase1_audit_and_lock` (auth_events + lock + RPCs)

---

## 4. Impact phases plan ai-conversational-agent

Voir CHANGELOG module `plans/modules/ai-conversational-agent/CHANGELOG.md` (à mettre à jour en v0.5.0).

**Phase 3 (Refonte 3-CP)** : partiellement livrée (60%)
- ✅ ROOT = m0 CP maître avec mode spécimen
- ✅ YUMI m1 avec son propre CP scopé
- ✅ PALOMA/RUBY credentials standardisés
- ✅ Hiérarchie Root > Yumi > modèles enforced backend
- ⏸ Auth-guard frontend : pas encore modifié pour bloquer paloma/ruby de `/agence/models/*`
- ⏸ Matrice modules `config/modules.ts` : à créer

**Phase 4 (DB migrations IA)** : démarrée — numéros à renuméroter
- Migrations 050 et 051 PRISES pour ROOT et sécurité
- Migrations IA agent initialement prévues 040-047 → à renuméroter **052-059** (ou plus)

**Phase 5 (Agent IA v1)** : toujours à faire, non impacté.

---

## 5. Points à trancher NB

- [ ] Commit git de toutes ces modifications (branche `main` worktree OR nouvelle feature branch `feat/root-cp-security-phase1`) ?
- [ ] Phase 1.3 : masquer le code en clair dans `/api/agence/accounts?with_code=true` (retourner `has_password: true` au lieu de `code: "Root2026"`) — impact UI eye icon, mais aligne avec Phase 1.4 bcrypt
- [ ] Phase 1.4 : hash bcrypt passwords (irréversible, demande test soigneux login avant déploiement)
- [ ] Migrations IA agent : renuméroter 040-047 → 052-059 dans `plans/modules/ai-conversational-agent/03-TECH.md`
- [ ] Auth-guard frontend : ajouter `/agence/models/*` aux routes admin-only ?

---

## 6. Protocole commit

Respecter `feedback_protocole_maj_plans.md` :
- 1 commit distinct pour : (a) DB migrations, (b) code changes, (c) plans & reports
- Message commits format : `feat(root-cp):` / `feat(security-phase1):` / `docs(plans):`
- Jamais `git add -A` — staging sélectif
- Avant push : `npm run verify` (typecheck + env + build)

Je **ne commit PAS** sans ton GO explicite.

---

## 7. Next actions proposées

1. **Tu valides ce rapport** → commit les 3 groupes
2. **Suite Phase 1 sécurité** (1.3 masking + 1.5 rate limit DB) — estimé 2h
3. **Phase 3 finalisation** (auth-guard frontend + `config/modules.ts`) — estimé 3h
4. **Phase 4 IA** migrations renumérotées 052+ puis dispatch Database Agent — estimé 3h
