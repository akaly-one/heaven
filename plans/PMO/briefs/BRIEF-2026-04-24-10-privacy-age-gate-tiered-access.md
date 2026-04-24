# BRIEF-2026-04-24-10 — Privacy Policy + Age Gate + Accès hiérarchisé (sensuel vs explicite)

> **Status** : 🟠 cadré (en attente GO NB)
> **Source** : NB message du 2026-04-24 ~19:00 (privacy bottom page + age gate popup dans conversation + redirect IG si mineur + hiérarchie accès : visiteur=sensuel only, validé manuellement=explicit+packs)
> **Type** : feature + légal + sécurité
> **Priorité** : P0 (bloquant légal pour déployer système insights BRIEF-09 + explicite BRIEF-08 niv 3)

---

## Demande NB (verbatim résumé)

1. **Privacy Policy légale en bas de page** expliquant :
   - Respect RGPD
   - But : pas de stockage d'infos, juste tri contacts + market research selon préférences/critères/envies des **visiteurs et utilisateurs vérifiés**
   - Accessible depuis toutes les pages

2. **Age Gate dans la conversation** :
   - Bouton qui demande certification que la personne qui parle est majeure
   - Case à cocher
   - Certification stockée dans les infos du profil **lié à la conversation** (pas juste session)
   - Si fan ne valide pas majorité → **redirect vers Instagram** (Insta gère l'age gate)
   - Question NB : "est suffisant ?" → oui techniquement, avec mitigation (voir §Risques)

3. **Hiérarchie d'accès stricte** :
   - **Mode visiteur** (pas upgradé) = contenu **sensuel non explicite**
   - **Mode upgradé** (snap/insta validés manuellement admin) = accès profil complet + packs + explicite
   - Sans validation admin manuelle → jamais d'accès explicite/packs
   - L'age gate seule ne suffit pas à débloquer explicite — il faut ET majorité ET validation admin

## Compréhension CDP

### Matrice accès cible

| Stage fan | Age certifié ? | Validation admin ? | Accès contenu | Agent IA tone |
|---|---|---|---|---|
| **Nouveau visiteur** | ❌ | ❌ | Profil basique + flirt léger | Niveau 1 (BRIEF-08) |
| **Visiteur majeur** (case cochée) | ✅ | ❌ | Profil + sensuel (non explicit) | Niveau 2 (flirt chaud, allusions) |
| **Handle lié (pending)** | ✅ | ❌ en attente | Idem visiteur majeur | Niveau 2 + relance "bientôt validé" |
| **Handle validé admin** | ✅ | ✅ | Packs + explicite + sextapes Fanvue | Niveau 3 (BRIEF-08) |
| **Handle rejeté admin** | — | ❌ rejeté | Idem visiteur anonyme | Niveau 1 |

**Note importante** : si fan décoche age gate ou refuse → redirect IG (car Instagram a sa propre age gate Meta).

### Relations avec autres briefs

| Brief | Lien |
|---|---|
| **BRIEF-06** Cycle vie visiteurs | **Merge partiel** : la stage `pending_verification` de BRIEF-06 utilise maintenant la matrice ci-dessus, pas juste "pseudo fourni" |
| **BRIEF-08** Persona v2 progression | Les niveaux 1/2/3 se basent sur cet accès (pas juste heat_score) |
| **BRIEF-09** Extraction insights | Consent RGPD explicite = conditionné à age gate validé + info Privacy Policy |

## Scope

### IN

#### Volet A — DB infrastructure (~45 min)

1. `TICKET-AG01` Migration 066 : extension `agence_clients` colonnes :
   - `age_certified BOOLEAN DEFAULT false`
   - `age_certified_at TIMESTAMPTZ`
   - `age_certified_ip TEXT` (audit, hashé)
   - `access_level TEXT CHECK (anonymous | major_visitor | pending_upgrade | validated | rejected)` DEFAULT 'anonymous'
   - `validated_at TIMESTAMPTZ`, `validated_by TEXT`, `rejected_at TIMESTAMPTZ`, `rejected_reason TEXT`
2. Backfill : clients existants → déterminer stage basée sur `pseudo_insta`/`pseudo_snap` présents + `verified_at`
3. Index partiel sur `access_level` (pour filtres rapides)

#### Volet B — Privacy Policy + Footer (~45 min)

4. `TICKET-AG02` Refonte `/privacy` page (existe mais basique) :
   - Sections : Collecte / Base légale / Utilisation / Rétention / Droits fans / Contact DPO
   - Mention explicite insights BRIEF-09 : catégories / durée (1-3 ans) / finalité (market research + personnalisation)
   - Badge "conforme RGPD" + date dernière MAJ
   - Langues FR + EN (i18n simple)
5. `TICKET-AG03` Footer persistant toutes pages publiques `/m/[slug]` :
   - Liens `/privacy` + `/terms` + `/data-deletion` + "Contact"
   - Design discret, accessible clavier, WCAG AA

#### Volet C — Age Gate UI (~1h30)

6. `TICKET-AG04` Composant `<AgeGateModal>` shared :
   - Déclenchement : **1er message fan dans une conversation** OU clic sur contenu "sensuel+"
   - Texte : "Pour continuer, confirme que tu as 18 ans ou plus"
   - Case à cocher obligatoire + bouton "Je certifie"
   - Bouton "Je suis mineur" → redirect `https://instagram.com/yumiiiclub` (target="_blank")
   - Pas de fermeture sans réponse (modal bloquant)
7. `TICKET-AG05` Persistance certification :
   - Fan certifié → cookie + DB `agence_clients.age_certified=true`
   - Skip modal aux sessions suivantes (cookie valide 30 jours)
   - Reset si cookie effacé OU si IP différente (audit)
8. `TICKET-AG06` Indicateur visuel fiche fan admin :
   - Badge "✅ 18+ certifié" OU "⚠️ pas certifié"
   - Timestamp certification visible
   - Bouton "Révoquer certification" (si admin suspect fraude)

#### Volet D — Hiérarchie accès runtime (~1h30)

9. `TICKET-AG07` Helper `computeAccessLevel(client)` dans `src/shared/lib/access/tiers.ts` :
   - Input : client row (agence_clients)
   - Output : `{ level, allowedContent: ['profile'|'sensual'|'explicit'|'packs'], maxAiTone: 'flirt_light'|'flirt_hot'|'explicit' }`
   - Règles :
     - Sans age_certified → `anonymous`, `[profile_basic]`, `flirt_light`
     - age_certified + pas de handle → `major_visitor`, `[profile, sensual]`, `flirt_hot`
     - handle fourni pas validé → `pending_upgrade`, idem `major_visitor`
     - handle validé admin → `validated`, `[profile, sensual, explicit, packs]`, `explicit`
10. `TICKET-AG08` Middleware contenu :
    - Routes `/api/packs/*` retournent uniquement si `access_level=validated`
    - Route `/api/messages POST` inject le `max_tone` dans prompt persona runtime
11. `TICKET-AG09` UI `/m/[slug]` affiche sections selon access_level :
    - Packs = visible avec overlay "validated seulement" si pas encore validé
    - Wall/Feed : filtre `is_sensual_only` sur posts

#### Volet E — Admin validation flow (~1h)

12. `TICKET-AG10` Drawer fan admin : boutons explicites
    - `[Valider @handle]` → check IG/Snap API presence (si possible) + UPDATE access_level=validated
    - `[Rejeter]` → UPDATE access_level=rejected + raison obligatoire
    - `[Demander preuve]` → envoyer DM auto "peux-tu m'envoyer screenshot de ton Insta ?"
13. `TICKET-AG11` Queue admin `/agence/verification-queue` :
    - Liste fans avec access_level='pending_upgrade' triés par ancienneté
    - Actions batch (valider lot)
    - Compteur en attente dans sidebar

#### Volet F — Audit + tests (~45 min)

14. `TICKET-AG12` Audit log `agence_age_gate_events` :
    - Chaque interaction age gate (certified / rejected / revoked) loggée
    - RLS root + model current
15. `TICKET-AG13` Tests Playwright :
    - Visiteur nouveau → age gate modal s'affiche
    - Clic "Je suis mineur" → redirect IG URL correcte
    - Clic "Je certifie" → DB update + cookie set + skip modal next time
    - Admin valide handle → access_level=validated → packs visibles au fan

### OUT

- ID verification documentaire (carte identité upload) — overkill MVP, overhead légal
- Biométrie / selfie verification — idem, V2+ si vraiment nécessaire
- Auto-verification via IG/Snap API presence — pas de public API fiable, validation manuelle OK
- Multi-langue full (FR/EN seulement pour Privacy Policy) — BRIEF-12 couvrira le multilingue

## Branches concernées

- ☒ **DB** — migration 066 + RLS + audit log
- ☒ **BE** — helper access tiers + middleware + routes validation
- ☒ **FE** — AgeGateModal + footer + drawer admin + queue verification + indicateurs
- ☒ **Legal** — refonte Privacy Policy + ToS alignement + mentions RGPD
- ☒ **QA** — tests Playwright e2e + WCAG + i18n FR/EN
- ☒ **Doc** — ADR access tiers + runbook admin validation + update CONTEXT messenger module
- ☐ AI / DevOps — indirect (l'agent lit le access_level mais pas de changement prompt hors BRIEF-08)

## Dépendances

### Amont
- ✅ Infra DB Heaven existante
- 🟠 BRIEF-06 (cycle visiteurs) — sera mergé partiellement avec BRIEF-10 pour la stage `pending_verification`

### Aval (BRIEF-10 débloque)
- BRIEF-08 niveau 3 explicite = exige access_level=validated
- BRIEF-09 consent RGPD = exige age_certified + Privacy Policy publique
- Tout explicite / packs en prod = bloqué tant que BRIEF-10 pas livré

## Questions à NB

- [ ] **Redirect IG suffisant pour mineurs ?** Oui, mais je propose aussi logger l'event (`agence_age_gate_events` avec reason='declared_minor') pour traçabilité légale en cas de litige
- [ ] **Rétention cookie certification** : 30 jours proposé (équilibre UX/sécurité). OK ?
- [ ] **Contact DPO Privacy Policy** : email ? `dpo@heaven-os.vercel.app` ou autre ?
- [ ] **Révocation certification** : si admin voit suspicion fraude, il révoque → le fan doit recocher = OK ou relancer processus complet ?
- [ ] **Queue verification** : tu veux notifications Telegram quand nouveau handle pending ?

## Acceptance criteria

- [ ] Visiteur nouveau `/m/yumi` → age gate modal bloquant au 1er message
- [ ] Clic mineur → redirect `https://instagram.com/yumiiiclub` ouverture nouvel onglet
- [ ] Clic majeur → DB update + conversation continue normalement (niveau 2 agent)
- [ ] Fan avec pseudo_insta/snap fourni → stage `pending_upgrade`, pas accès packs/explicite
- [ ] Admin clique "Valider" → stage `validated`, fan reçoit message auto "tu as maintenant accès à tout 🔥"
- [ ] Agent IA niveau 3 uniquement si client `access_level='validated'`
- [ ] Privacy Policy accessible tous pages, conforme art. 13-14 RGPD
- [ ] Tests Playwright passent tous les scénarios
- [ ] Aucune régression visiteurs existants (backfill access_level correct)

## Notes CDP

### Risque #1 — Déclaration fausse majorité
Fan peut cocher "majeur" alors qu'il est mineur. Mitigation légale :
- Audit log avec timestamp + IP hashée
- ToS mentionne : "en cochant cette case, tu certifies sur l'honneur être majeur. Toute fausse déclaration est sous la responsabilité de l'utilisateur"
- Si admin suspecte fraude (langage, photo profil IG, comportement) → révocation + bloquer fan
- En cas de litige : on peut prouver consentement + age_certified + date + IP

### Risque #2 — Bypass modal via cookie manipulation
Fan efface cookie → modal réapparaît (OK). Fan édite cookie manuellement pour contourner → audit IP différente déclenche recertification. Pas de bypass silencieux.

### Risque #3 — Fan mineur via IG redirect
On envoie les mineurs sur Instagram — c'est Meta qui gère. Si Meta les laisse sur @yumiiiclub, c'est leur problème (ils ont leur propre age gate et politique). Yumi sur IG doit aussi respecter Meta community guidelines (pas de NSFW explicit dans le feed public — déjà la règle).

### Risque #4 — Queue validation admin surchargée
Si trop de fans pending, admin peut ne pas suivre. Mitigation :
- Alerte sidebar compteur pending
- Notification Telegram Yumi si >20 pending
- Auto-reject après 7 jours sans action (déjà prévu dans BRIEF-06 lifecycle)

### Skills Claude Code préférentiels

- AG01 : Supabase MCP + `general-purpose`
- AG02-AG03 : `senior-frontend` + `design:ux-copy` + `legal:compliance-check`
- AG04-AG06 : `senior-frontend` + `vercel:shadcn` + `design:accessibility-review`
- AG07-AG09 : `senior-backend`
- AG10-AG11 : `senior-frontend` + `senior-backend`
- AG12-AG13 : `engineering:testing-strategy` + `engineering:code-review`
