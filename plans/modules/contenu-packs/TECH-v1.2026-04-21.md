# Contenu + Packs — Infra v1 (2026-04-21)

> Plan technique pour `/agence/contenu` (à reconstruire) + gestion packs PPV.
> Complète `STRATEGIE-v1.2026-04-21.md`.

---

## 1. Routes

| Route | Source | Statut |
|---|---|---|
| `/agence/contenu` | `src/app/agence/contenu/page.tsx` | **À reconstruire** (supprimé commit `9e93428` le 2026-04-10) |
| `/agence?tab=contenu` | legacy | Redirect middleware → `/agence/contenu` |
| `/agence/settings/packs` | existant | Config packs avancée (prix, bucket, DMCA link) |

---

## 2. Composants

### 2.1. Arbo cible (reconstruction)

```
src/app/agence/contenu/page.tsx                ← NEW (shell ~400L, DnD-aware)
└── <ContenuView>
    ├── <ViewSwitcher>                          ← Dossiers / Colonnes / Liste
    ├── <PackConfigStrip>                       ← collapsible inline (commit 47560e0)
    │   └── <PackConfigurator pack={pack} />    ← EXISTE src/cp/components/cockpit/pack-configurator.tsx
    ├── <ContenuGrid mode="folders|columns|list">
    │   ├── <TierDropZone tier="p0..p4">
    │   │   └── <MediaCard draggable>
    │   │       ├── <CloudinaryThumbnail />
    │   │       ├── <TierBadge />
    │   │       └── <ActionsMenu />            ← tier switch, delete, pin
    │   └── <EmptyTierState />
    ├── <UploadDropZone>                        ← drag from desktop
    └── <ZoomLightbox />                        ← existant
```

### 2.2. Restaurer depuis git history

```bash
# Étapes de restauration
git show 9e93428^:src/app/agence/contenu/page.tsx > /tmp/contenu-legacy.tsx
# Adapter imports (structure post-merge apps/*)
# Extraire la logique DnD (lignes avec dragId, dragOverTier, handleDragStart, handleDrop)
# Intégrer à la nouvelle structure single-app
```

Fichiers à examiner dans git history :
- `src/app/agence/contenu/page.tsx` (shell + DnD state)
- `src/components/profile/gallery-tab.tsx` (DnD gallery commit `c90e5df`)
- Tous les patches des commits `6078376`, `977f6ba`, `ae5c7f3`, `3654a10`, `efb799b`

### 2.3. `<PackConfigurator>` (existant, à conserver)

Fichier : `src/cp/components/cockpit/pack-configurator.tsx`

Propriétés actuelles :
```ts
interface PackConfiguratorProps {
  pack: PackConfig;
  onSave: (updated: PackConfig) => void;
  readOnly?: boolean;
}
```

**Extensions à ajouter** (brief B8 règles affinables) :
```ts
interface PackConfig {
  // existant
  id: string; name: string; tier: string; price_eur: number;
  // extensions
  visibility_rule: "always_public" | "if_purchased" | "preview_blur";
  blur_intensity: number;    // 0..100
  preview_count: number;     // nb items teaser
  tier_locked: boolean;
  active: boolean;
  cover_media_id?: string;
}
```

---

## 3. Data model

### 3.1. Table `agence_packs` (existante, extension)

Migration `041_pack_visibility_rules.sql` :

```sql
ALTER TABLE agence_packs
  ADD COLUMN IF NOT EXISTS visibility_rule text
    CHECK (visibility_rule IN ('always_public','if_purchased','preview_blur'))
    DEFAULT 'if_purchased',
  ADD COLUMN IF NOT EXISTS blur_intensity int DEFAULT 40 CHECK (blur_intensity BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS preview_count int DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tier_locked bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS active bool DEFAULT true,
  ADD COLUMN IF NOT EXISTS cover_media_id uuid REFERENCES agence_uploads(id);

CREATE INDEX IF NOT EXISTS idx_agence_packs_active ON agence_packs(model_id, active);
```

### 3.2. Table `agence_uploads` (existante)

```
id              uuid PK
model_id        text
cloudinary_id   text
cloudinary_url  text
thumbnail_url   text
media_type      enum('image','video','story')
tier_required   text       -- p0..p4 (lié au tier du pack)
pack_id         uuid NULL  -- FK agence_packs (nullable si non assigné)
pinned          bool DEFAULT false
posted_at       timestamptz
ttl_expires_at  timestamptz NULL  -- pour stories (TTL 24h)
file_size_bytes int
```

### 3.3. Lien uploads ↔ packs

Un media peut appartenir à un pack (pour la logique de paywall) ou rester en standalone.

Règle :
- `pack_id IS NULL` + `tier_required = 'p0'` → public libre sur le feed
- `pack_id IS NOT NULL` → règle de visibilité du pack s'applique
- `pack_id IS NULL` + `tier_required > 'p0'` → ne doit pas arriver (safeguard check)

### 3.4. Table `agence_purchases` (existante)

Utilisée pour savoir si un fan a payé un pack. Jointure : `agence_purchases.fan_id + pack_id` → `access_granted`.

---

## 4. Endpoints API

### 4.1. Existants réutilisés

| Route | Méthode | Fichier |
|---|---|---|
| `/api/upload` | POST | `src/app/api/upload/route.ts` — signed Cloudinary URL |
| `/api/uploads` | GET | `src/app/api/uploads/route.ts` — liste filtrable par tier |
| `/api/packs` | GET/POST/PATCH | `src/app/api/packs/route.ts` — CRUD packs |
| `/api/upload/cleanup` | POST | `src/app/api/upload/cleanup/route.ts` — orphan cleanup |
| `/api/feed` | GET | `src/app/api/feed/route.ts` — feed polymorphe public |

### 4.2. Nouveaux

| Route | Méthode | Rôle |
|---|---|---|
| `/api/uploads/[id]/tier` | PATCH | Change `tier_required` (drag & drop) |
| `/api/uploads/[id]/pack` | PATCH | Assign media to pack |
| `/api/uploads/reorder` | POST | Batch update `sort_order` / pinned |
| `/api/packs/[id]/config` | PATCH | Update visibility rules/preview_count/blur |

---

## 5. Patterns techniques

### 5.1. Drag & Drop desktop (HTML5 natif)

```ts
const [dragId, setDragId] = useState<string | null>(null);
const [dragOverTier, setDragOverTier] = useState<string | null>(null);

function handleDragStart(e: DragEvent, id: string) {
  setDragId(id);
  e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e: DragEvent, tier: string) {
  e.preventDefault();
  setDragOverTier(tier);
}

async function handleDrop(tier: string) {
  if (!dragId) return;
  // optimistic
  setPosts(prev => prev.map(p => p.id === dragId ? { ...p, tier_required: tier } : p));
  // network
  await fetch(`/api/uploads/${dragId}/tier`, { method: "PATCH", body: JSON.stringify({ tier }) });
  setDragId(null);
  setDragOverTier(null);
}
```

### 5.2. Drag & Drop mobile (touch-pick + glow)

```ts
const [touchPickedId, setTouchPickedId] = useState<string | null>(null);

function handleTouchPick(id: string) {
  setTouchPickedId(id);
  // Haptic feedback
  if ("vibrate" in navigator) navigator.vibrate(10);
}

// Puis tap sur tier cible → handleDrop
```

Glow effect CSS :
```css
.media-card.picked { box-shadow: 0 0 16px var(--accent), 0 0 32px rgba(230,51,41,0.3); }
.tier-zone.drop-target { border: 2px dashed var(--accent); }
```

### 5.3. Upload Cloudinary direct signé

```ts
// 1. Get signed params
const signRes = await fetch("/api/upload", { method: "POST" });
const { signature, timestamp, cloud_name, api_key, folder } = await signRes.json();

// 2. Upload direct to Cloudinary
const form = new FormData();
form.append("file", file);
form.append("signature", signature);
form.append("timestamp", String(timestamp));
form.append("api_key", api_key);
form.append("folder", folder);

const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
  method: "POST", body: form,
});
const { secure_url, public_id } = await upRes.json();

// 3. Persist DB
await fetch("/api/uploads", { method: "POST", body: JSON.stringify({ cloudinary_id: public_id, cloudinary_url: secure_url, tier_required: "p0" }) });
```

### 5.4. Feed sync — application des règles pack

Fichier consommateur : `src/app/api/feed/route.ts` (existant).

Logique à ajouter :

```ts
async function applyVisibilityRules(items: FeedItem[], visitorFanId: string | null) {
  const packIds = items.map(i => i.pack_id).filter(Boolean);
  const [packs, purchases] = await Promise.all([
    db.from("agence_packs").select("id, visibility_rule, blur_intensity, preview_count").in("id", packIds),
    visitorFanId
      ? db.from("agence_purchases").select("pack_id").eq("fan_id", visitorFanId)
      : Promise.resolve({ data: [] }),
  ]);

  const purchasedPackIds = new Set(purchases.data?.map(p => p.pack_id) || []);

  return items.map(item => {
    if (!item.pack_id) return { ...item, access: "public" };
    const pack = packs.data?.find(p => p.id === item.pack_id);
    if (!pack) return { ...item, access: "public" };

    if (pack.visibility_rule === "always_public") return { ...item, access: "public" };
    if (purchasedPackIds.has(item.pack_id)) return { ...item, access: "purchased" };
    if (pack.visibility_rule === "preview_blur") return { ...item, access: "blurred", blur: pack.blur_intensity };
    return { ...item, access: "locked" };
  });
}
```

### 5.5. Invalidation cache

Chaque mutation (upload, tier change, pack config) → `revalidateTag("feed:<model_id>")` + `revalidateTag("packs:<model_id>")`.

---

## 6. Tests & acceptation

- [ ] Page `/agence/contenu` existe et rend (shell reconstruit)
- [ ] 3 vues switchables (Dossiers / Colonnes / Liste)
- [ ] Drag media desktop entre tiers → `tier_required` update + feed refresh
- [ ] Touch-pick mobile avec glow fonctionne sur iOS Safari + Android Chrome
- [ ] Upload drop zone → Cloudinary direct + insert DB + thumbnail rendu < 3s
- [ ] Config pack inline modifiable (price, visibility_rule, blur, preview_count)
- [ ] Feed `/m/<slug>` respecte `visibility_rule` :
  - [ ] `always_public` → affiché net
  - [ ] `if_purchased` + fan non-payant → hidden (sauf preview_count)
  - [ ] `preview_blur` → affiché flouté
  - [ ] Fan ayant acheté pack → contenu net
- [ ] Pinned pack reste en tête dans tous les modes
- [ ] Delete media → orphan Cloudinary cleanup cron actif

---

## 7. Liens

- Page à restaurer : `src/app/agence/contenu/page.tsx` (git history `9e93428^`)
- API packs : `src/app/api/packs/route.ts`
- API uploads : `src/app/api/uploads/route.ts`, `src/app/api/upload/route.ts`
- Pack configurator : `src/cp/components/cockpit/pack-configurator.tsx`, `packs-editor.tsx`
- Cloudinary config : `next.config.ts`
- Migration extension DB : `supabase/migrations/041_pack_visibility_rules.sql` (à créer)
- Feed polymorphe : `src/app/api/feed/route.ts` (à étendre logique visibility)
- Profil public : `plans/modules/profil-public/INFRA-v1.2026-04-21.md`
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
