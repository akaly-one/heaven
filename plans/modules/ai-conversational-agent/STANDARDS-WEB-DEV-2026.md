# STANDARDS-WEB-DEV-2026 — AI Conversational Agent (Heaven / Yumi)

> Reference 2026 pour piloter l'implem du module. Stack : Next.js 15+, React 19, TS strict, Tailwind v4, Supabase RLS. MAJ 2026-04-23. Sources cites par section.

## 0. TL;DR

| Domaine | Choix 2026 | Justification |
|---|---|---|
| Realtime stream IA | **SSE + Supabase Realtime** (pas WebSocket V1) | 1-way server->client suffit, infra simple |
| Test runner | **Vitest** | 10-20x plus rapide Jest, ESM natif |
| E2E | **Playwright** | 91% sat StateOfJS 2025, +20pts vs Cypress |
| Validation | **Zod v4** + branded types | Schema partage client/server |
| Caching | `use cache` si N16, sinon `revalidateTag` N15 | PPR par defaut avec Cache Components |
| A11y CI | **axe-core + Pa11y + Lighthouse CI** | 30-40% auto, reste manual NVDA/VO |
| Chat a11y | `role="log"` + `aria-live="polite"` | WCAG 4.1.3 Status Messages AA |
| Observability | **Sentry SDK** ou GlitchTip self-host | Cost-optim 2026 |

Red flags plan existant -> section 11.

---

## 1. Accessibilite WCAG 2.2 AA

### Nouveaux criteres AA (obligatoires 2026)
- **2.4.11 Focus Not Obscured** — focus visible, pas cache par sticky header (scroll-margin-top).
- **2.5.7 Dragging Movements** — alternative single-pointer obligatoire si drag.
- **2.5.8 Target Size Minimum** — **24x24 CSS px min** (+24px spacing) ou 44x44 UX optimal.
- **3.2.6 Consistent Help**, **3.3.7 Redundant Entry**, **3.3.8 Accessible Auth** (no cognitive test, autofill OK).
- Critere 4.1.1 Parsing supprime.

### Focus management React 19
- Navigation : hook `useRouteFocus()` restaure focus sur `<main tabindex="-1">` apres route change.
- Modals : `inert` attribute sur background (Chrome 102+/Safari 15.5+), plus propre que aria-hidden+tabindex.
- Composer : ref.current.focus() sur textarea apres send success.
- `outline:none` interdit sans `:focus-visible:ring-2` remplace.

### Live regions chat
```tsx
<div role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions"
     aria-label="Historique conversation">{messages.map(...)}</div>
<div role="status" aria-live="polite">Yumi ecrit...</div>
<div role="alert" aria-live="assertive">Provider down, fallback Haiku.</div>
```
- `polite` default, `assertive` erreurs critiques.
- `aria-atomic="false"` = nouveau msg only.
- Stream IA : debounce 500ms annonce finale (pas chaque token).

### Keyboard + screen reader
- Inbox : `role="listbox"` + aria-selected, fleches, Enter, `/` search. Roving tabindex.
- Composer : Enter=send, Shift+Enter=newline, Escape=blur.
- Icon buttons : `aria-label` + icon `aria-hidden`. Forms : `aria-invalid`+`aria-describedby`+`<p role="alert">`.
- Test NVDA (gratuit), VoiceOver, TalkBack. Skip JAWS V1.

### Contraste tokens Heaven
- `#E63329` rouge/blanc : 4.38:1 AA OK texte.
- `#E84393` rose/blanc : 3.47:1 **KO texte normal**. Usage CTA/bg only.
- `#D4AF37` or/blanc : 2.15:1 **KO total**. Accent/border only (sur noir 9.77:1 OK).

Tailwind v4 OKLCH `@theme` pour luminosite stable (`--color-heaven-or: oklch(75% 0.12 85)`).

### Testing 2026
- **axe-core** (Deque, std) via `@axe-core/playwright` / `vitest-axe`.
- **Pa11y** CLI CI sur preview URLs.
- **Lighthouse CI** seuils a11y >=95.
- **Storybook addon-a11y** par composant.
- Realite : 30-40% auto, reste manual.

### Checklist PR
- [ ] `aria-label` icon-only, `alt` descriptif
- [ ] Contraste 4.5:1 texte, 3:1 UI
- [ ] `:focus-visible:ring-2`
- [ ] Target >= 44px
- [ ] Live regions messages/erreurs
- [ ] Keyboard test complet
- [ ] axe-core 0 criticals CI
- [ ] NVDA/VO pre-release

Sources : [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [What's new WCAG 2.2](https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2/), [WAI-ARIA 1.3](https://w3c.github.io/aria/), [Target Size 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [A11y tools 2026](https://www.a11ypulse.com/blog/top-accessibility-tools-in-2026/).

---

## 2. Performance Next.js 16 + React 19

### Core Web Vitals 2026
| Metric | Good | Needs | Poor |
|---|---|---|---|
| LCP | <= 2.5s | 2.5-4s | > 4s |
| **INP** (remplace FID mars 2024) | <= 200ms | 200-500 | > 500 |
| CLS | <= 0.1 | 0.1-0.25 | > 0.25 |

Mesure p75 users reels (CrUX). Rumeur CWV 2.0 avec Visual Stability Index 2026 — monitor.

### React 19 features cles
- **`use(promise)`** : lit Promise/Context dans conditionals/loops (unique vs autres hooks).
- **Actions + `useActionState`** : Server Actions avec pending+error natifs.
- **`useOptimistic`** : UI instant + revert auto si erreur. Critical chat send.
- **Server Components par defaut**, `'use client'` seulement interactivite.
- **`@types/react` + `@types/react-dom` v19** obligatoires.

### Next.js 16 Cache Components (si migration)
Actuel N15 : utiliser `fetch({ next: { tags: ['...'] } })` + `revalidateTag()`.
N16 : `use cache` directive, keys compile-auto, PPR default, `cacheTag`/`updateTag`.
Migration evaluer Q3 2026 (pas bloquant V1).

### Suspense pattern
```tsx
<Suspense fallback={<ConversationListSkeleton />}>
  <ConversationList />
</Suspense>
<Suspense fallback={<MessageFeedSkeleton />}>
  <MessageFeed conversationId={id} />
</Suspense>
```
Un Suspense par unite async distincte, pas un "gros" englobant.

### Images + fonts
- **CldImage** next-cloudinary (evite double optim), `fetchPriority="high"` sur LCP, `sizes` obligatoire.
- Edge Runtime incompatible Sharp → Node runtime pour image processing OU offload Cloudinary.
- `next/font/local` auto-host zero CLS, `display: 'swap'`, subset latin+latin-ext.

### Bundle + runtime
- `@next/bundle-analyzer` CI, budget < 200KB gzipped/route.
- Pas de `lodash`/`moment` (date-fns, natif).
- **Node runtime** par defaut pour AI agent (streams, timeouts longs). Edge seulement middleware/auth/redirects lightweight.

### Checklist PR perf
- [ ] LCP image `priority` + `fetchPriority="high"`
- [ ] Suspense autour fetch async
- [ ] `useOptimistic` sur actions user
- [ ] Bundle diff < +20KB
- [ ] `'use client'` justifie (grep nouveaux fichiers)
- [ ] `CldImage` avec sizes
- [ ] Node runtime pour IA (pas Edge)

Sources : [web.dev Vitals](https://web.dev/articles/vitals), [React 19](https://react.dev/blog/2024/12/05/react-19), [Next.js 16](https://nextjs.org/blog/next-16), [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components).

---

## 3. TypeScript strict 2026

### tsconfig cible
```jsonc
{
  "compilerOptions": {
    "strict": true, "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true, "noPropertyAccessFromIndexSignature": true,
    "noImplicitOverride": true, "noImplicitReturns": true,
    "useUnknownInCatchVariables": true, "verbatimModuleSyntax": true,
    "isolatedModules": true, "target": "ES2023", "moduleResolution": "bundler"
  }
}
```

### Patterns cles
**Template literal routes** : `type CpRoute = \`/cp/${string}\`; type AgentApi = \`/api/agent/${'run'|'status'}\`;`

**Branded types IDs** (critique multi-entite) :
```ts
type Brand<T, B> = T & { readonly __brand: B };
type FanId = Brand<string, 'FanId'>;
type ConversationId = Brand<string, 'ConversationId'>;
// Impossible de confondre FanId et ConversationId a l'appel
```
Zod natif via `.brand<'FanId'>()`.

**Zod v4 Server Actions** :
```ts
export const AgentRunInput = z.object({
  conversationId: z.string().brand<'ConversationId'>(),
  modelSlug: z.enum(['yumi', 'ruby', 'paloma']),
  message: z.string().min(1).max(2000),
});
// usage: const parsed = AgentRunInput.safeParse(Object.fromEntries(formData));
```

### CI gates
`tsc --noEmit` bloquant PR + `eslint --max-warnings 0` + Husky pre-commit stages.

### Checklist PR
- [ ] Pas `any` (prefer `unknown`+narrow)
- [ ] Pas `as` sans Zod/type guard
- [ ] IDs branded
- [ ] Schemas partages client/server
- [ ] `tsc --noEmit` passe

Sources : [TSConfig Reference](https://www.typescriptlang.org/tsconfig/), [Strictest TS](https://whatislove.dev/articles/the-strictest-typescript-config/), [Zod](https://zod.dev/).

---

## 4. Conventions code 2026

- **Naming** : fichiers `kebab-case.tsx`, composants `PascalCase`, hooks `useCamelCase`, types `PascalCase` sans prefix `I`, constantes `UPPER_SNAKE_CASE` globales.
- **Colocation** : tests + stories + types colocates avec source (`message-feed.tsx` + `message-feed.test.tsx`).
- **Architecture Heaven** (hybride pragmatique, pas FSD pur) : `src/app/` routes thin / `src/cp/components/` UI cockpit / `src/shared/lib/ai-agent/` domain IA / `src/shared/components/` design system. FSD 6-layers overkill si < 20 features.
- **Props** : `interface` pour props (extendable), `type` pour unions/utility/generics.
- **Barrel exports** : OK petit barrel feature (< 5 exports), KO barrel global (kill tree-shaking Turbopack). Imports directs favoris.
- **Hooks** : 1 responsabilite, max ~150 LOC, return objet si > 2 valeurs.

### Checklist PR
- [ ] kebab-case files + PascalCase components
- [ ] Tests colocates
- [ ] Pas de barrel global
- [ ] Interfaces props, types unions

---

## 5. Real-time / messaging UX 2026

### Transport : SSE > WebSocket > Polling
Consensus 2026 : "Start with SSE, use WebSockets when you must". Pour Heaven :
- **Stream IA tokens** : SSE (1-way, HTTP natif, reconnect auto).
- **Inbox refresh** : polling 15-30s OU Supabase Realtime.
- **Typing fan->IA** : pas expose par Meta IG V1.
- **Pas de WebSocket infra V1** (complexite superflue).

### Optimistic UI
```tsx
const [messages, addOptimistic] = useOptimistic(serverMessages,
  (state, newMsg) => [...state, { ...newMsg, status: 'pending' }]);
// addOptimistic puis await action; revert auto si throw
```
Use : send message, thumbs, reorder. **Skip** : paiements, transfers irreversibles.

### Typing indicator + status
- 3 dots pulse 200ms post-submit, "Yumi ecrit..." (jamais "AI generating").
- Min 500ms visible, max 15s timeout fallback.
- Iconographie Telegram-like : pending → sent → delivered → read (si expose) → failed+retry.

### Rate limit + V1 skip
- Toast `role="alert"` "Yumi surchargee, fallback actif." Ne bloque pas composer. Auto-switch provider.
- V1 skip : service worker offline (V2), push notifications (V2 Meta/OneSignal).

### Checklist PR
- [ ] Optimistic UI send
- [ ] Typing aria-live polite
- [ ] Reconnect SSE auto
- [ ] Status min sent/delivered visible
- [ ] Error state + retry

Sources : [SSE vs WebSocket](https://websocket.org/comparisons/sse/), [useOptimistic](https://react.dev/reference/react/useOptimistic), [Streaming AI UX](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/).

---

## 6. Security & confidentialite 2026

### CSP Next.js (middleware nonce)
```
default-src 'self';
script-src 'self' 'nonce-<NONCE>' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://res.cloudinary.com;
connect-src 'self' https://openrouter.ai https://api.anthropic.com wss://*.supabase.co;
frame-ancestors 'none'; form-action 'self'; base-uri 'self';
```
Genere nonce par requete (middleware) + injecte dans `<script nonce>`.

### Vercel breach avril 2026 — env vars
Env non-flagged "sensitive" exposees. **TOUS secrets** marques Sensitive Encrypted Vercel Dashboard. Rotation trimestrielle minimum API keys.

### Supabase RLS (critique)
- Toutes nouvelles tables (`ai_runs`, `agent_personas`, etc.) : RLS ENABLE + policy par op (SELECT/INSERT/UPDATE/DELETE).
- **Indexer colonnes referencees dans policies** (ex `user_id`, `model_slug`) — gain x100 perf.
- Jamais `user_metadata` JWT claim (editable user = faille). Utiliser `app_metadata` custom claims server-side.
- Test : pgTap + `supabase test db`.

### Input/output sanitization
- Server-side seulement (client bypassable).
- Zod schemas stricts, pas de `.*`.
- Scrubber PII avant LLM (emails, tel, URLs) — deja prevu 03-TECH.
- Markdown output : DOMPurify si render HTML, sinon text-only.

### CSRF
Server Actions Next.js v15+ : auto Origin check. API routes custom POST : `x-csrf-token` manuel via `jose`.

### PII + GDPR
- Jamais vrais prenoms (regle memoire : YUMI/RUBY/PALOMA only).
- Logs : scrubber PII auto avant write.
- Retention ai_runs 90j max puis anonymise/purge.
- Export GDPR : `/api/gdpr/export?fan_id=` admin-only.
- Right to be forgotten : soft delete + purge 30j.

### ⚠️ EU AI Act aout 2026 (CRITIQUE)
Disclosure obligatoire si user interagit avec IA "unless obvious". Persona humaine realiste = **pas obvious** → disclosure requis.

Options :
- Bio IG : mention "Assistee IA"
- Page web footer : "Certaines interactions assistees par IA"
- Admin disclosure on-demand si fan demande direct

**Plan existant SafetyFilter qui masque "je suis une IA" = conflit reglementaire direct.** Voir section 11.

### Secrets management
- `.env.local` jamais commit.
- Vercel env tous Sensitive Encrypted.
- Rotation trimestrielle.
- `npm audit --production` CI 0 high/critical.
- Dependabot auto-PR, Snyk optionnel.

### OWASP Top 10 2025 (confirm jan 2026)
1. **A01 Broken Access Control** — RLS + RBAC
2. A02 Cryptographic Failures
3. **A03 Software Supply Chain Failures** (nouveau) — SBOM, lockfile, Dependabot
4. A04 Insecure Design
5. A05 Misconfiguration
6. A06 Vulnerable Components
7. **A07 Auth Failures** — MFA, session timeout
8. A08 Integrity Failures
9. **A09 Logging & Alerting** — alert sur anomalies, pas que log
10. **A10 Mishandling Exceptional Conditions** (nouveau) — try/catch sans swallow, error boundaries

### Checklist PR
- [ ] Inputs valides Zod server-side
- [ ] RLS enabled + indexed nouvelles tables
- [ ] Secrets Sensitive Encrypted Vercel
- [ ] Pas `dangerouslySetInnerHTML` sans DOMPurify
- [ ] CSP nonce si nouveau script inline
- [ ] PII scrub verif logs
- [ ] `npm audit` 0 high/critical

Sources : [OWASP 2025](https://owasp.org/Top10/2025/), [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [Vercel 2026 incident](https://vercel.com/kb/bulletin/vercel-april-2026-security-incident).

---

## 7. Chatbot / AI UX 2026

### Typing + streaming + error
- 3 dots pulse/avatar breathing visible 200ms post-submit.
- Stream SSE token-by-token obligatoire (perception latence).
- Markdown mid-stream : `react-markdown` + remark-gfm, buffer code blocks backtick impair.
- **Abort button** (`AbortController`). Timeout 10s sans 1er token → fallback canned "Je reviens bientot".
- Provider down : toast + retry chain. Rate limit : inline "Yumi tres demandee..." + retry 30s.

### Confidence + feedback
- **Skip confidence cote fan** (break immersion humaine). Metriques internes analytics admin.
- Thumbs up/down **admin-only**. Corrections inline → `prompt_examples` (prevu). Jamais "rate my response" fan.

### Avatar
Photo modele Cloudinary sur chaque message IA. Jamais icon "robot"/"AI" — incoherent persona.

### ⚠️ Consent / transparency AI Act
- Bio IG : "Assistee IA" discret
- Page `/m/yumi` footer : disclosure EU AI Act
- Admin disclosure configurable par modele (Paloma=transparent, YUMI=evasive sans mentir)

### Patterns 2026
- Intent-based UI : user dit resultat, IA infere workflow.
- Multi-modal voice transcribe (V3). Proactive re-engagement 7j silence (prevu 16-COMMUNITY-MANAGER).

### Checklist PR
- [ ] Stream SSE actif, typing 200ms
- [ ] Abort button gen
- [ ] Fallback timeout 10s
- [ ] Disclosure AI Act respecte
- [ ] Feedback admin-only

Sources : [Chatbot Design 2026](https://www.jotform.com/ai/agents/chatbot-design/), [Streaming UX LogRocket](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/), [Intent-based NN/g](https://www.uxtigers.com/post/intent-ux).

---

## 8. Mobile-first responsive 2026

- **Breakpoints Tailwind v4** : `sm 640 / md 768 / lg 1024 / xl 1280` — garder actuel.
- **Touch targets** : min `min-h-[44px] min-w-[44px]`, padding `px-4 py-3`, icon `size-11`.
- **Gestures** : swipe left conversation = archive, long press message = menu, pull-to-refresh liste. `touch-action: manipulation` (evite double-tap zoom).
- **Bottom sheet composer** mobile : swipe-up fullscreen. Librairie : `vaul` (Radix-compat) ou custom Framer Motion.
- **Safe area** : `min-height: 100dvh` + `padding: env(safe-area-inset-*)` + meta `viewport-fit=cover`.
- **Viewport units** : `dvh` main containers (resize browser UI), `svh` sticky toasts, `lvh` overlays fullscreen. **EVITER `vh`** (bug Safari 100vh). Support 95%+ users 2026.

### Checklist PR
- [ ] Touch targets 44px
- [ ] `dvh` pas `vh`
- [ ] `env(safe-area-inset-*)` bords
- [ ] `touch-action: manipulation`
- [ ] Test iPhone 14+ + Android notch

Sources : [Viewport units](https://modern-css.com/mobile-viewport-height-without-100vh-hack/), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

---

## 9. Testing stack 2026

- **Vitest** : 10-20x plus rapide Jest (cold 2s vs 12s, HMR 80ms vs 4s), ESM natif, config partagee Vite. `@testing-library/react` v16+ pour React 19. **Decision Heaven** : Vitest.
- **Playwright E2E** : 91% sat StateOfJS 2025. Cross-browser Chromium+WebKit+Firefox natif, parallel `--shard`, trace viewer CI. Selecteurs `getByRole` (a11y-first).
- **MSW** mocking : intercept reseau (app code = prod). Handlers reutilises Vitest + Playwright + Storybook.
- **Visual regression** V1 skip. V2 : Chromatic ou Percy. Self-host : `playwright-visual-comparisons`.
- **Perf** : `web-vitals` RUM custom `/api/vitals` + Lighthouse CI (Perf>=85, A11y>=95, SEO>=90).

### Checklist PR
- [ ] Unit colocates `*.test.tsx`
- [ ] E2E critical path Playwright
- [ ] MSW mocks partages envs
- [ ] `vitest --coverage` >= 70% `shared/lib/ai-agent/`
- [ ] CI bloquants PR main

Sources : [Vitest vs Jest 2026](https://tech-insider.org/vitest-vs-jest-2026/), [Playwright 2026](https://dev.to/jake_kim_bd3065a6816799db/playwright-vs-cypress-2026-which-e2e-testing-framework-should-you-use-1kmo), [MSW](https://mswjs.io/).

---

## 10. Deployment & CI 2026

- **Vercel** : preview auto par PR, promotion Preview→Prod via merge main, skew protection default, Turborepo remote cache.
- **Vercel Flags SDK** GA jan 2026 : `flag({ key, defaultValue, decide })` — canary persona, A/B prompt, kill switch provider IA.
- **Monitoring cost-optim** : Sentry SDK + **GlitchTip self-host** (drop-in compat) OU **SigNoz** OTel-native unifie. Vercel Analytics free + `web-vitals` RUM.
- **Observability** : `pino` JSON avec `redact` PII auto. Traces OTel. Vercel logs 24h default.
- **CI pipeline** : lint → typecheck → unit → build → a11y (pa11y) → lighthouse-ci → e2e (playwright). Bloquant V1 : lint+typecheck+unit+build. Reste warn-only phase 1.

### Checklist PR
- [ ] Preview URL verifiee
- [ ] Lighthouse CI seuils OK
- [ ] Feature flag si risque
- [ ] CHANGELOG.md MAJ
- [ ] Secrets Sensitive Encrypted

Sources : [Vercel Flags](https://vercel.com/blog/flags-as-code-in-next-js), [Sentry Alternatives](https://signoz.io/comparisons/sentry-alternatives/), [Env Rotation](https://vercel.com/docs/environment-variables/rotating-secrets).

---

## 11. Red flags plan existant

### 🔴 CRITICAL — EU AI Act aout 2026 : SafetyFilter masque persona IA
`03-TECH.md §3.1 step 7` : patterns "je suis une IA" → rephrase masque identite. **Conflit reglementaire direct EU AI Act Art 50** (disclosure obligatoire interaction IA "unless obvious", persona humaine realiste != obvious).

**Action** : (1) clause transparente bio IG + FAQ Fanvue + footer web, (2) refactor SafetyFilter : reformuler sans mentir si demande direct, honnetete configurable par modele, (3) consulter legal NB avant prod.

### 🟠 HIGH — Manque optimistic UI composer admin
Plan step 8 `DelayHumanizer` sleep 2-6s. Admin UI risque percevoir echec si pas d'indication pendant 6s.

**Action** : `useOptimistic` composer admin, message "pending" immediat, transition "sent" sur confirm.

### 🟠 HIGH — Cost monitoring UI manquant
`ai_runs` log tokens/cost mais pas dashboard admin budget + alerte.

**Action** : ajouter `ops_metrics` dashboard + alert cost_daily > 80% budget + kill switch feature flag.

### 🟡 MEDIUM — Vercel AI SDK v5 pas evaluate
Plan utilise OpenRouter direct. AI SDK v5 2026 offre streaming+tool calling+agent primitives qui simplifierait provider-router custom.

**Action** : evaluer migration lors router V2 refactor. V1 garder custom (abstraction legere suffit).

### 🟡 MEDIUM — CSP + WebView IG
Si module integre Instagram in-app browser, CSP strict peut casser. Tester WebView IG avant prod.

### 🟢 LOW — Barrel `src/shared/lib/ai-agent/`
Plan §3.3 flat structure. Confirmer pas d'`index.ts` barrel (tree-shaking Turbopack).

### 🟢 LOW — SSE runtime Node obligatoire
Si stream web live futur : Node runtime imperativement (Edge Runtime SSE duration limitee).

---

## 12. Findings critiques — summary integration plan

- **EU AI Act aout 2026 → disclosure obligatoire.** Refactor SafetyFilter (pas de masquage), ajouter transparence bio/FAQ/footer. **Decision NB juridique avant prod.**
- **WCAG 2.2 AA** : Focus Not Obscured, Target 24px (44px UX), Redundant Entry, Accessible Auth, Dragging alternatives. Chat feed `role="log" aria-live="polite"`.
- **Contraste Heaven** : `#E84393` rose KO texte normal (3.47:1), `#D4AF37` or KO total. Usage accent/CTA only. Tokens Tailwind v4 OKLCH.
- **Stack testing default 2026** : Vitest + Playwright + MSW. Deprecate Jest/Cypress.
- **Transport** : SSE AI stream + Supabase Realtime inbox. Pas WebSocket V1.
- **`useOptimistic`** composer chat (perception instant critique).
- **TS strict** : `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + branded IDs.
- **Vercel breach avril 2026** : tous secrets Sensitive Encrypted + rotation trimestrielle + `npm audit` CI.
- **Core Web Vitals 2026** : INP<=200ms (remplace FID), LCP<=2.5s, CLS<=0.1. Monitor VSI (CWV 2.0 rumeur).
- **Touch 44px** (WCAG 2.2 min=24px, UX=44px iOS/Android).
- **`dvh` not `vh`** + `env(safe-area-inset-*)` partout mobile.
- **Vercel Flags SDK** GA 2026 pour canary provider IA + kill switch.
- **Observability cost-optim** : Sentry+GlitchTip ou SigNoz + OTel instrumentation.
- **OWASP 2025** : nouvelles categories Supply Chain (A03) + Mishandling Exceptions (A10) → Dependabot + error boundaries obligatoires.

---

> Lifecycle : MAJ mensuelle ou release majeure (Next 17, React 20, WCAG 2.3).
> Cross-ref : `03-TECH.md`, `04-OPS.md`, `DECISIONS.md`.
