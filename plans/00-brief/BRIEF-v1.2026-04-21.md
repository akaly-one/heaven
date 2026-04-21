# BRIEF — Heaven

> Contexte initial projet. Ce qu'est Heaven, pour qui, pourquoi.
> Source vérité business détaillée : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/).
> Vision stratégique complète : [`01-strategy/STRATEGY-v1.2026-04-21.md`](../01-strategy/STRATEGY-v1.2026-04-21.md).

---

## 1. Pitch

**Heaven est une agence digitale hybride IA + services de gestion et consultance pour modèles créatrices indépendantes**, opérée depuis la société SQWENSY (Belgique, branche Agence).

Une infrastructure unique (Sqwensy OS, CP multi-profils, agent IA conversationnel, automations) sert 3 modes opérationnels complémentaires sur les plateformes creator-fan (Fanvue, OnlyFans, MYM) avec le caming live comme canal d'acquisition primaire.

---

## 2. Les 3 Modes (raccourci)

| Mode | Activité | Revenu Sqwensy |
|---|---|---|
| **A — Studio IA pur** | Personas 100 % IA sur comptes agence (Yumi `@yumiiiclub`) | 100 % après coûts |
| **B — Hub annexe modèles réelles** | Modèles physiques publiées sur comptes agence via Release Form DMCA | 30 % net distribuable (70 % modèle) |
| **C — Services B2B** | Sqwensy prestataire tech/stratégique, modèle 100 % indépendante | Setup + sub + % croissance |

Détails : [`01-strategy/STRATEGY-v1.2026-04-21.md`](../01-strategy/STRATEGY-v1.2026-04-21.md) §3.

---

## 3. Origine

Le projet Heaven naît de la constatation que :

- Les plateformes créatrices (Fanvue, OnlyFans) ont **explosé** en 2024-2026 avec un marché fragmenté sur 5-10 apps et commissions 15-20 %
- Les modèles débutantes perdent ~80 % de leur potentiel par manque de compétences techniques (funnel, DM, pricing) et organisationnelles (planning, fiscal, contrats)
- Les agences traditionnelles chargent **30-50 %** pour des services humains chat-centriques
- Le **caming live** est sous-exploité par les agences francophones alors qu'il fournit un CAC structurellement plus bas que le social organique
- L'**infrastructure SQWENSY** (OS, CP, agent IA) est amortie — coût marginal d'ajout quasi nul

Heaven capitalise sur ces écarts en proposant une alternative **IA-first avec escalade humaine** pour les modèles débutantes, et un hub IA (Yumi) comme vitrine premium mode/lifestyle EU classy.

---

## 4. Pour qui

### Utilisatrices directes (modèles)
- **Modèles débutantes** (< 1 000 €/mois) cherchant un cadre simple (Palier P1 droit à l'image) pour démarrer sans démarche administrative lourde
- **Modèles en croissance** (1-20 k€/an) voulant un support technique et stratégique sans aller jusqu'à l'indépendante à temps plein
- **Modèles établies** souhaitant externaliser la tech/marketing (Mode C B2B) tout en restant propriétaires

### Bénéficiaires indirects (fans/abonnés)
- Clientèle creator-fan mainstream/premium qui consomme sur Fanvue, moins sur OF
- Niche « AI-friendly classy » pour Yumi (vs AI fitness / explicit)
- Niche « mystery / masked » possible via Plan Identité Shadow

### Opérateur (NB / SQWENSY)
- NB = fondateur SQWENSY, indépendant complémentaire BE
- Infra existante réutilisée (pas de re-dev)
- Revenue stream supplémentaire vs services B2B SQWENSY classiques

---

## 5. Pourquoi cette structure V2

Ce document et l'arborescence `plans/` complète sont issus d'une refonte V2 (avril 2026) pour :

1. **Ergonomiser** le suivi projet dev (modules autonomes, pas de monolithes)
2. **Scalabilité** : plus le projet grandit, plus la structure reste navigable
3. **Ergonomie Claude Code** : charger contexte minimal pertinent (pas 36 KB d'un coup)
4. **Zéro doublon** — un thème = un endroit
5. **Traçabilité** — ADRs + CHANGELOG + versioning visible

Détails du standard : [`STANDARD-SUIVI-PROJET.md`](../STANDARD-SUIVI-PROJET.md).

---

## 6. Périmètre actif 2026-Q2

- **Plateforme** : `heaven-os.vercel.app` (single Next.js 15 post merge Turborepo 2026-04-19)
- **Modèles gérés** : Yumi (m1, IA), Paloma (m2, Hub annexe), Ruby (m3, Hub annexe)
- **Intégrations live** : Instagram Business Account `@yumiiiclub` (webhook + feed sync), Cloudinary (storage), Supabase (DB+RLS), Vercel (deploy)
- **Stack IA** : OpenRouter Claude Sonnet 4.6 (prompt caching) — clé en attente (D-5)
- **App Review Meta** : en attente Business Verification SQWENSY (D-4)

---

## 7. Règles P0 non-négociables

- **Confidentialité** : Heaven ne doit JAMAIS être associé publiquement à SQWENSY
- **Anti-fraude** : aucun vrai prénom stocké anywhere (code, DB, docs, commits)
- **Compliance modèles** : Release Form DMCA obligatoire avant 1ère publication Mode B
- **Statut fiscal modèle** : check ONEM obligatoire avant signature si chômage
- **AI Act UE 2 août 2026** : bio `AI-generated content` + tag `#AI` obligatoire Mode A

---

## 8. Documents de référence

- Business : [`business/bp-agence-heaven-2026-04/README.md`](../business/bp-agence-heaven-2026-04/README.md)
- Stratégie : [`01-strategy/STRATEGY-v1.2026-04-21.md`](../01-strategy/STRATEGY-v1.2026-04-21.md)
- Objectifs + KPIs : [`00-brief/OBJECTIVES-v1.2026-04-21.md`](./OBJECTIVES-v1.2026-04-21.md)
- Roadmap : [`01-strategy/ROADMAP-v1.2026-04-21.md`](../01-strategy/ROADMAP-v1.2026-04-21.md)
- Synergie SQWENSY : [`00-brief/SYNERGY-v1.2026-04-21.md`](./SYNERGY-v1.2026-04-21.md)
- BP financier : [`01-strategy/BUSINESS-v1.2026-04-21.md`](../01-strategy/BUSINESS-v1.2026-04-21.md)
- Risques : [`01-strategy/RISKS-v1.2026-04-21.md`](../01-strategy/RISKS-v1.2026-04-21.md)
