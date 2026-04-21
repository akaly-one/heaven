# Profil public — Stratégie v1 (2026-04-21)

> Page publique du modèle : `/m/<slug>`.
> Skeleton unifié pour les 3 profils (m1/m2/m3 = yumi/paloma/ruby).
> Point de conversion #1 du funnel Heaven : visiteur → fan → abonné Fanvue.

---

## 1. Contexte

Le profil public est la **vitrine** d'un modèle Heaven. Il regroupe :

- hero (avatar + display_name + bio + CTA plateformes externes)
- feed d'actualités (posts manuels + posts Instagram syncés + wall clients)
- packs PPV (tiers P0→P4 avec règles d'accès)
- stories TTL 24h
- interaction chat + codes d'accès

Aujourd'hui le feed est déjà **polymorphe** (vue `agence_feed_items`, `source_type in ('manual','instagram','wall')` — migration 038). Le composant `<FeedSection>` consomme `/api/feed?model=<slug>` et distingue déjà les cartes Instagram avec un badge gradient violet/rose + icône Insta (cf. `src/web/components/profile/feed-section.tsx` ligne 212+).

---

## 2. Briefs NB — ce qui évolue (B9 + B10)

### 2.1. Posts Insta dans le feed public (B10)

Cible : **quand un modèle poste sur Insta, le post apparaît automatiquement dans le feed `/m/<slug>`**.

Déjà implémenté côté sync (cron `sync-instagram` daily 6h — `src/app/api/cron/sync-instagram/route.ts`). L'infra est posée. Le brief réaffirme la règle produit :

- **Zéro double-publication manuelle** : le modèle ne re-poste jamais sur le profil public ce qui est déjà sur Instagram
- **Sync temps réel** : objectif à terme → webhook IG pour insert immédiat dans `agence_feed_items` (aujourd'hui : 1/jour sur Hobby, D-6 pour Upstash QStash)

### 2.2. Click post Insta → renvoie Insta natif (B10)

Règle d'interaction : depuis `/m/<slug>`, **un click sur une carte Insta ouvre la publication Insta originale** (pas un modal interne).

- Le commentaire, le like, le DM se font sur Insta natif (pas sur Heaven)
- Rationale : Heaven ne peut pas répondre à des likes/commentaires IG en tant que modèle sans authentification Meta côté visiteur. On envoie donc le visiteur sur sa propre app Insta pour interagir.
- Lien : `item.permalink` (stocké dans `agence_feed_items` lors du sync)
- Comportement technique : `<a href={permalink} target="_blank" rel="noopener">`

### 2.3. Badges distinctifs dans le feed (B10)

Le feed mélange 3 sources. L'utilisateur public doit distinguer visuellement :

| Source | Badge | Couleur | Emplacement |
|---|---|---|---|
| `instagram` | gradient violet/rose + icône `Instagram` + texte « INSTAGRAM » | `linear-gradient(135deg, #f09433→#bc1888)` | Header carte |
| `manual` (post web exclusif) | couronne `Crown` + texte « YUMI EXCLU » (ou équivalent modèle) | or `#D4AF37` | Header carte |
| `wall` (post fan sur le mur) | icône `MessageSquare` + pseudo visiteur | `var(--accent)` | Header carte |

Le badge Instagram est déjà en place (lignes 231-238 de `feed-section.tsx`). Le badge **« couronne exclu »** sur les posts manuels est à ajouter.

### 2.4. Header actions — boutons natifs Insta (B9)

Symétrie avec le Dashboard (module `dashboard`) : le **header public** du profil `/m/<slug>` embarque lui aussi les deux CTA :

- **« Suivre sur Insta »** → `https://instagram.com/<ig_username>`
- **« Message sur Insta »** → `https://ig.me/m/<ig_username>`

Ces boutons **remplacent** les CTA génériques actuels (« Message » ambigu qui ouvre le chat interne). Le chat interne reste accessible via un CTA distinct clairement étiqueté « Chat Heaven ».

### 2.5. Pages uniformes 3 modèles

Règle produit : **même skeleton pour Yumi, Paloma, Ruby**. La personnalisation passe uniquement par :

- `agence_models` : display_name, bio, avatar_url, tier_palette custom
- `agence_feed_items` : contenu
- `agence_packs` : offres PPV
- `instagram_config` : compte IG lié (username, token)

**Aucun code spécifique par modèle**. Fichier unique : `src/app/m/[slug]/page.tsx`. Les 3 profils rendent la même UI dynamique. Cohérent avec la section scoping `model_id` de `plans/tech/architecture.md`.

---

## 3. Parcours utilisateur

### 3.1. Visiteur anonyme

```
1. Arrive sur /m/yumi
2. IdentityGate : pseudo + plateforme (Snap/IG/Fanvue)
3. Voit hero + feed public (tier P0)
4. Packs locked (visuel flou + CTA « Débloquer »)
5. CTA « Suivre sur Insta » | « Message sur Insta » | « Chat Heaven »
6. Stories visibles en bandeau top (TTL 24h)
```

### 3.2. Fan vérifié (code valide)

```
1. /m/yumi?code=XXXX
2. AccessCode workflow → tier unlocked
3. Feed affiche aussi packs P1-P<N> (selon code)
4. Chat Heaven actif
5. Wall : peut répondre
```

### 3.3. Modèle connectée

```
1. /m/yumi en mode logged-in (session CP)
2. Bouton « Edit mode » visible → passe en édition
3. Peut modifier bio, avatar (upload Cloudinary), tiers packs
4. Peut poster sur feed (source_type=manual) ou wall
```

---

## 4. Règles feed (contenu vs visibilité)

### 4.1. Posts Instagram
- Toujours public (tier=P0 implicite — Meta ne permet pas de contenu privé via Graph API)
- Affichage : badge Instagram + click → permalink natif

### 4.2. Posts manuels (contenu exclu web)
- Tier configurable : P0 (public) à P4 (VIP)
- Badge couronne modèle visible
- Click → modal interne de la publication (like/comment interne)

### 4.3. Posts wall (réponses fan)
- Tier hérité du visiteur
- Badge pseudo/plateforme
- Click → expand inline

### 4.4. Ordre
- `pinned DESC, posted_at DESC`
- Pagination 20 par page (scroll infini)

---

## 5. Critères UX de succès

1. **1 seule page par modèle** — zéro fork code spécifique
2. **Les 3 sources de feed coexistent visuellement** avec badges non-ambigus
3. **Un post Insta = un click = app Insta ouverte** (pas de modal interne pour IG)
4. **Les deux CTA Insta natifs visibles dès le hero** (desktop + mobile)
5. **Mobile-first** : le feed, les stories et les packs restent scrollables sans layout shift
6. **Cohérence avatar** : même image affichée ici qu'au Dashboard (module `dashboard` § sync IG)

---

## 6. Dépendances

- Module `dashboard` : source avatar IG commune (priorité IG > Cloudinary)
- Module `instagram` : sync posts + permalinks stockés
- Module `contenu-packs` : tiers d'accès des posts manuels
- Module `messagerie-contacts` : chat Heaven depuis profil public

---

## 7. Hors scope

- Tier system détaillé (cf. `plans/product/objectifs.md` — KPIs Mode B)
- DMCA Release Form workflow (Sprint 3 BP)
- Edit mode avancé (déjà en partie existant via `useEditMode`)
- Paiement Stripe (flux Fanvue-first, Stripe côté cession C)

---

## 8. Liens

- Route : `src/app/m/[slug]/page.tsx` (1 473L à mettre au régime)
- Composant feed : `src/web/components/profile/feed-section.tsx`
- API feed polymorphe : `src/app/api/feed/route.ts`
- Cron sync IG : `src/app/api/cron/sync-instagram/route.ts`
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
- Dashboard : `plans/modules/dashboard/STRATEGIE-v1.2026-04-21.md`
