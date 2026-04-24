# Update Report — 2026-04-24 11:12 — Messagerie unifiée + Agent IA 3 modes + per-conversation override

**Scope :** tout le travail session entre commits `5db3dea` et `876a827` (post v1.3.0).
**Branche :** `main`.
**Status :** livré + pushé sur `origin/main`, build Vercel OK.

---

## 1. Commits couverts

| SHA      | Message                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------- |
| 5db3dea  | feat(cockpit,ai): tab Agent IA dédié + swap Strategie dashboard + auth persistante                 |
| bd0b657  | feat(ai,messagerie): modes agent IA (auto/user/shadow/learning) + sync header→inbox                |
| 54739aa  | refactor(ai): fusion shadow+learning → copilot + avatars web visiteurs + CTA upgrade               |
| daf6212  | fix(messagerie): sync pseudos visiteur-NNN + thread chargé pour pseudo-fans                        |
| 876a827  | feat(messagerie): standards affichage unifiés + mode agent par conversation                        |

---

## 2. Module `ai-conversational-agent`

### Livrable 1 — Refonte modes (4 → 3, aligné Intercom Fin / Zendesk Agent Assist / GitHub Copilot)

**Avant (v1.3.0) :** pas de mode opérationnel → agent répondait toujours dès activation.

**Itération 1 (5db3dea) :** 4 modes introduits (auto, user, shadow, learning).

**Itération 2 (54739aa — finale) :** 3 modes retenus car shadow+learning redondants dans un use case creator agency.
- `auto` — agent répond seul
- `copilot` — human-in-the-loop : toi tu tapes + envoies, l'agent génère en parallèle un draft (`sent=false`) et apprend de tes corrections
- `user` — 100% humain, agent skip

**DB :**
- Migration `053_agent_personas.sql` (v1.3.0) — seed Yumi persona
- Migration `055_agent_persona_modes.sql` — colonne `mode` + `ai_runs.mode_at_run` + `ai_runs.sent` + table `ai_feedback`
- Migration `056_merge_shadow_learning_into_copilot.sql` — UPDATE valeurs existantes + CHECK constraint finale `(auto, copilot, user)`

**Code :**
- `src/shared/lib/ai-agent/modes.ts` : `AgentMode`, `decideForMode()`, `MODE_LABELS`
- Backend :
  - `/api/cron/process-ig-replies` : check `decision.generate` avant LLM, `decision.send` avant Meta send
  - `/api/messages POST → triggerWebAutoReply` : même logique pour web chat
- API REST :
  - `/api/agence/ai/settings` GET/PUT (persona + runs récents + provider_status)
  - `/api/agence/ai/test` POST (playground Groq direct)
  - `/api/agence/ai/health` GET (public, diag env booléens + file d'attente IG)

**UI (`src/cp/components/cockpit/messagerie/agent-ia-panel.tsx`)**
- Nouveau tab "Agent IA" dans messagerie (switch `[Messages] [Agent IA]` en top bar)
- 4 sections : Status strip · Mode d'opération · Persona editor · Playground · 15 derniers runs
- Mode selector 3 cards (Auto / Copilote / Manuel) avec description + couleur + icône (Radio / GraduationCap / UserRound)
- Backward-compat `shadow`/`learning` → `copilot` côté frontend

### Livrable 2 — Mode agent par conversation (override persona)

**DB (migration 057) :**
- Colonne `agent_mode TEXT CHECK (null | auto | copilot | user)` sur :
  - `agence_fans`
  - `agence_clients`
  - `instagram_conversations`
- `NULL` = utilise `persona.mode` global
- Index partiels `WHERE agent_mode IS NOT NULL`

**API (`/api/agence/messaging/mode`) :**
- `GET ?fan_id=xxx` → `{ mode, override, source: "override" | "persona_default" }`
- `PUT { fan_id, mode }` → override, `mode: null` remove l'override
- Parse `fan_id` UUID direct ou `pseudo:<client_id|ig_conv_id>`

**Backend wiring :**
- Worker IG : lit `instagram_conversations.agent_mode` → fallback persona
- Web auto-reply : lit `agence_clients.agent_mode` → fallback persona

**UI :**
- Chip dans le header de thread (messagerie) avec popover 3 choix + "Retour au défaut persona"
- Label = short mode + `(défaut)` si inherit persona
- Icône + couleur en cohérence avec `MODE_LABELS`

---

## 3. Module `messagerie-contacts`

### Livrable 3 — Standards d'affichage unifiés (header ↔ page messagerie)

**Problème résolu :** le header dropdown et la page `/agence/messagerie` affichaient des pseudos différents (ex. `@visiteur-005` côté header vs `pseudo:v` côté page) pour la même conversation. Le header était un univers isolé, pas un raccourci cohérent.

**Source de vérité unique (`src/shared/lib/messaging/conversation-display.ts`) :**
- `getConversationPseudo(c)` — priorité Snap → Insta → pseudo_web → fallback `visiteur-<last4>`
- `getAvatarStyle(c)` — returns { platform, bg, color, iconKey } par plateforme
- `getExternalUrl(c)` — lien social seulement si Snap/Insta présents, jamais pour visiteur web anonyme
- `conversationSortKey(c)` — timestamp numérique pour tri
- `formatConversationTime(iso)` — format commun (m/h/j/date)

**Refactor consommateurs :**
- `src/shared/components/header/messages-dropdown.tsx` : `PlatformAvatar` délègue à `getAvatarStyle`, grouping utilise `getConversationPseudo`, timestamps via `formatConversationTime`, `ExternalLink` via `getExternalUrl`
- `src/app/agence/messagerie/page.tsx` : `primaryHandle` devient un alias de `getConversationPseudo`, `timeAgo` alias de `formatConversationTime`

### Livrable 4 — Sync header → inbox unifié

Le header fetchait `/api/messages` (legacy, par client_id) pendant que la page messagerie utilisait `/api/agence/messaging/inbox` (unifié web + IG). Résultat : divergence de pseudos + conversations manquantes.

**Fix (bd0b657) :** header.tsx `fetchMessages()` switch vers `/api/agence/messaging/inbox?source=all` avec transformation vers MessageItem synthétique (1 row/conversation = last_message). Fallback legacy si 401/500.

### Livrable 5 — Pseudos `visiteur-NNN` cohérents + thread chargé pour pseudo-fans

**Bugs (avant daf6212) :**
1. La pseudo-fan key utilisait `display_handle` (ex. nickname "v") → collision possible + affichage "pseudo:v" moche
2. Thread vide quand on cliquait une conversation "pseudo:xxx" (`if !isPseudoFan` court-circuitait le fetch)

**Fix :**
- Pseudo-fan key = `pseudo:<client_id|ig_conv_id>` (UUID stable, unique)
- Nouvelle branche inbox fetch pour `isPseudoFan` : tente agence_messages par `client_id`, fallback instagram_messages par `ig_conversation_id`
- Display normalization inbox : `pseudo_web = visiteur-<last4>` si pas de handle

### Livrable 6 — Upgrade CTA pour visiteurs web

Le bouton "Login" en header de `/m/[slug]` renommé → "Upgrade" avec tooltip "Ajouter ton Insta/Snap → stories privées & promos Fanvue".

Nouveau bandeau dans `ChatPanel` visible pour `!visitorRegistered` : "Ajoute ton Insta ou Snap → stories privées, promos Fanvue" → rouvre l'`IdentityGate`.

---

## 4. Module `dashboard` (cross-cutting)

### Livrable 7 — Swap Strategie tab (obsolète → version 3-plans)

Dashboard tab "Stratégie" utilisait `@/components/cockpit/strategie-panel` (monolithe ~660L avec `realData` props). Remplacé par `@/components/cockpit/strategie/strategie-panel` (version 3-plans A/B/C déjà utilisée dans `/agence/strategie`). Unification : même composant pour la tab et la page dédiée.

---

## 5. Module `auth-session`

### Livrable 8 — Auth persistante cross-onglets

**Problème :** `heaven_auth` était stocké en `sessionStorage` (éphémère par onglet) → déconnexions aléatoires dès fermeture/reload preview/nouveau tab. Cookie serveur `heaven_session` (JWT 24h) restait valide mais `AuthGuard` lisait uniquement sessionStorage → redirect `/m/yumi`.

**Fix (5db3dea) :** migration `heaven_auth` vers `localStorage` dans 7 fichiers lecture (`auth-guard`, `model-context`, `use-model-session`, `sidebar`, `mode-badge`, `agence/page`, `admin-auth-modal`). Fallback lecture sessionStorage pour compat sessions existantes. `handleLogout` nettoie déjà les 2 stores.

---

## 6. Fichiers créés cette session

### Migrations SQL (Supabase)
- `supabase/migrations/055_agent_persona_modes.sql`
- `supabase/migrations/056_merge_shadow_learning_into_copilot.sql`
- `supabase/migrations/057_per_conversation_agent_mode.sql`

### API routes
- `src/app/api/agence/ai/settings/route.ts`
- `src/app/api/agence/ai/test/route.ts`
- `src/app/api/agence/ai/health/route.ts`
- `src/app/api/agence/messaging/mode/route.ts`

### Composants + librairies
- `src/cp/components/cockpit/messagerie/agent-ia-panel.tsx`
- `src/shared/lib/ai-agent/modes.ts`
- `src/shared/lib/messaging/conversation-display.ts`

### Configuration
- `vercel.json` — cron `/api/cron/process-ig-replies` ajouté (`*/2 * * * *`)
- `.env.example` — `INSTAGRAM_PAGE_ACCESS_TOKEN` documenté

---

## 7. Fichiers modifiés majeurs

- `src/shared/components/header.tsx` — fetch inbox unifié + ClientItem.pseudo_web
- `src/shared/components/header/messages-dropdown.tsx` — avatar Globe + delegate helpers + lien "Voir tous les messages"
- `src/shared/components/auth-guard.tsx` — localStorage read
- `src/shared/components/admin-auth-modal.tsx` — localStorage write
- `src/app/agence/messagerie/page.tsx` — tab Agent IA + chip mode conversation + helpers shared
- `src/app/agence/page.tsx` — swap Strategie panel vers 3-plans
- `src/app/m/[slug]/page.tsx` — bouton Upgrade + CTA ChatPanel
- `src/app/api/messages/route.ts` — triggerWebAutoReply honore mode + override conversation
- `src/app/api/cron/process-ig-replies/route.ts` — honore mode + override conversation
- `src/app/api/agence/messaging/inbox/route.ts` — pseudo-fan fetch branch + display normalization
- `src/middleware.ts` — `/api/agence/ai/health` public GET

---

## 8. Checklist pré-push (déjà exécutée)

- [x] `npx tsc --noEmit` clean (0 erreur)
- [x] Hook pré-push `next build` passé → production chunks generated
- [x] Migrations Supabase appliquées via MCP (055, 056, 057)
- [x] Commits pushés sur `origin/main`
- [x] Vercel Deploy automatic (commit `876a827` disponible sur heaven-os.vercel.app dans ~30s)

## 9. Points d'attention post-déploiement

1. **Vercel env vars requis** : `GROQ_API_KEY`, `CRON_SECRET`, `INSTAGRAM_PAGE_ACCESS_TOKEN`. Vérifier via `/api/agence/ai/health` en prod.
2. **Cron process-ig-replies** : fréquence `*/2 * * * *` nécessite plan Pro Vercel (Hobby = daily min). Si Hobby → Vercel UI affichera un warning, utiliser `0 * * * *` comme fallback.
3. **Mode `copilot` volumétrie** : chaque inbound déclenche un ai_run même sans envoi → surveiller le compteur Groq (free tier 14 400 req/jour). Envisager throttling si spam.

---

Rapport rédigé post-session par l'agent. Validation NB en attente.
