# Unlock System

This implements a secure, client-side unlock system using split cookies + HMAC + session seal (no server-side logic).

## Changes Made

### 1. New unlock.js module
- Signs unlock tokens with HMAC-SHA256 using a pepper baked into the bundle
- Stores payload and signature in separate cookies (`aul_p`, `aul_s`) to look less obvious
- Generates persistent install ID (`aul_iid`) in cookie
- Uses sessionStorage-based seal (`aul_seal`) that re-seals on valid read
- Tamper detection: HMAC verification, timestamp sanity, version checks, shape validation
- Migrates away from old localStorage key

### 2. Updated index.html and staging.html
- Load unlock.js in head
- Updated unlock logic to use new system
- Handle ?tier=member URL parameter
- Split signature and payload conceptually (implemented as two cookies)

## Cookie Structure
- `aul_p`: base64url-encoded payload JSON `{v, st, ts, iid, src}`
- `aul_s`: base64url-encoded signature (HMAC of canonical string `v|st|ts|iid|src`)
- `aul_iid`: install ID (persistent, 2 year expiry)
- `aul_seal`: sessionStorage seal (16 bytes hex, re-sealed on valid read)

## Security Notes
- Pepper is extractable from bundle (by design - stops casual copy-paste)
- Session seal means copied cookies to fresh incognito session will re-seal (as requested)
- HMAC verification prevents tampering
- Timestamp checks prevent future/ancient tokens
- No deviceId binding (as requested)

## Testing
1. Fresh load → free
2. Unlock via password with ?tier=member → becomes full, cookies set
3. Reload same tab → still full (seal persists)
4. Close/reopen browser → cookies valid, re-seal on first read
5. Copy cookies to incognito → valid read, re-seals
6. Edit cookies → HMAC fails → free
7. Remove one cookie → rejected
8. Old localStorage only → ignored
