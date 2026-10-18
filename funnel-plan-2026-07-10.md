# Troubleshooting Lab: Email opt-in + paywall plan
*2026-07-10. Panel synthesis (funnel, deliverable, pedagogy, code feasibility). Staging planning only, no code changed yet.*

## The one thing that changes everything: most of this already exists
The code panel confirmed the current build already ships:
- A separate 6-lesson **Mixer Tutorial** arc, ungated (ids `mix-master/pfl/gain/fader/pan/aux`).
- The 10-lesson **Run the Show** arc (`window.LEVELS`), currently **member-locked**.
- A `freePractice` counter with `FREE_PRACTICE_LIMIT = 10` already capping free Practice reps.
- Feedback mode locked, Free Play free, 16-channel member-only, all already wired.
- The Kit email gate (form `9560384`), currently soft/skippable, firing before Practice.
- A hard mobile block below 1024px that shows an email-capture "best on a computer" screen.

So your plan is mostly a **policy re-slice of existing pieces**, not new construction. The build list at the bottom is short.

## The panel's strongest signal (this pushes back on your plan)
All three strategy voices independently landed on the same correction:

**Do not gate the email before Run the Show. Gate it after the first win inside Run the Show.**

Your plan asks for the email at a doorway (tutorial done, email to enter the course). The panel says a doorway ask reads as a toll and bounces high-intent people before they feel the payoff. The same email ask, moved to just after the user gets their first real result inside Run the Show, becomes a "save your progress and keep going" action instead of a toll. Same gate, same list, materially higher opt-in, and it protects the completion of the very thing that sells the membership.

## Recommended funnel map

### Desktop path
1. Land, no gate. **Mixer Tutorial** plays immediately (already ungated).
2. Roll straight into **Run the Show**, first two beats free, still no email.
3. **Email ask fires after the first genuine win** (first time they get sound through the system and a monitor send working), framed as "save your progress and finish the run." Email required to continue past this beat. Name optional.
4. Finish Run the Show.
5. **Free Practice, curated ramp, capped low (6-7, not 10)**: reps climb from one obvious fault to one subtle fault to a first 2-fault scenario they probably will not fully nail.
6. **Paywall fires at the last free rep OR the instant they reach for a locked capability** (Feedback by-ear, multi-fault, 16-channel), whichever comes first. Copy names the specific thing they just tried to do.
7. Membership CTA, headline unlocks: the endless gym, by-ear Feedback, the 16-channel system, the mastery ledger.

### Mobile path (capture and defer, do not run the funnel here)
The tool genuinely needs a full screen (drag-to-patch, small controls). The 1024px block is a correct product decision, not a gap to fix.
1. Land, Mixer Tutorial is not playable, show the "works best on a computer" capture.
2. Capture email, deliver **the desktop deep-link PLUS the lead-magnet asset** so the email earns its open.
3. The emailed desktop link carries an "already opted in" flag so when they arrive on desktop the step-3 gate is skipped (no double ask).

### Suppression rule
Email known this session or arriving via the opted-in link = zero further capture prompts. Device decides which surface shows, state decides whether it shows at all.

## Opt-in to deliverable map
One Kit subscriber per person (email is the key), tagged by entry point. Deliver to the person's emotional state, not to the form.

| Context | State | Deliverable | Entry tag |
|---|---|---|---|
| Mobile bounce | blocked, wants in | desktop deep-link + the asset | `entry-mobile-bounce` |
| Desktop, after first Run the Show win | engaged, wants more | course continues **in-tool instantly**; email is a receipt + the asset (never a link to what they are already in) | `entry-desktop-tool` |
| (optional) Circle free-page | browsing | the asset, framed "start here" | `entry-circle-free` |
| Mobile then desktop | crossed over | none, gate skipped via link flag | `crossed-mobile-to-desktop` |

## The lead-magnet asset (ranked)
1. **One-page "System Check" flow card (build this first).** The Lab's diagnostic logic made portable: no sound, check these four things in this order. Mirrors what the tool trains, reinforces the paid program, ~1 hour of design. Reuse the pdf-companion visual language so it looks like the membership.
2. **Soundcheck checklist (your instinct, solid #2).** The pre-show sequence, framed as "the order I actually work in," not a generic list.
3. Gain-staging quick-reference card (meter-driven).

Pick one to launch. The System Check card is the strongest because it feels like a piece of the Lab, not a thing anyone could Google.

## Four-email nurture spine
Spine: you proved you can diagnose under pressure, here is the gap between drills and a live room, the membership closes that gap.
- **Email 1 (immediate):** deliver the asset + desktop link, one line on what the Lab really trains, no pitch.
- **Email 2 (day 2):** the reps you did are the easy part, the hard part is three things failing at once, point back into the harder scenarios.
- **Email 3 (day 4):** a real failure and how the diagnostic order saved the night, soft mention of the full program.
- **Email 4 (day 6):** direct membership offer, name what Run the Show plus the full 16-channel system unlocks.
- Branch: if a behavior tag shows they opened the course, skip Email 2 and accelerate to the offer.

## Three real decisions for you
1. **Email gate placement (recommended: after first win, not at the door).** This is the panel's strongest call. It overrides the "email before Run the Show" step in your plan.
2. **Feedback mode: give one guided taste free, do not lock it completely (recommended: one taste).** Ringing out a monitor is the most visceral, most shareable, most "I need to learn this" moment in the tool. It is your best salesperson. Lock the by-ear version, but let a free user feel the glow-assisted fix land once. A remembered feeling of killing feedback is a craving. A locked door is abstract.
3. **Free Practice cap: lower from 10 to about 6-7, curated as a ramp (recommended).** Ten single-fault reps let a competent engineer feel "I've got this" and leave satisfied. Cap lower and structure the reps to end on a 2-fault scenario they do not quite nail, so they leave hungry and slightly humbled. The paywall lands on that upswing.

## Minimal build list
1. Demote Run the Show from member-locked to email-gated-free (drop `isLesson` from `isLocked`, staging.html ~7376).
2. Move the email gate to fire after the first-win beat inside Run the Show, and make it required there (remove "Skip for now" at that specific gate; keep it email-only, low friction).
3. Unlock one guided Feedback ring-out for free; keep by-ear paid.
4. Lower `FREE_PRACTICE_LIMIT` to 6-7 and curate the free rep sequence into a ramp.
5. Add a second Kit form or tag so mobile-bounce and desktop-tool captures are distinguishable; route `MobileNotice.onCapture` separately from desktop `captureEmail`.
6. Make the emailed desktop link carry an "already opted in" param that sets `emailDone` on arrival.
7. Build the two Kit automations (mobile: link + asset; desktop: asset) and the asset itself.

## Status (2026-07-10, staging v133, commit 6603eb7)
Built and verified live on staging:
1. Run the Show is free (email-gated after lesson 1, not member-locked). DONE.
2. Email gate fires after the first Run the Show win; "Not now" drops to Free Play without granting access. DONE.
3. One free guided Feedback ring-out, then the pitch. DONE.
4. Free Practice cap lowered to 7. DONE.
5. Mixer Tutorial hands straight into free Run the Show (no premature email ask). DONE.

Still to do (Kyle-owned, mostly Kit-side; not blocking the app):
6. Second Kit form or tag so mobile-bounce and desktop captures are distinguishable, and route the mobile capture separately. NOT STARTED (app-side, small).
7. Emailed link carries an "already opted in" param that skips the email gate. DONE 2026-07-10, live in production. Add `?optedin=1` to any Lab link for people already on the list; it sets `emailDone` on arrival and persists (as a skip) when browser storage holds. Members never see the gate regardless.
8. The Soundcheck Checklist deliverable + the Kit automations that send it. KYLE (checklist is already made; the automations live in Kit, not the app).

Note: the funnel evolved past this v133 plan. Production now leads with the free "Start Here" course, gates email at its finale (Ring Out the Feedback), then a 5-rep Practice taste, then Ear Training (3 guided rounds → join-or-one-by-ear panel), then the pitch. The member build adds Run the Show, unlimited Practice, unlimited Ear Training (guided + by ear), and the 16-channel board. See git history from 2026-07-10 for the full arc.
Correction 2026-10-18: the email gate moved again — from the Start Here finale to after the FIRST Start Here win (the council's directive in this document, line 18, shipped at last; Run the Show turned out to be member-locked, so the free funnel's first win is a Start Here lesson). The finale now carries the completion card for everyone, plus a fallback ask for a free viewer who never submitted at the first-win beat.

Decision made 2026-07-10: use the existing Soundcheck Checklist as the lead-magnet asset (it's already finished).

## Honest constraints
- **There is no backend.** Kit is the only delivery mechanism. The checklist, the desktop link, and every nurture email are **Kit automations you build and test in Kit**, not something the app sends. The app can only capture the address.
- **Nothing here is enforced.** `?tier=member` is a URL param, the gate lives in a signed-cookie unlock (localStorage before 2026-10; see `UNLOCK_README.md`), and shared links bypass it. This is fine for a lead magnet (the goal is friction and funnel, not DRM), but treat the paywall as soft. The real protection is that the member content sits behind the Circle access-group page, which casual users never see.
- **Sequence:** the code changes are a short session. The slow parts are the asset design and the Kit automations, so start those in parallel.

## Live distribution map (as of 2026-07-10, production v67)

One GitHub Pages build (`index.html` + `content.js`), three direct links that differ only by URL query. Bump the `&v=` cache-buster on every production push (`node scripts/promote.js` does it and prints all three links), and update it wherever these are pasted.

*(2026-10-18 correction: the full-bleed iframe wrapper — `allow="autoplay; fullscreen"` — is retired; distribution is direct GitHub Pages links now. The `v=67` values below are the 2026-07-10 snapshot — read them as query shapes, not live versions.)*

Base URL: `https://zzz-creator.github.io/audio-troubleshooting-lab` (no trailing slash — the variant query goes straight after, e.g. `...audio-troubleshooting-lab?tier=member&v=N`)

| Variant | URL query | Where Kyle placed it (2026-07-10) | Behavior |
|---|---|---|---|
| **Members** | `?tier=member&v=67` | Members-only Circle page (behind the access group) | Everything unlocked; no email gate |
| **Free — cold** | `?v=67` | YouTube video descriptions + any public link | Full free funnel; email gate fires at the finale |
| **Free — already opted in** | `?optedin=1&v=67` | All email sales copy (list is already opted in) + the Circle Resource Library (access to it = already on the list) | Same free funnel, email gate skipped |

Rationale for the opted-in placements: everyone reached through email or the Resource Library is already on the list, so re-asking for the email is friction with no gain — `?optedin=1` skips it. Public/YouTube traffic is cold, so it gets the plain free link and the gate. Members are gated by the Circle access group, not by the URL (the `?tier=member` unlock is soft; the access group is the real wall).

~~Caveat carried from Honest Constraints: Safari partitions third-party iframe storage, so the persisted opted-in/skip flag and saved progress may reset per visit inside Circle on Safari. The `?optedin=1` link still works every time because it re-sets the flag on arrival.~~ **Struck 2026-10-18:** the caveat only applies inside cross-origin *iframe* embeds, which are retired; the direct links above are first-party, top-level visits where Safari does not partition storage. (`?optedin=1` re-setting the flag on arrival is unchanged.)
