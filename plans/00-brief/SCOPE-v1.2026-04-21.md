# 06 — Modules

> Source BP : **`plans/business/bp-agence-heaven-2026-04/README.md`** §CP admin Heaven.
> Ce fichier catalogue les modules existants + les nouveaux dérivés du BP v1.

---

## Catalogue modules CP (`src/app/agence/`)

### Existant (v1.0 → v1.1)

| Module | Route | Description | État |
|---|---|---|---|
| **Cockpit** | `/agence` | Home multi-profil + widget IG stats | ✅ Livré v1.1 |
| **Messagerie** | `/agence/messagerie` | Inbox unifiée web + IG (vue `agence_messages_timeline`) | ✅ Livré v1.1 |
| **Instagram** | `/agence/instagram` | 3 tabs (Posts / Commentaires / Config) | ✅ Livré v1.1 |
| **Ops** | `/agence/ops` | 6 KPIs observabilité (latency, quota Meta, queue) | ✅ Livré v1.1 |
| **Clients** | `/agence/clients` + `/[fanId]` | CRM fans unifié multi-canal | ✅ Livré v1.1 |
| **CMS** | `/agence/cms` | Éditeur pages + collaborateurs | 🟡 Existant, à adapter Plan Identité |
| **Pipeline** | `/agence/pipeline` | Planning contenu + goals | 🟡 Existant, à étendre par Mode |
| **Finances** | `/agence/finances` | Revenus, commission | 🟡 À refactor avec calcul palier |
| **Stratégie** | `/agence/strategie` | Simulateur revenus + onboarding | 🟡 À étendre vue par Mode |
| **Automation** | `/agence/automation` | Flows IA (DM, replies) | 🟡 À étendre scripts par Mode |
| **Settings** | `/agence/settings` | Tarifs, paramètres profil | 🟡 À étendre |
| **Architecture** | `/agence/architecture` | Diagramme live (dev) | ✅ |

### Nouveaux modules (dérivés BP)

| Module | Route | Description | Sprint |
|---|---|---|---|
| **Panel Mode** | `/agence/models/[id]` — section Mode | Select A/B/C + badge visuel card profil | **Sprint 2** |
| **Panel Plan Identité** | `/agence/models/[id]` — section Identity | Radio `discovery`/`shadow` + guidelines + impact coût prod | **Sprint 2** |
| **Panel Palier rémunération** | `/agence/models/[id]` — section Palier | Palier courant (P1-P4) + historique bascules + simulateur | **Sprint 2** |
| **Statut initial** | `/agence/models/[id]` — section Statut | Enum salariée/étudiante/chômage/sans activité/pensionnée + bouton « Vérifié ONEM » | **Sprint 2** |
| **Onglet Release Form DMCA** | `/agence/models/[id]` — tab DMCA | Upload sécurisé 5 documents + state machine + template email DMCA@fanvue.com | **Sprint 3** |
| **Onglet Contrat privé** | `/agence/models/[id]` — tab Contract | Bucket chiffré + versioning + date signature | **Sprint 3** |
| **Dashboard Caming** | `/agence/caming` | Sessions actives + viewers + conversion cam→Fanvue + planning | **Sprint 4** |
| **Commission auto** | `/agence/finances` — section Commission | Calcul net distribuable + part modèle 70% + part Sqwensy 30% | **Sprint 5** |
| **Alertes palier** | `/agence/finances` — notifications | 3 mois > 750 € → notif + pré-remplissage guichet d'entreprise BE | **Sprint 5** |
| **Vue par Mode** | `/agence/strategie` — tabs A/B/C | Filtres par Mode, KPIs, attribution canaux | **Sprint 6** |
| **Scripts DM par Mode** | `/agence/automation` — section scripts | Scripts différents A (IA persona) / B (modèle réelle) | **Sprint 6** |

---

## Instagram AI Agent (v1.1)

Module livré avec messagerie unifiée (migrations 030, 032-038b).

### Architecture
- Migration `030_instagram_agent.sql` : 3 tables (config, conversations, messages)
- Migration `038_yumi_full_ops.sql` : UNIQUE(`ig_message_id`) + RPC `ig_conv_increment_count` + `ig_reply_queue` + `agence_feed_items` polymorphe
- Migration `038b_claim_jobs_rpc.sql` : RPC `claim_ig_reply_jobs` (FOR UPDATE SKIP LOCKED)
- `src/shared/lib/openrouter.ts` — client Claude Sonnet 4.6 (prompt caching)
- `src/shared/lib/instagram.ts` — Meta Graph API v19
- API `/api/instagram/webhook` — GET verify + POST async <500ms + dedup + enqueue
- API `/api/cron/process-ig-replies` — worker IA (placeholder pending D-5)
- API `/api/cron/sync-instagram` — daily 6h sync posts
- API `/api/cron/purge-ops-metrics` — daily 4h rétention 7j
- Dashboard `/agence/instagram` — 3 tabs

### Sécurité
- Webhook signature HMAC-SHA256 (Meta App Secret)
- Auth JWT sur send + conversations
- Fallback human si AI fail

### Pending
- Clé `OPENROUTER_API_KEY` (D-5 NB)
- Meta App Review permissions `instagram_manage_messages`/`manage_comments`/`pages_messaging` (D-4)
- Business Verification SQWENSY BE

Spec agent détaillée : `plans/IA-AGENT-SPEC.md` (persona flirt classy, FR/EN/ES auto-detect, modes review/auto, $0.008/reply).

---

## Data model nouveau (dérivé BP)

Les tables existantes (`agence_models`, `agence_clients`) à étendre + **2 nouvelles tables** :

### Extension `agence_models`
```
mode_operation       enum('A','B','C')
identity_plan        enum('discovery','shadow')
palier_remuneration  enum('P1','P2','P3','P4')
fiscal_voie          enum('droit_image','profits_divers','indep_complementaire','indep_principal')
statut_initial       enum('salariee','etudiante','chomage','sans_activite','pensionnee')
statut_initial_verified     bool
caming_active               bool
caming_platforms            jsonb   -- ['stripchat','bongacams','chaturbate']
caming_weekly_hours_target  int
release_form_status         enum('pending','submitted','validated','rejected')
release_form_submitted_at   timestamptz
release_form_validated_at   timestamptz
contract_signed_at          timestamptz
contract_url                text    -- bucket chiffré + URL signée 15 min
revenue_monthly_avg_3m      numeric
palier_escalation_locked_until  timestamptz
```

### Nouvelle `agence_releaseform_dossier` (1 par modèle × plateforme)
```
id, model_id, platform enum('fanvue','onlyfans','mym')
release_form_pdf_url, id_document_recto_url, id_document_verso_url,
headshot_dated_url, full_body_url,
faceswap_before_url, faceswap_after_url,
submitted_at, validated_at, rejected_at, rejection_reason
```
RLS stricte : accès uniquement JWT admin avec scope `dmca:read`. URLs signées 15 min.

### Nouvelle `agence_caming_sessions`
```
id, model_id, platform enum('stripchat','bongacams','chaturbate'),
started_at, ended_at, duration_minutes,
viewers_unique_estimated, tokens_earned, tips_received, private_sessions_count,
redirections_fanvue_utm, new_fanvue_subscribers_attributed
```

### Extension `agence_revenus_modele` (si existe déjà, sinon à créer)
```
source_platform     enum('fanvue','onlyfans','mym','stripchat','bongacams','chaturbate','manuel')
source_type         enum('subscription','ppv','tip','caming_tokens','private_session')
acquisition_channel enum('caming','ig_organic','tiktok','snap','collab','paid','other')
caming_session_id   uuid NULL  -- FK si attribution caming
```

### Vue matérialisée `agence_commission_calcul` (mensuelle)
```
revenu_brut_plateforme, commission_plateforme_pct, tva_applicable,
frais_production_dedies, net_distribuable,
part_modele (70%), part_sqwensy (30%),
palier_detected, palier_escalation_triggered
```

---

## Workflows critiques (BP §CP workflows)

1. **Onboarding modèle Mode B** — 11 étapes state machine (contact → 1er drop) avec dates + responsables
2. **Release Form DMCA** — upload 5 docs + état workflow + email pré-rempli `mailto:DMCA@fanvue.com`
3. **Bascule palier auto** — cron mensuel recalcule `revenue_monthly_avg_3m` + notif admin bascule
4. **Calcul commission mensuel** — fin de mois : PDF justificatif (note paiement P1/P2 / facture P3/P4)
5. **Tracking funnel caming → PPV** — UTM dynamique par session cam, attribution J+7
6. **Alerte statut légal** — si `statut_initial=chomage`, bloquer signature contrat tant que `statut_initial_verified=false`
7. **Retrait consentement** — workflow dédié : ticket → retrait contenu 7j → confirmation + log immuable

---

## BEACON widget (inchangé)

`src/shared/components/beacon-widget.tsx` — widget chat flottant.
- Proxy server-side `/api/heaven-beacon/{chat,lead}`
- Aucun leak URL OS dans bundle client
- 3 quick actions (Découvrir profils / Packs / J'ai un code)

## Stories system (inchangé)

- Upload Cloudinary + TTL 24h (livré v1.0 Module D)
- Viewer fullscreen `src/shared/components/profile/story-viewer.tsx`
