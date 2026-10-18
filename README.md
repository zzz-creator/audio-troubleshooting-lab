# Troubleshooting Lab

An interactive mixing-console training simulator for [Audio University](https://www.youtube.com/@AudioUniversity). Single-page app, no build step (React + Babel via CDN). Free Essentials tier acts as the lead magnet; paid challenge scenarios drip in over time for members.

## Files

Two parallel pairs — a sandbox and production. `IS_STAGING` auto-detects which is which from the content-script filename.

- **`staging.html` + `content-staging.js`** — the development sandbox. Do content work here.
- **`index.html` + `content.js`** — production (the live embed). Content moves one way only, via **`node scripts/promote.js`**: it refuses to run if production holds any line staging lacks (wrong-direction-copy protection), copies `content-staging.js` → `content.js`, sets `content.js?v=N` in `index.html`, runs all three checks, and prints the direct links to re-share. `--dry-run` previews without changing anything; `--v N` sets the version instead of incrementing.
- **Engine edits go into `index.html` directly** (or are mirrored into it) — do **not** copy `staging.html` over `index.html`. `index.html` carries the full signed-cookie unlock wiring and is currently ahead of the sandbox by design; a blind copy would revert it.
- The app shell holds the engine, UI, and synthesized audio; the content file is the scenario library (`window.LEVELS`, `window.START_HERE`, `window.FEEDBACK_MODE`, etc.). **Edit the content file when adding or changing levels.**

## Hosting

Served via GitHub Pages, embedded in an iframe on the Audio University Circle community. A commit to `main` auto-deploys within about a minute.

One production build, three iframe embeds that differ only by URL query (all share the full-bleed wrapper with `allow="autoplay; fullscreen"`). Base URL: `https://zzz-creator.github.io/audio-troubleshooting-lab` (no trailing slash — append `?tier=member&v=N` etc. directly; `/path?query` redirects here with the query intact)

| Variant | Query | Placement | Behavior |
|---|---|---|---|
| Members | `?tier=member&v=N` | Members-only Circle page (behind the access group) | Everything unlocked, no email gate |
| Free — cold | `?v=N` | YouTube descriptions + any public link | Full free funnel; email gate at the finale |
| Free — opted in | `?optedin=1&v=N` | Email sales copy + the Circle Resource Library (both audiences are already on the list) | Same free funnel, email gate skipped |

`&v=N` is a cache-buster the browser/CDN keys on (the root `index.html` shell is cached separately from `content.js?v=N`). **On every production push, `promote.js` sets `content.js?v=N` and prints the three direct links with the new `&v=N`** — update those links wherever they are shared (YouTube descriptions, email copy, community posts) so visitors get the new shell on first load instead of a stale cached one. The `?tier=member` unlock is soft — the real paywall is the Circle access group. See `funnel-plan-2026-07-10.md` for the full distribution map and rationale.

## Progress and the drip model

Member progress is saved in the browser via `localStorage`, keyed by each level's **stable `id`**. Two rules keep monthly content drops from disturbing anyone's progress:

1. **Every scenario has a stable `id`.** Progress is stored by id, not by position.
2. **Append only. Never renumber existing levels.** New scenarios go on the end with new ids.

Follow those two and you can drop new levels any time without resetting a single student.

## Audio

The app synthesizes its sound in the browser with the Web Audio API. It loads no audio files, so there is nothing to break across hosts. Sound starts off and resumes on the first click (browser autoplay policy).

## Checks

There is no build step, so these are the checks. Run them before a production push, and on the pair you changed.

| Check | What it catches |
|---|---|
| `node scripts/promote.js` | The release gate, run before every production push. Refuses if `content.js` holds any line `content-staging.js` lacks or if there is nothing to promote, copies the content file, sets the version in `index.html`, runs the three checks below, and prints the direct links to re-share. |
| `node scripts/check_syntax.js` | Parses every `<script type="text/babel">` block in each HTML file. A dropped bracket inside a babel block does **not** show up as a console error — the page just sits on "LOADING THE LAB…" forever — so this turns a browser round trip into a one-second check. |
| `python scripts/lint_copy.py` | The content contract: lesson text is definitions-only, every glossary key exists, approved terminology, no control name or number silently dropped. Errors fail; warnings do not. Takes an optional file argument (default `content-staging.js`). |
| `node scripts/check_lesson3_regression.js` | Regression gate for Run the Show 03. Drives the real engine out of the HTML and the real lesson out of the content file, and fails if the guide's four hints and the win disagree on any way the student can set the two mains. |
| `node scripts/check_tier_prompt.js` | The `?tier=member` landing flow, driven against the real production script block under a DOM shim: the member link prompts for the password, a correct unlock writes the signed cookies and re-renders the member tier, a cancelled/wrong answer falls back to free, an unlocked member is never re-asked, and cold free links are left alone. |

Both node gates use `@babel/standalone`, committed at `scripts/vendor/babel.min.js` (the same 7.29.0 the HTML loads from unpkg), so they run offline with no npm install; `BABEL_STANDALONE` still overrides. The regression gate also takes `HTML=<path>` and `CONTENT=<path>` to point at another engine/content pair (e.g. `staging.html` + `content-staging.js`); it exits `2` if babel or the lesson is missing, `1` if the guide and the win disagree.
