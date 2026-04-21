# BUSINESS — Heaven

> **Source de vérité business détaillée** : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/) (BP Cowork 4 docs).
> Ce fichier **résume** + pointe vers le BP. Ne duplique pas. Mises à jour = via ADR.

---

## 1. Modèles économiques par Mode

### Mode A — Studio IA pur
- Comptes agence (Fanvue `yumiclub`, IG `@Yumiiiclub`, TikTok, Snap) au nom SQWENSY / KYC fondateur
- Bio Fanvue mention « AI-generated content » explicite (compliance)
- Contenu 100 % IA (Midjourney, ComfyUI local, Suno voice, Lora custom)
- **Acquisition** : social organique uniquement (pas de caming, le live est intrinsèquement humain)
- **Revenus** : 100 % SQWENSY après commission Fanvue 15 % + frais prod IA
- Formule : `Abonnés × % actifs × conv PPV × panier`

### Mode B — Hub annexe modèles réelles
- Modèles réelles publiées sur comptes agence via Model Release Form DMCA
- Répartition :
  ```
  Net distribuable = Revenu brut plateforme × (1 − 15% Fanvue) − TVA applicable − Frais prod dédiés
  Part modèle     = 70 % × Net distribuable
  Part SQWENSY    = 30 %
  ```
- Renégociation vers 75/25 ou 80/20 au-delà de **2 000 €/mois/modèle sur 3 mois consécutifs**
- Voies fiscales selon palier (cf. §2)

### Mode C — Services B2B indépendantes
- SQWENSY = prestataire tech/stratégique, modèle reste 100 % indépendante
- Tarification :
  | Ligne | Fourchette | Récurrence |
  |---|---|---|
  | Setup fee | 800 — 2 500 € | Ponctuel |
  | Subscription | 150 — 500 €/mois | Mensuel |
  | Commission croissance | 5-10 % CA incrémental | Mensuel si applicable |
  | Prestations ponctuelles | Variable | À la tâche |
- Cible v1 : 1-2 clientes entre M9-M12. Pas ouvert avant validation A+B.

---

## 2. Paliers rémunération modèles Mode B (fiscalité BE)

| Palier | Revenu brut annualisé | Voie fiscale recommandée | Taux effectif |
|---|---|---|---|
| **P1 Test** | < 1 000 €/an | Droit à l'image (art. 17 CIR92) ou profits divers | ~15 % |
| **P2 Démarrage** | 1 000 — 9 000 €/an | Droit à l'image (sous plafond ~10 k€) | ~15 % |
| **P3 Structuration** | 9 000 — 20 000 €/an | **Indép. complémentaire BE** (INASTI ~20,5 %) OBLIGATOIRE | ~30 % total |
| **P4 Pro** | > 20 000 €/an | Indép. renforcée + TVA (si > 25 k€ HT) | ~35-40 % total |

**Règle de bascule** : déclencher P3 dès 3 mois consécutifs > 750 €/mois (clause contrat, pas renégo).

Détail complet + exemples chiffrés : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/) (doc `Heaven_Paliers_Remuneration_Modeles.docx`).

---

## 3. Paliers fiscaux SQWENSY

| Seuil / événement | Impact | Action |
|---|---|---|
| CA HT > 25 000 €/an | TVA 21 % obligatoire | Activer dès 3 mois > 2 000 €/mois |
| Revenus plateformes UK (Fanvue, OF) | Export service hors UE | À VALIDER comptable |
| Bénéfice ≤ 100 000 €/an | ISOC PME 20 % | Respecter conditions PME |
| Bénéfice > 100 000 €/an | ISOC 25 % | Optimisation rémunération dirigeant |

---

## 4. Charges fixes & stack

### Infrastructure Heaven
| Poste | Budget |
|---|---|
| Vercel (Hobby ou Pro selon D-6) | 0-20 €/mois |
| Supabase Pro (projet dédié) | ~25 €/mois |
| Cloudinary | 0-30 €/mois |
| Resend | 0 € (free 3k/mois) |
| Domaine | ~10 €/an |
| Juridique/comptable | 250-500 € (structurel) |
| **Total infra** | **~45-75 €/mois** |

### Stack IA content (budgété, carte Wise virtuelle « Heaven »)
- Q2 2026 : 60 €/mois (Midjourney + ElevenLabs + Suno)
- Q4 2026 : 160 €/mois (+ HeyGen + Runway + CapCut)
- Q4 2027 : 380 €/mois (tout Pro)

### Bootstrap 6 mois
- Budget total : **< 2 000 €** (zéro paid ads)
- Détail : cf. [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/) §7.6

---

## 5. Canaux d'acquisition hiérarchisés

1. **Caming live** (Stripchat / Bongacams / Chaturbate) = canal **primaire** Mode B
   - 2-5 % des viewers d'une session deviennent abonnés free Fanvue dans les 7j
   - 10-20 % des abonnés acquis via caming sont actifs en PPV
2. **Social organique** (IG `@Yumiiiclub` + 2 backups, TikTok, Snap)
3. **Collaborations / influenceurs** (dès M6+)
4. **Paid ads adult-friendly** (Reddit, X, Telegram — hors scope bootstrap, budget ≥ 500 €/mois requis)

---

## 6. Objectifs chiffrés (milestones)

| Trimestre | Objectif | Chiffré |
|---|---|---|
| **M3** | Mode A seul (Yumi IA) | ≥ 500 abonnés free Fanvue + ≥ 100 € cumulés |
| **M6** | Mode B ouvert (1-2 modèles) | ≥ 400 €/mois A+B |
| **M9** | A+B plein régime + caming live | ≥ 750 €/mois A+B + marge SQWENSY ≥ 150 € |
| **M12** | Mode C v1 (1-2 clientes) | ≥ 1 150 €/mois A+B + 1 cliente C |

### Scénarios M12
- **Optimiste** : > 2 500 €/mois A+B → scale
- **Nominal** : 1 150 — 2 500 €/mois → continuer
- **Pessimiste** : < 500 €/mois → sortie ou pivot

Détails + modèle financier 24 mois : [`business/bp-agence-heaven-2026-04/`](../business/bp-agence-heaven-2026-04/) (Excel `Heaven_BP_financier_v1.xlsx`, 6 onglets).

---

## 7. Calcul commission détaillé (Mode B)

Exemple 300 €/mois brut Fanvue, Plan Découverte standard :
```
Revenu brut Fanvue :              300 €
- Commission Fanvue 15% :         -45 €
- Frais prod dédiés :             -50 €
= Net distribuable :              205 €
├── Part modèle 70% :             144 € → fiscalité ~15% P1/P2 → net ~122 €
└── Part SQWENSY 30% :             61 €
```
Annualisé : ~1 725 €/an → Palier P2.

---

## 8. Renégociation

- **Modèle** : vers 75/25 ou 80/20 au-delà de 2 000 €/mois × 3 mois consécutifs
- **Paliers SQWENSY** : activation TVA dès 3 mois × 2 000 €/mois de CA

---

## 9. Banques & cashflow

- **Wise Business unique SQWENSY** : compte IN/OUT multi-devises, 5 cartes virtuelles dédiées par branche (dont Heaven)
- **Revolut Business** : fallback si Wise bloque
- **Crypto** : backup si bancaire refuse (comptes adult-unfriendly BE)
- Payouts Fanvue : bank transfer min $20 compatible Wise directement

---

## 10. À VALIDER comptable/fiscaliste BE

- Plafond droit à l'image 2026 + conditions contenu adulte
- TVA revenus plateformes UK (Fanvue/OF) — régime export service hors UE
- Conditions ISOC PME 20 %
- AI Act UE — catégorie contenu IA adulte commercial
- Contrats types Mode B (Agence↔Modèle) et Mode C (SQWENSY↔B2B) — avocat
- Règles cumul chômage + activité complémentaire (Article 48 ONEM, Tremplin indépendant)
- Banques BE acceptant adult (alternative Revolut/Wise/crypto confirmée)

---

## 11. Pointers

- Source vérité business : [`business/bp-agence-heaven-2026-04/README.md`](../business/bp-agence-heaven-2026-04/README.md)
- Stratégie globale : [`STRATEGY-v1.2026-04-21.md`](./STRATEGY-v1.2026-04-21.md)
- Roadmap trimestrielle : [`ROADMAP-v1.2026-04-21.md`](./ROADMAP-v1.2026-04-21.md)
- Risques financiers : [`RISKS-v1.2026-04-21.md`](./RISKS-v1.2026-04-21.md)
- Paliers détaillés : BP Cowork `Heaven_Paliers_Remuneration_Modeles.docx`
- Modèle financier 24 mois : BP Cowork `Heaven_BP_financier_v1.xlsx`
