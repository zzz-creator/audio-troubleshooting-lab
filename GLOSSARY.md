# Troubleshooting Lab — Glossary

The single source of truth for every definition shown in the app.

**Rules:**
- One definition per term. Reused verbatim everywhere the term appears.
- No jargon inside a definition.
- Kyle wrote and approved every line. Nothing here is regenerated or reworded.
- Lesson gray boxes render from this file only. They never contain instructions or
  descriptions of what is already visible on screen.

Status: **APPROVED by Kyle 2026-07-20.** Researched against Shure, Sweetwater,
Yamaha, Sound on Sound, AES/Rane Pro Audio Reference, Radial, Royer, QSC,
Allen & Heath, Behringer and Crown documentation, then rewritten by Kyle.

---

## Signal path

| Term | Definition |
|---|---|
| signal | The audio traveling through the cables and gear. |
| patch | To connect a signal from one device to another. |
| input channel | One signal's path through the mixer, with its own controls and fader. |
| input | Where signal enters a device. |
| output | Where signal leaves a device. |
| snake | A multichannel cable carrying many signals between the stage and the mixer. |
| stage box | The connector box on stage where cables plug into the snake. |
| sub-snake | A short snake connecting one area of the stage to the main snake. |
| snake input | A line in the snake that carries sound from the stage to the mixer. |
| snake output | A line in the snake that carries sound from the mixer back to the stage. |
| cross-patch | A signal landing on the wrong channel. |

## Level

| Term | Definition |
|---|---|
| gain | How much signal level is boosted or cut. |
| fader | The slider that sets a channel's level in the main mix. |
| unity | The setting where a signal passes through unchanged. On a fader, the 0 dB mark. |
| meter | Reads the signal level at a particular point in the signal chain. |
| headroom | The room between the signal level and the point where sound distorts. |
| clipping | The harsh distortion that is heard when a signal exceeds the available headroom. |
| gain structure | How signal level is set at every stage of the signal chain. |

## Microphones and inputs

| Term | Definition |
|---|---|
| dynamic microphone | A passive moving-coil microphone that needs no power. |
| condenser microphone | A microphone with active electronics inside, which require power. |
| phantom power (+48V DC) | Power required for active DIs and microphones (usually provided by the microphone preamp). |
| DI box | A device used when connecting a high-impedance source (instrument, laptop, etc) to a low-impedance input (mixer input). |
| active DI | A DI that requires external power (usually from a battery or phantom power). Usually used with passive sources. |
| passive DI | A DI that requires no power. Usually used with active sources. |
| high-pass filter (HPF) | Reduces energy below a set frequency. Also called low-cut. |

## Monitors and routing

| Term | Definition |
|---|---|
| wedge | A speaker on the stage pointing at a performer. |
| monitor mix | A mix built for a performer on stage, separate from the main mix. |
| aux send | Sends signal from a channel to a separate output mix. |
| pre-fader | A send that bypasses the channel fader. Monitor sends work this way. |
| main mix | The mix that goes to the speakers facing the audience. |
| mains | The main speakers pointed at the audience. |
| mute | Turns a channel off. |
| PFL | Routes audio to your headphones without changing what the audience hears. |

## Feedback and EQ

| Term | Definition |
|---|---|
| feedback | An infinite loop where the output of a system feeds into its input. |
| ring out | Cutting the frequencies that feed back first, so monitors are clearer and louder. |
| graphic EQ | An EQ with a row of sliders, each cutting or boosting one fixed frequency band. |
| line check | Confirming every input reaches the console on the right channel and sounds clean. |

**Deliberately not defined** (Kyle, 2026-07-20): *pop*, *soundcheck*. Ordinary words
that carry themselves in context. Do not add definitions for them.

---

## Console-specific notes

True of the MX-8 / MX-16 modeled in this app. Real consoles vary; where they do,
the app's behavior is recorded here so copy and engine cannot drift apart.

- **mute** kills the channel everywhere downstream, including pre-fader monitor
  sends. This matches Allen & Heath behavior. Behringer and Midas do the opposite
  by default. Engine: `index.html:997` (monitor-send gate; `index.html:919` for the main-mix path).
- **meter** reads the channel post-fader — it moves with the fader and shows that
  channel's contribution to the mix — and reads the pre-fader input while the
  channel is PFL'd, so a fader-down channel still meters live in PFL. Engine:
  `index.html:3611` (strip meter); `index.html:11145` mirrors it on the digital
  desk. (Corrected 2026-10-18: the entry claimed a pre-fader tap that never moves
  with the fader — that describes `chanIn`, not what the meter displays — and the
  pointer still named the removed `staging.html`.)
- **"top of the green"** describes this console's meter. It is not an industry
  standard. Yamaha teaches "yellow on peaks," others teach 15 dB below clip.

## Accuracy rules the copy must not break

Claims the app makes, or could easily make, that the research contradicts.

1. **Do not say a console always thumps on power-up.** Manufacturers say gear *can*
   emit a pop on either transition, which is why order matters. Modern desks often
   boot muted (Behringer's "Safe Main Levels") and amps have turn-on delays.
2. **Power order is "each device after whatever feeds it,"** not simply "console
   first, speakers last." One powered speaker feeding another breaks the simple rule.
3. **A line check covers outputs too,** not just inputs, and its purpose is
   confirming signal lands on the *right* channel.
4. **Ring-out cuts are 3 to 6 dB.** More than about 6 dB means the real problem is
   mic placement or gain structure, not EQ.
5. **Condensers need power, not specifically phantom.** Battery, tube supply, and
   wireless bodypack condensers exist. Phantom is how a wired console delivers it.
6. **Phantom power does not harm modern dynamic mics.** The hazard is unbalanced or
   miswired cable, not the mic type.
7. **Active DI needs power, passive does not.** Commonly taught backwards.
   The source pairing is the opposite of what the words suggest, which is why
   both definitions state it: an **active DI** suits a **passive source** (passive
   bass, acoustic pickup), and a **passive DI** suits an **active source**
   (keyboard, active bass). Beginners pattern-match "active bass, active DI"
   and get it backwards. Source: Radial Engineering.
8. **A channel is not a socket.** Stage box port 1 need not be console channel 1.
   This is the whole basis of the Patching course.
9. **Feedback is not always a squeal.** It ranges from low rumble to screech.
10. **PFL and cross-patching apply to outputs, not just input channels.**
