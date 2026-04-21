# Messagerie + Contacts — Infra v1 (2026-04-21)

> Plan technique fusion Messagerie + CRM fans (brief B7).
> Complète `STRATEGIE-v1.2026-04-21.md`.

---

## 1. Routes

### 1.1. Cible

| Route | Source | Statut |
|---|---|---|
| `/agence/messagerie` | `src/app/agence/messagerie/page.tsx` | **Route principale**, étendue avec panel Contacts |
| `/agence/messagerie/[fanId]` | NEW | Deep-link vers conversation + fiche fan |
| `/agence/clients` | existant | **Redirect 301** → `/agence/messagerie` |
| `/agence?tab=clients` | middleware | **Redirect 301** → `/agence/messagerie` (backcompat B9) |
| `/agence/clients/[fanId]` | existant | Redirect → `/agence/messagerie/[fanId]` |

### 1.2. Sidebar

Mise à jour `src/shared/components/sidebar.tsx` :

```ts
// AVANT
{ id: "contacts", label: "Contacts", icon: BookUser, href: "/agence?tab=clients", ... }

// APRÈS — item Contacts supprimé, Messagerie absorbe
// NAV_MAIN devient :
[
  { id: "dashboard",   label: "Dashboard",   ... },
  { id: "messagerie",  label: "Messagerie",  ... },  // absorbe Contacts
  { id: "instagram",   label: "Instagram",   ... },
  { id: "contenu",     label: "Contenu",     ... },  // route /agence/contenu
  { id: "strategie",   label: "Stratégie",   ... },  // route /agence/strategie
]
```

---

## 2. Composants

### 2.1. Arbo cible

```
src/app/agence/messagerie/page.tsx             ← shell
└── <InboxLayout>
    ├── <InboxFilterBar>                        ← source filter (all/web/ig)
    ├── <ConversationList>                      ← panel gauche
    │   └── <ConversationRow>                   ← un row = un fan (multi-canal)
    │       ├── <SourceIcons />                 ← badges web/IG/snap
    │       ├── <LastMessagePreview />
    │       └── <UnreadBadge />
    ├── <ThreadPanel>                           ← panel droit (chat)
    │   ├── <ThreadHeader>                      ← handles + bouton "Voir fiche"
    │   ├── <MessageTimeline>                   ← historique unifié
    │   └── <ReplyComposer>                     ← canal pré-sélectionné + timer 24h IG
    └── <FanProfileDrawer>                      ← slide-in fiche fan
        ├── <HandlesEditor>                     ← edit pseudos + link IG
        ├── <TagsEnviesPanel>                   ← goûts + envies
        ├── <PurchaseHistory>                   ← historique achats PPV
        └── <ActionsMenu>                       ← merge / block / delete
```

### 2.2. Composants à **retirer** / refactorer

| Composant | Action |
|---|---|
| `ClientsPanel` (`src/cp/components/cockpit/clients-panel.tsx`) | Splitter : la partie CRM → `FanProfileDrawer`, le listing → `ConversationList` |
| `clients-dropdown.tsx` (header) | Conservé (raccourci header) mais pointe sur `/agence/messagerie` |
| `FanHandlesManager` (existant) | Intégré dans `FanProfileDrawer` > `HandlesEditor` |

---

## 3. Data model

### 3.1. Vue `agence_messages_timeline` (migration 038 — existante)

```sql
CREATE VIEW agence_messages_timeline AS
SELECT 'web' AS source, id, model, fan_id, client_id,
       NULL::uuid AS ig_conversation_id,
       text, direction, read_flag, created_at
FROM agence_messages
UNION ALL
SELECT 'instagram' AS source, im.id, im.model_id AS model,
       ic.fan_id, NULL AS client_id, im.ig_conversation_id,
       im.text, im.direction, im.read_flag, im.created_at
FROM instagram_messages im
JOIN instagram_conversations ic ON im.ig_conversation_id = ic.id;
```

### 3.2. Table `agence_fans` (existante, extensions)

Champs existants :
```
id                  uuid PK
model_id            text
nickname            text
pseudo_web          text
pseudo_insta        text
pseudo_snap         text
pseudo_fanvue       text
pseudo_onlyfans     text
device_fingerprint  text
created_at          timestamptz
merged_into_id      uuid NULL   -- si merged
```

**Extensions à ajouter** (migration `040_fan_profile_context.sql`) :
```
tags                jsonb DEFAULT '[]'    -- ["feet","soft","couple"]
envies              jsonb DEFAULT '[]'    -- [{"text":"PPV pieds","at":"2026-04-21","status":"pending"}]
preferences         jsonb DEFAULT '{}'    -- {"lang":"fr","frequency":"daily","style":"flirty"}
scoring             jsonb DEFAULT '{}'    -- {"ltv":50,"conversion":0.3,"last_active":"..."}
```

### 3.3. Tables `agence_clients` + `instagram_conversations` — reliaison

```
agence_clients.fan_id               → agence_fans.id  (déjà existant)
instagram_conversations.fan_id      → agence_fans.id  (déjà existant)
```

Le merge (endpoint `merge`) réassigne ces FK vers le target + marque la source `merged_into_id`.

---

## 4. Endpoints API

### 4.1. Existants

| Route | Méthode | Fichier |
|---|---|---|
| `/api/agence/messaging/inbox` | GET | `src/app/api/agence/messaging/inbox/route.ts` |
| `/api/agence/messaging/reply` | POST | `src/app/api/agence/messaging/reply/route.ts` |
| `/api/agence/fans/[id]` | GET | `src/app/api/agence/fans/[id]/route.ts` |
| `/api/agence/fans/[id]/merge` | POST | `src/app/api/agence/fans/[id]/merge/route.ts` |
| `/api/agence/fans/link-instagram` | POST | `src/app/api/agence/fans/link-instagram/route.ts` |
| `/api/agence/fans/search` | GET | `src/app/api/agence/fans/search/route.ts` |

### 4.2. Nouveaux

| Route | Méthode | Rôle |
|---|---|---|
| `/api/agence/fans/[id]/tags` | PATCH | Update `tags` JSONB |
| `/api/agence/fans/[id]/envies` | POST / PATCH | Ajouter / update une envie |
| `/api/agence/fans/[id]/preferences` | PATCH | Update préférences chat |
| `/api/agence/messaging/merge-suggestions` | GET | Retourne paires fan_id à merger (similarité pseudo) |

### 4.3. Webhook IG (existant — critique)

`/api/instagram/webhook` (POST async <500ms) :
1. Verify HMAC
2. Insert `instagram_messages` (UNIQUE sur `ig_message_id`)
3. RPC `ig_conv_increment_count`
4. Enqueue `ig_reply_queue`
5. 200 OK

Pas de modification — déjà compatible avec fusion.

---

## 5. Patterns techniques

### 5.1. Single-page workflow

```
GET /api/agence/messaging/inbox?source=all
  → [conversations] (groupées par fan_id)

Click on conv #N
  → fetch /api/agence/fans/<fan_id>        (drawer fiche)
  → fetch /api/agence/messaging/inbox?fan_id=<fan_id>  (thread détaillé)

Reply :
  POST /api/agence/messaging/reply
    { fan_id, channel: "web"|"instagram", text }
  → Selon channel : insert agence_messages OU Meta Graph API Send
```

### 5.2. Fusion auto — logique proposée

Cron hebdo `/api/cron/fan-merge-suggestions` :

```sql
-- candidate pairs (même fingerprint, pseudos différents)
SELECT a.id AS source_id, b.id AS target_id
FROM agence_fans a
JOIN agence_fans b ON a.device_fingerprint = b.device_fingerprint
WHERE a.id != b.id
  AND a.merged_into_id IS NULL AND b.merged_into_id IS NULL
  AND a.created_at < b.created_at;

-- candidate pairs (similarité pseudo — trgm)
SELECT a.id, b.id, similarity(a.nickname, b.nickname) AS score
FROM agence_fans a, agence_fans b
WHERE a.id != b.id
  AND a.model_id = b.model_id
  AND similarity(a.nickname, b.nickname) > 0.85;
```

Affichage admin : panel « Suggestions de fusion » avec boutons Valider/Ignorer.

### 5.3. Canal de réponse — dispatcher

```ts
async function sendReply(fanId: string, text: string, channel: "web" | "instagram") {
  if (channel === "web") {
    return db.from("agence_messages").insert({ fan_id: fanId, text, direction: "out" });
  }
  if (channel === "instagram") {
    const conv = await db.from("instagram_conversations").select().eq("fan_id", fanId).single();
    // Check 24h window (Meta policy)
    if (!isWithin24h(conv.last_inbound_at)) {
      throw new Error("Hors fenêtre 24h — Message Tag requis");
    }
    return postMetaGraphMessage(conv.ig_conversation_id, text);
  }
}
```

### 5.4. Timer 24h Meta dans UI

`ReplyComposer` affiche un compteur : « Fenêtre IG ouverte : 23h 12m » basé sur `instagram_conversations.last_inbound_at`. Au-delà : composer désactivé pour IG, message explicite + suggestion copy/paste Snap/Fanvue.

### 5.5. Unified fan profile — agrégation au load

Quand on ouvre un fan :
1. `SELECT * FROM agence_fans WHERE id = $1 OR merged_into_id = $1`
2. `SELECT * FROM agence_clients WHERE fan_id IN (...)`
3. `SELECT * FROM instagram_conversations WHERE fan_id IN (...)`
4. `SELECT * FROM agence_purchases WHERE fan_id = $1`
5. `SELECT * FROM agence_messages_timeline WHERE fan_id = $1 ORDER BY created_at DESC`

---

## 6. Tests & acceptation

- [ ] Sidebar « Contacts » supprimé, « Messagerie » seul
- [ ] `/agence/clients` redirige vers `/agence/messagerie`
- [ ] Conversation list multi-source (web + IG) dans une seule liste
- [ ] Fan avec 2 pseudos (Snap + IG) affiche les deux badges
- [ ] Merge root-only fonctionne (soft, `merged_into_id` set)
- [ ] Reply via web OK → `agence_messages` insert
- [ ] Reply via IG hors fenêtre 24h → erreur explicite
- [ ] Fiche fan drawer affiche tags, envies, achats
- [ ] Tags JSONB éditable inline
- [ ] Link Instagram via endpoint dédié
- [ ] Suggestions de merge générées par cron hebdo

---

## 7. Liens

- Vue DB : migration 038 `agence_messages_timeline`
- Extensions DB à créer : `supabase/migrations/040_fan_profile_context.sql`
- API endpoints : `src/app/api/agence/messaging/*`, `src/app/api/agence/fans/*`
- Sidebar : `src/shared/components/sidebar.tsx`
- Dashboard (KPIs remontés) : `plans/modules/dashboard/INFRA-v1.2026-04-21.md`
- Profil public (source chat web) : `plans/modules/profil-public/INFRA-v1.2026-04-21.md`
- BP : `plans/business/bp-agence-heaven-2026-04/README.md`
