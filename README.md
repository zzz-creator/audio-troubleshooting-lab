# Troubleshooting Lab

An interactive mixing-console training simulator for Audio University. Single-page app, no build step (React + Babel via CDN). Free Essentials tier acts as the lead magnet; paid challenge scenarios drip in over time for members.

## Files

One pair — the whole app:

- **`index.html`** — HTML shell + styles. The engine/UI/audio now live in `js/*.jsx` (below), loaded via Babel Standalone. It is the HTML source of truth.
- **`content.js`** — the scenario library (`window.LEVELS`, `window.START_HERE`, `window.FEEDBACK_MODE`, etc.). **Edit this file when adding or changing levels.** The app calls `computeAudio(state)` (now in `js/app.jsx`) for level state.
- **`js/unlock.js`** — the signed-cookie unlock module behind the member flow. Frozen; see `UNLOCK_README.md` before touching it or the unlock wiring in `index.html`.
- **`scripts/`** — the checks and the release command (below).
- The app synthesizes audio directly from level state (no audio files); everything is computed from the JSON in `content.js` via Web Audio API.
- Write copy against `GLOSSARY.md` and the locks in `UNLOCK_README.md`.
- **Strategy, funnel, and diagnostic docs** (`strategy-*.md`, `funnel-plan-*.md`, `README*.md`) are untracked background; the council transcript/report (`council-*`) stay local.

Releases go through **`node scripts/promote.js`**: it runs every check, bumps `content.js?v=N` in `index.html`, and prints the three direct links to re-share (`--dry-run` previews without changing anything; `--v N` sets the version instead of incrementing). Work on a branch, run the checks, merge to `main` — a push to `main` auto-deploys in about a minute.

The `staging.html` / `content-staging.js` sandbox pair was removed 2026-10-18; it lives on in git history along with the old copy-and-refuse promotion gate.

## Hosting

Served via GitHub Pages. Links are distributed directly — the full-bleed iframe wrapper is retired (the page's own in-app embed support is unchanged).

One production build, three direct links that differ only by URL query. Base URL: `https://zzz-creator.github.io/audio-troubleshooting-lab` (no trailing slash — append `?tier=member&v=N` etc. directly; `/path?query` redirects here with the query intact)

| Variant | Query | Placement | Behavior |
|---|---|---|---|
| **Members** | `?tier=member&v=N` | Members-only Circle page (behind the access group) | Everything unlocked; no email gate |
| **Free — cold** | `?v=N` | YouTube video descriptions + any public link | Full free funnel; email gate fires after the first course win (moved from the finale, 2026-10-18) |
| **Free — already opted in** | `?optedin=1&v=N` | All email sales copy (list is already opted in) + the Circle Resource Library (access to it = already on the list) | Same free funnel, email gate skipped |

The three URLs differ only by query and load `content.js?v=N`; a shared link and a typed URL behave identically.

Why `?optedin=1`: everyone reached through email or the Resource Library is already on the list, so re-asking for the email is friction with no gain — `?optedin=1` skips it. Public/YouTube traffic is cold, so it gets the plain free link and the gate. Members are gated by the Circle access group, not by the URL (the `?tier=member` unlock is soft; the access group is the real wall).

`&v=N` in any shared link (YouTube description, email) must be updated by hand after every production push.

## Progress and the drip model

Free users can complete **The Gig** (a three-scenario arc ending in a show) plus free lessons. **Practice Mode** and **Run the Show** are locked to members (sell via the join link in the completion card). **Over-Essentials** scenarios unlock over a 12-month drip (members only): the earliest `unlocksAt`-eligible scenario is promoted into the member library once a week, so free users see practice+gig, members see a growing library.

Start Here order is explicit in `START_HERE` — entry lesson, then numbered wiring/fault lessons, The Gig, post-gig debrief, courses. A `.locked` or `.feat-locked` lesson in `START_HERE_INDEX` renders grayed with a lock icon but the label is untouched. **Never reorder or rename entries in `START_HERE` casually — `check_lesson3_regression.js` pins its indexes** (e.g. `START_HERE[2]` must be `lesson3`, `START_HERE[14]` must be `gig`).

There is no backend: free/members-only gating is client-side only; scenario JSON is in `content.js`; email capture is the Kit form, with posting **disabled 2026-10-18** while the subscription service is reworked — the gate still accepts and stores the address locally, it posts nothing; join links use `?optedin=1`.

## Audio

No audio files. Everything is synthesized directly from the level state via Web Audio API (oscillators for the band, noise for fans/PA, procedural envelopes per source). Nothing autoplays — the first user gesture (clicking a fader, button, etc.) initializes the `AudioContext`. The app contains its own `[Unlocked]` / `[Shared Rep]` handling for signed-cookie member unlock and deep-link state.

## Funnel events (local only)

Every funnel beat is recorded by `track()` in `index.html` into a bounded localStorage ring buffer (`audiou-lab-funnel-v1`, ~200 events). Nothing is sent anywhere — `FUNNEL_ENDPOINT` is deliberately blank until an analytics service is actually chosen. In the browser console: `__funnelDump()` returns the events (oldest first), `__funnelClear()` empties the buffer. Events: `landing`, `start_here_progress`, `gate_shown`, `email_submit`, `email_skip`, `practice_taste`, `ear_training`, `join_panel_shown`, `member_cta_click`.

## Checks

Run them before a production push — or just run `promote.js`, which runs all four. There is no build step, so these are the checks.

| Command | What it gates |
|---|---|
| `node scripts/promote.js` | The release command, run before every production push. Executes the four checks below, sets `content.js?v=N` in `index.html`, and prints the three direct links with the new version. Exits 1 on any failing check with nothing changed. `--dry-run` previews; `--v N` sets the version instead of incrementing. |
| `node scripts/check_syntax.js` | Parses every `<script type="text/babel">` block in `index.html`. Catches the "page just sits on LOADING THE LAB…" class of bug in ~1s instead of a browser round trip. |
| `python scripts/lint_copy.py` | Copy contract: no new `symptom`/`teach` on a lesson, every `def` key resolves against `GLOSSARY.md`, no dropped control names or numbers (zero-error gate; warnings allowed). Defaults to `content.js`. |
| `node scripts/check_lesson3_regression.js` | Regression gate for Run the Show 03. Drives the real engine out of the HTML and the real lesson out of the content file, and fails if the guide's four hints and the win disagree on any way the student can set the two mains. |
| `node scripts/check_tier_prompt.js` | The `?tier=member` landing flow, driven against the real production script block under a DOM shim: the member link prompts for the password, a correct unlock writes the signed cookies and re-renders the member tier, a cancelled/wrong answer falls back to free, an unlocked member is never re-asked, and cold free links are left alone. |

The regression and tier gates also take `HTML=<path>` and `CONTENT=<path>` to point at an alternate engine/content pair; they exit 2 if babel or the lesson is missing, 1 if the guide and the win disagree. `@babel/standalone` comes from `scripts/vendor/` (committed, works offline) — `node_modules/` and `BABEL_STANDALONE=<path>` are optional overrides.
