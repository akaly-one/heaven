# Spec — Refactor Navigation Cockpit Yumi

> Sous-doc de `ROADMAP-MISE-A-NIVEAU-AVRIL-2026.md` Module A
> **Statut** : spec, en attente décision NB (D-1, D-2, D-3)
> Pas de code avant GO

---

## 1 — Problème

État actuel du CP Yumi (`/agence/*`) :

| Point d'entrée UI | URL réelle | Type | Commentaire |
|---|---|---|---|
| Sidebar « Dashboard » | `/agence` | page | OK |
| Sidebar « Messagerie » | `/agence/messagerie` | page | OK |
| Sidebar « Instagram » | `/agence/instagram` | page | OK |
| Sidebar **« Contacts »** | `/agence?tab=clients` | **tab interne** | ambigu (« Contacts » ≠ « Clients ») |
| Sidebar **« Contenu »** | `/agence?tab=contenu` | **tab interne** | URL ne change pas |
| Sidebar **« Stratégie »** | `/agence?tab=strategie` | **tab interne** | URL ne change pas |
| Dashboard header tab « Dashboard » | `/agence` (state) | **tab header** | redondance sidebar |
| Dashboard header tab « Contenu » | `/agence?tab=contenu` | **tab header** | idem sidebar |
| Dashboard header tab « Clients » | `/agence?tab=clients` | **tab header** | idem sidebar |
| Dashboard header tab « Stratégie » | `/agence?tab=strategie` | **tab header** | idem sidebar |

**Conséquences** :
- 6 items sidebar dont 3 sont des tabs interne → user pense naviguer différemment
- Click « Messagerie » change URL, click « Contenu » garde `/agence` → incohérence invisible
- Naming « Contacts » (sidebar) vs « Clients » (tab header) = 2 mots pour la même chose
- `/agence/page.tsx` reste à 2 453 lignes (monolithe)

---

## 2 — Options de refonte

### Option 1 — Sidebar 1:1 avec pages (recommandé)

```
URL                      | Source fichier                          | Sidebar label
─────────────────────────┼─────────────────────────────────────────┼──────────────
/agence                  | src/app/agence/page.tsx (home)          | Dashboard
/agence/messagerie       | src/app/agence/messagerie/page.tsx      | Messagerie
/agence/instagram        | src/app/agence/instagram/page.tsx       | Instagram
/agence/contenu          | src/app/agence/contenu/page.tsx (NEW)   | Contenu
/agence/clients          | src/app/agence/clients/page.tsx (REBUILD)| Clients
/agence/strategie        | src/app/agence/strategie/page.tsx (NEW) | Stratégie

Admin only :
/agence/finances, /agence/ops, /agence/automation,
/agence/architecture, /agence/settings
```

**Changements** :
- Retirer les 4 tabs en haut du Dashboard
- Dashboard `/agence` devient une vraie home : widget IG + KPIs row + recent activity
- Tabs de `/agence/page.tsx` → extraits en 3 nouveaux fichiers `.tsx` (contenu / clients / strategie)
- Sidebar items = 6 (+ 5 admin) → 1 click = 1 URL = 1 destination
- Backcompat : middleware redirect `/agence?tab=contenu` → `/agence/contenu` (+ idem pour clients, strategie)
- Naming unifié : sidebar = « Clients » (pas Contacts) pour matcher la page + header

**Bénéfices** :
- 1 click = 1 URL unique, bookmarkable
- Mobile meilleur (pas de state ambigu)
- Route-based code splitting Next.js → perf +
- Permet enfin de fragmenter `agence/page.tsx` (2 453L → ~300L shell + 4 composants)
- Préserve la compat avec liens externes (`?tab=X`)

**Coût** : ~3-4h code + tests

---

### Option 2 — Tabs only, sidebar réduite

```
Sidebar (4 items) :
  - Dashboard (= /agence)
  - Messagerie (= /agence/messagerie)
  - Instagram (= /agence/instagram)
  - Admin ▸ (submenu Finances, Ops, Auto, Archi, Settings)

Dashboard tabs (dans /agence) :
  - Home (KPIs + widget IG)
  - Contenu
  - Clients
  - Stratégie
  - Packs
```

**Changements** :
- Supprimer items sidebar « Contacts », « Contenu », « Stratégie »
- Renommer tab « Dashboard » → « Home » pour éviter ambiguïté
- Accès rapide aux 4 sections via les tabs du Dashboard uniquement

**Bénéfices** :
- Moins de navigation globale, plus focus Dashboard
- Refactor plus léger (pas de nouvelles pages à créer)
- Sidebar plus « propre » (moins d'items)

**Inconvénients** :
- Tabs cachent les sous-sections (moins discoverable)
- Pas de bookmark possible sur « Contenu » / « Clients »
- `agence/page.tsx` reste monolithique

**Coût** : ~1-2h

---

### Option 3 — Cleanup minimal de l'existant

**Changements** :
- Renommer sidebar « Contacts » → « Clients » (aligner avec tab header)
- Sidebar étendue par défaut (labels visibles)
- Visuel : séparer dans la sidebar les items « pages dédiées » (top) des items « tabs Dashboard » (bottom)
- Aucune migration URL, aucune création de page

**Bénéfices** :
- Zéro risque de régression
- Moins d'1h de travail

**Inconvénients** :
- Garde la double nav sous-optimale
- Pas de gain structure code (`agence/page.tsx` reste 2 453L)
- Règle les naming mais pas l'architecture

**Coût** : ~45 min

---

## 3 — Renaming racine `/agence` (D-2)

Choix entre :
- **Garder `/agence`** : pas de changement, preserve URL existantes
- **`/cockpit`** : cohérent avec mental model « cockpit modèle »
- **`/studio`** : cohérent avec branche SQWENSY Studio — mais confusion possible
- **`/yumi`** : personnel, mais casse le pattern multi-modèles futur Ruby/Paloma

Recommandation : **garder `/agence`** pour minimiser risque. Si renaming souhaité, appliquer via middleware rewrite (pas de refactor massif des fichiers).

---

## 4 — Sidebar labels visibles (D-3)

Actuellement : `collapsed=true` par défaut dans `sidebar.tsx` L66.

Options :
- **Collapsed default (actuel)** — icône only, hover expand
- **Expanded default** — icônes + labels dès le rendu
- **Toggle persistant** — état stocké en `localStorage`, user choisit

Recommandation : **Toggle persistant** avec default **expanded** pour première visite (meilleure discoverability) puis mémorisation du choix.

---

## 5 — Décision à prendre par NB

| Clé | Choix | Défaut recommandé |
|-----|-------|--------------------|
| D-1 | Option navigation | Option 1 |
| D-2 | Racine URL | Garder `/agence` (pas de renaming) |
| D-3 | Sidebar par défaut | Expanded + toggle persistant |

Quand NB valide ces 3 points, dispatch Module A de la roadmap principale.
