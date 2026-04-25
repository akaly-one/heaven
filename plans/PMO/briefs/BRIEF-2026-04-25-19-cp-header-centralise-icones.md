# BRIEF-2026-04-25-19 — CP Header centralisé icônes seules

> **Date** : 2026-04-25 evening
> **Émetteur** : NB
> **Type** : feature UX + refactor frontend
> **Priorité** : P1
> **Layer** : FE
> **Statut** : 🟢 livré (Session 2026-04-25 evening)

---

## Demande NB

> "dans le cp je te déjà demandé l'oeuil profil doit être en header, pareil avec le bouton lien socials, ensuite le bouton clef générer pas besoin de texte, et le bouton story pareil, et tu doit les centrer"
> "je te parl de ces boutons qui sont à la suite de dashboard contenu et stratégie ils doivent aller en header cp"

## Décisions

1. **4 boutons centrés icônes seules** dans le header CP global (`src/shared/components/header.tsx`)
   - `[👁 Eye]` → `/m/[currentModel]` target=_blank (voir profil public)
   - `[🔗 Link2]` → dispatch event `heaven:toggle-socials` (toggle SocialsDropdown)
   - `[🔑 Key]` → dispatch event `heaven:generate` (ouvre GenerateModal — BRIEF-20)
   - `[🎬 Story/ImagePlus]` → ouvre StoryGeneratorModal (BRIEF-21)
2. **Retrait labels textes** "Générer" et "Story" — icônes seules suffisent
3. **Centrage** via wrapper `flex-1 flex items-center justify-center` entre LEFT et RIGHT sections
4. **Eye + Link2 retirés de `agence-header.tsx`** (déplacés vers header global, accessibles partout dans le CP)
5. **Visibilité** : uniquement pour `auth.role === "model" || "root"`
6. **Responsive mobile-first** : touch targets 44×44 mobile via `p-2 sm:p-1.5`

## Implémentation

### Nouveaux fichiers
- `src/shared/components/header/heaven-admin-actions.tsx` (~95 LOC) — sous-composant réutilisable des 4 boutons icon-only

### Fichiers modifiés
- `src/shared/components/header.tsx` — retrait des 2 boutons inline (Générer + Story) → mount `<HeavenAdminActions>` centré
- `src/cp/components/cockpit/dashboard/agence-header.tsx` — retrait Eye L289-302 + Link2 L303-309 + retrait import `Eye`, `Link2`
- `src/app/m/[slug]/page.tsx` — `<HeavenAdminActions>` également mounté dans le HeaderBar profil quand admin connecté (cohérence cross-vue)

## DoD ✅

- [x] 4 boutons icônes centrés dans header CP
- [x] Eye + Link2 retirés de agence-header
- [x] Visible uniquement model/root
- [x] Touch targets 44×44 mobile
- [x] tsc --noEmit exit 0
- [x] Composant réutilisable header CP + profil admin

## Références

- `src/shared/components/header/heaven-admin-actions.tsx`
- `src/shared/components/header.tsx`
- `src/cp/components/cockpit/dashboard/agence-header.tsx`
- `src/app/m/[slug]/page.tsx`
