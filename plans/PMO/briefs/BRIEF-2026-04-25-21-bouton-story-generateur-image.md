# BRIEF-2026-04-25-21 — Bouton Story Générateur image téléchargeable

> **Date** : 2026-04-25 evening
> **Émetteur** : NB
> **Type** : feature majeure
> **Priorité** : P1
> **Layer** : FE
> **Statut** : 🟢 livré

---

## Demande NB

> "le bouton story sert à générer des fichier photo téléchargeable au dimensions story instagram ou snap avec la dernière photo upload dans les albums contenu, et dans ce bouton ca doit ouvrir une box qui permet de rajouter par de toggle des infos sup qui rajoutent à l'aperçu avant de générer l'image à télécharger, je doit pouvoir choisir l' % de floutage de l'image en arrière plan, ou choisir une autre image, en upload local. Ajouter un code d'accès générer aussi à partir de la, la génération doit me permettre de choisir le temps, et le pack tier contenu en question lié"

## Décisions

1. **Modal `<StoryGeneratorModal>`** style cohérent `payment-reference-modal` (backdrop blur 28px, fadeUp)
2. **4 customisations** :
   - **Image bg** : default = `GET /api/uploads?model=X&limit=1` (dernier upload) — toggle "Choisir autre" → file input local (max 10 MB)
   - **Slider flou** 0-20px appliqué via CSS `filter: blur(Npx)`
   - **Toggle code d'accès** :
     - Choix durée (jours, default 7)
     - Choix pack/tier (select packs[])
     - Génération via `POST /api/codes` body `{ model, client: "story-share", tier, type: "promo", duration: days*24, platform: "snapchat" }`
     - Code overlay sur l'image preview en bas
   - **Aperçu canvas 1080×1920** redessiné temps réel via `useEffect` + `ctx.drawImage`
3. **Output** : PNG téléchargeable via `canvas.toBlob` → `<a download>` blob URL
4. **CORS Cloudinary fallback** : si `tainted canvas`, message d'erreur invitant upload local
5. **Responsive mobile-first** : modal full-screen sur mobile (`p-0 sm:p-5`, `rounded-none sm:rounded-2xl`, `h-full sm:h-auto`), touch targets 44+

## Implémentation

### Nouveau fichier
- `src/web/components/profile/story-generator-modal.tsx` (~330 LOC)

### Fichiers modifiés
- `src/shared/components/header.tsx` — retire StoryGenerator legacy + mount `<StoryGeneratorModal>` via state `storyOpen` géré côté composant
- `src/app/m/[slug]/page.tsx` — state `storyOpen` + mount `<StoryGeneratorModal>` quand admin connectée

### Legacy
- `src/web/components/profile/story-generator.tsx` (ancien composant) **conservé non-importé** — sera supprimé cycle suivant après vérif zéro usage

## DoD ✅

- [x] Modal s'ouvre via bouton Story header CP + profil admin
- [x] 4 customisations fonctionnelles (image bg, flou, code, preview)
- [x] Output PNG 1080×1920 téléchargeable
- [x] Responsive mobile-first
- [x] tsc --noEmit exit 0

## Références

- `src/web/components/profile/story-generator-modal.tsx` (nouveau)
- `src/web/components/profile/payment-reference-modal.tsx` (style référence)
- `src/app/api/codes/route.ts` (POST génération code)
- `src/app/api/uploads/route.ts` (GET dernière image)
