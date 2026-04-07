# Heaven OS — Process de mise a jour securise

## Principe
JAMAIS coder directement sur `main` pour des changements significatifs.
`main` = production live = ce que les clients voient.
Toute modification passe par une branche isolee (worktree) puis merge apres validation.

## Zones critiques (JAMAIS casser)

| Zone | Impact si cassee | Fichiers cles |
|------|-----------------|---------------|
| **Auth & codes** | Clients ne peuvent plus acceder a leur profil | `/api/codes/`, `/api/codes/security/`, `lib/auth.ts` |
| **Profil public** | Page blanche pour les clients | `/m/[slug]/page.tsx`, `gallery-tab.tsx`, `pack-tiles.tsx` |
| **Paiements** | Perte de revenus, codes non generes | `/api/payments/`, `payment-utils.ts`, `payment-checkout.tsx` |
| **DB schema** | Perte de donnees | `supabase/migrations/` |
| **Images/Cloudinary** | Galerie vide | `/api/upload/`, `/api/uploads/` |
| **Messages** | Perte de communication client | `/api/messages/` |
| **Bridge SQWENSY** | SQWENSY OS perd la visibilite | `/api/sqwensy/` |

## Workflow : Worktree

### 1. Creer un worktree
```
Claude Code: "ouvre un worktree pour [nom-feature]"
→ EnterWorktree "nom-feature"
→ Branche isolee creee dans .claude/worktrees/
```

### 2. Developper
- Coder les modifications
- Tester en local : `npx next build` + `npx next dev`
- Verifier les pages critiques manuellement

### 3. Checklist avant merge
- [ ] `npx tsc --noEmit` → 0 erreurs
- [ ] `npx next build` → build reussi
- [ ] Page profil `/m/gret` charge correctement
- [ ] Codes d'acces fonctionnent (login test)
- [ ] API `/api/packs`, `/api/uploads`, `/api/codes` repondent
- [ ] Pas de `console.error` dans le navigateur

### 4. Merge et deploiement
```bash
git checkout main
git merge [branche-feature] --no-ff
git push origin main
```
→ Vercel deploie automatiquement

### 5. Verification post-deploiement
- Ouvrir heaven-os.vercel.app dans un navigateur
- Tester le login avec un code existant
- Verifier la galerie, les packs, les messages

## Workflow : Hotfix urgent
Si un bug critique est en prod et qu'on doit corriger vite :
1. `EnterWorktree "hotfix-description"`
2. Fix chirurgical (1-2 fichiers max)
3. Build + test minimal
4. Merge + push
5. Verifier en prod

## Migrations DB
Les migrations SQL sont IRREVERSIBLES. Process special :
1. Ecrire la migration dans `supabase/migrations/`
2. Tester sur la DB sandbox AVANT (pas la prod)
3. Si la migration modifie des colonnes existantes → backup d'abord
4. Executer sur la prod seulement apres validation complete
5. Ne JAMAIS `DROP TABLE` ou `DROP COLUMN` sans backup

## Fragmentation du code
Pour isoler les risques, le code est organise en modules independants :

```
src/
├── lib/           ← Utilitaires purs (timezone, auth, supabase)
│                     Modifiable sans risque si l'interface ne change pas
├── constants/     ← Donnees statiques (packs, tiers)
│                     Modifiable sans risque
├── components/
│   ├── cockpit/   ← UI admin (generate-modal, pack-configurator, etc.)
│   │                 Modifiable sans impact client
│   └── profile/   ← UI profil public (gallery-tab, payment-checkout, etc.)
│                     ⚠️ CRITIQUE — tester avant push
├── app/
│   ├── agence/    ← Pages CP admin
│   │                 Modifiable sans impact profil public
│   ├── api/       ← Routes API
│   │                 ⚠️ CRITIQUE — ne jamais changer les signatures de reponse
│   └── m/[slug]/  ← Profil public
│                     ⚠️ LE PLUS CRITIQUE — toujours worktree
```

## Regle d'or
> Si tu modifies un fichier dans `api/`, `m/[slug]/`, ou `components/profile/`,
> tu DOIS utiliser un worktree. Pas de push direct sur main.
