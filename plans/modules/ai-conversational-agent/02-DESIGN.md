# 02 — Design (UX / UI / Responsive)

> **Phase 2** : Design system, wireframes, flows utilisateur, spécifications responsive mobile-first.
> **Cible** : UX Pro Max — pas de complexité inutile, efficace, humanisé.

---

## 1. Principes UX

1. **Mobile-first** — Yumi opère depuis son tel 80% du temps
2. **Moins de clics** — inbox → conv → reply en ≤2 taps
3. **Statut agent toujours visible** — jamais douter si c'est agent ou humain qui répond
4. **Reprise de main instantanée** — "prendre la main" 1 tap, agent OFF immédiat pour cette conv
5. **Zéro ambiguïté** — indicateur visuel fort pour messages IA (border/badge discret mais présent côté admin, invisible côté fan)
6. **Progressive disclosure** — config agent avancée cachée derrière "Paramètres avancés"
7. **Feedback instantané** — thumbs up/down par message, saved immédiatement

---

## 2. Design System (tokens + composants)

### 2.1 Tokens existants (déjà en place)

- **Couleurs** : accent rouge `#E63329`, rose `#E84393`, or `#D4AF37`, verts/ambre pour statuts
- **Typo** : inter var, tailles 10/11/12/13/14/16/18
- **Spacing** : Tailwind v4 standard (0.5/1/2/3/4/6/8)
- **Radius** : `rounded-lg` / `rounded-xl` / `rounded-2xl`
- **Shadow** : `shadow-xl` pour dropdowns, `shadow-sm` cartes

### 2.2 Nouveaux tokens nécessaires

| Token | Valeur | Usage |
|-------|--------|-------|
| `--agent-active` | `#8B5CF6` (violet) | Badge agent ON, indicateur mode auto |
| `--agent-inactive` | `#6B7280` (gris) | Badge agent OFF |
| `--ai-typing` | gradient `#8B5CF6 → #E84393` animé | Typing indicator IA |
| `--safety-warn` | `#F59E0B` ambre | Message flaggé par classifier (warning) |
| `--safety-block` | `#EF4444` rouge | Message bloqué (NSFW/spam) |

### 2.3 Nouveaux composants

| Composant | Rôle | Localisation |
|-----------|------|--------------|
| `<AgentBadge variant="active|inactive|override" />` | Badge visible côté admin (thread header) | `src/cp/components/cockpit/messagerie/agent-badge.tsx` |
| `<AgentModeToggle conversationId />` | Switch agent auto/humain par conv | `src/cp/components/cockpit/messagerie/agent-mode-toggle.tsx` |
| `<AgentTypingIndicator />` | Animation "l'agent prépare une réponse" | idem |
| `<AgentResponseCard message aiMeta />` | Bulle message avec hover tooltip (model used, temp, tokens, latency) + thumbs up/down inline | idem |
| `<SafetyFlag type="warn|block" reason />` | Badge rouge/ambre sur messages problématiques | idem |
| `<AgentTrainingPanel />` | Page d'entraînement (prompts + examples + rollback) | `src/cp/components/cockpit/agent/training-panel.tsx` |
| `<PromptVersionTimeline />` | Historique versions prompts avec diff | idem |
| `<ConversionAttributionBar />` | Barre funnel fan : DM → Click Fanvue → Abonné (couleurs) | `src/cp/components/cockpit/conversion/attribution-bar.tsx` |

---

## 3. Wireframes principaux (desktop + mobile)

### 3.1 Messagerie inbox avec agent status

**Desktop (≥1024px)** — split 3 panes
```
┌──────────────────────────────────────────────────────────────────┐
│  Header: • ROOT · yumi / Messagerie          [Agent ON 🟣] [⚙]  │
├────────────────┬──────────────────────────────────┬──────────────┤
│  INBOX         │  CONVERSATION                    │  CONTACT     │
│  ─────────     │  ─────────────                   │  ────────    │
│  [🟣] @fan1  🆕│  @fan1 · 24h ⏱️ 18m left         │  Avatar      │
│  "Hey bb..."   │                                  │  @fan1       │
│  il y a 2m     │  ┌────────────────┐              │  IG · Fanvue │
│                │  │ Hey bb ça va?  │              │              │
│  [👤] @fan2    │  └────────────────┘              │  Notes:      │
│  "Wow magnif"  │           il y a 2m              │  …           │
│  il y a 15m    │                                  │              │
│                │              ┌───────────────┐   │  [Prendre    │
│  [🟣] @fan3    │              │Hey mon cœur💜  │   │   la main]   │
│  "Tu fais..."  │              │super et toi? │   │              │
│  il y a 1h     │              └───────────────┘   │  [Lien       │
│                │          🟣 Agent · Haiku · 3.2s │   Fanvue UTM]│
│  ...           │          👍 👎  "Modifier"       │              │
│                │                                  │              │
│                │  ┌────────────────────────────┐  │              │
│                │  │ Taper une réponse...       │  │              │
│                │  │ [🟣 Auto] [👤 Humain]  ➜  │  │              │
│                │  └────────────────────────────┘  │              │
└────────────────┴──────────────────────────────────┴──────────────┘
```

- Badge `🟣` = agent ON pour cette conv · `👤` = humain / agent OFF
- `🆕` = nouveau message pas lu
- Bulle agent = border violette discrète (admin only, invisible côté fan)
- Hover bulle agent → tooltip `ai_model_used · temperature · tokens_in/out · latency_ms`
- `👍/👎` par bulle agent → feedback direct vers Training UI

**Mobile (<768px)** — stacked, 1 pane à la fois
```
┌────────────────────┐
│ ← Messagerie  ⚙   │
│ [Agent global: ON] │
├────────────────────┤
│ Tabs: All | IG | Web│
├────────────────────┤
│ [🟣] @fan1 🆕      │
│ "Hey bb ça va?"    │
│ 2m                 │
├────────────────────┤
│ [👤] @fan2         │
│ "Wow magnif"       │
│ 15m                │
├────────────────────┤
│ ...                │
└────────────────────┘
```
Tap conv → slide à droite → vue conversation full-screen → swipe right = back.

Reply composer = **bottom sheet** sticky (input + channel selector + send).

### 3.2 Agent Training UI

**Route** : `/agence/agent-training` (Yumi only, cross-model si fusion)

```
┌──────────────────────────────────────────────────────────────┐
│ Header: Training Agent — Yumi (m1)          [Save draft] [▶ Test] │
├──────────────────────────────────────────────────────────────┤
│ TABS: [Prompt Base] [Examples] [Guardrails] [Versions]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Prompt base v12 · saved 2h ago                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tu es Yumi, 25 ans, créatrice de contenu exclusive... │ │
│  │ Tu flirtes avec naturel, chaleureuse, jamais explicite│ │
│  │ en DM. Redirige vers Fanvue pour tout contenu premium.│ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [👁 Preview system prompt final (avec examples + context)] │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ EXAMPLES (7/10 slots) — ajouter depuis conv réelle ou saisir │
│                                                              │
│  Input:  "T'es tellement belle bb"                           │
│  Output: "Merci mon cœur 🥰 Tu as vu mes dernières photos?" │
│  [👍 gardé] [🗑 supprimer] [↻ regen]                        │
│                                                              │
│  Input:  "Envoie moi une photo cachée stp"                   │
│  Output: "Tout mon contenu coquin est sur Fanvue mon chou 💋"│
│  [👍 gardé]                                                  │
│                                                              │
│  [+ Ajouter example]                                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ SANDBOX TEST                                                 │
│  Tape un message test :                                      │
│  ┌────────────────────────────────┐                          │
│  │ Hey mon cœur                   │  [Envoyer test]         │
│  └────────────────────────────────┘                          │
│                                                              │
│  Réponse agent simulée (Haiku, v12, 2.3s):                   │
│  "Hey toi 🥰 comment tu vas?"                                │
│                                                              │
│  [Promouvoir cette version en prod] [Modifier prompt]       │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Dashboard Conversion (funnel Fanvue)

**Route** : `/agence` (Dashboard tab) ou `/agence/ops` section funnel

```
┌────────────────────────────────────────────────────────────────┐
│ Funnel — 7 derniers jours · scope: Yumi (m1)                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  IG DMs reçus        1,247  ████████████████  100%            │
│  Répondus par agent  1,182  ███████████████   94.8%           │
│  Click Fanvue lien     187  ██               15.0%            │
│  Conversion J+7         23  ▌                 1.8%            │
│                                                                │
│  Revenu attribué: 287 € · Coût IA: 12.40 € · ROI: 22x         │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 ROOT mode présentation (skeleton vide)

**Règle** : sur ROOT, chaque panel remplace sa data par une carte descriptive.

```
┌────────────────────────────────────────────────────────────────┐
│ Module — Messagerie                                 🧪 ROOT    │
├────────────────────────────────────────────────────────────────┤
│  📩 Fonction principale                                       │
│  Inbox unifiée web + Instagram, grouping par fan,             │
│  mode agent auto / humain par conversation.                   │
│                                                                │
│  🔗 APIs utilisées                                            │
│  GET /api/agence/messaging/inbox                              │
│  POST /api/agence/messaging/reply                             │
│  GET /api/agence/messaging/contact                            │
│  POST /api/instagram/webhook                                  │
│  POST /api/instagram/send                                     │
│                                                                │
│  🔐 Rôles autorisés                                           │
│  • root : mode présentation (ce que tu vois)                 │
│  • yumi : données m1 uniquement                              │
│  • paloma / ruby : données own                               │
│                                                                │
│  🗄 Sources de données                                        │
│  • agence_messages_timeline (view UNION web+ig)              │
│  • agence_fans · instagram_conversations                     │
│                                                                │
│  🔗 Modules liés                                              │
│  → Agent IA · Instagram · Clients                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Flows utilisateur clés

### 4.1 Flow — Fan DM IG reçu, agent répond

```
Fan (IG)                Meta API               Heaven Backend         Agent IA              Yumi admin
   │                       │                        │                    │                      │
   │─── "Hey bb ça va?" ──►│                        │                    │                      │
   │                       │── webhook POST ───────►│                    │                      │
   │                       │                        │─ dedup UNIQUE ─┐   │                      │
   │                       │                        │◄───────────────┘   │                      │
   │                       │                        │─ enqueue (queue)   │                      │
   │                       │                        │─ return 200 OK ◄──────                    │
   │                       │                        │                    │                      │
   │                       │                        │  [Cron worker 1min]│                      │
   │                       │                        │◄── claim_ig_reply_jobs                    │
   │                       │                        │─ load context ────►│                      │
   │                       │                        │  (history + prompt)│                      │
   │                       │                        │─ classify intent ─►│                      │
   │                       │                        │  (small_talk_entry)│                      │
   │                       │                        │─ route: Haiku ───►│                      │
   │                       │                        │                    │─ Claude API ────┐    │
   │                       │                        │                    │◄────────────────┘    │
   │                       │                        │  safety check ────►│                      │
   │                       │                        │  (no leak, no NSFW)│                      │
   │                       │                        │─ persist message   │                      │
   │                       │                        │  (ai_run_id logged)│                      │
   │                       │◄── send reply ─────────│                    │                      │
   │◄─── "Hey mon cœur" ──│                        │                    │                      │
   │                       │                        │                    │                      │
   │                       │                        │                    │                      │─ SSE notification
   │                       │                        │                    │                      │◄── new msg badge
```

### 4.2 Flow — Yumi prend la main

```
Yumi voit bulle agent → tap "Prendre la main"
  ↓
POST /api/agence/messaging/override { conversation_id, mode: "human" }
  ↓
instagram_conversations.mode = "human" (persistent)
  ↓
UI refresh: badge agent → 👤 humain
  ↓
Yumi tape réponse manuelle → envoi direct Meta API (agent ne touche plus)
```

### 4.3 Flow — Yumi corrige une réponse agent

```
Yumi hover bulle agent → clique 👎
  ↓
Modal: "Qu'est-ce qui n'allait pas ?"
  Options: [Ton pas bon] [Trop long] [Pas flirt] [Autre texte]
  Input: "Suggère une meilleure réponse"
  ↓
Yumi tape sa version
  ↓
POST /api/agence/agent-training/feedback { ai_run_id, correction, reason }
  ↓
Ajouté automatiquement aux examples du prompt (avec thumbs up)
  ↓
Notification: "Example ajouté au prompt v12 — 8/10 slots"
```

### 4.4 Flow — Paloma active son agent (Phase 9)

```
Paloma login → /agence/settings → tab "Agent DM"
  ↓
Voit config minimale : [Toggle ON/OFF] [Editer prompt]
  ↓
Clique "Activer mon agent"
  ↓
POST /api/agence/agent-config { model_slug: "paloma", is_active: true }
  ↓
instagram_config.is_active = true pour m2
  ↓
Worker prend en compte m2 au prochain run
  ↓
Paloma reçoit DM → agent m2 répond avec son propre prompt (jamais celui de m1)
```

---

## 5. Responsive & accessibilité

### 5.1 Breakpoints

| Breakpoint | Range | Layout |
|------------|-------|--------|
| xs | <640px | Stack vertical, bottom sheet composer, 1 pane |
| sm | 640-767px | idem, drawer contact = overlay full |
| md | 768-1023px | 2 panes (inbox + thread), drawer = side panel |
| lg | ≥1024px | 3 panes (inbox + thread + drawer) |
| xl | ≥1280px | idem + padding plus généreux |

### 5.2 Gestes mobile

- **Swipe right** : back (thread → inbox)
- **Long press bulle agent** : ouvrir modal feedback (👍/👎/edit)
- **Swipe left sur conversation item** : actions rapides (archiver, marquer lu, mode human)
- **Pull to refresh** : recharger inbox

### 5.3 Accessibilité WCAG AA

- ✅ Contrastes min 4.5:1 pour texte (actuels tokens respectent)
- ✅ `aria-label` sur boutons icon-only
- ✅ Focus visible (ring violet 2px sur tous focusable)
- ✅ Keyboard shortcuts : `⌘K` command palette, `E` = envoyer, `H` = prendre la main, `R` = refresh
- ✅ Screen reader : `aria-live="polite"` pour nouvelles bulles, `role="status"` pour badges

### 5.4 Performance

- Lazy load : panels Training / Conversion pas chargés avant tab click
- Virtualisation liste inbox si >100 conversations (lib `react-virtuoso` légère)
- Images avatars : `next/image` + Cloudinary edge cache 30j (déjà configuré)
- Prompts longs : streaming progressif réponse agent (SSE dans sandbox test)

---

## 6. Micro-interactions & polish

- **Typing indicator IA** : 3 dots animés violet→rose gradient, fade in/out pendant que l'agent prépare (quand `ai_run` en status `running`)
- **Nouveau message arrive** : glow violet 2s sur item inbox + son discret (toggleable)
- **Thumbs up/down** : animation scale + confetti léger pour 👍 (positive reinforcement)
- **Prompt version save** : toast "Saved v13" avec lien undo "rollback v12"
- **Agent ON/OFF** : transition smooth badge couleur 200ms ease-out
- **Safety block** : bulle message fan shake horizontal + badge rouge "filtré"

---

## 7. Dark mode

- Déjà supporté via tokens CSS `var(--*)` existants
- Nouveaux tokens agent doivent avoir variante dark (violet plus saturé en dark)

---

## 8. Deliverables Phase 2

- [ ] Storybook entries pour 6 nouveaux composants (dev visualizer)
- [ ] Figma wireframes (ou variante HTML statique) validés NB
- [ ] Specs mobile détaillées par écran
- [ ] Accessibility checklist WCAG AA signed

---

## 9. Prochaine phase

**→ Phase 3 — Refonte 3-CP** (Guard unifié + mode présentation ROOT + Yumi admin cross-model option 2)
Livrable : patches sur `config/modules.ts`, `auth-guard.tsx`, `sidebar.tsx`, `header.tsx`, pages settings.
