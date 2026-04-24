# BRIEF-2026-04-24-02 — Messenger UI Standards : pseudo + avatar + bulles chat + mode agent par conversation

> **Status** : 🟠 cadré (en attente consolidation)
> **Source** : NB message du 2026-04-24 ~13:00 (screenshot messagerie + "corrige les incoherence et uniformiser...")
> **Type** : standard + feature
> **Priorité** : P1 (important UX, bloque pas prod)

---

## Demande NB (verbatim résumé)

1. Corriger les incohérences dans le module messagerie, visibles dans le screenshot (liste conversations gauche vs dropdown header droite)
2. Créer **des standards de classement pour les bulles de chat** (pas juste corriger les 5 conversations actuelles)
3. Règle : les règles du header = prolongement direct de la messagerie (le header = raccourci, pas un univers séparé)
4. Ajouter le **mode utilisé pour l'agent comme option pour toutes les discussions** → pouvoir choisir le mode de réponse par discussion (pas juste globalement)
5. Règle transverse : travailler chirurgicalement, phase par phase, comme une vraie agence de dev web

## Compréhension CDP

4 incohérences réelles identifiées par audit du code (pas juste visuelles) :

### Bug A — `getConversationPseudo` applique des règles inconsistantes
- `src/shared/lib/messaging/conversation-display.ts:34-35` : Insta → `@{pseudo}` (avec @), Snap → `{pseudo}` (sans @)
- `src/shared/components/header/messages-dropdown.tsx:87` hardcode `@{pseudo}` en plus → risque `@@` pour Insta
- Résultat : même client affiché différemment selon la vue

### Bug B — 2 composants Avatar différents pour le même client
- Header : `PlatformAvatar` via `getAvatarStyle` → icône `Ghost`/`Instagram`/`Globe`
- Page messagerie : `<Avatar>` custom inline (page.tsx:101) → cercle doré + initiale (V/G/T)
- Helper `getAvatarStyle` existe mais n'est pas consommé par la page messagerie

### Bug C — Bulles de chat (thread) hardcodées dans chaque vue
- Dropdown header : styling inline (background, radius) dans `messages-dropdown.tsx:119-123`
- Page messagerie : styling inline dans `agence/messagerie/page.tsx`
- Pas de composant `<MessageBubble>` partagé → changements duplicables, bugs divergents

### Bug D — Mode agent par conversation : infra OK, UI incomplète
- Migration 057 existe (colonne `agent_mode` sur `agence_fans`, `agence_clients`, `instagram_conversations`)
- API `PUT /api/agence/messaging/mode` existe
- Chip mode existe dans le thread header de la page messagerie
- **Manque** : mode chip dans la liste des conversations (row) + dans le dropdown header

## Scope

### IN
- **Standard documenté** (fichier unique source de vérité) : règles pseudo, avatar, bulle row, bulle chat, mode agent placement, **ordre chronologique**, **couleurs bulle par canal**, **avatar modèle dans bulle**
- **Helper corrigé** `getConversationPseudo` : règle unique et cohérente
- **Composants shared** nouveaux :
  - `<ConversationAvatar>` (remplace `<Avatar>` page + `PlatformAvatar` dropdown + `clients-dropdown` — cf. BRIEF-13)
  - `<ConversationRow>` (remplace rendering inline page + dropdown)
  - `<MessageBubble>` (remplace bulles inline thread)
- **Mode chip** ajouté dans `<ConversationRow>` + dropdown header
- **Tests** : snapshot Playwright cohérence header vs page vs profil

### IN (ajouts NB 2026-04-24 ~20:00)

#### Ordre chronologique des messages (✅ hotfix partiel livré `528bdea`)
- Standard : **oldest first → newest bottom** (iMessage/WhatsApp/Slack)
- Scroll auto vers le bas au chargement du thread
- Scroll auto vers le bas quand un nouveau message arrive pendant que la conversation est ouverte
- Scroll preservation : si l'user scrolle vers le haut (lecture historique), ne PAS forcer scroll bottom auto sur nouveau message (afficher badge "1 nouveau message ↓" à la place)

#### Styling bulles par canal (iMessage-inspired)
Trois variants selon le canal et l'acteur :

| Acteur | Canal | Bulle background | Texte | Alignement | Avatar |
|---|---|---|---|---|---|
| **Modèle** (Yumi/Paloma/Ruby) | Web | Vert iMessage `#30D158` (ou `var(--imessage-green)`) | Blanc | Droite | Photo profil modèle (cercle 32px à gauche de la bulle) |
| **Modèle** | Instagram | Bleu iMessage `#0A84FF` (ou `var(--imessage-blue)`) | Blanc | Droite | Photo profil modèle + badge IG discret |
| **Agent IA** (auto/copilot) | Tous | Même vert/bleu que modèle + sparkle icon ✨ coin supérieur | Blanc | Droite | Photo modèle + badge bot discret |
| **Visiteur web** | Web | Gris neutre `var(--bg)` + border `var(--border)` | `var(--text)` | Gauche | Avatar `<ConversationAvatar>` Globe ou initiale |
| **Fan Instagram** | IG | Gris neutre + border subtle IG accent | `var(--text)` | Gauche | Avatar Instagram icon |

**Tokens CSS ajouts** (Tailwind `@theme` ou CSS vars) :
```
--imessage-green: #30D158;   /* Web outbound */
--imessage-blue: #0A84FF;    /* IG outbound */
--imessage-gray: var(--bg);  /* Inbound tous canaux */
```

Dark mode : `oklch` équivalents pour luminosité stable.

**Avatar modèle dans bulle** :
- Source : `modelSelf.avatarUrl` (photo réelle modèle depuis `/api/models/photo`)
- Fallback : initiale majuscule sur gradient or (existant)
- Visible sur le PREMIER message d'un "cluster" seulement (plusieurs messages consécutifs du même acteur = 1 avatar affiché)
- Taille 28-32px, placement à gauche de la bulle (même aligné à droite que la bulle)

#### Compteur messages non-lus — temps réel (✅ hotfix partiel livré `528bdea`)
- Dès qu'une conversation est ouverte → mark_read automatique
- Compteur header se décrémente instantanément (CustomEvent `heaven:messages-read`)
- Polling 15s reste en fallback mais UX = instant
- Extension : si plusieurs conversations non-lues, header affiche total + bulle rouge
- Badge bulle row passe de "3 non lus" → 0 dès ouverture

#### Cohérence bouton header "Clients & Codes" avec pseudos messagerie
Intégré dans BRIEF-13 TICKET-UV10 (refactor `clients-dropdown.tsx` pour consommer helpers shared).

### OUT
- Refonte complète du module messagerie (hors scope de ce brief, cf. ROADMAP-multiagent-execution B7)
- Ajout de canaux nouveaux (Telegram, Discord, Fanvue) — brief futur
- Changement de DB schema (colonnes `agent_mode` déjà en place)

## Branches concernées

- ☒ **FE** — composants shared + refactor consommateurs + mode chip
- ☒ **BE** — micro-fix `getConversationPseudo` + test unit
- ☒ **QA** — snapshot tests Playwright + a11y audit WCAG 2.2 AA
- ☒ **Doc** — UI-STANDARDS-v1.md dans `plans/modules/messagerie-contacts/`
- ☐ DB / AI / DevOps — pas concerné

## Dépendances

- Aucune bloquante
- Bénéficie de : migrations 055/056/057 (agent_mode column) déjà appliquées
- Synergique avec : Phase 7 ai-conversational-agent (Training UI) qui consomme aussi mode
- Réf standard pattern : `STANDARDS-WEB-DEV-2026.md` (a11y WCAG 2.2 AA, live regions chat, testing Vitest+Playwright)

## Livrables attendus

1. **Doc** : `plans/modules/messagerie-contacts/UI-STANDARDS-v1.2026-04-24.md`
   - Section 1 : Règle Pseudo (une seule formule)
   - Section 2 : Règle Avatar (composant `<ConversationAvatar>`)
   - Section 3 : Règle Bulle conversation liste (`<ConversationRow>`)
   - Section 4 : Règle Bulle chat thread (`<MessageBubble>` avec discriminator `actor`)
   - Section 5 : Mode agent placement (3 points d'entrée cohérents)
   - Section 6 : Matrice cohérence header ↔ messagerie ↔ profil
2. **Code** : 3 composants shared + refactor des 2 consommateurs
3. **Tests** : snapshot e2e Playwright + unit test `conversation-display.ts`
4. **Changelog** : CHANGELOG.md messagerie + root CHANGELOG.md v1.5.0

## Acceptance criteria

- [ ] Screenshot page messagerie et dropdown header affichent le **MÊME pseudo** et la **MÊME bulle avatar** pour le même client
- [ ] Helper `getConversationPseudo` a une règle unique documentée + test unit passant
- [ ] Composants shared : 3 composants créés, consommateurs refactorés (0 styling inline dupliqué)
- [ ] Mode chip présent dans conversation row (liste) + thread header + dropdown header
- [ ] PUT `/api/agence/messaging/mode` invoqué depuis les 3 points d'entrée avec mêmes sémantiques
- [ ] Snapshot Playwright : même client testé dans 3 vues → render identique
- [ ] Axe-core 0 critical sur les nouveaux composants
- [ ] Touch targets ≥ 44px mobile (WCAG 2.5.8)

## Tickets générés (sera rempli en phase consolidation)

Pré-découpage proposé (à valider en consolidation) :

- `TICKET-M01` [Doc] — Rédiger UI-STANDARDS-v1.2026-04-24.md (Architect)
- `TICKET-M02` [BE] — Fix `getConversationPseudo` règle unique + test Vitest
- `TICKET-M03` [FE] — Créer `<ConversationAvatar>` shared + refactor 2 sites
- `TICKET-M04` [FE] — Créer `<ConversationRow>` shared + refactor 2 sites
- `TICKET-M05` [FE] — Créer `<MessageBubble>` shared + refactor 2 sites
- `TICKET-M06` [FE] — Ajouter mode chip (row + dropdown), câbler PUT /mode
- `TICKET-M07` [QA] — Snapshot tests Playwright cohérence 3 vues + a11y axe-core

## Notes CDP

**Observation critique** : le v1.4.0 livré ce matin annonçait l'unification mais la page messagerie n'utilise toujours pas `getAvatarStyle` (elle a son propre `<Avatar>`). L'unification promise n'était donc que partielle. Ce brief la termine.

**Standard transverse** : ce brief **crée le premier jeu de standards concrets** dans `PMO/standards/`. Pattern à reproduire pour les autres modules (dashboard, contenu-packs, profil-public, instagram).

**Risque** : refactor UI sur composants visibles = risque régression visuelle. Mitigation = snapshot Playwright AVANT refactor pour comparaison.

**Parallélisation** : TICKET-M01 (doc) bloque M02-M07 (le doc sert de contrat). M03/M04/M05 peuvent être parallèles après M01 validé. M06 dépend de M04. M07 en parallèle de M06 mais valide en fin de chaîne.

**Skills Claude Code préférentiels** :
- M01 : `engineering:architecture` + `design:design-system`
- M02 : `senior-backend` + `test-driven-development`
- M03/M04/M05 : `senior-frontend` + `vercel:shadcn` + `vercel:react-best-practices`
- M06 : `senior-frontend` + `vercel:nextjs`
- M07 : `engineering:testing-strategy` + `design:accessibility-review`
