#!/usr/bin/env python3
"""Copy lint for the Troubleshooting Lab.

Enforces the content contract mechanically so it cannot regress quietly:

  - Lesson gray text is DEFINITIONS ONLY. A lesson carries `defs: [...]`
    of glossary keys. It does not carry `symptom` prose and does not carry
    per-step `teach` prose.
  - Instructions live in the step's `text` (the green DO THIS) and nowhere else.
  - Every glossary key referenced actually exists.
  - Terminology matches the approved glossary (GLOSSARY.md).
  - No copy pass silently drops a control name or a number.

Run:  python3 scripts/lint_copy.py [content.js]
Exit: 0 clean, 1 if any error. Warnings do not fail the build.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TARGET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'content.js')

errors, warnings = [], []


def err(lesson, msg):
    errors.append(f"{lesson}: {msg}")


def warn(lesson, msg):
    warnings.append(f"{lesson}: {msg}")


src = open(TARGET).read()

# ---------------------------------------------------------------- glossary
gm = re.search(r'window\.GLOSSARY = \{(.*?)\n\};', src, re.S)
if not gm:
    print("FATAL: window.GLOSSARY not found in", TARGET)
    sys.exit(1)
GLOSSARY = set(re.findall(r"^\s*'([^']+)':", gm.group(1), re.M))

# ------------------------------------------------------- lesson extraction
# A lesson block runs from its `id:` line to the next one. Ids are quoted
# strings in most courses and bare numbers in Run the Show.
LESSON_RE = re.compile(r"^\s*id: (?:'([^']+)'|(\d+)),", re.M)
starts = [(m.start(), m.group(1) or m.group(2)) for m in LESSON_RE.finditer(src)]
# A block also ends at the next top-level `window.X =` OR the `];` that closes a
# top-level array (both at column 0). Without the array close, the LAST lesson of
# a course swallows every helper function defined after the array until the next
# `window.X =` — which is how the board sniff in check 5b read `bandUp16` out of
# the code following START_HERE and mislabeled a plain MX-8 lesson as MX-16.
bounds = [m.start() for m in re.finditer(r"^(?:window\.\w+ =|\];)", src, re.M)]
lessons = []
for i, (pos, lid) in enumerate(starts):
    end = starts[i + 1][0] if i + 1 < len(starts) else len(src)
    for b in bounds:
        if pos < b < end:
            end = b
            break
    lessons.append((lid, src[pos:end]))

# Practice, Free Play and custom scenarios legitimately keep a `symptom`:
# it is their goal statement, not lesson prose. Only stepped LESSONS are
# bound by the definitions-only contract.
def is_lesson(blk):
    return 'hints: [' in blk and 'done:' in blk


# ------------------------------------------------------------------ checks
BANNED = [
    (r'—', 'em dash'),
    (r'\brides\b', '"rides" as a verb for signal'),
    (r'\broom mix\b', '"room mix" (say "main mix")'),
    (r'\bthe room\b(?! is)', '"the room" for people (say "the audience")'),
    (r'\brig\b', '"rig" (say "system")'),
    (r'\bdeaf\b', '"deaf" for mic directionality'),
    (r'\bdead\b', '"dead" (say "silent", or "switched off")'),
    (r'You walk in|Mid-set|Soundcheck, the band|A new night', 'scene-setting opener'),
    (r'\bNow that you(\'| ha)ve\b', 'meta-transition'),
    # The NOUN is retired in favour of "snake output". The verb is fine:
    # "Return to the main mix", "Zeroing returns every control".
    (r'\breturns?\b(?! to\b| every\b)',
     '"return" as a noun (say "snake output")'),
]
IMPERATIVE = re.compile(
    r'^(Turn|Bring|Set|Push|Pull|Send|Find|Fix|Open|Move|Switch|Check|Cut|Unmute|'
    r'Mute|Patch|Build|Confirm|Get|Leave|Drag|Raise|Lower|Start|Repatch|Trace|'
    r'Follow|Use|Make|Ring|Press|Engage|Disengage|Connect|Match|Zero|'
    # Verbs that showed up in real DO THIS lines and were flagged as false
    # positives. A too-noisy lint gets skimmed, which is how a real one hides.
    r'Read|Do|Look|Plug|Reconnect|Slide|Power|Test|Add|Listen|Drop|Aim|'
    r'Compare|Repeat|Play|Tap|Note|Hold|Keep|Give|Sweep|Wait)\b')

# Win-condition source whitelists, per board. A `source:` in a win condition or
# verifyEach must be one the engine can actually route on that board; naming any
# other makes the lesson unwinnable (see check 5b). Keep in lockstep with the
# SOURCES catalog in index.html: MX-8 patches four inputs plus the FOH
# playback line; the MX-16 band patches its fourteen inputs plus playback.
MX8_SOURCES = {'vocal', 'vocal2', 'guitar', 'laptop', 'playback'}
MX16_SOURCES = {'kick', 'snare', 'hat', 'rack', 'floor', 'ohl', 'ohr', 'bass',
                'egtr', 'agtr', 'keys', 'keysl', 'keysr',
                'vx1', 'vx2', 'vx3', 'vx4', 'playback'}

baseline = {}
bpath = os.path.join(HERE, 'copy-baseline.json')
if os.path.exists(bpath):
    baseline = json.load(open(bpath))

n_lessons = 0
for lid, blk in lessons:
    if not is_lesson(blk):
        continue
    n_lessons += 1

    # 1. no free-form gray prose on a lesson
    if re.search(r"\n\s*symptom: '", blk):
        err(lid, "has a `symptom`. Lessons carry `defs: [...]` instead; "
                 "instructions go in the step's DO THIS.")

    # 2. defs must reference real glossary keys
    dm = re.search(r"defs: \[(.*?)\]", blk, re.S)
    if dm:
        keys = re.findall(r"'([^']+)'", dm.group(1))
        for k in keys:
            if k not in GLOSSARY:
                err(lid, f"defs references '{k}', which is not in window.GLOSSARY")
        # A lesson that genuinely introduces a lot of vocabulary is allowed to,
        # but past ~6 the panel is a wall of text and the lesson probably wants
        # splitting instead.
        if len(keys) > 6:
            warn(lid, f"{len(keys)} definitions on one screen; consider "
                      "splitting the lesson")
        if len(keys) != len(set(keys)):
            err(lid, "defs has a duplicate key")

    # 3. teach is gone. No exceptions, no length allowance: gray text is
    #    DEFINITIONS ONLY (Kyle, 2026-07-20). An earlier version of this lint
    #    only errored past 12 words, which let a short rule-of-thumb survive in
    #    Run the Show. A rule is not a definition; it belongs in the DO THIS,
    #    the hint, or the after-solve recap.
    for t in re.findall(r"teach: '((?:[^'\\]|\\.)*)'", blk):
        if t.strip():
            err(lid, f"step has `teach` prose; gray text is definitions only: {t[:70]}")

    # 4. every step has an instruction, and it reads like one
    for t in re.findall(r"text: '((?:[^'\\]|\\.)*)'", blk):
        if not t.strip():
            err(lid, "a step has an empty DO THIS")
        elif not IMPERATIVE.match(t):
            warn(lid, f"DO THIS does not start with an imperative verb: {t[:60]}")

    # 5. banned phrases anywhere the student can read
    prose = ' '.join(re.findall(r"(?:teach|text|title|hint|solution): '"
                                r"((?:[^'\\]|\\.)*)'", blk))
    for pat, label in BANNED:
        if re.search(pat, prose, re.I):
            err(lid, f"banned: {label}")

    # 5b. every win-condition source must exist on the board the lesson runs on.
    #     This is the one that bit us: The Gig (a 16-channel capstone) shipped
    #     with conditions naming the MX-8's sources (vocal / guitar / laptop),
    #     which are catalog entries that never get patched on the big board, so
    #     their contribution is pinned at 0 and the lesson was UNWINNABLE. Nothing
    #     surfaced it — no console error, the board just never satisfied the win.
    #     The board is read from the sabotage: a lesson that builds its start off
    #     the 16-channel band (bandState / bandUp16 / big16) is an MX-16 lesson;
    #     everything else is the MX-8.
    is_big = bool(re.search(r'\bbandState\b|\bbandUp16\b|\bbig16\b', blk))
    valid_sources = MX16_SOURCES if is_big else MX8_SOURCES
    board = 'MX-16' if is_big else 'MX-8'
    for src in re.findall(r"source: '([^']+)'", blk):
        if src not in valid_sources:
            err(lid, f"win condition names source '{src}', which is not on the "
                     f"{board} board this lesson runs on (it can never satisfy the "
                     f"win -> the lesson is unwinnable)")

    # 6. facts must survive the copy pass
    if lid in baseline:
        nums = set(re.findall(r'[-+]?\d+(?:\.\d+)?', prose))
        lost = set(baseline[lid]['nums']) - nums
        if lost:
            warn(lid, f"numbers dropped since baseline: {sorted(lost)}")
        ctrls = set(re.findall(
            r'\b(?:GAIN|FADER|MUTE|PFL|AUX ?\d|MAIN [LR]|Main [LR]|Wedge \d|'
            r'\+48V|HPF|PAN|SOUND|KEYS|BASS|Vocal \d|channel \d|Monitor EQ)\b', prose))
        lostc = set(baseline[lid]['ctrls']) - ctrls
        if lostc:
            warn(lid, f"control names dropped since baseline: {sorted(lostc)}")

# ----------------------------------------------------------------- report
print(f"Linted {n_lessons} lessons in {os.path.basename(TARGET)}")
print(f"Glossary: {len(GLOSSARY)} terms")
for w in warnings:
    print("  WARN  " + w)
for e in errors:
    print("  ERROR " + e)
print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
