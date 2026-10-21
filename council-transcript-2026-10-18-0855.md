# LLM Council Transcript — What can we improve? (Audio Troubleshooting Lab)

*18 October 2026, 08:55 · Session run in `audio-troubleshooting-lab` (main @ a8e16fd)*

---

## 1. Original question

> **User:** "@llm-council what can we improve?"
> **Clarified (one question asked):** Improve *this project* (audio-troubleshooting-lab), not the council skill.

## 2. Framed question

**What should we improve in the Audio Troubleshooting Lab (C:\Users\mrkee\Documents\Opencode\HTML\audio-troubleshooting-lab)? Cover codebase maintainability, funnel/conversion design, product/pedagogy priorities, and process risks. What is the highest-leverage improvement, what is decaying, what is over-engineered or missing?**

Context given to every advisor:

- Single-page React + Babel-via-CDN app, no build step; GitHub Pages; embedded in iframes on the Audio University Circle community. Free tier = lead magnet into a paid membership (Kit email, no backend; soft paywall via URL param + localStorage; Circle access group is the real lock).
- Two hand-maintained file pairs: `staging.html` + `content-staging.js` vs `index.html` + `content.js`. Staging v242, production v108; `content-staging.js` ~3,391 lines vs `content.js` ~2,372; engine HTML files ~13,650 lines each. Promoted by manual copy; cache-buster `&v=N` bumped in multiple places per push.
- Checks: `node scripts/check_syntax.js`, `python scripts/lint_copy.py`, `node scripts/check_lesson3_regression.js` (last needs non-vendored `@babel/standalone`).
- Funnel (as of 2026-07-10, evolved past its written plan): free "Start Here" course → email gate at its finale → 5-rep Practice taste → Ear Training (3 guided rounds → join-or-by-ear) → membership pitch.
- 2026-07-06 "Show Day" proposal with unresolved forks; recent commit "client-side unlock system with signed split cookies + session seal"; untracked log file in repo root.
- **Stakes:** membership conversion, the pedagogy goal (one-of-a-kind training tool), effectively a single maintainer.

Context sources scanned before framing: `README.md`, `funnel-plan-2026-07-10.md`, `strategy-review-2026-07-06-troubleshooting-lab-tiers.md`, `git status`/`git log`, file line counts.

## 3. Seating

**Core five (always seated):** The Contrarian, The First Principles Thinker, The Expansionist, The Outsider, The Executor.

**Rotating panel (5 of 11):**

| Advisor | Why seated |
|---|---|
| 🔧 The Pragmatist | Build/technical question; feasibility and constraints of a single maintainer |
| 🛡️ The Risk Assessor | Downside/irreversibility: drift, silent production failures |
| 💡 The Innovator | "What to improve" invites unconventional angles beyond hygiene |
| 📈 The Economist | Funnel/incentives/release-energy scarcity |
| ♟️ The Strategist | Long-term positioning: where the project lands 2–5 years out |

Not seated: Skeptic (overlaps Contrarian), Data Analyst (overlaps Economist on numbers), Historian/Ethicist/Humanist/Comedian (weak fit for a solo-dev maintenance/funnel question).

**Peer review:** 10 reviewers, one per advisor, responses anonymized with a randomized letter mapping (see §6).

---

## 4. Advisor responses (de-anonymized)

### The Contrarian *(core five)*

**The HMAC unlock system is security theater, and it's your most expensive line of code.** The pepper is extractable from the bundle — your own README admits it. Cold visitors already receive all 13,650 lines of engine HTML; the split cookies, install ID, and session seal protect nothing Circle doesn't already protect, while adding a crypto module, cookie-migration paths, and a test matrix a solo maintainer must maintain forever. Delete it or reduce it to one flag. Complexity you can't afford is worse than a paywall someone can bypass.

**The real decay is the manual promotion between two drifting files.** Staging v242 vs. production v108 — a 1,019-line content divergence maintained by hand, with a cache-buster bumped in multiple places per push. That is the actual failure waiting to happen: one forgotten `&v=N`, and members load stale content. Highest-leverage fix: one `promote.js` script that copies staging→production and rewrites every version literal atomically. Ten lines, kills the biggest operational risk.

**Show Day has been an unbuilt decision for four months.** Your own review flagged Fork A (member onboarding first) as protecting month-one churn — the fragile revenue — yet the forks never got decided. Building Show Day now would optimize the long-tenure member while your newest paying member lands in "randomness."

**Missing:** funnel instrumentation. You cite conversion as the business goal but measure nothing between email gate and join.

### The First Principles Thinker *(core five)*

You're asking which of four areas to improve. Wrong question. The real problem: a one-person project is paying a compounding tax on every commit, and no feature in any of those four buckets matters while it does.

Strip it down. The 956KB shell is identical between staging and production except one `<script src>` line — yet it's maintained twice, by hand, with a cache-buster bumped in multiple places per push. That is the decaying asset: not the code, the promotion ritual. Everything else follows from it — the content drift, the stale-shell risk members actually hit, the version-pairing commits cluttering your log.

The signed split cookies + session seal are the tell. You built real cryptographic complexity to defend a paywall your own README admits isn't the real protection (Circle's access group is), while leaving genuinely unprotected the failure that ships silently: a hand-copied divergence or stale cached shell. Fix the leak you have, not the one you invented.

Highest leverage: one command that copies `content-staging.js` → `content.js`, bumps N everywhere, runs the three checks. Maintainability, drift, and process risk collapse into a single ~20-line script in `scripts/`.

Then the funnel: "pass/fail vs. no-scoring" isn't an unresolved fork — it's two incompatible pedagogies never reconciled. Decide what the tool teaches before building Show Day. And conversion work with no stated drop-off measurement is astrology. Name the number you're guessing at first.

### The Expansionist *(core five)*

**The undervalued asset is your own content graph.** Every guided chain in `content-staging.js` — patch, power, gain, ring-out — is structured, machine-readable pedagogy nobody else has. You're treating it as UI copy when it's the product: export it and each lesson becomes a YouTube walkthrough script, a Circle post, a printable System Check card, and the daily "Show Day" challenge feed. One content source, five distribution surfaces. That's how a single-maintainer tool grows without new code.

**Highest leverage: ship the 2026-07-10 funnel plan.** It's written, panel-approved, and mostly a policy re-slice of code that already exists (demote Run the Show to email-gated, move the gate after first win, one free guided ring-out, cap Practice at 6 ending on a 2-fault humbling). Staging is at v242, production at v108 — you're 134 experiments ahead of your revenue. The conversion lift is sitting unbuilt while you polish the simulator. Ship it.

**The Show Day daily challenge is the retention engine everyone's underrating.** Pass/fail and free/paid forks are stalling a no-brainer: a rotating scenario drives return visits, feeds the email list, and pre-sells the paid ramp naturally. Resolve forks by shipping the loosest version this week.

**Decaying:** the staging/production split itself — 134 versions of manual copy-promotion is a time bomb. One `node scripts/promote.js` (copy + bump every `&v=N`) costs an hour and buys back every future release.

**Over-engineered:** signed split cookies + session seal securing a soft paywall whose real lock is Circle. Delete the crypto theater; keep the `?tier` param.

### The Outsider *(core five)*

**Nobody outside this repo could ship a single change here.** Two 956KB HTML files that differ by ~850 bytes, promoted by hand, a cache-buster bumped "in multiple places" — that's not a workflow, it's a ritual only you know. The content files have already diverged by ~1,000 lines, which means your staging sandbox is teaching lessons production doesn't have, or vice versa. Nobody has noticed because nothing checks it.

**Highest leverage: one file pair, not two.** Make `index.html` the only engine, switch environments with a single `?env=staging` flag or a tiny build script that swaps content. That deletes the manual copy, the drift, and most of the cache-buster problem in one move. Everything else is polish on top of a fork that will keep producing "works in staging, broke in prod" bugs — which your git log already shows repeatedly.

**Over-engineered:** the signed-cookie unlock system. It's security theater — the pepper ships to every browser, and you've said the real gate is Circle. Hours of HMAC work protecting a page the paywall was never really protecting.

**Missing:** an outsider cannot tell what a new visitor *does* in the first 60 seconds, or why they'd pay. Ship one clear hero scenario and instrument it — you're optimizing gates on a path whose first step is unmeasured.

**Decaying:** the written plan, already overtaken by the funnel. Reconcile it or delete it.

### The Executor *(core five)*

**Monday morning, three commands.** `content.js` is a strict subset of `content-staging.js` — 1,031 deleted lines, zero insertions. That means promotion is provably a straight copy, so write `scripts/promote.js`: run the three checks, copy `content-staging.js` → `content.js`, bump `?v=` in `index.html`, print the embed URLs to re-paste in Circle. Fifteen minutes, kills the single largest risk in the repo. Every other maintainability item is noise next to this.

Second hour: vendor `@babel/standalone` so `check_lesson3_regression.js` actually runs — a gate nobody can execute is decoration, not a gate. Add the stray `.log` to `.gitignore`.

**What's decaying:** the manual promotion ritual and the split-cache-buster, which are the same problem. **Over-engineered:** the signed-cookie/session-seal unlock. Client-side crypto with no backend is theater — Circle's access group is the real lock. Don't rip it out; freeze it and never extend it. Also freeze `index.html`/`staging.html` dual-maintenance — a `diff` gate in the check script that fails when they diverge beyond `content.js` is cheaper than merging 13,650 lines twice per release.

**Missing:** Show Day is unbuilt — confirmed, zero code hits. The strategy doc already answers it: build order matters — member start-here path first, it protects month-one churn; Show Day second. Don't start Show Day until `promote.js` exists.

### The Pragmatist *(panel — Practical Advisor)*

**Monday's job: collapse the duplication.** The two 13,641/13,661-line HTML files differ by ~20 lines. That's not two environments — it's one file maintained twice, by one person, via manual copy. The drift is already measurable: `content.js` has been frozen at v102 since July 24 while `content-staging.js` ran to v242, so 1,019 lines of production content are a stale mirror. Every engine fix now requires a double-edit you will eventually forget.

The realistic fix is not "adopt a build step." It's one 30-line Node concat script: `template.html + content.js → index.html`, with the version injected from `git describe` or a counter. That single script kills three open wounds at once — the manual copy, the `&v=N` bump scattered across Circle embeds, and the promotion step that's visibly failing. Two hours of work beats months of discipline you've already proven you won't sustain.

**Over-engineered:** the signed split cookies + session seal. You said it yourself — the real protection is the Circle access group. Client-side crypto on a static site is maintenance burden buying false confidence. Revert to URL param + localStorage.

**Missing:** measurement. Conversion is the business goal and nothing records where free users stall. One funnel event log (even a Kit tag per stage) tells you more than the next feature will.

**Decaying:** the July strategy review's Show Day forks, open three months — that's not unresolved, that's dead. Ship a default: new-member path first, no scoring, free.

**Process:** vendor `@babel/standalone`; delete the untracked log file and `abtest.html`; write a five-line release checklist.

### The Risk Assessor *(panel — Risk Analyst)*

**Pre-mortem: it's Q1 2027 and the funnel died where nobody was looking.** Ranked by likelihood × damage:

1. **Manual promotion regresses production — highest leverage.** Drift is measurable today: a ~1,031-line gap across 134 unreplayable versions. One copy in the wrong direction silently reverts shipped fixes (you've already needed "Run the Show 03 can be finished again"). Fix: a `promote.js` that diffs staging→prod, refuses regressions, bumps **every** `&v=N` atomically, then runs all three checks. This converts your most dangerous recurring manual act into a gated one.
2. **Mixed-version serving.** Multi-location cache-buster + iframe embeds = new HTML with old content.js for some Circle users. No error surfaces to you. Same script fixes it.
3. **Over-engineered: the HMAC/split-cookie/session-seal stack.** The pepper ships in the bundle; Circle is the real gate. This buys nothing but *can* wrongly lock a paying member — an asymmetric failure (refund + support ticket). Replace with a plain flag.
4. **Missing: funnel instrumentation.** Kit shows sends, not drop-off. Resolve Show Day's forks *after* you can see where users leave.
5. **The regression gate isn't hermetic** — vendor `@babel/standalone`. Delete the stray `.log`.

### The Innovator *(panel — Creative Thinker)*

**Kill the file pair, not the process.** Two 13,650-line HTML files kept in sync by hand — 135 staging versions ahead — is the whole disease. Staging should be a *branch*, not a file. Ship one `index.html`/`content.js`, gate dev features behind `?dev=1`, deploy prod from `main` via a 10-line GitHub Action that auto-injects the git SHA as `?v=`. That single move erases the manual copy ritual, the multi-place cache-buster bump, and the 1,000-line content deficit your free users are silently eating. Production is running a funnel the docs don't even describe anymore.

**The signed-cookie/session-seal unlock is security theater.** You wrote client-side crypto to defend a paywall you've already documented as soft, where Circle's access group is the real lock. It's the most complex code in the repo protecting the least valuable asset. Revert it to a plain flag.

**You have a conversion goal with zero instrumentation.** Ear Training → join panel → membership is completely dark. Add Kit event tags or even a single `navigator.sendBeacon` ping per funnel transition before touching any copy.

**The missed product idea:** you already built a share-link scenario builder (the `COPY LIBRARY ENTRY` tool). That's a distribution engine hiding in a training tool. Free users who publish a ring-out scenario and share it into live-sound communities *are* your acquisition channel — far cheaper than any email gate. Make "build and share a fault" the free-tier hero action, and gate *unlimited attempts*, not creation.

### The Economist *(panel — Incentives Analyst)*

**Highest leverage: a one-command promote script.** The scarce resource is the single maintainer's release energy, and the manual copy tax is *why* production sits at v108 while staging is at v242 — your live lead magnet runs 134 versions behind your best content. Every funnel test (gate placement, rep caps, Show Day) demands a hand-copy of ~955KB HTML plus a 232KB content file plus cache-buster bumps; that friction is the direct cause of a starved funnel. Cheapen promotion and good content flows downhill unattended.

**Over-engineered: the HMAC unlock system.** Split cookies, session seals, tamper detection — defending a soft paywall whose real lock is the Circle access group. Negative-ROI security theater: it costs maintenance, adds a failure surface (a bug here locks out *paying* members), and converts nobody. Revert to the URL param; bank the hours.

**Missing: your own panel's gate fix never shipped.** The 2026-07-10 plan says move the email ask from the Start Here finale to *after* the first win inside Run the Show. A doorway ask reads as a toll and bounces high-intent users pre-payoff. Free opt-in lift, already analyzed, still unimplemented.

**Decaying:** content drift; both planning docs, explicitly stale, with Show Day's forks unresolved; the regression gate needing unvendored `@babel/standalone` (quietly skippable); an untracked log in root.

**Show Day:** decide the free/paid split first or don't build. A daily challenge is a retention loop — the habit *is* the membership. Shipping it open gives away the thing you sell.

### The Strategist *(panel — Big-Picture Thinker)*

**Where this lands in 2–5 years:** the asset is the simulator's pedagogy and the trust of a smart, niche audience — not the paywall. You are playing the compounding game (a tool no one else has, an email list, a membership that retains) while spending your scarcest resource — one maintainer's hours — on the non-game.

**Highest leverage: kill the staging/prod fork.** A 134-version drift with manual copy-promotion is a slow-motion accident and a tax on *every* future feature, doubled. One source of truth, a promote script that copies, bumps `&v=N` everywhere from one version constant, runs the three checks; staging behind a query flag. An hour of setup repays itself on the next ten commits.

**Over-engineered:** the HMAC signed-cookies + session-seal unlock. The real protection is Circle access; nobody is scraping your pepper from a client bundle to steal ear-training reps. Defense built against an imagined attacker, at the exact moment the fork and the untracked log file say maintenance capacity is the binding constraint.

**Missing:** you cannot manage a funnel you cannot see. Instrument the funnel edges (email gate hit → opt-in; rep-5 → ear-training; join-or-by-ear → join) before building anything new. The 2026-07-06 review's Operator was right and was ignored: a new-member "start here" path protects revenue more than Show Day protects attention. Ship that first, daily challenge later.

**Process risk:** the fork, plus the dead strategy doc — decide Show Day's forks explicitly or delete it.

---

## 5. Peer reviews (anonymized round)

Anonymization mapping (randomized to avoid positional bias):

| Letter | Advisor |
|---|---|
| A | The Risk Assessor |
| B | The Outsider |
| C | The Economist |
| D | The Contrarian |
| E | The Strategist |
| F | The Expansionist |
| G | The Executor |
| H | The First Principles Thinker |
| I | The Pragmatist |
| J | The Innovator |

**Review 1.** Strongest: **G** — the only response that verified before prescribing (strict subset ⇒ promotion is a safe copy), hours-scale sequence, restraint (freeze crypto, diff gate instead of merging 13,650 lines). J runner-up but adds CI the project avoids. Blind spot: **F** — ignores the binding constraint; "ship the loosest Show Day this week" plus a five-surface export exceeds one maintainer's capacity. All missed: whether members' localStorage state migrates across a v108→v242 jump; bus factor (no backup/export of the content graph).

**Review 2.** Strongest: **G** — evidence-grounded, hour-by-hour Monday actions, smart to freeze the crypto mid-flight; novel HTML-divergence diff-gate. Blind spot: **J** — correct root fix but layers a full free-tier redesign plus CI migration with zero evidence while one gate can't even run. All missed: runtime performance and mobile audio reality — 956KB HTML + client-side Babel is a *conversion* problem (slow first paint, Web Audio latency/autoplay on phones where Circle embeds open).

**Review 3.** Strongest: **J** — turns analysis into a new lever (share-link builder reframes the free tier as an acquisition channel) plus a deploy fix; G runner-up. Blind spot: **B** — presumes the ~850-byte HTML diff is trivially deletable, but that diff *is* the staging/production switch. All missed: the unanimous "HMAC is theater" carries zero migration plan (mid-session members, stale sealed cookies, lockout bug); mobile iframe page-weight.

**Review 4.** Strongest: **G** — diagnosis + verified evidence + 15-minute fix; "freeze, don't rip out" respects solo-maintainer risk; enforces build order. Blind spot: **F** — ships funnel plan plus Show Day "this week" before instrumentation exists — the same unsighted shipping the other nine criticize. All missed: zero user perspective (no interviews/drop-off surveys); accessibility of an audio tool; bus factor / release runbook.

**Review 5.** Strongest: **J** — fixes the root cause structurally (staging as a branch, CI-injected SHA) and surfaces the share-builder acquisition idea. Blind spot: **F** — ships through the very pipeline everyone else calls broken. All missed: verification — cited line counts and version figures are mutually inconsistent; nobody measured. Also mobile page-weight, accessibility, testing pedagogy with actual users.

**Review 6.** Strongest: **J** — converts diagnosis into strategy ("gate attempts, not creation") and expresses staging-as-branch cleanly. G is the best-executed Monday plan but settles for a diff gate preserving the dual shell. Blind spot: **F** — treats deployment as free; pushing policy through a fork with ~1,000 lines of drift widens the gap. All missed: the HMAC revert path; unreconciled line counts; Babel-via-CDN runtime fragility on mobile iframes.

**Review 7.** Strongest: **J** — structural fix plus the unique growth idea. Blind spot: **C** — right that the 2026-07-10 gate move is implementable today, but buries the lead under promote.js. All missed: whether Babel-via-CDN/no-build is itself the root constraint forcing duplication (a tiny build step would dissolve it); accessibility; mobile Safari performance.

**Review 8.** Strongest: **G** — only response whose central claim is falsifiable evidence; 15-minute scope; diff-gate instead of a risky merge; pragmatic freeze on the HMAC. Blind spot: **F** — cheerleads Show Day plus a five-surface export stacked on the exact fork everyone else flags undecided and unmeasurable. All missed: the iframe context — Safari ITP / Chrome cookie phase-out partition or block third-party storage; everyone says "revert to a plain localStorage flag," which may already fail silently in embeds (possibly *why* the HMAC was built); zero responses interviewed members.

**Review 9.** Strongest: **J** — correct root cause (a branch mis-modeled as a file pair), durable fix, only one to find the share-builder asset. Blind spot: **F** — fast-tracks a decision it admits is unresolved. All missed: the iframe storage trap — the soft paywall may silently fail for the exact audience targeted (freeloader leakage or locked-out members, no error surface); nobody checked whether it *works* in production; 956KB×2 mobile load performance.

**Review 10.** Strongest: **J** — root cause, durable fix, unique growth asset. Blind spot: **F** — shipping the funnel re-slice plus a loose Show Day through a 134-version manual-copy process maximizes regression risk. All missed: runtime cost (Babel compiling ~955KB in-browser every load, in mobile iframes — a conversion killer no copy fixes) and GDPR/consent exposure with Kit email capture; every advisor's line-count evidence differs — verify before acting.

**Review tally:** strongest → J:5, G:4, C/B stray mentions. Biggest blind spot → F:8, J/B/C:1 each.

---

## 6. Chairman synthesis (full)

### Where the Council Agrees

**1. The manual promotion ritual is the number-one problem — 10/10.**
Every advisor, unprompted, ranked the staging↔production file pair as the top risk. The evidence is consistent in substance even where the exact numbers disagree: production sits ~134 versions and ~1,000 lines behind staging, the two 13,650-line HTML shells are maintained twice by hand, and the cache-buster is bumped in multiple places per push. One forgotten `&v=N` ships stale content silently; one copy in the wrong direction reverts shipped fixes. This is the only item the council treated as unanimously first.

**2. The HMAC signed split-cookies + session-seal unlock is security theater — 10/10.**
The pepper ships in the bundle, Circle's access group is the real lock, and the stack buys zero conversion while creating an asymmetric failure mode: a bug there locks out a *paying* member — refund and support ticket. Every advisor said some version of "you built crypto to defend a door that was never the real gate, while leaving the failure that actually ships — stale content — unprotected."

**3. The funnel is unmeasured.** Conversion is the stated business goal, and nothing records drop-off between the email gate and the join panel. Multiple advisors called conversion work with no instrumentation "astrology." Nobody can tell whether any funnel change worked.

**4. Show Day's forks are dead weight, and member onboarding comes first.** The 2026-07-06 proposal sat unresolved for months. The majority position: the new-member path protects month-one churn — the fragile revenue — while Show Day optimizes long-tenure attention. Build the member path first; decide the free/paid split before building a daily challenge at all (a daily challenge is a retention loop — shipping it open gives away the thing you sell).

**5. Process hygiene is agreed and cheap:** vendor `@babel/standalone` so `check_lesson3_regression.js` actually runs (a gate nobody can execute is decoration), handle the untracked `.log`, and reconcile or delete the two planning docs the funnel has already overtaken.

### Where the Council Clashes

**Patch the fork vs. kill the fork.**
- *Patch side* (Executor, Pragmatist, Risk Assessor, Economist, Strategist, Contrarian): write `scripts/promote.js` — 15 minutes, zero deploy risk, preserves the two-file structure the project already understands. Four peer reviews named the Executor's plan strongest precisely because it's evidence-grounded and hour-scale.
- *Kill side* (Innovator, Outsider, First Principles): staging should be a branch, not a file; ship one artifact, gate dev behind a flag, inject the git SHA as the cache-buster. Structurally erases the entire class of bug.
- *Why reasonable advisors disagree:* the patch is verifiable today and touches nothing about hosting; the structural fix changes deploy mechanics in a project that deliberately has no build step, and the Innovator's plan stacks CI plus a free-tier redesign while one existing gate can't even run. The reviews split 6–4 in the Innovator's favor on *direction*, but backed the Executor on *sequencing*. These aren't really opposed — they're a target state and a first step.

**Revert the HMAC vs. freeze it.**
Most advisors said delete or revert to a plain flag. The Executor — endorsed by four reviews — said freeze it, don't rip it out mid-flight. Peer review sided with caution on grounds no individual advisor raised: nobody wrote a migration path (existing sealed cookies, mid-session members), and one review plausibly argues the crypto may exist *because* plain localStorage silently fails under Safari ITP inside iframes. Reverting on the majority's reasoning alone could break the paywall invisibly.

**Ship now vs. measure first.**
The Expansionist says ship the funnel plan and Show Day this week. The Risk Assessor, First Principles, and Innovator say instrument first. Peer review near-unanimously flagged the Expansionist as the blind spot: shipping through the very pipeline everyone else calls broken widens the drift, and unsighted shipping is the exact behavior all ten criticize. The defensible middle is the Economist's narrow version — the pre-approved 2026-07-10 email-gate move is a cheap policy re-slice, not new feature work.

### Blind Spots the Council Caught

Only the peer reviews surfaced these; every individual advisor missed them:

- **The iframe storage trap.** Everyone said "revert to a plain localStorage flag" — but nobody checked whether localStorage-based unlocking already fails silently under Safari ITP / Chrome's third-party cookie phase-out inside Circle embeds. It may be *why* the HMAC was built. The paywall may be broken in production for the exact audience it targets, with no error surface.
- **No migration plan.** Reverting the HMAC and jumping production from v108 to v242 both strand existing members' localStorage/cookie state. Zero advisors planned either.
- **Runtime cost as a conversion problem.** 956KB of HTML plus Babel compiling ~955KB in-browser on every load, inside mobile iframes — slow first paint, audio autoplay/latency issues on phones. No copy change fixes this, and five reviews independently flagged it.
- **The evidence doesn't hold.** Line counts and version numbers differ across advisors; nobody actually measured. Only one central claim in the entire council is falsifiable — the Executor's "content.js is a strict subset" — and it must be verified with a real diff before anyone writes the script that acts on it.
- **No user voice.** Zero interviews or surveys of drop-offs; accessibility of an audio tool; GDPR/consent exposure with Kit email capture.
- **Bus factor.** No backup or export of the content graph — the actual product — and no release runbook.
- **The root constraint question:** is Babel-via-CDN/no-build itself what forces the duplication? A tiny build step would dissolve it; almost nobody connected this until review.
- **Two assets nobody used:** the ~850-byte HTML diff is *not* trivially deletable — it *is* the environment switch; and the COPY LIBRARY ENTRY share-builder is a distribution engine hiding in a training tool (the Innovator's find, endorsed by six reviews as the strongest unique idea).

### The Recommendation

The binding constraint is one maintainer's release energy. Every other goal — conversion, pedagogy, Show Day — is downstream of two things: releases that can't break production, and a funnel you can see. So fix in that order.

**1. Automate promotion (this week).** One `scripts/promote.js`: diff staging→production and refuse regressions, copy `content-staging.js` → `content.js`, bump every `&v=N` from a single version constant, run all three checks, print the Circle embed URLs. Verify the subset claim with a real diff first. Vendor `@babel/standalone`. Gitignore the log. This is the unanimous #1 and it costs an hour.

**2. Instrument before you rewrite (before any copy change).** One event per stage — landing → Start Here → email gate → first Run the Show win → 5-rep taste → Ear Training → join panel → membership. A Kit tag per stage or a `sendBeacon` ping is enough. Name the drop-off number you're currently guessing at.

**3. Freeze the HMAC; don't revert it yet.** Stop extending it. Before touching it, verify unlock behavior in a real Circle iframe on Safari and Chrome, and write a one-page migration note for existing sealed cookies. Only then reduce it to a plain flag. The council is right that it's theater; the reviews are right that ripping it out unverified is its own outage.

**4. Then ship the cheap funnel win** — the already-approved 2026-07-10 move of the email ask from the Start Here finale to after the first win inside Run the Show — now that you can measure it.

**5. Build the new-member path, not Show Day.** Decide the free/paid split or delete the Show Day doc outright. Treat staging-as-branch / single-artifact / SHA cache-buster as the target state to adopt *after* `promote.js` proves the workflow — don't start with CI. Take the share-builder seriously as the growth bet once the funnel is visible. Back up the content graph and test first paint on a phone in an iframe.

### The One Thing to Do First

**Run one real diff of `content-staging.js` vs `content.js` to confirm the strict-subset claim, then write `scripts/promote.js` — a single command that runs the three checks, refuses staging→production regressions, copies the file, bumps every `&v=N` from one version constant, and prints the embed URLs to re-paste in Circle.**

Fifteen minutes to an hour. It is the one fix all ten advisors ranked first, it removes the largest silent-failure risk in the repo, and it is the precondition for every other change on this list — nothing else should ship through the manual ritual it replaces.

---

*Methodology: Andrej Karpathy's LLM Council, OpenCode adaptation. Files: `council-report-2026-10-18-0855.html`, `council-transcript-2026-10-18-0855.md`.*
