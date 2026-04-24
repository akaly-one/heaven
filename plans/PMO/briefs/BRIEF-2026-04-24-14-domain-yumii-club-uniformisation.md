# BRIEF-2026-04-24-14 — Domaine yumii.club + uniformisation références Yumi + sync extension Chrome

> **Status** : 🟠 cadré (en attente GO NB sur plan phasing)
> **Source** : NB message du 2026-04-24 ~22:00 ("j'acheté le nom de domaine yumii.club aussi, donc faudra uniformiser tout les endroit en front end ou c'est ecris Yumiiiclub ou Yumiclub et maintenant syncro toi avec l'extension claude chrome pour tu travaile en syncro")
> **Type** : feature infra + refactor + sync tooling
> **Priorité** : P1

---

## Demande NB

1. **Nouveau domaine acheté** : `yumii.club` (TLD `.club`, 2 `i`)
2. **Uniformiser** les références front-end qui confondent les 3 identifiants proches :
   - `yumii.club` → **domaine web racine** (nouveau)
   - `yumiiiclub` → **Instagram handle** `@yumiiiclub` (3 `i`)
   - `yumiclub` → **Fanvue handle** `yumiclub` (1 `i`)
3. **Synchronisation avec l'extension Claude Chrome** pour travailler en collaboration live (NB envoie rapports debug en temps réel, CDP et agents consomment)

## Compréhension CDP

### 3 identifiants distincts — matrice mémotechnique

| Identifiant | Usage | Format | URL canonique |
|---|---|---|---|
| **`yumii.club`** | Domaine web Heaven (à configurer Vercel) | `yumii.club` / `www.yumii.club` / `https://yumii.club/m/yumi` | Nouveau, à mapper Vercel |
| **`yumiiiclub`** | Instagram handle | `@yumiiiclub` | `https://instagram.com/yumiiiclub` |
| **`yumiclub`** | Fanvue handle | `yumiclub` | `https://www.fanvue.com/yumiclub` |

**Risque** : confusion = URL mortes ou pointage client vers le mauvais endroit. **Il faut une source unique** (constant file) qui expose les 3 identifiants distinctement.

### Action infra Vercel (NB)

Avant migration front-end complète, NB doit :
1. Acheter domaine `yumii.club` (✅ fait)
2. Ajouter dans Vercel Dashboard → Project `heaven-os` → Settings → Domains :
   - `yumii.club` (apex)
   - `www.yumii.club` (redirect apex)
3. Configurer DNS chez le registrar : A records ou CNAME vers Vercel (Vercel fournit les valeurs exactes)
4. Vérification auto SSL (Vercel Let's Encrypt)
5. **Option** : garder `heaven-os.vercel.app` en fallback ou rediriger tout vers `yumii.club`

### Extension Chrome — workflow nouveau

NB a une extension Chrome Claude (probablement Claude in Chrome MCP ou similaire) qui lui permet de :
- Inspecter pages live Heaven en prod
- Extraire rapports debug structurés (console errors, network, DOM, a11y, etc.)
- Me les envoyer directement comme context

**Observations aujourd'hui** (24 avril session) :
- Rapport 1 : `/m/yumi` → 4 bugs identifiés (hydration #418, /api/clients/visit 502, tabs a11y, icônes triplés)
- Rapport 2 : `/agence/messagerie` → 10 bugs identifiés (hydration #418, polling excessif, POST 400, badge platform, viewport, etc.)

Ces rapports = **DEBUG v2 Couche B + C combinés** (ce que Charte §1.4.bis exige). Plus efficace que les preview MCP (qui plantent cwd).

### Sync formel CDP ↔ Chrome extension

Proposition (à valider NB) :
- **Input CDP** : NB envoie rapports Chrome comme messages structurés
- **Traitement CDP** : chaque rapport = série de bugs → mapping priorité → dispatch CORRECTIF
- **Output CDP** : chaque CORRECTIF commit référence le rapport Chrome source
- **Cadence** : NB peut envoyer rapport à la demande ou après chaque Phase

## Scope

### IN

#### Volet A — Constants file source unique (~30 min)

1. `TICKET-DM01` : créer `src/shared/lib/branding/yumi-platforms.ts`
   ```typescript
   // Source unique — ne PAS dupliquer ces valeurs ailleurs
   export const YUMI = {
     heavenDomain: "yumii.club",
     heavenUrl: "https://yumii.club",
     heavenProfilePath: "/m/yumi",
     heavenProfileUrl: "https://yumii.club/m/yumi",
     
     instagramHandle: "yumiiiclub",
     instagramUrl: "https://instagram.com/yumiiiclub",
     
     snapHandle: "yumiiclub",
     snapUrl: "https://snapchat.com/add/yumiiclub",
     
     fanvueHandle: "yumiclub",
     fanvueUrl: "https://www.fanvue.com/yumiclub",
     
     // Ancien fallback (à déprécier progressivement)
     legacyVercelUrl: "https://heaven-os.vercel.app",
   } as const;
   
   // Type guards
   export type YumiPlatform = keyof typeof YUMI;
   ```

2. Export aussi des helpers :
   ```typescript
   export function getHeavenProfileUrl(): string { return YUMI.heavenProfileUrl; }
   export function getFanvueUrl(): string { return YUMI.fanvueUrl; }
   // etc.
   ```

#### Volet B — Audit + refactor consommateurs (~2h)

3. `TICKET-DM02` : grep exhaustif des occurrences :
   ```bash
   grep -rn "yumiiiclub\|yumiclub\|yumiiclub\|heaven-os.vercel.app\|fanvue.com/yumi" src/ plans/ docs/
   ```
4. Classifier chaque occurrence :
   - `@yumiiiclub` ou `instagram.com/yumiiiclub` → `YUMI.instagramUrl`
   - `yumiiclub` ou `snapchat.com/add/yumiiclub` → `YUMI.snapUrl`
   - `yumiclub` ou `fanvue.com/yumiclub` → `YUMI.fanvueUrl`
   - `heaven-os.vercel.app` → `YUMI.heavenUrl` (ou garder pour fallback legacy)
5. Remplacer par import `YUMI` dans les fichiers code (pas plans/ qui sont des docs)
6. Fichiers probables à refactor :
   - Persona Yumi v2 DB (agent_personas) — mettre à jour le prompt si contient les URLs hardcodées
   - `/m/[slug]/page.tsx` (liens Follow/DM/Fanvue)
   - Header / Profile cards
   - Privacy + Terms + Data deletion (mentions plateformes)
   - Constants de redirect (age-gate, verification flow)

#### Volet C — Configuration Vercel custom domain (~15 min, action NB)

7. `TICKET-DM03` : ajout `yumii.club` dans Vercel Dashboard (NB action manuelle)
8. DNS check + SSL auto-renew
9. Redirect 301 de `heaven-os.vercel.app` → `yumii.club` (optionnel, si NB veut forcer migration)

#### Volet D — Meta App Review update (~15 min)

10. `TICKET-DM04` : si Meta App Review est soumise avec `heaven-os.vercel.app` comme domaine webhook, updater avec nouveau domaine. Sinon, soumission initiale avec `yumii.club` directement.
11. Update `plans/operations/SPEC-meta-app-review-v1.2026-04-21.md` avec nouveau domaine

#### Volet E — Protocole sync Chrome extension (~30 min)

12. `TICKET-DM05` : documenter dans `plans/PMO/01-INTAKE-PROTOCOL.md` une nouvelle section "Rapports Chrome extension"
    - Format attendu : bugs P0/P1/P2 structurés
    - Flow CDP : réception → consolidation → dispatch CORRECTIF
    - Référence : les 2 rapports du 2026-04-24 (profil + messagerie) comme exemples

### OUT

- **Refactor plans/docs** (c'est des historiques, les URLs dedans ne sont pas fonctionnelles)
- **Migration totale** vers yumii.club si Vercel deploy warning (rollback facile)
- **Email yumii.club** (setup Zoho/Gmail hors scope — futur brief si besoin)
- **Subdomains** (api.yumii.club, admin.yumii.club) — V2 si volume justifie

## Branches concernées

- ☒ **Doc** — constants file + audit + update specs Meta + intake protocole Chrome
- ☒ **FE** — refactor tous les composants qui hardcodent les URLs
- ☒ **BE** — persona DB prompt + routes (ex: decline redirect IG vérifier)
- ☒ **DevOps** — Vercel domains config (action NB manuelle)
- ☐ DB / AI / Legal / QA — indirect

## Dépendances

### Amont
- ✅ Persona Yumi v2 livré (Phase 1) — contient déjà les URLs correctes grâce au brief BRIEF-08
- ✅ Privacy page livrée (Phase 1) — à auditer pour les mentions éventuelles

### Aval
- Débloque migration Heaven vers domaine propre
- Prérequis Meta App Review finale (si submission inclut le domaine)

## Questions à NB

- [ ] Garder `heaven-os.vercel.app` en fallback OU rediriger 301 vers `yumii.club` ?
- [ ] Sous-domaines futurs prévus (`admin.yumii.club`, `api.yumii.club`) ?
- [ ] Email `@yumii.club` à configurer maintenant ou plus tard ?
- [ ] Rapports Chrome extension : cadence fixe (après chaque phase) OU à la demande ?
- [ ] Tu veux un CHANGELOG public sur yumii.club pour communiquer les mises à jour aux fans ?

## Acceptance criteria

- [ ] `src/shared/lib/branding/yumi-platforms.ts` créé avec 4 handles distincts + helpers
- [ ] Grep `yumiiiclub|yumiiclub|yumiclub` dans src/ → 0 occurrences hardcodées (tout via `YUMI.*`)
- [ ] Vercel domain `yumii.club` configuré + SSL OK
- [ ] Navigation sur `https://yumii.club/m/yumi` fonctionnelle
- [ ] Agent IA Yumi mentionne correctement chaque plateforme selon contexte (pas de confusion)
- [ ] Privacy + Terms mentionnent `yumii.club` comme domaine officiel
- [ ] Protocole Chrome extension documenté dans PMO

## Notes CDP

### Risque — migration DNS
Changer DNS peut couper service 5-15 min le temps de propagation. Timing à choisir (hors heure de pic). Vercel fait le SSL auto.

### Sécurité — sous-domaines
Si on ajoute `api.yumii.club` plus tard, attention au middleware d'auth qui doit reconnaître le nouveau host. La Deployment Protection actuelle est spécifique à `heaven-os.vercel.app` — vérifier comportement sur custom domain.

### Cohérence persona IA
Le persona Yumi v2 (prompt en DB) dit déjà `heaven-os.vercel.app/m/yumi`. À updater en `yumii.club/m/yumi` via migration persona v3 quand ce brief exécuté.

## Ordonnancement

Phase A (30 min) : constants file DM01 (pas bloquant par Vercel config)
Phase B (2h) : audit + refactor consommateurs DM02 (parallélisable par couche FE/BE)
Phase C (15 min, NB) : Vercel config DM03
Phase D (15 min) : update Meta App Review SPEC DM04
Phase E (30 min) : protocole Chrome DM05

Total : ~3h CDP + 15 min NB action manuelle.
