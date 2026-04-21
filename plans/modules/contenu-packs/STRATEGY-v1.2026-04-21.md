# Contenu + Packs — Stratégie v1 (2026-04-21)

> Module de gestion du contenu (photos, vidéos, stories) et packs PPV.
> Route cible : `/agence/contenu` (à reconstruire — a été supprimée le 10/04/2026, commit `9e93428`).

---

## 1. Contexte

Heaven gère trois types de contenu :

- **Contenu média** : photos / vidéos uploadées par le modèle sur Cloudinary
- **Stories** : uploads TTL 24h avec viewer fullscreen
- **Packs PPV** : bundles de contenu avec prix + tier d'accès

Historique important :
- ✅ **07/04/2026** (commit `6078376`) : **drag & drop fonctionnel** ajouté pour drag entre tiers (P0→P5) en 3 vues (Dossiers, Colonnes, Liste)
- ✅ **08/04/2026** (commit `ae5c7f3`) : **glow mobile touch-pick** pour drag mobile
- ❌ **10/04/2026** (commit `9e93428`) : **page `/agence/contenu` supprimée** (fichier `src/app/agence/contenu/page.tsx` effacé, soi-disant « merged into dashboard Contenu tab ») → le drag & drop a été **perdu dans le merge**
- 🟡 Actuellement : un tab `?tab=contenu` existe dans `/agence/page.tsx` (monolithe 2 537L), mais **drop&drag cassé/absent**

Le brief NB B8 demande de **restaurer cette fonctionnalité** et de la stabiliser.

---

## 2. Briefs NB — ce qui change (B8)

### 2.1. Garder l'affichage packs actuel

L'éditeur de packs existant (`packs-editor.tsx`, `pack-configurator.tsx`) est fonctionnel — à **conserver tel quel**. On ne touche pas à la présentation des packs individuels.

### 2.2. Restaurer drag & drop

**Priorité #1** : le drag & drop doit revenir.

Besoin fonctionnel :

- Un modèle ou admin peut **glisser** un media d'un tier à l'autre (P0 → P1 → P2 … P4)
- **3 vues** disponibles : Dossiers, Colonnes (kanban), Liste
- Desktop : drag HTML5 natif
- Mobile : touch-pick avec glow effect + placeholder tier cible

Source technique à exhumer : commits `e12b23d` (drag & drop real CP) + `977f6ba` (Kanban columns) + `ae5c7f3` (mobile touch) — visibles via :
```
git log --all --oneline --grep="drag\|kanban\|touch"
```
Fichier à restaurer et adapter : `src/app/agence/contenu/page.tsx` (deleted) — reprendre le shell + logique DnD + l'intégrer à la nouvelle route dédiée (Option 1 navigation, D-1).

### 2.3. Règles affinables par pack

Chaque pack a des règles configurables :

| Règle | Valeurs | Effet |
|---|---|---|
| `upload_tier` | p0..p4 | Tier par défaut des uploads dans ce pack |
| `visibility_rule` | `always_public` / `if_purchased` / `preview_blur` | Gouverne l'affichage feed |
| `blur_intensity` | 0-100 | Niveau de flou si non-accès |
| `preview_count` | int | Nb d'items teaser visibles avant paywall |
| `tier_locked` | bool | Empêche drag&drop hors du pack |
| `price_eur` | decimal | Prix unitaire Fanvue |
| `active` | bool | Pack visible sur `/m/<slug>` |

Ces règles sont portées par `agence_packs` (table existante), à étendre avec les colonnes manquantes.

### 2.4. Upload Cloudinary direct

- Drop d'un fichier dans une zone tier → upload direct Cloudinary (URL signée server-side)
- Enregistrement dans `agence_uploads` + `agence_feed_items` (source_type=manual)
- Flow : `POST /api/upload` → URL signée → POST fichier → callback Cloudinary → INSERT DB
- Déjà existant — réutilisation full

### 2.5. Sync feed selon règles

**Règle produit clé** : le **feed public `/m/<slug>` respecte automatiquement les règles de visibilité pack**.

```
Pour chaque item du feed :
├── item.source_type = "instagram"  → toujours public (IG = public par nature)
├── item.source_type = "manual" :
│   ├── pack.visibility_rule = "always_public"   → affiché net
│   ├── pack.visibility_rule = "if_purchased" :
│   │   ├── fan a payé le pack  → affiché net
│   │   └── fan n'a pas payé    → hidden (sauf preview_count items)
│   └── pack.visibility_rule = "preview_blur"    → affiché flouté (blur_intensity)
└── item.source_type = "wall"       → selon tier du posteur
```

Règle de base :
- **Public** (P0) → toujours affiché
- **Client a payé pack** → contenu débloqué (même en feed)
- **Client sans accès** → contenu flouté OU « no access » (bouton unlock)

### 2.6. Kanban vue — colonnes par pack

Déjà réalisé dans commit `3654a10` (« kanban layout for contenu page — columns per pack »). À restaurer : chaque colonne = un tier/pack, drag entre colonnes pour reclasser les médias.

---

## 3. Parcours utilisateur modèle

### 3.1. Ajout d'un contenu

```
1. Ouvrir /agence/contenu
2. Cliquer "Upload" ou glisser un fichier depuis le desktop
3. Fichier uploadé dans le tier par défaut (ou tier de la zone de drop)
4. Preview thumbnail Cloudinary
5. Possibilité de drag vers un autre tier immédiatement
```

### 3.2. Reclassement

```
1. Vue "Colonnes" sélectionnée
2. Drag carte média de colonne P1 vers P3
3. POST /api/uploads/:id { tier_required: "p3" }
4. UI feedback instantané (optimistic update)
5. Cloudinary URL inchangé, seulement metadata DB modifié
```

### 3.3. Config pack

```
1. Ouvrir panneau pack (inline collapsible — commit 47560e0)
2. Éditer price_eur, visibility_rule, preview_count, blur_intensity
3. Save → /api/packs PATCH
4. Feed public invalidé (revalidateTag("feed:<model>"))
```

---

## 4. Critères UX de succès

1. **Drag & drop fonctionne en desktop ET mobile** (aucune régression vs commit `ae5c7f3`)
2. **3 vues** : Dossiers, Colonnes kanban, Liste — switchables en 1 clic
3. **Règles pack visibles et éditables inline** (pas de page séparée)
4. **Upload Cloudinary < 3s pour un JPG 10MB** (progress bar par tier)
5. **Feed `/m/<slug>` reflète les règles** instantanément (invalidation cache)
6. **Visiteur sans accès** → flou net + CTA unlock clair
7. **Ordre drag cohérent** : tier respecté, pinned respecté, last-uploaded top

---

## 5. Dépendances

- Module `profil-public` : consomme les règles de visibilité pour render feed
- Module `dashboard` : KPIs contenu (count uploads mois, packs actifs) remontés
- Cloudinary tier-lock par `model_id` (existant dans `next.config.ts` + edge cache 30j)

---

## 6. Hors scope

- Stories TTL 24h workflow (déjà livré v1.0 Module D)
- Paiement Stripe / Fanvue / unlock flow (côté visiteur, géré sur `/m/<slug>`)
- Modération IA contenu (ultérieur)
- Watermarking auto (réflexion ultérieure, pas prioritaire)

---

## 7. Règles de conformité

- **Aucun fichier client local** : tous les médias vivent sur Cloudinary (scoped par `model_id`)
- **Cloudinary folder** : `heaven/<model_id>/{photos,videos,stories}/<uuid>`
- **RLS** : `agence_uploads` + `agence_packs` filtrés par `model_id` (writer = model+root, reader = public pour tier<=p0)
- **DMCA** : contenu lié à un modèle avec `release_form_status != validated` ne peut pas être publié (flag bloqueur — sprint 3 BP)

---

## 8. Liens

- Page à reconstruire : `src/app/agence/contenu/page.tsx` (deleted 2026-04-10)
- Historique à récupérer : commits `6078376`, `977f6ba`, `ae5c7f3`, `3654a10`, `efb799b`
- Composants existants : `src/cp/components/cockpit/packs-editor.tsx`, `pack-configurator.tsx`
- Cloudinary config : `next.config.ts`
- Feed public (consommateur) : `plans/modules/profil-public/STRATEGIE-v1.2026-04-21.md`
- Dashboard (KPIs) : `plans/modules/dashboard/STRATEGIE-v1.2026-04-21.md`
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
