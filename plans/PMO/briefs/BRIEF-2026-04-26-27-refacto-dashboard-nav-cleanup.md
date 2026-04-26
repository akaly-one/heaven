# BRIEF-2026-04-26-27 — Refacto Dashboard CP + nettoyage liens nav

> **Date** : 2026-04-26
> **Émetteur** : NB
> **Type** : refactor archi + cleanup navigation
> **Priorité** : P0 (cohérence Profile-as-Hub V1)
> **Layer** : FE + Middleware
> **Statut** : 🟢 livré (commits `a9423c3` v1.6.13 + `a2bf03d` v1.6.14 + `25a9995` v1.6.15)

---

## Contexte

Suite aux nombreux fixes UX itératifs (BRIEF-26), NB a fait deux demandes
structurelles majeures :

### Demande 1 — Refacto Dashboard
> "ensuite en dash la messagerie doit etre uniquemetn le widget qui resume les
> discution quand on apuis sur le bouton messages dans le header car en mobile
> faut pas de box comme en pc, et a cote aussi le widget client et codes...
> de base le dash doit afficher les kpis et les dernier stats et infos recolté
> par l'agent ia"

> "ta compris que le feed doit plus etre en cp car on la unifier en profil, et
> que l'onglet messagerie je te demandé un widget qui resumé les types de
> clients et demandé classé par tag"

**Interprétation** : Le dashboard CP doit être une vue stratégique pure (KPIs +
classification tag + récap agent IA). Plus de feed/composer (doublon Profile-as-Hub).
Plus de tab Messagerie (accessible via dropdown header chat icon).

### Demande 2 — Cleanup liens nav
> "etudie les boutons cassé en nav et netoie"

**Interprétation** : Audit + fix systématique des liens orphelins pointant vers
des tabs supprimés (clients/contenu/messagerie).

---

## Commits livrés

### v1.6.13 (`a9423c3`) — Dashboard tab remis en default

- TABS étendu à `[dashboard, messagerie, strategie]` (dashboard en premier)
- activeTab default = "dashboard"
- HomePanel mount sur dashboard tab

(Évolué dans v1.6.14 — voir ci-dessous)

### v1.6.14 (`a2bf03d`) — DashboardOverview = KPIs + widget tag + agent IA

Nouveau composant `DashboardOverview` (remplace HomePanel) :

1. **5 KPIs cards grand format** :
   - 💰 Revenu (or)
   - 👥 Clients (bleu)
   - ⚡ Codes actifs (vert)
   - 📈 Posts (violet)
   - 📈 Rétention (rouge)

2. **Widget "Clients par tag"** :
   - Aggregation `clients.tag` avec count + total spent + bar progress
   - Tags : VIP / Hot lead / Récurrent / À relancer / Custom / Nouveau / Sans tag
   - Classification heuristique fallback si client.tag vide :
     - spent ≥ 200€ → vip
     - spent ≥ 50€ → recurring
     - spent > 0 → hot
     - sinon → cold (à relancer)

3. **BotActivityPanel** (récap activité agent IA + conversions, déjà existant)

**Plus de composer/feed/timeline** dans le CP (doublon avec /m/[slug] admin overlay
BRIEF-22+23).

**Tab "Messagerie" retiré du CP** (TABS = `[dashboard, strategie]` uniquement).
La liste full conversations reste accessible via dropdown header chat icon.

HomePanel + MessagerieEmbedded conservés non-mountés (rollback rapide possible).

### v1.6.15 (`25a9995`) — Nettoyage liens nav cassés

Audit + fix systématique des liens orphelins :

- `agence/contenu/page.tsx` : redirect `/agence` (au lieu de `?tab=contenu` disparu)
- `middleware.ts` : whitelist tabs étendue (clients/contenu/messagerie/strategie) avec
  routes cibles correctes pour chaque
- `sidebar.tsx` NAV_MAIN : item "Contenu" retiré (5 items au lieu de 6)
- `agence/clients/[fanId]/page.tsx` ×3 : `?tab=clients` → `/agence/messagerie?view=contacts`
- `clients-dropdown.tsx` + `codes-list.tsx` : idem

Aucun lien `/agence?tab=clients` ou `/agence/contenu` orphelin restant dans src/.

---

## DoD ✅

- [x] DashboardOverview composant créé (KPIs + widget tag + BotActivity)
- [x] Tab Dashboard default
- [x] Tab Messagerie retiré du CP
- [x] Composer/feed retiré du dashboard (doublon profil)
- [x] Classification clients par tag avec heuristique fallback
- [x] Lien `agence/contenu` redirige proprement
- [x] Middleware backcompat redirects étendus
- [x] Sidebar NAV_MAIN nettoyée
- [x] Tous les liens `?tab=clients` corrigés
- [x] tsc --noEmit exit 0 sur les 3 commits
- [x] Build prod Vercel OK

---

## Routes flow propre post-cleanup

| Route entrante | Comportement |
|---|---|
| `/agence` | Dashboard (KPIs + tags + agent IA) |
| `/agence/messagerie` | Liste full conversations |
| `/agence/messagerie?view=contacts` | Vue contacts (alias clients) |
| `/agence/strategie` | 3 plans A/B/C |
| `/agence/instagram`, `/agence/settings`, `/agence/ops` | Routes dédiées |
| `/agence/contenu` | redirect `/agence` (Profile-as-Hub fusion) |
| `/agence?tab=clients` | middleware → `/agence/messagerie?view=contacts` |
| `/agence?tab=contenu` | middleware → `/agence` |
| `/agence?tab=messagerie` | middleware → `/agence/messagerie` |
| `/agence?tab=strategie` | middleware → `/agence/strategie` |

---

## Méthodologie protocole §1.4

Pour les 3 commits :
1. INTAKE feedback NB
2. CADRAGE objectif
3. AUDIT (grep liens cassés)
4. PLAN ordonné
5. EXEC (sed + Edit chirurgicaux)
6. DEBUG (tsc 0)
7. DOC SYNC (CHANGELOG retroactif rattrapé v1.6.16)
8. DEPLOY (commit + push)
9. VERIFY (preview screenshots)
10. ARCHIVE

## Références

- `src/cp/components/cockpit/dashboard/dashboard-overview.tsx` (NOUVEAU)
- `src/app/agence/page.tsx` (TABS + activeTab default + mount DashboardOverview)
- `src/middleware.ts` (whitelist redirects étendue)
- `src/shared/components/sidebar.tsx` (NAV_MAIN -1 item)
- `src/app/agence/contenu/page.tsx` (redirect simplifié)
- `src/app/agence/clients/[fanId]/page.tsx` (×3 liens fix)
- `src/shared/components/header/clients-dropdown.tsx` (1 lien fix)
- `src/cp/components/cockpit/codes-list.tsx` (1 lien fix)
