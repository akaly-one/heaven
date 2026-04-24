# UI-STANDARDS v1 — Messagerie + Contacts (Heaven)

> Date : 2026-04-24
> Auteur : Agent DEV #2 (BRIEF-02 tickets M01 full + M02)
> Status : v1 — source de vérité unique pour tout rendu conversationnel
> Portée : `/agence/messagerie` + dropdown header messages + dropdown header clients + futurs canaux (Fanvue, Telegram)

---

## 0. Pourquoi ce document

Le module messagerie a exhibé 4 incohérences (cf BRIEF-02 Bugs A→D) :
- Pseudo du même fan différent entre header (`pseudo:v`) et page (`visiteur-XXXX`)
- Avatar rendu par 2 composants différents
- Bulles de chat hardcodées dans chaque vue (0 réutilisation)
- Mode agent partiellement implémenté

Ce document **fige les 6 règles** qui rendent impossible toute divergence à l'avenir. Toute nouvelle plateforme (Fanvue, Telegram, Discord, Snap API) passe par ces règles sans exception.

### Invariant global (à citer dans tout PR review)

> **Le header = raccourci. Jamais un univers séparé.**
> Chaque conversation doit avoir un rendu **strictement identique** entre :
>   (1) dropdown header messages
>   (2) dropdown header clients (`clients-dropdown.tsx`)
>   (3) page `/agence/messagerie` liste + thread
>   (4) drawer contact profil
>
> Si un de ces 4 sites diverge → bug. Snapshot Playwright (cf §6) doit casser le build.

---

## 1. Règle Pseudo — `getConversationPseudo`

### 1.1 Source unique

Tous les consommateurs (header dropdowns, page messagerie, drawer contact) **DOIVENT** importer :

```ts
import { getConversationPseudo, type Handle } from "@/lib/messaging/conversation-display";
```

**Anti-pattern absolu** : hardcoder `` `@${pseudo}` `` dans un composant. Le helper gère déjà le `@` selon la source.

### 1.2 Priorité de résolution (ordre strict)

| Ordre | Source | Transformation | Ex. input | Ex. output |
|-------|--------|---------------|-----------|------------|
| 1 | `pseudo_insta` | strip `@` puis préfixer `@` | `yumi_club` / `@yumi_club` | `@yumi_club` |
| 2 | `pseudo_snap` (réel) | strip `@` puis préfixer `@` | `paloma.heaven` | `@paloma.heaven` |
| 2bis | `pseudo_snap` (anon) | tel quel (PAS de `@`) | `visiteur-005` / `guest-abc` | `visiteur-005` / `guest-abc` |
| 3 | `pseudo_web` | tel quel (déjà formaté) | `visiteur-042` | `visiteur-042` |
| 4 | `fanvue_handle` | strip `@` puis préfixer `@` | `yumi` | `@yumi` |
| 5 | `fan_id` préfixé `pseudo:` | `visiteur-<last4 lowercase>` | `pseudo:...12AB` | `visiteur-12ab` |
| 6 | `fan_id` plain UUID | `visiteur-<last4 lowercase>` | `abcd-...-MNOP` | `visiteur-mnop` |
| 7 | `display_name` | tel quel | `Paloma` | `Paloma` |
| 8 | aucun | `"visiteur"` (string littéral) | `{}` | `visiteur` |

**Détection anonyme** : regex `/^(visiteur|guest)/i` — insensible à la casse, matche `visiteur-NNN`, `guest-XXX`, `Visiteur-ABCD`.

### 1.3 Règle d'or `@`

- **TOUJOURS `@`** pour handles externes réels : Instagram, Snap (réel), Fanvue
- **JAMAIS `@`** pour les pseudos anonymes : `visiteur-NNN`, `guest-XXX`

**Pourquoi ?** Parce que `@visiteur-005` serait interprété comme un handle externe cliquable (lien mort). Les visiteurs anonymes n'ont pas de profil externe tant qu'ils n'ont pas upgrade via IdentityGate.

### 1.4 Type TS strict

```ts
export type Handle =
  | `@${string}`           // handle externe (Insta / Snap réel / Fanvue)
  | `visiteur-${string}`   // visiteur web anonyme (nouveau format)
  | `guest-${string}`      // legacy (à migrer BRIEF-13 UV10+)
  | "visiteur";            // ultime fallback
```

**Avant commit** : `npx tsc --noEmit` doit passer (strict activé dans `tsconfig.json`).

### 1.5 Test unit

Fichier : [`src/shared/lib/messaging/conversation-display.test.ts`](../../../src/shared/lib/messaging/conversation-display.test.ts)

31 cases couvrant les 8 priorités + invariants de cohérence. Runner : Vitest (cf STANDARDS-WEB-DEV-2026 §0).

### 1.6 Extension future

Nouveau canal (ex : `telegram_handle`) ? 3 étapes :
1. Ajouter le champ dans `ConversationLike`
2. Ajouter la branche dans `getConversationPseudo` respectant l'ordre de priorité (après `fanvue_handle`)
3. Ajouter 2 cases de test (sans `@`, avec `@`) + 1 case de priorité

---

## 2. Règle Avatar — `<ConversationAvatar>` (composant unique)

### 2.1 Source unique

Composant shared (à créer en TICKET-M03) :

```tsx
import { ConversationAvatar } from "@/components/messaging/conversation-avatar";

<ConversationAvatar
  conversation={conv}              // ConversationLike
  size={32}                        // 24 | 32 | 40 | 56
  variant="row"                    // row | thread | dropdown | profile
  modelAvatarUrl={modelSelf.avatarUrl}  // pour bulles outbound modèle
  hasUnread={conv.unread_count > 0}
/>
```

Sous-capot : délègue à `getAvatarStyle(conv)` pour couleurs/icône, puis rend l'icône lucide appropriée OU une photo si `modelAvatarUrl` dans le contexte outbound.

### 2.2 Rendu par plateforme (inbound = fan)

| Source | Icône lucide | Background | Color | Hover |
|--------|--------------|------------|-------|-------|
| Instagram (`pseudo_insta`) | `Instagram` | `rgba(193,53,132,0.12)` | `#C13584` | ring rose discret |
| Snap réel (`pseudo_snap` non-anon) | `Ghost` | `rgba(255,252,0,0.12)` | `#FFFC00` | ring jaune |
| Web anonyme (`pseudo_web`, `visiteur-NNN`, `guest-XXX`) | `Globe` | `rgba(156,163,175,0.12)` | `#9CA3AF` | ring gris |
| Fanvue (`fanvue_handle`) | `Heart` (pink outline) | `rgba(236,72,153,0.12)` | `#EC4899` | ring Fanvue |
| Upgradé (fan avec photo réelle) | photo (`img`) | n/a | n/a | ring `var(--accent)` |
| Modèle outbound (dans bulle thread) | photo modèle | n/a (cover) | n/a | ring `var(--accent)` or |

### 2.3 Tailles normalisées

| Contexte | Size | Icon px | Initial font |
|----------|------|---------|--------------|
| Dropdown header (cluster) | 24 | 12 | 9px bold |
| Liste row (`<ConversationRow>`) | 32 | 14 | 11px bold |
| Thread header / drawer card | 40 | 18 | 14px bold |
| Profil fan hero | 56 | 24 | 18px bold |

**WCAG 2.5.8 (Target Size)** : minimum 24px CSS + 4px padding = 28px au clic. Touch target mobile ≥ 44px obtenu via padding parent (le row entier est cliquable, pas juste l'avatar).

### 2.4 Accessibilité

```tsx
<div role="img" aria-label={`Avatar de ${pseudo} — ${platformLabel}`}>
  {/* icône lucide avec aria-hidden */}
  <Instagram aria-hidden className="w-4 h-4" />
</div>
```

- Icônes lucide-react : `aria-hidden="true"` (décoratif)
- Container : `role="img"` + `aria-label` descriptif
- Photo upload : `alt` = pseudo complet

### 2.5 Avatar modèle dans bulle outbound (nouveau)

Quand une bulle est envoyée par le modèle ou l'agent IA :
- **Avatar photo réelle modèle** à gauche de la bulle (cercle 28-32px)
- Source : `modelSelf.avatarUrl` (depuis `/api/models/photo?slug=yumi|paloma|ruby`)
- Fallback : gradient or + initiale majuscule (existant page.tsx:119)
- **Cluster detection** : si 2+ messages consécutifs du même acteur → 1 seul avatar affiché (le premier), les suivants ont un espace réservé transparent pour alignement

---

## 3. Règle Bulle conversation (liste) — `<ConversationRow>`

### 3.1 Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Avatar 32] │ @pseudo [Source dots] [Tier badge] [Mode chip] │
│             │ last msg preview (truncated 40ch)  [time ago]   │
│             │                                      [unread pill]│
└─────────────────────────────────────────────────────────────┘
```

- Padding : `12px` vertical, `16px` horizontal
- Gap : `12px` entre colonnes majeures, `8px` intra-cluster
- Hauteur row min : **56px** (touch target WCAG 2.5.8 confort)
- Border bottom : `1px solid var(--border)` (supprimé sur la dernière row)
- Hover : `background: var(--bg-hover)` + cursor pointer
- Active (conversation ouverte) : `background: var(--bg-active)` + ring gauche `var(--accent)` 2px

### 3.2 Unread pill

Badge rouge circulaire en haut à droite :
- `background: var(--accent)` (rouge `#E63329`)
- `color: #fff`
- `min-width: 18px`, `height: 18px`, `border-radius: 9999px`
- Text : `unread_count` (99+ si >99)
- Disparaît dès ouverture (CustomEvent `heaven:messages-read` — cf hotfix `528bdea`)
- `aria-label="{N} messages non lus"`

### 3.3 Source dots (multi-canal)

Si `sources = ["web", "instagram"]`, afficher 2 petits dots colorés côte à côte (4x4px) :
- Web : `#9CA3AF`
- Instagram : `#C13584`
- Fanvue : `#EC4899` (futur)

Tooltip `title` natif pour accessibilité.

### 3.4 Tier badge (si fan upgradé)

Pill mini 10px text :
- `WHALE` : bg `rgba(212,175,55,0.15)`, color or `#D4AF37`
- `VIP` : bg rose, color rose
- Sinon : absent

### 3.5 Mode chip (agent override par conversation)

Pill cliquable à droite du pseudo, à gauche du tier :
- `AUTO` : bg `rgba(48,209,88,0.12)`, color `var(--imessage-green)`, icon `Radio`
- `COPILOT` : bg `rgba(10,132,255,0.12)`, color `var(--imessage-blue)`, icon `Sparkles`
- `MANUAL` : bg `rgba(156,163,175,0.12)`, color `#9CA3AF`, icon `UserRound`
- Click → popover 3 choix + "Retour au défaut persona" (NULL → hérite persona globale)
- Fetch : `PUT /api/agence/messaging/mode` avec `{ fan_id, mode }`

Placement : **identique à 3 endroits** (cf §5 Mode placement).

### 3.6 Last msg preview

- Truncation : **40 caractères max** puis `…`
- Direction indicator : `›` devant si outbound (modèle/agent a envoyé le dernier)
- Si message IA : italique léger `opacity: 0.8` + sparkle mini icon
- Color : `var(--text-muted)` inbound, `var(--text)` outbound

### 3.7 Time ago

Helper partagé : `formatConversationTime(iso)` (déjà dans `conversation-display.ts`).
- `<1min` → "à l'instant"
- `<60min` → "5m"
- `<24h` → "3h"
- `<7j` → "2j"
- Sinon → date locale FR "15 avr."

### 3.8 Accessibilité row

```tsx
<li
  role="option"
  aria-selected={activeFanId === conv.fan_id}
  aria-label={`Conversation avec ${pseudo}, ${unread_count} non lus, dernier message ${timeAgo}`}
  tabIndex={activeFanId === conv.fan_id ? 0 : -1}
  onKeyDown={handleRovingTabindex}  // flèches haut/bas + Enter
>
```

Parent `<ul role="listbox" aria-label="Liste des conversations">`. Roving tabindex pattern ARIA standard.

---

## 4. Règle Bulle chat (thread) — `<MessageBubble>`

### 4.1 Discriminator `actor`

Union type strict :

```ts
type MessageActor =
  | "fan"                    // inbound — gris, gauche
  | "model_web"              // outbound modèle sur canal web — vert iMessage, droite
  | "model_instagram"        // outbound modèle sur canal IG — bleu iMessage, droite
  | "agent_ai"               // IA envoyée (sent=true) — même couleur que modèle + sparkle
  | "agent_draft";           // IA copilot pending (sent=false) — bg dashed, bot icon

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    actor: MessageActor;
    source: "web" | "instagram";
    ai_run_id?: string | null;   // présent si actor === "agent_ai"
  };
  modelAvatarUrl?: string | null;
  modelInitial?: string;
  showAvatar: boolean;           // false si cluster middle/end
  isFirstOfCluster: boolean;
}
```

### 4.2 Styling par actor (iMessage-inspired)

| Actor | Background | Text | Align | Avatar | Badge |
|-------|------------|------|-------|--------|-------|
| `fan` | `var(--bg)` + `border 1px var(--border)` | `var(--text)` | gauche | `<ConversationAvatar variant="thread">` | source dot |
| `model_web` | `var(--imessage-green)` `#30D158` | `#fff` | droite | photo modèle 28px | — |
| `model_instagram` | `var(--imessage-blue)` `#0A84FF` | `#fff` | droite | photo modèle + mini IG icon | — |
| `agent_ai` | même que `model_*` correspondant | `#fff` | droite | photo modèle | `✨` coin sup. droit |
| `agent_draft` | transparent + `border dashed var(--text-muted)` | `var(--text-muted)` italic | droite | bot icon 28px | `Brouillon IA` chip |

### 4.3 Tokens CSS (Tailwind v4 `@theme`)

À ajouter dans `src/app/globals.css` ou le layer theme :

```css
@theme {
  --imessage-green: #30D158;      /* Web outbound light */
  --imessage-blue: #0A84FF;       /* IG outbound light */
  --imessage-gray: var(--bg);     /* Inbound tous canaux */

  /* Dark mode OKLCH équivalents (luminosité stable) */
  --imessage-green-dark: oklch(72% 0.18 145);
  --imessage-blue-dark: oklch(65% 0.20 255);
}

@media (prefers-color-scheme: dark) {
  :root {
    --imessage-green: var(--imessage-green-dark);
    --imessage-blue: var(--imessage-blue-dark);
  }
}
```

### 4.4 Dimensions

- Max-width bulle : `75%` container (mobile) / `65%` (desktop ≥ 768px)
- Padding : `12px` vertical, `16px` horizontal
- Border-radius : `20px` tous coins, **4px** sur le coin le plus proche de l'avatar (tail pointer)
  - `fan` : `borderBottomLeftRadius: 4`
  - `model_*` / `agent_*` : `borderBottomRightRadius: 4`
- Gap entre bulles consécutives : `4px` (cluster) / `12px` (acteur différent)

### 4.5 Live region A11y (chat thread)

```tsx
<div
  role="log"
  aria-live="polite"
  aria-atomic="false"
  aria-relevant="additions"
  aria-label="Historique de la conversation"
>
  {messages.map(m => <MessageBubble key={m.id} {...m} />)}
  <div ref={chatEndRef} />
</div>
```

- `polite` par défaut (nouveau message annoncé sans interrompre)
- `aria-atomic="false"` : annonce le nouveau msg seul, pas toute la liste
- Debounce 500ms sur stream IA pour éviter spam screen reader

### 4.6 Cluster detection

Logique :
```ts
function isClusterStart(prev: Msg | undefined, curr: Msg): boolean {
  if (!prev) return true;
  if (prev.actor !== curr.actor) return true;
  const deltaMin = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / 60000;
  if (deltaMin > 5) return true;  // 5min gap → nouveau cluster
  return false;
}
```

Un cluster = plusieurs messages consécutifs du même acteur dans un délai court. **1 avatar par cluster** affiché sur le premier message ; les suivants ont un spacer transparent de même largeur pour alignement.

### 4.7 Ordre chronologique

**Standard iMessage/WhatsApp/Slack** (déjà livré en hotfix `528bdea`) :
- **Oldest top, newest bottom** (ASC par `created_at`)
- Scroll auto vers le bas au chargement du thread
- Scroll auto vers le bas à l'arrivée d'un nouveau message **SI** l'utilisateur est déjà au bas

### 4.8 Scroll preservation (nouveau)

Règle : **ne jamais forcer scroll vers le bas si l'utilisateur lit l'historique**.

```ts
// useScrollPreservation hook
const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
const [unseenCount, setUnseenCount] = useState(0);

useEffect(() => {
  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100; // tolerance 100px
    setShouldAutoScroll(atBottom);
    if (atBottom) setUnseenCount(0);
  };
  containerRef.current?.addEventListener("scroll", onScroll);
  return () => containerRef.current?.removeEventListener("scroll", onScroll);
}, []);

// Nouveau message arrive
useEffect(() => {
  if (shouldAutoScroll) {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  } else {
    setUnseenCount(n => n + 1);
  }
}, [messages.length]);
```

Badge sticky en bas quand `unseenCount > 0` :
```tsx
{unseenCount > 0 && (
  <button
    onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); setUnseenCount(0); }}
    className="sticky bottom-4 ..."
    aria-label={`${unseenCount} nouveau(x) message(s) — scroller vers le bas`}
  >
    {unseenCount} nouveau{unseenCount > 1 ? "x" : ""} ↓
  </button>
)}
```

### 4.9 Timestamp hover

Sur hover d'une bulle : tooltip affiche le timestamp complet FR (`15 avr. à 14h32`). Petit texte sous le cluster affiche l'heure début cluster en permanence (style iMessage).

### 4.10 Actions bulle (futur — prép M05)

Long-press mobile / right-click desktop sur une bulle :
- Copier texte
- Répondre (quote)
- Signaler (modération)
- Delete (admin only, avec audit log)

Hors scope v1, documenté pour M05+.

---

## 5. Mode agent — placement à 3 points d'entrée cohérents

### 5.1 Points d'entrée

Le mode agent par conversation (`agent_mode` column, migration 057) doit être éditable depuis **3 points cohérents** avec la même UI (`<AgentModeChip>`) et le même endpoint (`PUT /api/agence/messaging/mode`) :

1. **Conversation row (liste)** `<ConversationRow>`
   - Position : après pseudo + tier, avant time ago
   - Compact : icon + label court (`AUTO` / `COPILOT` / `MANUAL`)
   - Click → popover inline (absolute, above row)

2. **Thread header (page messagerie)**
   - Position : à droite du pseudo dans la bande thread
   - Même composant `<AgentModeChip>`, mais en taille `md` (plus grande)
   - Popover avec description du mode + bouton "Retour au défaut persona"

3. **Dropdown header (raccourci global)**
   - Position : à droite du pseudo dans chaque row du dropdown
   - Taille `sm` (identique conversation row)
   - Click → popover contextuel 3 choix sans navigation

### 5.2 Sémantique unifiée

| Mode | Label | Description | Color | Icon |
|------|-------|-------------|-------|------|
| `AUTO` | Auto | L'agent IA répond instantanément sans validation | `var(--imessage-green)` | `Radio` |
| `COPILOT` | Copilot | L'agent génère un brouillon, admin valide avant envoi | `var(--imessage-blue)` | `Sparkles` |
| `MANUAL` | Manuel | 100% humain, l'IA ne répond pas | `#9CA3AF` | `UserRound` |
| `null` | Défaut persona | Utilise la persona globale (cf module `ai-conversational-agent`) | `var(--text-muted)` | `GraduationCap` |

### 5.3 Payload endpoint

`PUT /api/agence/messaging/mode`
```json
{ "fan_id": "uuid | pseudo:<id>", "mode": "AUTO" | "COPILOT" | "MANUAL" | null }
```

Response :
```json
{ "ok": true, "mode": "AUTO", "updated_at": "2026-04-24T..." }
```

### 5.4 Synchronisation UI

Après succès PUT :
- Dispatch CustomEvent `heaven:agent-mode-changed` avec `{ fan_id, mode }`
- Tous les composants consommateurs (row, thread header, dropdown) écoutent et se rafraîchissent
- Cache local (`useSWR` ou similaire) invalide la conversation concernée

### 5.5 État de transition

- Pendant PUT : chip affiche `<Loader2 className="animate-spin w-3 h-3" />` (opacité 0.6)
- Si échec : toast erreur + revert local
- Si succès : animation flash subtil (scale 1.05 → 1 sur 200ms)

---

## 6. Matrice cohérence header ↔ messagerie ↔ profil

### 6.1 Matrice de test

Pour un même fan `f` avec données fixes, les 4 vues doivent rendre **exactement** les mêmes primitives :

| Vue | Pseudo | Avatar icône | Mode chip | Unread pill | Time ago |
|-----|--------|--------------|-----------|-------------|----------|
| Dropdown header messages | identique | identique | identique | identique | identique |
| Dropdown header clients | identique | identique | n/a | n/a | n/a |
| Page `/agence/messagerie` row | identique | identique | identique | identique | identique |
| Drawer contact header | identique | identique (taille 40) | identique (taille md) | n/a | n/a |

**Règle** : les 4 vues consomment **les mêmes helpers** (`getConversationPseudo`, `getAvatarStyle`, `formatConversationTime`) et **les mêmes composants** (`<ConversationAvatar>`, `<AgentModeChip>`).

### 6.2 Snapshot Playwright (TICKET-M07)

Test e2e auto qui charge un fan de test avec :
- `pseudo_insta = null`
- `pseudo_snap = "visiteur-005"`
- `fan_id = "pseudo:abcd-efgh-ijkl-mn12"`

Attendu : rendu `visiteur-005` (SANS `@`) dans les 4 vues, icône `Globe`, color `#9CA3AF`.

```ts
// e2e/messaging-coherence.spec.ts (à créer en M07)
test("cohérence rendu fan visiteur entre header dropdown et page", async ({ page }) => {
  await page.goto("/agence/messagerie");
  const pagePseudo = await page.locator('[data-testid="conversation-row"][data-fan-id*="mn12"] [data-testid="pseudo"]').textContent();

  await page.locator('[data-testid="header-messages-trigger"]').click();
  const headerPseudo = await page.locator('[data-testid="dropdown-message-row"][data-fan-id*="mn12"] [data-testid="pseudo"]').textContent();

  expect(pagePseudo).toBe("visiteur-005");
  expect(headerPseudo).toBe("visiteur-005");
  expect(pagePseudo).toBe(headerPseudo);
});
```

### 6.3 Check-list PR (anti-régression)

Avant de merger un PR touchant la messagerie :

- [ ] Le helper `getConversationPseudo` n'a pas été modifié (ou s'il l'a été, 31 tests unit passent)
- [ ] Aucun composant ne hardcode `` `@${pseudo}` `` — utilise `getConversationPseudo` partout
- [ ] Aucun composant n'importe `Avatar` custom — utilise `<ConversationAvatar>`
- [ ] Aucune bulle n'a de styling inline — utilise `<MessageBubble>`
- [ ] Mode chip présent dans les 3 points d'entrée (row / thread / dropdown)
- [ ] Snapshot Playwright `messaging-coherence.spec.ts` passe
- [ ] Axe-core 0 critical sur les composants nouveaux
- [ ] Touch target ≥ 44px (vérif manuelle mobile)

### 6.4 Dark mode & thèmes

Toutes les couleurs référencées **DOIVENT** être soit :
- Des tokens CSS variables (`var(--accent)`, `var(--bg)`, `var(--text-muted)`, `var(--imessage-green)` etc.)
- Des valeurs OKLCH pour luminosité stable (cf `@theme` Tailwind v4)

**Interdit** : hex codes en dur dans JSX sauf justifié (ex : couleurs brand réseau externe `#C13584` Instagram — OK parce que branding officiel).

---

## 7. Annexes

### 7.1 Références internes

- Helper source : [`src/shared/lib/messaging/conversation-display.ts`](../../../src/shared/lib/messaging/conversation-display.ts)
- Test unit : [`src/shared/lib/messaging/conversation-display.test.ts`](../../../src/shared/lib/messaging/conversation-display.test.ts)
- Standards a11y + testing : [`plans/modules/ai-conversational-agent/STANDARDS-WEB-DEV-2026.md`](../ai-conversational-agent/STANDARDS-WEB-DEV-2026.md)
- Brief parent : [`plans/PMO/briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md`](../../PMO/briefs/BRIEF-2026-04-24-02-messenger-ui-standards.md)
- Roadmap master : [`plans/PMO/03-ROADMAP-MASTER.md`](../../PMO/03-ROADMAP-MASTER.md)

### 7.2 Références externes (WCAG 2.2 AA)

- [WCAG 2.2 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WCAG 2.2 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [ARIA 1.3 listbox pattern](https://w3c.github.io/aria/#listbox)
- [ARIA 1.3 log role](https://w3c.github.io/aria/#log)

### 7.3 Changelog ce document

| Date | Version | Changement |
|------|---------|------------|
| 2026-04-24 | v1 | Création initiale (TICKET-M01 full + M02) — 6 sections + helper fixé + 31 tests |

---

## 8. Prochains tickets (dépendent de ce doc)

- **TICKET-M03** — Créer `<ConversationAvatar>` shared (base §2)
- **TICKET-M04** — Créer `<ConversationRow>` shared (base §3)
- **TICKET-M05** — Créer `<MessageBubble>` shared avec discriminator `actor` + tokens CSS (base §4)
- **TICKET-M06** — Créer `<AgentModeChip>` shared + câbler 3 points d'entrée (base §5)
- **TICKET-M07** — Snapshot Playwright cohérence 4 vues + axe-core 0 critical (base §6)
