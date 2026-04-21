# Plan — Publication App Meta Yumi-AI

> Sous-doc de `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` Module G
> **Statut** : actions en attente NB (Business Verif + Meta dashboard)

---

## 1 — Objectif final

Passer l'app Meta `Yumi-AI` (App ID `981952864691167`) du **Development Mode** au **Live Mode** avec permissions Instagram :
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_messaging`
- `pages_read_engagement` (déjà approuvé probablement)

Une fois Live, les DMs des fans publics de `@yumiiiclub` arrivent sur le webhook Heaven → worker → agent IA → reply. Le feed Instagram continue de se syncer via Graph API (déjà OK).

---

## 2 — Décision architecture (D-4)

### Option A — App restée chez Yumi (actuel)
- Business Manager ID `445891253938700` (à confirmer nom)
- Docs Business Verification = persona Yumi
- Simple mais non-scalable

### Option B — App dans Business Manager SQWENSY (recommandé)
- Transfert app → BM SQWENSY (entité BCE NB)
- Business Verification = SQWENSY docs
- Multi-créatrices (Paloma, Ruby futures) hébergées dans la même BM
- Cohérent avec réalité business SQWENSY

**Action NB** :
1. Vérifier le nom du Business Manager `445891253938700` sur https://business.facebook.com/settings/info?business_id=445891253938700
2. Si c'est SQWENSY : option B déjà en place, il reste juste la Verif
3. Si c'est Yumi perso : créer un nouveau BM SQWENSY + transférer l'app

---

## 3 — Business Verification SQWENSY

### Documents requis (BE, indépendant complémentaire)

- **Nom légal** (ton nom / prénom ou dénomination SQWENSY si déposée)
- **Numéro BCE** (10 chiffres depuis https://kbopub.economie.fgov.be)
- **Extrait BCE** récent <3 mois (téléchargeable depuis le Guichet Entreprise)
- **Facture utilitaire** récente <3 mois avec adresse pro : électricité/eau/télécom/bail
- **Numéro TVA** (BE0...) si assujetti
- **Numéro téléphone** pro
- **Site web** officiel : `https://heaven-os.vercel.app`

### Procédure

1. `https://business.facebook.com/settings/security`
2. Security Center → Business Verification → "Start"
3. Upload docs (PDF ou photos nettes)
4. Meta review **3-14 jours** (notifications email)
5. Validation domain : code par lettre physique à ton adresse OU appel téléphone robot
6. Confirmation → status « Verified »

---

## 4 — Artefacts App Review (déjà livrés par Heaven)

| Requis Meta | URL / fichier |
|---|---|
| App Icon 1024×1024 PNG | convertir `public/meta/yumi-ai-icon.svg` en PNG via cloudconvert.com ou Figma |
| Privacy Policy | https://heaven-os.vercel.app/privacy |
| Terms of Service | https://heaven-os.vercel.app/terms |
| Data Deletion URL | https://heaven-os.vercel.app/data-deletion |
| Data Deletion callback | https://heaven-os.vercel.app/api/meta/data-deletion |
| Webhook callback | https://heaven-os.vercel.app/api/instagram/webhook |
| Webhook verify token | `yumiii_webhook_secret_2026` |
| Email contact | `yumiiiclub@gmail.com` |
| Description courte | « AI assistant for creator DMs » |
| Description longue | Voir `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` §Meta publication |
| Category | Entertainment |

**Restant à produire** :
- Conversion icône SVG → PNG 1024×1024
- Screencast vidéo 2-3 min (NB s'enregistre via Loom / OBS / QuickTime)

---

## 5 — Screencast vidéo (guide tournage)

**Durée cible** : 2-3 min.
**Outil** : Loom ou QuickTime (Mac native).

**Scénario** :
1. Intro : « Voici Yumi-AI, assistant DM pour la créatrice Yumi sur Instagram @yumiiiclub » (5 sec)
2. Visite `/m/yumi` profil public : identity gate → tier content (15 sec)
3. Login admin via modal ACCÈS ADMIN (10 sec)
4. Dashboard `/agence` avec widget IG stats : « 5k followers, 20 posts, 0 DMs aujourd'hui » (15 sec)
5. Click « Messagerie » : inbox unifiée web + IG, exemple conversation fan (20 sec)
6. Click « Instagram » dashboard : tabs Posts / Commentaires / Config (20 sec)
7. Config tab : « voici où Yumi gère son agent AI — mode review par défaut, elle valide chaque draft avant envoi » (15 sec)
8. Retour Messagerie + explication : « l'agent IA rédige une réponse en FR/EN/ES selon la langue du fan, Yumi valide puis envoie » (20 sec)
9. Conclusion : « Tous les DMs = users ayant initié contact, consent explicite, 24h window Meta respectée » (10 sec)

**Privacy** : ne jamais montrer vrai prénom / vrais handles dans la vidéo. Utiliser comptes test.

---

## 6 — Permissions à demander + justifications

Dans `https://developers.facebook.com/apps/981952864691167/app-review/permissions/` demander chaque permission avec ce texte :

### instagram_basic
> Allows Yumi-AI to read the basic profile and public media of the Instagram Business Account @yumiiiclub owned by the creator Yumi. Required to display her feed within her private creator platform at heaven-os.vercel.app/m/yumi, giving her subscribers a unified experience across Instagram and her private page.

### instagram_manage_messages
> Allows Yumi-AI to read incoming Instagram DMs sent to @yumiiiclub and send replies on her behalf. Messages are only exchanged with users who have explicitly messaged the creator first (Meta 24h window respected). The AI agent operates in review mode by default — the creator validates each draft before sending. This is a customer support / fan engagement use case for an adult creator business; users can opt out by replying STOP or blocking the account.

### instagram_manage_comments
> Allows Yumi-AI to read and reply to comments on @yumiiiclub's posts from the creator dashboard at heaven-os.vercel.app/agence/instagram. This helps the creator engage with her audience more efficiently.

### pages_messaging
> Required in parallel with instagram_manage_messages as the Instagram Business Account is linked to the Facebook Page « Yumi Club ». We do not intend to send Facebook Page messages — only Instagram DMs via the unified Messenger API.

### pages_read_engagement
> Required to list the Facebook Page linked to the Instagram Business Account in order to identify which IG handle the app is authorized for.

---

## 7 — Timeline estimée

| Étape | Durée |
|---|---|
| Décision D-4 (option A ou B) | 10 min NB |
| Docs Business Verification assemblés | 30 min NB |
| Submit Business Verification | 10 min NB |
| Meta review Business Verif | **3-14 jours** |
| Conversion icône PNG + screencast | 1h NB |
| Submit App Review permissions | 30 min NB |
| Meta review App Review | **2-4 semaines** |
| **Total go-live** | **~3-5 semaines** |

---

## 8 — Après approval : checklist go-live

Quand Meta valide les permissions et que l'app passe en Live mode :

- Vérifier que les DMs des fans publics arrivent bien sur webhook → DB `instagram_messages`
- Activer `INSTAGRAM_AGENT_ENABLED=true` (déjà actif en env Vercel)
- Basculer worker en `auto` ou garder `review` selon confort NB
- Monitor `/agence/ops` : webhook latency, Meta API quota, queue depth
- Setup cron externe (QStash / GitHub Actions) pour `process-ig-replies` toutes les 1-5 min
- Stress test sur 1 pub test Instagram (post avec mention → attendre DMs)

---

## 9 — Risques & mitigation

| Risque | Probabilité | Mitigation |
|---|---|---|
| Meta refuse Business Verif (docs incomplets) | Moyen | Préparer docs complets dès 1er submit, refaire avec corrections |
| Meta refuse App Review (usage jugé ambigu) | Moyen | Vidéo screencast claire + description honest, tenue professionnelle |
| Compte @yumiiiclub suspendu | Faible | Backup : préparer compte secondaire si déjà 5k followers |
| Token permanent révoqué | Faible | Endpoint exchange-token prêt pour re-génération si besoin |
| Rate limit Meta saturé en pic pub | Moyen | Queue worker + throttle 180 calls/h déjà en place |
| Cas 24h window refusé sur welcome DM | **Certain** | Welcome message se déclenche UNIQUEMENT à réception 1er DM fan (déjà coded) |

---

## 10 — Questions ouvertes NB

1. **D-4** : App liée au BM `445891253938700` — confirmer si c'est SQWENSY ou perso
2. Test accounts Meta : ajouter quel compte IG perso pour les tests Dev Mode ? Yumi elle-même ? Toi NB ?
3. Screencast : préférence Loom, QuickTime, ou autre outil ?
4. Si Business Verif pas possible immédiatement (ex: BCE à jour manque) : repousser de combien de temps ? Plan B = tester en Dev Mode sur comptes testers uniquement.
