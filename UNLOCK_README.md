# Unlock System — FROZEN

**FROZEN as of 2026-10-18 (LLM council decision, confirmed by Kyle):** the
signed-cookie unlock for `?tier=member` is deliberately complete. Keep it
working exactly as it is — **never revert it to a localStorage boolean**, never
add cookie fields, new code paths, or APIs. Any change to this system or its
wiring in `index.html` needs Kyle's explicit go-ahead. The prompt flow is gated
by `node scripts/check_tier_prompt.js`, which must stay green.

What it is: a secure, client-side unlock using split cookies + HMAC + session
seal (no server-side logic).

## How it works

### 1. `js/unlock.js` module
- Signs unlock tokens with HMAC-SHA256 using a pepper baked into the bundle
- Stores payload and signature in separate cookies (`aul_p`, `aul_s`) to look less obvious
- Generates persistent install ID (`aul_iid`) in cookie
- Uses sessionStorage-based seal (`aul_seal`) that re-seals on valid read
- Tamper detection: HMAC verification, timestamp sanity, version checks, shape validation
- Exposes `window.UnlockSystem`: `readUnlock`, `writeUnlock`, `deleteUnlock`, `maybeUnlockFromUrl`, `isUnlocked`, `init`

### 2. Wiring in `index.html`
- Loads `unlock.js` in the head
- `initTier()` reads `?tier=member`: valid cookies → member tier (param cleaned from the URL); no valid cookies → password prompt; wrong/cancel → free tier with the param dropped
- `openFullVersion()` gates the "Open the full version" link the same way
- The password lives in `MEMBER_PASSWORD` in `index.html` — a soft gate by design (source-readable), not security

## Cookie structure
- `aul_p`: base64url-encoded payload JSON `{v, st, ts, iid, src}`
- `aul_s`: base64url-encoded signature (HMAC of canonical string `v|st|ts|iid|src`)
- `aul_iid`: install ID (persistent, 2 year expiry)
- `aul_seal`: sessionStorage seal (16 bytes hex, re-sealed on valid read)
- Written with `SameSite=Lax`, `path=/`, on this origin only

## Migration note (sealed cookies replaced the old boolean)
- Before this system, membership was the localStorage boolean
  `audiou-troubleshooting-lab-member-unlock-v1 = '1'` — forgeable with DevTools
  and gone under storage partitioning.
- The sealed-cookie system replaced it. The legacy key is no longer written.
  `isMemberUnlocked()` in `index.html` still *reads* it once as a
  backward-compat first pass for the `openFullVersion` link; the tier itself is
  decided by `UnlockSystem.readUnlock()` alone (code-read, 2026-10-18).
- A legacy-only session (old key, no cookies) does **not** auto-unlock the
  tier: `initTier()` asks for the password once, and a correct answer writes
  the cookies — a one-time re-entry, after which the seal carries it.

## Security notes (design intent — unchanged, frozen)
- Pepper is extractable from bundle (by design — stops casual copy-paste)
- Session seal means copied cookies to a fresh incognito session will re-seal (as requested)
- HMAC verification prevents tampering
- Timestamp checks prevent future/ancient tokens
- No deviceId binding (as requested)
- The query parameter is obscurity, not security; the real wall for paid content is wherever members-only content is served from (the Circle access group today)

## Verification matrix (2026-10-18)

### Harness-measured — `node scripts/check_tier_prompt.js` (Node + DOM shim; logic-level, browser-agnostic)

| Scenario | Result |
|---|---|
| Cold free link `?v=N`: no prompt, URL untouched, exactly one render | PASS |
| Member link + cancel: prompt once, `?tier=member` dropped, stays free | PASS |
| Member link + wrong password: prompt once, "Incorrect password" alert, stays free | PASS |
| Member link + correct password: prompt once, signed cookies written, member re-render | PASS |
| Member relaunch with cookies: no re-prompt, member applies, cookies survive | PASS |

`node scripts/check_syntax.js` parses all five babel blocks; the freeze does
not change behavior, so these are the expected gates on every future edit.

### Manual browser verification — PENDING (not yet run in a real browser)

| Check | Chrome | Safari |
|---|---|---|
| Direct URL `.../audio-troubleshooting-lab?tier=member` prompts; correct password unlocks; URL cleans | pending | pending |
| Member relaunch with cookies already set: no re-prompt | pending | pending |
| Wrong password: alert + free tier | pending | pending |
| `?optedin=1` direct link skips the email gate | pending | pending |
| Unlock survives reload and browser restart (cookies + re-seal) | pending | pending |
| Tampered/removed cookie → rejected → free | pending | pending |

The Safari column matters specifically because of ITP storage/cookie
partitioning — exactly why distribution moved to direct, first-party GitHub
Pages links (2026-10-18). Funnel events (`landing`, `gate_shown`,
`email_skip`) make the `?optedin=1` row observable from the ring buffer once
these runs happen.

### Known constraint (not a bug): in-iframe prompting
`window.prompt` is blocked in cross-origin iframes without an `allow-modals`
permission. Direct GitHub Pages links — the current distribution — are
first-party top-level visits, where prompting works normally. Any future
cross-origin embed must not rely on the prompt; this was flagged during the
Circle → direct-link transition.

## Original build checklist (statuses are the record; blank = never run)
1. Fresh load → free — harness PASS (cold scenario)
2. Unlock via password with `?tier=member` → full, cookies set — harness PASS; browser pending
3. Reload same tab → still full (seal persists) — manual pending
4. Close/reopen browser → cookies valid, re-seal on first read — manual pending
5. Copy cookies to incognito → valid read, re-seals — manual pending
6. Edit cookies → HMAC fails → free — manual pending
7. Remove one cookie → rejected — manual pending
8. Old localStorage only → ignored for the tier — code-read (see migration note)
