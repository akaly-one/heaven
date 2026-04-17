# 02 — Design

## Identité visuelle

Branding "poker" — chaque tier = une carte. Couleurs neutres + accent or (`#c9a84c`).

## Palette

- Fond : `#0f0f1a`
- Surface : `#1a1a2e` / `#22223a`
- Accent : `#c9a84c` (or)
- Texte : `#e8e8f0` / `#8888a0`
- Border : `rgba(201,168,76,0.12)`

## Profils — couleurs signature

| Profil | Couleur |
|--------|---------|
| YUMI | `#E84393` (rose vif) |
| RUBY | `#9B6BFF` (violet) |
| PALOMA | `#D4A574` (beige chaud) |

Définies dans `apps/lib/src/config/entities/{slug}.ts`.

## Tier System — Poker Branding

5 tiers (source : BP-HEAVEN §5) :
1. **2♦** — Accès basique (wall publique)
2. **J♣** — Tier intermédiaire (feed + stories)
3. **Q♥** — Premium (packs tier-locked)
4. **K♠** — VIP (accès full galerie)
5. **A♠** — VVIP (direct messages + événements)

Mappés sur `tier_utils.ts`. Couleurs dynamiques via CSS vars, theme-aware.

## Composants clés

- Hero collapse animation (profil scroll)
- Gallery masonry + daily shuffle + zoom
- Stories bar + fullscreen viewer
- Locked posts → blur (pas noir)
- Client badge tier-based
- BEACON widget (dark mode natif, bubble pulsante or)

## Dark mode

Default = dark. Toggle via `theme-provider.tsx` + `theme-toggle.tsx`. Attribut `data-theme` sur `<html>`.
