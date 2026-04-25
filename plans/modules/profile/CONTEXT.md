# Module Profile — CONTEXT

> **Mis à jour** : 2026-04-25 evening (BRIEF-22+23 Profile-as-Hub V1)
> **Pattern** : SPRBP — Single Page, Role-Based Permissions (style Instagram/TikTok)

---

## Mission

Le module `profile` est le **hub unique** de la modèle Heaven. Une seule page (`/m/[slug]`) sert :
- Vitrine fan/prospect (couche client)
- Hub de gestion contenu/feed/packs (couche admin si propriétaire connectée)

Anti-pattern banni : pages dupliquées CP↔Profil pour la gestion contenu.

---

## Files clés

### Page principale
- `src/app/m/[slug]/page.tsx` (~2050 LOC) — composant monolithique avec :
  - Hooks data : `useModelSession`, `useModelData`, `useEditMode`, `useAccessCode`, `useVisitorIdentity`, `useChat`, `useWall`, `useClientProfile`, `useScreenshotDetection`
  - Sections internes : HeaderBar, HeroSection, FeedView, TierView
  - Modals : AdminAuthModal, IdentityGate, AgeGateModal, StoryGeneratorModal, etc.

### Composants profil
- `src/web/components/profile/` :
  - `post-composer.tsx` — admin inline text + photo upload (BRIEF-23)
  - `story-generator-modal.tsx` — admin Story PNG 1080×1920 (BRIEF-21)
  - `payment-reference-modal.tsx` — flow paiement V1 manuel (BRIEF-16)
  - `custom-cart-sheet.tsx` — custom pack shopping cart (BRIEF-16)
  - `paypal-checkout-button.tsx` — PayPal SDK (BRIEF-16 Phase I)
  - `unlock-sheet.tsx` — sélection packs côté fan
  - `instagram-feed-grid.tsx` + `feed-item-detail-modal.tsx` (BRIEF-17)
  - `client-badge.tsx`, `countdown-badge.tsx`, `order-history-panel.tsx`, etc.

### Composants header admin
- `src/shared/components/header/heaven-admin-actions.tsx` — 4 boutons icon-only Eye/Link2/Key/Story (BRIEF-19) — réutilisable header CP + profil admin

---

## Architecture en couches (SPRBP)

```
┌─────────────────────────────────────────────────────────────┐
│  /m/[slug] — Skeleton unique                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Couche 1 : CLIENT (default, toujours)                      │
│  ────────────────────────────────────                       │
│  - HeaderBar visiteur (badge tier, code input, message,     │
│    login/Upgrade)                                           │
│  - HeroSection (avatar + bio + stats)                       │
│  - FeedView (wall posts + feed items)                       │
│  - TierView (packs déverrouillables)                        │
│  - PublicFooter                                             │
│                                                             │
│  ▼ Si `isModelLoggedInActual && !previewMode`               │
│                                                             │
│  Couche 2 : ADMIN OVERLAY (additive, pas substitutive)      │
│  ─────────────────────────────────────────                  │
│  - HeaderBar admin tools (Camera/Banner/Save/Cancel/Eye)    │
│  - HeavenAdminActions (Eye public/Link2/Key/Story)          │
│  - PostComposer inline (text + photo)                       │
│  - Hover edit avatar/banner overlays                        │
│  - Mount StoryGeneratorModal admin                          │
│  - [Phase 2] PacksEditorInline                              │
│  - [Phase 2] BlurPreviewToggle drawer                       │
│                                                             │
│  ▼ Si `previewMode === true`                                │
│                                                             │
│  Couche 3 : PREVIEW (admin teste comme un fan)              │
│  ──────────────────────────────────────                     │
│  - Masque toute la couche admin                             │
│  - HeaderBar bouton "ADMIN" pour sortir du preview          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Hooks clés

| Hook | Fichier | Rôle |
|---|---|---|
| `useModelSession` | `src/shared/hooks/use-model-session.ts` | Détecte session admin (`heaven_auth` localStorage/sessionStorage) |
| `useModel` | `src/shared/lib/model-context.tsx` | Context global auth + currentModel + headers |
| `useModelData` | `src/shared/hooks/use-model-data.ts` | Fetch model + posts + stories + packs + uploads + wallPosts |
| `useEditMode` | `src/shared/hooks/use-edit-mode.ts` | State édit (editProfile, editPacks, displayModel, displayPacks) + refs upload + previewMode |
| `useAccessCode` | `src/shared/hooks/use-access-code.ts` | Validation/persistance code d'accès fan |
| `useVisitorIdentity` | `src/shared/hooks/use-visitor-identity.ts` | clientId guest, registerClient, visitorHandle |
| `useChat` | `src/shared/hooks/use-chat.ts` | Messages chat fan + polling + sendMessage |
| `useWall` | `src/shared/hooks/use-wall.ts` | Wall posts text + submitWallPost |
| `useClientProfile` | `src/shared/hooks/use-client-profile.ts` | Orders + notifications fan |
| `useScreenshotDetection` | `src/shared/hooks/use-screenshot-detection.ts` | Anti-screenshot client validé |

---

## Routes API consommées

| Route | Méthode | Usage |
|---|---|---|
| `/api/feed` | GET | Liste polymorphic feed items (manual + wall + instagram) |
| `/api/wall` | POST | Création wall post (text + media_url) |
| `/api/upload` | POST | Upload Cloudinary (data base64 → URL) |
| `/api/uploads` | GET | Liste uploads modèle (filtre tier, source) |
| `/api/codes` | POST/GET | Validation/génération codes d'accès |
| `/api/clients` | POST/GET | Création/lookup clients (visiteurs identifiés) |
| `/api/feed-items/[id]/like` | POST | Toggle like (BRIEF-17) |
| `/api/feed-items/[id]/comments` | GET/POST/DELETE | Commentaires (BRIEF-17) |
| `/api/payment/create` | POST | Initiation paiement multi-providers (BRIEF-16) |

---

## Permissions et contrôles

```typescript
// Calcul permission propriétaire (dans /m/[slug]/page.tsx)
const modelAuth = useModelSession(slug);
const isModelLoggedInActual = !!modelAuth;
const isModelLoggedIn = isModelLoggedInActual && !edit.previewMode;

// Display admin overlay
{isModelLoggedInActual && !edit.previewMode && (
  <AdminFeatureXYZ />
)}

// Permission propagée via prop
<PostComposer canPost={isModelLoggedInActual && !edit.previewMode} ... />
<EditableField canEdit={isModelLoggedInActual && !edit.previewMode} ... />
```

---

## Intégrations majeures

- **Identity Gate** : modal d'enrôlement visiteur (Snap/IG/Code)
- **Age Gate** (BRIEF-10) : modal majoration 18+ avant accès content sensuel/explicite
- **Payment providers** (BRIEF-16) : PayPal manuel + checkout SDK + Wise + Stripe (off)
- **Likes/Comments IG** (BRIEF-17) : grille vignettes + lightbox + interactions
- **Screenshot detection** : surveille tentatives capture sur fan validé

---

## Évolutions Phase 2 (différées)

- `PacksEditorInline` — édit prix/details/photo cover **à côté du display client** (vs dropdown séparé legacy)
- `BlurPreviewToggle` — drawer admin "vue floutée vs débloquée"
- Extraction `MessagingPageInner` exportable pour mount inline cockpit (vs redirect actuel)
- Suppression effective `contenu-panel.tsx` (1432 LOC) + `home-panel.tsx` après vérif zéro imports
- Décomposition page.tsx 2050 LOC → composants extraits (HeaderBar, HeroSection, FeedView, TierView)

---

## Confidentialité

Le module Profile **NE FAIT JAMAIS RÉFÉRENCE À SQWENSY** (société mère) — confidentialité Heaven absolue cf. protocole §1.
