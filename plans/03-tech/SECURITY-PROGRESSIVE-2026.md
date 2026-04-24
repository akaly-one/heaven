# Sécurité Progressive Heaven — 2026

> **Directive NB 2026-04-24** : site personnel pour le moment, pas besoin de sécurité ultime. Besoin d'un **plan progressif d'upgrade**. Actions immédiates = sécuriser DB + exposition codes + brute force.

---

## Phases d'upgrade

### ⚡ Phase 1 — MAINTENANT (anti-brute-force + exposition DB)

Objectif : rendre le système résistant aux attaques basiques sans 2FA ni complexité excessive.

| # | Item | Effort | Risque si pas fait |
|---|---|:-:|---|
| 1.1 | **Audit log** tentatives login (table `agence_auth_events`) | 1h | Impossible détecter intrusion |
| 1.2 | **Failed attempts counter** + **auto-lock** après 10 échecs consécutifs (15 min cooldown) | 1h | Brute force possible |
| 1.3 | **Masquer passwords** dans toutes réponses API — même `?with_code=true` ne retourne plus le code en clair, retourne `"has_password": true` | 30min | Leak via UI admin compromise |
| 1.4 | **Hash bcrypt** des passwords (migration non-destructive : colonne `code_hash` en parallèle, bascule progressive) | 3h | Leak DB = tous passwords exposés |
| 1.5 | **Rate limit DB-persistant** (table `auth_rate_limits`) au lieu de in-memory — résiste au restart | 1h | Bypass trivial via redeploy/timing |

**Total Phase 1** : ~6h30. Non-bloquant, pas de changement UX visible.

### 🟡 Phase 2 — ~1 mois (durcissement)

| # | Item | Effort |
|---|---|:-:|
| 2.1 | **CSP headers strict** (`next.config.ts`) — script-src self, connect-src whitelist | 1h |
| 2.2 | **Sliding JWT refresh** (session renouvelle à chaque activité, expire après 1h inactivité au lieu de 24h fixe) | 2h |
| 2.3 | **Device fingerprint admin** accounts (étendre migration 020 existante) — max 2 devices Root, alerte sur 3ème | 3h |
| 2.4 | **Notifications Telegram** login Root/Yumi (quick win pour visibilité) | 30min |
| 2.5 | **CSRF tokens** sur formulaires sensibles (login, reset-code, PATCH accounts) | 2h |

**Total Phase 2** : ~9h. Durcissement silencieux, UX identique.

### 🟢 Phase 3 — ~3 mois (2FA optionnel)

| # | Item | Effort |
|---|---|:-:|
| 3.1 | **TOTP 2FA** via `otplib` (Google Authenticator compatible) — optionnel par compte, obligatoire Root | 4h |
| 3.2 | **Recovery codes** (10 codes one-shot papier) | 1h |
| 3.3 | **Password policy** : min 12 chars, majuscule + chiffre + symbole, pas réutiliser 5 derniers | 2h |
| 3.4 | **Password expiration** 90j (optionnel) | 1h |

**Total Phase 3** : ~8h. Active seulement si 1er client payant confirmé.

### 🔵 Phase 4 — ~6 mois (prod-grade)

| # | Item | Effort |
|---|---|:-:|
| 4.1 | **Passkeys WebAuthn** (Apple Touch ID / Google / MS Authenticator) | 8h |
| 4.2 | **IP allowlist** optionnelle pour Root | 2h |
| 4.3 | **CAPTCHA** après 3 échecs (hCaptcha free) | 2h |
| 4.4 | **Geolocation tracking** + alerte login pays inhabituel | 3h |
| 4.5 | **Pentesting basique** Nuclei scan mensuel | 1h setup |

**Total Phase 4** : ~16h. Prêt pour plusieurs clients actifs.

### 🟣 Phase 5 — ~1 an (maximal)

- YubiKey hardware FIDO2 obligatoire Root
- Biométrie (TouchID/FaceID) + hardware key combined
- Audit log immutable hash chain SHA-256
- Recovery physique (papier coffre + avocat)
- HSM pour secrets rotation

(Aligne avec `feedback_root_master_authority.md` niveaux L3→L5)

---

## Ce qui est déjà en place (baseline actuelle)

- ✅ JWT HttpOnly cookie + sameSite strict (prod)
- ✅ Rate limit IP in-memory (5 tentatives / 5 min) — fragile mais actif
- ✅ Uniform error "Identifiants invalides" (anti-enumeration)
- ✅ HMAC webhook Meta
- ✅ RLS Supabase sur toutes tables sensibles
- ✅ Device tracking `agence_code_devices` (fans codes uniquement)
- ✅ TypeScript strict + ESLint en CI
- ✅ Secrets via env vars (jamais commités)
- ✅ Password case-sensitive
- ✅ Hiérarchie Root > Yumi > Paloma/Ruby enforced (aujourd'hui)

---

## Règles opérationnelles (applicables immédiatement)

1. **Jamais** de secret commité — vérifier `.env.local` pas staged
2. **Rotation** passwords Root/Yumi tous les 3 mois manuel
3. **Ne pas partager** password Root (seul NB)
4. **Logout** session Root avant fermeture ordi / départ
5. **Monitor** `agence_auth_events` hebdomadaire dès activation Phase 1
6. **Backup** DB chiffré quotidien (vérifier Supabase auto-backup actif)

---

## Détection intrusion — signaux à surveiller

Après Phase 1 active :

- Login depuis IP jamais vue avant (alerte Telegram)
- >5 failed attempts / heure sur un même compte
- Changement de password admin hors créneau NB
- Session JWT active >24h sans refresh
- Accès simultané même compte depuis 2 IPs géo différentes
- Requêtes API anormales (>100/min sur un endpoint)

---

## Références

- [feedback_security_evolutive_plan.md](~/.claude/projects/-Users-aka-Documents-AI-LAB/memory/feedback_security_evolutive_plan.md) — directive évolutive L0→L5
- [feedback_root_master_authority.md](~/.claude/projects/-Users-aka-Documents-AI-LAB/memory/feedback_root_master_authority.md) — auth évolutive Passkeys/YubiKey long terme
- [plans/03-tech/SECURITY-v1.2026-04-21.md](./SECURITY-v1.2026-04-21.md) — baseline sécurité actuelle
- Migration 020 — device tracking fans codes (pattern à étendre Phase 2.3)
