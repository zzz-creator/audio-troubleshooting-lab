# Strategy Review: Troubleshooting Lab free/paid model and the "Show Day" build
*2026-07-06*

## The Brief

Reassess the Troubleshooting Lab student journey and free/paid tier model from first principles. Clear all assumptions about what should be free versus paid. Evaluate whether the current direction serves both the pedagogical goal (be the one-of-a-kind, first-of-its-kind training tool for live sound engineers) and the business goal (drive Audio University membership sales and retention). Analyze across five student vectors: (a) a cold YouTube viewer who clicks a shared scenario link, (b) someone who arrives at the lead magnet directly, (c) a free user mid-Essentials, (d) a brand-new paying member, (e) a long-term member at risk of churn.

Current state: Free tier is "Essentials," 10 guided lessons from a cold silent system to running a full show, with a JOIN CTA at lesson 9 and a soft, skippable email gate before starting. Shared scenario and rep links are playable by anyone with no email and no membership. Paid tier is the "gym": endless randomized diagnosis reps (1 to 3 simultaneous faults, zero-fault sign-off reps, dynamic goal-tasks), Feedback ring-out training with guided and by-ear modes, a per-fault mastery ledger and Your Training stats, save codes, and custom scenario authoring.

Proposed next build (#9): "Show Day," a free daily challenge to run a full show from a cold system, one attempt per day, three strikes then locked out until tomorrow. Open questions: what counts as a strike, and what members get that free users do not. Kyle wants the overall journey and tier strategy confirmed before building it.

Decide: is the free/paid line in the right place for both learning and conversion plus retention? What is the ideal journey for each vector? Does Show Day belong free, paid, or split, and is it even the right next thing to build?

---

## Council Deliberation

### Audience Advocate
*Conditional: back the daily ritual, kill the lockout.*

A working sound tech with three free hours a week is not grinding a mobile game. Three strikes and locked out until tomorrow is exactly the kind of mechanic that makes an experienced person close the tab and not open it again. It reads as a tool that does not respect their time. What they will come back for daily is different: a fresh, realistic "here is tonight's room, run it" that takes five minutes and feels like a real call. The draw is the daily ritual, not the punishment. The cold YouTube click also has to pay off in the first 30 seconds with a real problem and a real fix and no signup wall in the way, which the tool gets right today.

**Red flag:** the lockout treats a pro like a lapsed gamer.

---

### The Craftsman
*Support the concept, oppose the current mechanic.*

Show Day can be the most true-to-life thing in the whole tool: one real show, real conditions, and the show either survived or it did not. That is closer to the job than any number of low-stakes reps, and it is a better teacher. But "three strikes" is borrowed from arcade games and it cheapens the idea. A real show does not end after three mistakes; you recover and keep the night running, so the model should be recovery, not elimination. This also sits awkwardly next to the decision we just made to strip move-counts and par from the tool. If Show Day grades mistakes or speed as a score, it contradicts the principle that the tool should not punish experimenting.

**Green light:** if the mechanic is realism (run the whole show, recover from faults) rather than a strike counter.

---

### Revenue Architect
*Support, with a clear free/paid split.*

The membership is the product. Show Day only earns its place if it moves joins or reduces cancels, and it can do both, but only if the free version is a genuine daily habit and the member version is the obvious upgrade. Put the daily challenge on the free side, because it gives the funnel a recurring conversion surface every single day, which nothing in the current tool does. Put the mastery loop behind membership: the full debrief on what you missed and why, harder daily variants, the streak archive and history, and comparing your run with the community. Do not make the split "members get more attempts," because paying to remove a lockout is a weak reason to join and a bad look. The higher-dollar lever here is retention, and a daily reason to open the tool plus a streak you do not want to break is a direct answer to the month-three cancel.

**Red flag:** a fully free Show Day with no member upgrade spends build time on distribution with no line to revenue.

---

### The Operator
*Conditional: watch the sequence, lock the design first.*

Show Day reuses the show engine that already exists, since Essentials lesson 9 is a full show. The new surface is the daily seed, the streak, and the result screen, so this is a contained build, not a new platform. The hidden cost is the mechanic debate: strikes, scoring, lockout, and the member split are each a design decision that needs sign-off before code, or the thing gets built twice. The real question is opportunity cost. A brand-new paying member currently lands in an endless gym with no "start here," and if we are choosing one build, a guided member path may protect more revenue than a free daily challenge, because it catches the month-one cancel. Show Day helps the long-tenure member; onboarding helps the fragile new one.

**Red flag:** building Show Day before a member path leaves the most fragile paying customer, the brand-new one, still dropped into randomness.

---

### The Skeptic
*Flag: confirm the problem before building the exciting thing.*

Three assumptions are buried in this. First, that a daily challenge creates a daily habit for this specific audience. Live-sound techs work nights and weekends and are not all daily-app people, so the streak may fit a hobbyist better than a working pro; test whether "daily" is even the right cadence versus "a new show whenever you show up." Second, that the lockout drives joins. It more likely drives closed tabs, and to a smart audience a punitive gate reads as a dark pattern that damages the trust that is the entire moat. Third, that Show Day is the thing that is missing at all. The engagement cliff after Essentials is real, but the fix could be a taste of the paid gym inside Essentials, or a member path, rather than a new free mode.

**Red flag:** we may be attached to Show Day because it is fun to build, not because it solves the biggest problem on the board.

---

### The Long Game
*Support the daily ritual as a flagship, guard the framing.*

A daily "run tonight's show" that a working tech does for five minutes a day over years is a compounding asset. It is the thing that turns the tool from a demo into a habit, and it is endlessly shareable on YouTube ("can you survive today's show?"), which feeds the top of the funnel for free. That is a genuine moat builder. The lockout is the opposite of compounding: it caps the exact engagement we want and trains people to associate the tool with being shut out. Five years out, the win is that Show Day is a known thing in the live-sound world that people check like a daily crossword, with the deep gym sitting behind the membership.

**Green light:** the daily ritual as a flagship. **Red flag:** any mechanic that gates the habit itself.

---

## Decision Forks

> **Fork A (the real prioritization call): Show Day next, or the new-member path next?** Show Day fills the post-Essentials engagement cliff on the free side and gives long-tenure members a reason to return. A guided member "start here" path protects the brand-new member from month-one churn, which is the higher-value recurring-revenue risk. The Operator and Revenue Architect lean toward whatever protects recurring revenue soonest; the distribution and free-funnel case leans Show Day. These are both correct, and Kyle has to pick the order.

> **Fork B: the daily mechanic versus the no-scoring principle.** A compelling daily challenge wants a clear outcome and a streak. The tool just removed efficiency scoring (par, move counts) specifically to protect free experimentation. These can be reconciled by scoring "did the show survive" rather than mistakes or speed, but Kyle should confirm that a pass/fail daily result is acceptable in principle, because it is a different stance from Practice mode's no-stakes design.

> **Fork C: the free/paid split of Show Day itself.** Free daily challenge plus a paid mastery loop (recommended) versus a fully free Show Day (maximum distribution, no direct revenue line) versus a members-only Show Day (maximum paid value, but it loses the YouTube hook and the daily conversion surface).

---

## Journey by vector (what the brief specifically asked for)

- **(a) Cold YouTube viewer, shared scenario link.** Keep the no-gate instant play; that is right. On the win, lead with one primary next step (start Essentials from the top) and offer "try today's Show Day" as the secondary hook, then ask for the email after the win, not before. One clear CTA, not a wall of buttons.
- **(b) Direct arrival at the lead magnet.** Soft email gate into Essentials is right. The only risk is the person who wants to just play, not take a 10-lesson course; the shared-scenario entry already covers them, so leave Essentials-first as the designed path.
- **(c) Free user mid-Essentials.** This is the nurture path to the lesson-9 JOIN CTA. Add one moment during Essentials where they get a single taste of the paid gym (one Practice rep as a graduation taste), so the JOIN CTA is not the first time they feel what membership is. After they finish, Show Day is what catches them so they do not fall off the cliff to zero.
- **(d) Brand-new paying member.** The most under-served vector today. They land in an endless gym with no direction, which is a known early-churn pattern. They need a recommended member path (Practice level 1, then goal-tasks, then Feedback guided, then by-ear, then Practice 2 and 3, with Show Day as the daily anchor). Show Day alone does not fix this.
- **(e) Long-term member at risk of churn.** Needs novelty, status, and a reason to return. A fresh daily Show Day plus a streak plus an optional community leaderboard is precisely the anti-churn mechanic the paid tier lacks right now. This vector is the strongest argument for building Show Day.

---

## Synthesis

### Signal
The council agrees on more than it disagrees. The daily-ritual concept is strong and worth building. The three-strikes lockout must go; it is punitive, off-brand for a professional audience, and it contradicts the no-scoring decision we just made. The rest of the free/paid line is basically right: Essentials free is the correct proof-of-value hook (finite, so it does not cannibalize the endless gym), the gym and authoring are correctly paid, and the shared links must stay ungated because they are the distribution engine. The Show Day split should be free-challenge plus paid-depth, never free-versus-paid on number of attempts.

### Tension
Two genuine calls for Kyle. The sequencing (Fork A: Show Day first or the new-member path first), because both protect real revenue and the team can only build one at a time. And the principle reconciliation (Fork B: whether any daily pass/fail is acceptable given that we just stripped scoring to protect experimentation).

### Watchlist
Whether "daily" is the right cadence for a nocturnal working audience, or whether "a fresh show whenever you show up" fits better. Whether new members have a start-here path before they churn in month one. Whether any pass/fail framing quietly creeps back toward efficiency scoring. And measuring conversion after the value moment (post-win email ask), not before it.

### Recommendation
Proceed with Show Day, with three non-negotiable conditions:

1. **Remove the lockout entirely.** Unlimited play on today's show. One scored run per day counts for the streak; failing it does not lock you out, it just means the streak does not extend today and you can keep practicing.
2. **Split it free-challenge, paid-mastery-loop.** Free: the daily challenge, your result, and the streak. Paid: the full post-show debrief (what you missed and why), harder daily modifiers, the historical archive and stats, and community comparison. Never split on attempts.
3. **Frame the outcome as "did the show survive," not mistakes or speed.** A real show is about keeping the night running and recovering from faults, which keeps Show Day consistent with the no-scoring principle and makes it a better teacher than the gym at the same time.

On sequencing (Fork A), build Show Day first, then the new-member path immediately after. Show Day is the smaller build (it reuses the existing show engine), it is the shareable YouTube hook that feeds new leads, and its streak and daily infrastructure are the exact primitives the member path will reuse. So building it first also builds the retention plumbing the member path needs. That said, the new-member start-here path is the higher-value retention lever on its own and should not sit on the shelf; it is the very next thing after Show Day, not a someday.

One net-new suggestion outside Show Day: give free users a single taste of a Practice rep inside Essentials, so membership is felt before it is pitched. Small give, meaningful lift on the lesson-9 conversion.

---

## Decisions recorded 2026-10-18 (council review with Kyle)

The forks above stop floating as of this date:

- **Show Day split (Fork C): free challenge, paid mastery loop — as the conditional recommendation above.** Free: the daily challenge, the result, and the streak. Paid: the full post-show debrief, harder daily modifiers, the historical archive and stats, and community comparison. Never split on number of attempts; the three-strikes lockout stays gone.
- **Sequencing (Fork A): the new-member start-here path ships FIRST, Show Day after it.** This reverses the recommendation above. The council's read: month-one churn among brand-new members is the more fragile revenue than the post-Essentials engagement cliff, so the member path gets built before the daily-challenge build. Show Day remains approved as the next build after it.
- **Still open (flagged by the council):** the pass/fail-vs-no-scoring reconciliation in this doc must be settled before Show Day starts, and any conversion work needs a named drop-off number to measure against first.

Status: decisions only — neither is built as of 2026-10-18.
