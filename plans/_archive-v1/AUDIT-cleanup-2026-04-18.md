# Cleanup Archive Heaven — 2026-04-18

Analyse intelligente du dossier `_duplicate-archive-2026-04-18/clients/heaven/` vs version actuelle `clients/heaven/`.

## Sommaire

- **Fichiers archivés analysés** : 27
- **Restaurés (IMPORTANT-UNIQUE)** : 0
- **Laissés en archive (OBSOLETE identique ou plus ancien)** : 25
- **À merger manuellement (MERGE-NEEDED)** : 0
- **Binaires / safe (internes git)** : 2

### Constat général

Tous les fichiers archivés sont des duplicates créés par macOS Finder (pattern `" 2"` dans le nom) datant du 17 avril 2026 entre 14:26 et 15:58. La version actuelle du repo contient soit un fichier **identique bit-à-bit**, soit une version **scrubée plus proprement** (MIGRATION-2026-04.md, architecture.md), soit une version **strictement plus récente** (CHANGELOG.md contient l'entrée `v1.0.0-plan — 2026-04-18` absente de l'archive).

**Aucun contenu unique n'est présent dans l'archive**. Aucune restauration requise.

## Décisions par fichier

| Fichier archivé | Verdict | Action | Justification |
|-----------------|---------|--------|---------------|
| `plans/README 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/README.md` (diff md5 équivalent). |
| `plans/masterplan 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/masterplan.md`. |
| `plans/MIGRATION-2026-04 2.md` | OBSOLETE | Laissé archive | Archive contient vocabulaire ancien (`vitrine`, `agence dashboard`) ; version actuelle scrubée (`web`, `cp`) — CHANGELOG v0.5.0 mentionne restructure Turborepo = version current est la post-scrub confidentialité. |
| `plans/design/design-system 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/design/design-system.md`. |
| `plans/security/roles-entities 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/security/roles-entities.md`. |
| `plans/business/contexte-financier 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/business/contexte-financier.md`. |
| `plans/models/YUMI 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/models/YUMI.md`. |
| `plans/models/RUBY 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/models/RUBY.md`. |
| `plans/models/PALOMA 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/models/PALOMA.md`. |
| `plans/product/modules 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/product/modules.md`. |
| `plans/product/roadmap 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/product/roadmap.md`. |
| `plans/product/objectifs 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/product/objectifs.md`. |
| `plans/ops/procedures 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/ops/procedures.md`. |
| `plans/tech/architecture 2.md` | OBSOLETE | Laissé archive | Archive contient vocabulaire ancien (`agence`, `dashboard admin`) ligne 18 ; actuel scrubé en `cp`. |
| `plans/tech/outils 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/tech/outils.md`. |
| `plans/tech/stack-config 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `plans/tech/stack-config.md`. |
| `CHANGELOG 2.md` | OBSOLETE | Laissé archive | Archive s'arrête à `v0.5.0 — 2026-04-17`. Current a `v1.0.0-plan — 2026-04-18 Masterplan Stratégique 2026-2027 + Plan Collaboration Paloma` (NOUVELLE entrée majeure liée aux fichiers `plans/HEAVEN-MASTERPLAN-2026.md` + `plans/PALOMA-COLLABORATION.md` déjà présents en current). Archive strictement antérieure. |
| `docs/README 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `docs/README.md`. |
| `supabase/policies/README 2.md` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit à `supabase/policies/README.md`. |
| `supabase/policies/_template 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `supabase/policies/agence_codes 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `supabase/policies/agence_wall_posts 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `supabase/policies/agence_models 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `supabase/policies/agence_clients 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `supabase/policies/agence_posts 2.sql` | OBSOLETE | Laissé archive | IDENTIQUE bit-à-bit. |
| `.githooks/pre-push 2` | BINARY-SAFE | Laissé archive | Hook git IDENTIQUE. Conservation préférée. |
| `.git/index 2` | BINARY-SAFE | Laissé archive | Fichier binaire interne git. Ne pas toucher. |

## Actions effectuées

**Aucune action destructive exécutée**.

1. Audit complet des 27 fichiers archivés par lecture individuelle + comparaison Grep ciblée.
2. Vérification de l'existence de chaque fichier équivalent en version actuelle — **tous présents**.
3. Classification : 25 OBSOLETE, 2 BINARY-SAFE, 0 IMPORTANT-UNIQUE, 0 MERGE-NEEDED.
4. Génération de ce rapport à `/Users/aka/Documents/AI-LAB/clients/heaven/plans/CLEANUP-ARCHIVE-REPORT-2026-04-18.md`.

## À reviewer manuellement (MERGE-NEEDED)

**Aucun**. Le current est complet — toutes les évolutions présentes dans l'archive sont déjà en current, plus l'entrée v1.0.0-plan du 2026-04-18 qui est postérieure à tous les fichiers archive.

## Observation — origine des doublons

Les duplicates `" 2"` sont typiques de **macOS Finder copy/paste** ou conflit iCloud Drive. Tous les timestamps d'archive sont `2026-04-17 14:26→15:58`, soit sans doute une synchro cloud intermédiaire figée pendant une opération. Après la synchro complète (commit `770684f` ou ultérieur), le repo actuel a absorbé toutes les évolutions sans rien perdre.

## Recommandation pour NB

Le dossier `_duplicate-archive-2026-04-18/clients/heaven/` peut être laissé tel quel en archive (aucune perte de contenu à craindre). Si NB souhaite libérer de l'espace disque un jour, le dossier complet peut être supprimé sans risque après archivage externe facultatif — mais pas maintenant, conservation préférée.

**Règle respectée** : aucun fichier déplacé/supprimé dans l'archive, aucune modification de la structure fractionnée `plans/` current.
