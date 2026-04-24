# BRIEF-2026-04-24-13 — Unification Clients & Codes ↔ Messages + flow self-verification IP-matched

> **Status** : 🟠 cadré (en attente GO NB + validation approche simplification)
> **Source** : NB message du 2026-04-24 ~19:30 (screenshot "Clients & Codes" header vs messagerie → pseudos désynchronisés + flow self-verification visiteur via lien + IP match)
> **Type** : feature majeure + refactor data + workflow verification
> **Priorité** : P1 (débloque BRIEF-10 access_level validated + BRIEF-08 niveau 3 explicite)

---

## Demande NB (verbatim résumé)

### Volet A — Unification DB & rendering

1. Il y a **UNE SEULE DB client** (`agence_clients`) qui gère messages + clients + codes
2. L'user créé pour la session visiteur dans "Clients & Codes" doit être le MÊME que celui qui apparaît dans Messages
3. Si visiteur ajoute Snap/Insta → son pseudo change partout (messages + clients + codes)
4. Apparition d'un **badge "vérifié"** quand validé

### Volet B — Flow self-verification

Flow complet décrit par NB :

1. **Visite** : tout visiteur génère automatiquement un username `visiteur-XXXX` (dès envoi de message)
2. **Ajout handle** : visiteur ajoute Snap/Insta → pseudo mis à jour, **reste en attente validation manuelle** modèle
3. **Demande modèle** : modèle reçoit la demande dans le CP après que visiteur ait fourni handle
4. **Génération lien** : modèle génère + copie un **lien direct de validation** pour ce visiteur
5. **Envoi manuel** : modèle envoie le lien via le canal visiteur (Snap direct ou IG DM)
6. **Self-validation** : le visiteur, sur **son vrai compte Snap/Insta**, reçoit le lien et clique
7. **IP match** : si IP du clic = IP du moment de la demande → validation automatique
8. **Accès débloqué** : profil validé → badge partout → robot passe en **phase explicite**

NB : "ce flow de vérification me paraît correct, étudie-le et regarde si il y pas un moyen de le rendre plus simple mais en tout cas l'user créé dans client et code pour la session visiteur doit être le même que celui que le CP reçoit en message aussi"

## Compréhension CDP + analyse simplification

### État actuel (audit code)

| Aspect | État | Source |
|---|---|---|
| DB unique `agence_clients` | ✅ OK déjà | `src/app/api/clients/*` |
| Table `agence_codes` | ✅ existe | migration antérieure |
| Rendering pseudo messages | partial `visiteur-XXXX` | `conversation-display.ts` + `/api/agence/messaging/inbox` |
| Rendering pseudo dropdown "Clients & Codes" | ❌ format `@pseudo:7` | `clients-dropdown.tsx` (pas de consommation `getConversationPseudo`) |
| Workflow self-verification | ❌ inexistant | à construire |
| Badge "vérifié" | ⚠️ colonne `verified_status` existe mais pas utilisée UI | `agence_clients` |
| IP tracking | ⚠️ pas systématisé | — |

**Conclusion** : la DB est **déjà unifiée** ✅. Le problème = **rendering UI non partagé** entre header dropdown et messagerie + absence du workflow self-verification.

### Flow NB — analyse robustesse

**Points forts** :
- ✅ Out-of-band validation (modèle envoie sur canal différent de Heaven) = prouve contrôle compte Snap/IG
- ✅ IP match = anti-share-link (un fan ne peut pas donner le lien à un ami)
- ✅ Trigger manuel modèle = pas de spam automatique (modèle choisit qui valider)

**Points faibles** :
- ⚠️ **IP match strict peut rater des cas légitimes** : mobile 4G/5G change d'IP, VPN, réseaux NAT partagés (corpo, café)
- ⚠️ **Copy/paste manuel** par la modèle = friction (risque d'oubli, lien envoyé 2 fois)
- ⚠️ **Pas de TTL explicite** → liens qui traînent = risque sécurité
- ⚠️ **Pas de fallback** si visiteur clique le lien depuis un autre device

### Proposition de simplification CDP (à valider)

**Améliorations proposées sans casser la logique** :

1. **IP match "loose" par défaut** : même subnet /24 (3 premiers octets IP) plutôt qu'exact match
   - Évite les faux négatifs (NAT, mobile)
   - Reste efficace anti-share-link (même ville/FAI)
   - Option "strict mode" admin par conversation si suspect
2. **TTL lien** : 72h par défaut (aligné avec règle Meta 7j de BRIEF-06 mais plus court pour security)
3. **Device fingerprint fallback** : si IP change MAIS User-Agent + screen + timezone match → valide quand même
4. **Code 6 chiffres alternatif** : le lien contient aussi un code copy-paste (si le fan ne peut pas ouvrir le lien direct)
5. **Génération auto pour modèle** : au moment où le fan ajoute Snap/IG, le code/lien est **généré automatiquement** → modèle copie en 1 clic (pas besoin de générer manuellement)
6. **Validation check** : badge "⏳ En attente" → "✅ Vérifié" dès que visiteur clique le lien (temps réel via Supabase Realtime)

**Ce qui reste inchangé du flow NB** :
- Envoi MANUEL par modèle (pas automatique par Heaven vers Snap/IG — pas d'API disponible)
- Self-service visiteur côté réception
- Validation uniquement si visiteur clique depuis son vrai compte

## Scope

### NB 2026-04-24 ~20:00 — Clarification dynamic pseudo update live

Règle métier additionnelle NB :

> Quand un visiteur anonyme (`visiteur-XXXX`) ajoute un handle Snap/IG, le pseudo doit être remplacé PARTOUT instantanément :
> - Dans la messagerie (row + thread header)
> - Dans le dropdown header "Clients & Codes"
> - Dans la box conversationnelle du profil visiteur
> - Dans tout rendu qui fait référence à ce client
>
> La **SEULE chose qui attend la validation** = le badge "vérifié ✅" à côté du pseudo.
> Donc :
> - Pseudo change immédiat (ex: `visiteur-73d5` → `@jnoske`)
> - Badge reste ⏳ "en attente" jusqu'à validation admin via le flow IP match
> - Une fois validé, badge passe à ✅ "vérifié"

**Implications techniques** :
- Le pseudo affiché doit être **recalculé dynamiquement** par `getConversationPseudo(client)` — helper unique
- Supabase Realtime subscription sur `agence_clients` pour les vues ouvertes (messagerie, dropdown, drawer fan)
- Event `heaven:client-handle-updated` dispatched quand un handle est modifié → toutes les vues refresh leur pseudo
- Le badge `<VerificationBadge>` reste indépendant (pseudo ≠ verified_status)

#### Volet A — Migration DB (~1h)

1. `TICKET-UV01` Migration 069 : table `agence_client_verifications`
   - Colonnes : id, client_id FK, target_handle, target_platform (snap|insta), token UUID, code_6digit, requested_ip_hash, requested_ua_hash, requested_at, sent_by, sent_via_platform, sent_at, expires_at, validated_at, validated_ip_hash, validated_ua_hash, validation_method (link_click|code_input), status (pending|sent|validated|expired|revoked)
   - Index unique sur token
   - RLS : root + current model
   - Hash IP/UA = SHA256 tronqué /24 subnet pour IP

2. `TICKET-UV02` Migration 070 : extension `agence_clients`
   - `verified_handle TEXT` (le handle validé, distinct de pseudo_snap/pseudo_insta qui peuvent être juste "fournis")
   - `verified_platform TEXT CHECK (snap|insta)`
   - `verified_at TIMESTAMPTZ`
   - `verified_via_verification_id UUID FK agence_client_verifications`
   - Backfill : clients existants avec verified_status='verified' → copier dans verified_handle

3. `TICKET-UV03` Trigger DB : INSERT sur `agence_clients` avec pseudo_snap/pseudo_insta fourni + pas encore validé → auto-INSERT row `agence_client_verifications` status='pending'

#### Volet B — Backend workflow (~2h30)

4. `TICKET-UV04` Service `generateVerification(clientId, handle, platform)` :
   - Génère token UUID + code 6 chiffres + lien complet
   - Hash IP + UA du request
   - INSERT dans `agence_client_verifications`
   - Retourne `{ verification_id, token, code, link, expires_at }`
   - Appelé auto quand handle ajouté OU manuellement depuis admin drawer

5. `TICKET-UV05` Route `POST /api/agence/clients/:id/verification/generate` (admin)
   - Wrapper du service, auth root + model
   - Rate limit 5/jour par client pour éviter spam

6. `TICKET-UV06` Route `POST /api/agence/clients/:id/verification/:vid/mark-sent` (admin)
   - Marque le verification comme `sent` avec timestamp + canal
   - Permet suivi "combien j'en ai envoyés"

7. `TICKET-UV07` Route **PUBLIQUE** `GET /verify/[token]` page (pas juste API)
   - Affiche page publique Heaven branded
   - Input code 6 chiffres (optionnel, auto-validate if token only)
   - Capture IP + UA → compare avec request (loose /24 match)
   - Si match OK → UPDATE `status=validated`, `verified_at=NOW()`, trigger UPDATE `agence_clients.verified_*`
   - Si mismatch → affiche "IP différente détectée, contactez Yumi" + log incident
   - Si expired → message + bouton "Demander nouveau lien"

8. `TICKET-UV08` Route `POST /api/verify/code` (public)
   - Alternative à GET /verify/[token] : fan entre code 6 chiffres manuellement
   - Même logique IP match
   - Utile si le fan copie-colle le code depuis Snap sans cliquer le lien

9. `TICKET-UV09` Helper `hashIpSubnet(ip)` + `hashUserAgent(ua)` + `compareWithLoose(a, b)` dans `src/shared/lib/verification/crypto.ts`
   - Hash utilisé pour éviter stocker IP full (RGPD-friendly)
   - Loose compare = premiers 3 octets IP + UA base (chrome/firefox/safari + major version)

#### Volet C — Frontend unification (~2h)

10. `TICKET-UV10` Refactor `clients-dropdown.tsx` pour utiliser `getConversationPseudo` + `getAvatarStyle` (sync avec BRIEF-02)
    - Le dropdown "Clients & Codes" affiche les mêmes pseudos que la messagerie
    - Badges identiques (plateforme + vérifié)
    - Actions identiques (valider, rejeter, voir conversation)

11. `TICKET-UV11` Composant `<VerificationBadge>` shared
    - États : `⏳ en attente (X jours restants)` / `✅ Vérifié Snap/Insta` / `❌ Rejeté` / `⚠️ Expiré`
    - Utilisé dans ConversationRow + drawer fan + dropdown Clients & Codes + profil public

12. `TICKET-UV12` Drawer fan admin — section "Validation handle"
    - Si handle fourni pas validé → card "En attente validation"
      - Bouton "Générer lien de validation" (auto-génère ou regénère)
      - Affiche lien + code copy-to-clipboard
      - Bouton "Marquer comme envoyé" (change status pending → sent)
      - Note modèle : "Envoie ce lien depuis ton Snap direct au compte [@handle]"
    - Si handle validé → card verte avec détails (quand / via quel canal)
    - Bouton "Révoquer validation" (révoquer si admin suspecte fraude)

13. `TICKET-UV13` Queue admin `/agence/verification-queue` (cf. BRIEF-10 aussi)
    - Tri par : demandes nouvelles, handles fournis non traités, liens envoyés sans validation
    - Compteurs sidebar

#### Volet D — Page publique /verify (~1h30)

14. `TICKET-UV14` Page `/verify/[token]` publique
    - Design cohérent Heaven dark theme
    - States : loading / validating / success / error (expired, IP mismatch, already validated)
    - Auto-redirect `/m/yumi` après succès (fan connecté avec badge vérifié)
    - Pas d'auth requise (token = auth)
    - Analytics events

15. `TICKET-UV15` Composant `<VerificationInput>` reusable sur `/verify/[token]`
    - Input code 6 chiffres (si fan préfère entrer code plutôt que lien direct)
    - Feedback visuel temps réel

#### Volet E — Notifications temps réel (~1h)

16. `TICKET-UV16` Supabase Realtime sur `agence_clients.verified_at`
    - Dès qu'un client est validé → push temps réel vers admin dashboard
    - Badge qui passe de ⏳ à ✅ sans refresh
    - Counter "à valider" qui décrémente

17. `TICKET-UV17` **Dynamic pseudo update live** (ajout 2026-04-24 ~20:00)
    - Supabase Realtime sur `agence_clients.pseudo_snap` / `pseudo_insta` / `pseudo_web`
    - Quand un de ces champs change → event `heaven:client-handle-updated` dispatched
    - Les vues ouvertes (messagerie, dropdown, drawer, profil) re-fetch leurs rows
    - `getConversationPseudo(client)` recalcule le pseudo affiché à partir des nouveaux champs
    - Le badge `<VerificationBadge>` reste indépendant (verification_status pas lié au pseudo)
    - Exemple : visiteur `visiteur-73d5` ajoute pseudo_insta='jnoske' → toutes vues affichent `@jnoske` + badge ⏳ "en attente" → admin valide → badge passe ✅

#### Volet F — Tests + Doc (~1h)

18. `TICKET-UV18` Tests Playwright e2e scénario complet :
    - Visiteur anonyme → envoi message → username visiteur-XXXX visible
    - Visiteur ajoute pseudo_snap → row `agence_client_verifications` créé
    - Admin voit demande → clique "générer lien" → copy lien
    - Admin ouvre nouvel onglet simulant fan Snap → clique lien → validation success
    - Admin dashboard → badge ✅ apparaît, access_level → validated, BRIEF-10 débloque niveau 3

19. `TICKET-UV19` Tests scénarios edge :
    - IP different subnet (mobile → wifi) → rejeté avec message explicite
    - Link expired → message + bouton régénérer
    - Token réutilisé (déjà validé) → idempotent "Tu es déjà vérifié"
    - Brute force codes → rate limit 10/heure par IP

20. `TICKET-UV20` Runbook `plans/PMO/standards/OPS.md` section "Verification flow"
    - Procédure admin pour valider un fan
    - Troubleshooting : "pourquoi le lien ne valide pas ?"
    - FAQ fan (à intégrer à support public)

### OUT

- **Auto-DM Snap/Insta** : Snap n'a pas d'API publique DM, Insta Graph API est limitée (déjà l'agent IA gère inbound). Modèle doit envoyer **manuellement** comme demandé par NB.
- **2FA SMS/email** : overkill pour contexte, ajoute friction
- **Biométrie** : pas utile sur fans anonymes
- **Validation API officielle Insta/Snap** (OAuth) : Snap pas d'OAuth public, Insta OAuth = lourd pour un simple verify

### Questions à NB (8 décisions)

- [ ] **IP match strict ou loose ?** (reco CDP : loose /24 avec option strict par client si admin suspect)
- [ ] **Code 6 chiffres en plus du lien ?** (reco : oui, fallback utile)
- [ ] **TTL lien** : 72h proposé. OK ou autre ?
- [ ] **Device fingerprint fallback** si IP change : activé par défaut ?
- [ ] **Génération auto** row verification quand handle ajouté, OU manuel par admin ?
- [ ] **Rate limit** génération par client : 5/jour proposé OK ?
- [ ] **Révocation manuelle** : admin doit pouvoir désactiver une validation ? (suspect fraude)
- [ ] **Page /verify design** : plain (juste message) OU branded Heaven (logo, style) ?

## Branches concernées

- ☒ **DB** — 2 migrations + trigger auto-create + RLS
- ☒ **BE** — service generate + 4 routes + helper crypto IP/UA
- ☒ **FE** — refactor dropdown unifié + VerificationBadge shared + drawer admin + queue + page publique /verify
- ☒ **QA** — tests e2e + tests edge cases IP/TTL/rate-limit
- ☒ **Doc** — runbook OPS + update BRIEF-06/10 avec liens vers ce workflow
- ☒ **DevOps** — monitoring verification success rate dans BRIEF-11 dashboard
- ☐ AI / Legal — indirect

**Total effort** : ~9h CDP + sous-agents, étape par étape.

## Dépendances

### Amont (prérequis)
- ✅ DB `agence_clients` unique
- ✅ Table `agence_codes` (distincte de nouvelle `agence_client_verifications`)
- 🟠 BRIEF-02 Messenger UI Standards livré (pour `getConversationPseudo` shared)
- 🟠 BRIEF-06 Cycle de vie visiteurs livré (stage `pending_verification` + lifecycle columns)

### Aval (BRIEF-13 débloque)
- **BRIEF-10 Age Gate + Access Hiérarchisé** : `access_level=validated` = conséquence directe d'une verification réussie
- **BRIEF-08 Persona niveau 3 explicite** : déclenché par access_level=validated
- **BRIEF-09 extraction insights full** : consent RGPD complet une fois vérifié

### Parallélisme
- Peut tourner en parallèle de BRIEF-11 (usage meters) et BRIEF-12 (multilingue)
- Synergique avec BRIEF-02 (UI refactor composants shared)

## Acceptance criteria

- [ ] Dropdown "Clients & Codes" affiche MÊMES pseudos que messagerie (`visiteur-XXXX` / `@handle`)
- [ ] Badge `<VerificationBadge>` identique partout (dropdown / messagerie / profil / drawer)
- [ ] Visiteur ajoute pseudo_snap → row verification auto-créée, visible dans queue admin
- [ ] Admin clique "Générer lien" → lien + code générés, copy-clipboard fonctionnel
- [ ] Fan clique lien depuis IP du moment de la demande → validation instantanée
- [ ] Fan clique lien depuis IP différente (hors subnet) → message "IP différente" + log
- [ ] Fan réutilise lien → idempotent "Déjà vérifié"
- [ ] Lien expiré → bouton "Demander nouveau"
- [ ] Realtime admin → badge passe ⏳ → ✅ sans refresh
- [ ] Agent IA niveau 3 explicite activé uniquement si access_level=validated (BRIEF-10 match)
- [ ] Tests Playwright e2e complets passent
- [ ] Runbook OPS documenté

## Notes CDP

### Avantage architecture choisie

L'unification `agence_clients` + `agence_client_verifications` permet :
- Une vue unique admin (dropdown + messagerie = même source)
- Un seul système de badges
- Historique complet des tentatives de verification par client (multiple handles possibles, un validé)
- RGPD-friendly (IP/UA hashés, pas de donnée brute)

### Risque #1 — Modèle oublie d'envoyer le lien
**Mitigation** : compteur sidebar "X handles fournis sans lien envoyé" + notification Telegram rappel après 24h

### Risque #2 — Fan clique lien mais erreur IP
**Mitigation UX** : message clair + bouton "demander nouveau lien" + CTA "contacter Yumi pour problème"

### Risque #3 — Brute force codes 6 chiffres
**Mitigation** : rate limit 10 tentatives/heure par IP, lockout 24h après 20 tentatives sur même token

### Risque #4 — Validation lien share entre amis
**Mitigation** : c'est exactement ce que l'IP match empêche. Si deux personnes sur le même wifi → accepté (compromise, acceptable — c'est rare et OK)

### Skills Claude Code préférentiels

- UV01-UV03 : Supabase MCP + `general-purpose`
- UV04-UV09 : `senior-backend` + `vercel:vercel-functions`
- UV10-UV13 : `senior-frontend` + `vercel:shadcn` + `design:design-system`
- UV14-UV15 : `senior-frontend` + `design:ux-copy`
- UV16 : `vercel:ai-sdk` (realtime patterns)
- UV17-UV19 : `engineering:testing-strategy` + `operations:runbook`
