# Close — Project Context & Build Log

A generative ambient music player built across two files (`index.html` + `close.js`) using the Web Audio API. No frameworks, no build step — open in a browser and it plays.

---

## Inspiration

Based on **loscil's *Adrift*** (loscil.ca/adrift), a web port of an iOS/Android generative music app by musician Scott Morgan. The concept: structured random selection continuously weaves discrete musical components together with no beginning or end. Every listen is unique. The aesthetic target is **Aphex Twin's *Nanou 2*** — sparse, ambient piano with heavy reverb and a lot of space.

---

## Architecture

### Core concept
Seven independent layers (plus contrabass drone) fire probabilistically on staggered timers. Each layer is key-aware — all notes come from the current key's scale or pentatonic. A key-change system rotates through six keys every 3–6 minutes, with the drone and contrabass retuning gradually over 12 seconds.

### Signal chain
All synth sources → single 6-second algorithmic reverb (ConvolverNode with decaying noise impulse) → master gain → analyser → destination. Acoustic instruments (piano, cello, harp) create their own per-event reverb nodes and connect directly to master gain. Contrabass shares the global reverb (same as synth drone).

### Echo / bounce effect
A `mkEcho(dest, delayTime, feedback)` helper creates a delay→feedback→delay loop feeding into any destination node. Applied probabilistically:
- Piano chord hits: 25% chance (200–550ms delay, 28–46% feedback)
- Harp arpeggios: 30% chance (150–400ms delay, 28–46% feedback)
- Harp single plucks: 20% chance (200–500ms delay, 25–40% feedback)

### Swing / humanisation
Two helpers are applied throughout:
- `jit(amt)` — random offset ±amt
- `velJ(v, frac)` — velocity ±frac%
- `swingSeq(events, timingAmt, velFrac)` — applies both to a sequence of events before playback

Chord hits: each note after the first gets a ±28% spread timing nudge. Sequences: ±70ms timing jitter, ±5.5% velocity variation per note.

---

## The Layers

### Synth layers (blue indicators)
All use oscillators routed through the shared reverb.

| Layer | Description |
|-------|-------------|
| **Drone** | Four detuned sine oscillators at root and fifth (two octaves below key root), each with a slow LFO pitch drift. Always on. Reglides to new key over 12s on key change. |
| **Pad** | 3 random notes from key pentatonic, dual sine oscillators (note + note×2.003), 3–5s attack, 10–18s duration. Fires every 6–14s if inactive (65% chance). |
| **Melody** | 3–6 notes from key pentatonic (mid-high range), sine + triangle oscillators, random durations 2.5–6.5s. Fires every 6–14s if inactive (55% chance). |
| **Texture** | Looping bandpass-filtered white noise with a sweeping filter frequency. 12–20s duration, 4s fade in. Fires every 6–14s if inactive (40% chance). |

### Acoustic layers (sample-based)

#### Piano (purple indicator)
- **Samples**: Salamander Grand Piano (Yamaha C5, public domain) via `https://tonejs.github.io/audio/salamander/`
- **Files loaded**: 9 notes (C3–C5, every minor third)
- **Pitch shifting**: nearest sample + Web Audio `detune` parameter
- **Effects**: Studio (1s reverb, 50% dry) or Live Room (1.8s reverb, 35% dry) for chord hits; 25% chance of echo/bounce effect on chord hits; each phrase has its own baked-in reverb
- **Voice types**: single note, open 5th, minor triad, wide spread voicing — all from current key
- **Fires**: every 18–48s, 72% probability
- **Mode split**: 45% plays a phrase, 55% plays a chord hit
- **Phrases**: 22 total — 10 slow/spacious (Nanou fragment, Glacial spread, Slow descent, etc.) and 12 rhythmically active phrases using mixed burst patterns (qq pairs ~0.4s apart, quarter pairs ~0.7s, half pairs ~1.4s, qqq triplets). All phrases written in D minor and transposed at play time.

#### Cello (amber indicator)
- **Samples**: nbrosowsky/tonejs-instruments cello via `https://nbrosowsky.github.io/tonejs-instruments/samples/cello/`
- **Files loaded**: 12 notes (C2–A4 in thirds/fourths)
- **Register**: deliberately kept in C2–A3 (deep bass) to complement the drone
- **Effects**: 3.5–6s reverb + ~30% dry so bow attack comes through
- **Voice types**: single bass note, two staggered notes, or one of four phrases (slow descent, slow ascent, two-note motif, octave drop)
- **Fires**: every 22–50s, 65% probability
- **Release**: all phrase notes use rel:16–20 for a natural bow decay; earlier shorter values were found to sound abrupt

#### Harp (teal indicator)
- **Samples**: nbrosowsky/tonejs-instruments harp via `https://nbrosowsky.github.io/tonejs-instruments/samples/harp/`
- **Files loaded**: 24 notes (E1–E5)
- **Register**: A2–E4 for most material; occasional bass pluck down to E1
- **Effects**: 5–7s reverb + ~25% dry; 30% echo chance on arpeggios, 20% on single plucks
- **Voice types**: slow arpeggio up or down key pentatonic (1.8–3s between notes), wide-span phrase (bass pluck + upper figure), or single bass pluck
- **Fires**: every 25–60s, 60% probability

#### Contrabass (no indicator)
- **Samples**: nbrosowsky/tonejs-instruments contrabass via `https://nbrosowsky.github.io/tonejs-instruments/samples/contrabass/`
- **Files loaded**: 11 notes (A1–C4, sharps use 's' convention in filenames)
- **Register**: root-12 and root-24 (one and two octaves below key root) — sub-bass presence only
- **Behaviour**: always-on drone layer, looped samples with slow LFO pitch wobble (±5–9 cents), 10s swell-in. Reglides on key change: old notes fade over ~12s, new notes swell in after 3s pause.
- **Signal chain**: lowpass filter (380Hz) → global reverb (same as synth drone)
- **Volumes**: root-12 at 0.09, root-24 at 0.055 — felt more than heard, reinforcing drone

---

## Key System

Six keys, one chosen randomly at startup:

| Key | Root MIDI |
|-----|-----------|
| D minor | 50 |
| E minor | 52 |
| F major | 53 |
| G minor | 55 |
| A minor | 57 |
| C major | 48 |

Each key has a full diatonic scale and a pentatonic subset. Synth layers use pentatonic for melody/pad; chord voicings use the full scale; cello and harp use pentatonic for arpeggios and scale for bass note selection.

**Key change cadence**: 3–6 minutes. Drone and contrabass reglide over 12s. All new acoustic events immediately use the new key.

---

## Startup Sequence

1. **Immediately**: synth drone starts, visualiser starts
2. **3s**: synth scheduler starts (pad, melody, texture)
3. **All four sample sets load in parallel**: piano (9) + cello (12) + harp (24) + contrabass (11) = 56 files total
4. **Contrabass enters**: 4–8s after load completes (slow 10s swell)
5. **Piano enters**: 10–25s after load completes
6. **Cello enters**: 15–35s after load completes
7. **Harp enters**: 20–40s after load completes

---

## Visualiser

Three scenes selectable top-right:
1. **Storm** — rain, lightning (piano), thunder glows (cello), sparks (harp)
2. **Bioluminescence** — flowing particles, blooms triggered by piano/cello/harp
3. **Cloud ceiling** — slow volumetric clouds, glows (piano/cello), rifts (harp)

Subtle frequency spectrum overlay at the bottom of all scenes (low opacity).

---

## Decisions Made Along the Way

### Effects explored and discarded
An **effects explorer** (`piano-effects-explorer.html`) was built to audition 10+ effects chains before committing. The following were **rejected**:
- Ghost note (too quiet/disappearing)
- Freeze (too slow/unnatural for hits)
- Cathedral, Nanou fog, Shimmer, Tape warmth, Delay bloom, Underwater, Bright hall, Double reverb — all too heavily processed for chord hits

**Kept for chord hits**: Studio and Live Room only — present, natural, slightly roomy.

**Echo/bounce**: added as a probabilistic effect on chord hits and harp. Uses a delay+feedback loop routed into the reverb, so echoes decay naturally into the tail.

### Piano phrase rhythm
Original phrases were all evenly-spaced notes (e.g. `i * 2.8s`). This sounded mechanical. An audition page (`phrase-audition.html`) was built to develop a new phrase vocabulary using irregular timing with burst clusters:
- **qq** pairs: ~0.4s apart — two notes arriving almost as one gesture
- **quarter** pairs: ~0.7s apart
- **half** pairs: ~1.4s apart
- **qqq** triplets: three notes at ~0.4s intervals
- Mixed burst sizes (2–3 notes) separated by 3–6s gaps

12 new phrases in this style were added alongside the original 10.

### Cello phrase releases
Original `rel` values of 13–14s were found to sound abrupt — exponential decay from that starting point drops a note to ~10% volume within 3 seconds. Increased to rel:16–20 across all cello phrases for a more natural bow decay.

### Cello "octave drop" phrase
New phrase: picks a note in MIDI 45–60 range, then drops to the same pitch an octave below (minimum C2), spaced 4–8s apart. Second note has a slightly longer release (rel:20) than the first (rel:18).

### Contrabass
Added as a persistent low-register drone layer using real contrabass samples, looped with LFO pitch wobble. Sits at root-12 and root-24 to reinforce the synth drone without competing with it. Volumes kept very low (0.055–0.09) — felt more than heard.

### Velocity
Medium (0.65) and Loud (0.88) only for chord hits. Very soft and very hard velocities were dropped as they didn't serve the aesthetic. Phrase note velocities vary internally for expression (landing notes louder, passing notes softer).

### Chord spread
Four spread speeds for chord hits: Tight (30ms), Easy (70ms), Roll (130ms), Slow roll (220ms). "Very slow" and "Glacial" options were explored and removed — 220ms is the practical maximum before notes feel disconnected.

### Instrument selection
A **cello & harp audition demo** (`cello-harp-audition.html`) was built before integration.

---

## File Structure

| File | Description |
|------|-------------|
| `index.html` | Shell — layout, styles, scene selector, about overlay |
| `close.js` | All audio and visual engine logic |
| `echo-demo.html` | Echo effect audition tool (piano and harp, dry vs wet) |
| `phrase-audition.html` | Piano phrase rhythm audition tool |
| `piano-effects-explorer.html` | Effects chain audition tool (reference/archive) |
| `cello-harp-audition.html` | Instrument audition tool (reference/archive) |

---

## Sample Sources

| Instrument | Source | License |
|------------|--------|---------|
| Piano | Salamander Grand Piano (Yamaha C5) via tonejs.github.io | Public domain (relicensed 2022) |
| Cello | nbrosowsky/tonejs-instruments | Public domain sources (see repo) |
| Harp | nbrosowsky/tonejs-instruments | Public domain sources (see repo) |
| Contrabass | nbrosowsky/tonejs-instruments | Public domain sources (see repo) |

All samples loaded at runtime via fetch — no local files needed.

---

## Technical Notes

- **No dependencies** — pure Web Audio API + vanilla JS
- **Reverb** — all reverb is algorithmic (ConvolverNode with generated noise impulse), not convolution from IR files
- **Echo** — `mkEcho(dest, dt, fb)` creates a delay→feedback→delay loop; signal enters at the delay node and exits into `dest` (reverb). Feedback kept below 0.46 to avoid self-oscillation.
- **Pitch shifting** — Web Audio `detune` parameter (cents) applied to BufferSourceNode; nearest available sample is selected and shifted
- **Sample loading** — graceful: failed fetches are silently skipped; `nearest` still works with whatever loaded
- **Key transpose** — piano phrases are written in D minor (root=50) and transposed at play time via a semitone offset
- **Octave labelling note** — the nbrosowsky library has a known issue where some instruments have octave labels off by one; cello and harp are reported as correct, but the `nearest` + `detune` approach means small errors self-correct perceptually
- **Contrabass filename convention** — nbrosowsky uses `s` for sharp in contrabass filenames (e.g. `Ds2`); `bassNoteToMidi` normalises to `#` before converting

---

## Possible Future Directions

- Add violin layer (high sparse melodic lines, could replace or complement synth melody)
- Explore the harmonium sample for an alternative pad character
- Add a UI control for overall tempo/density (how often layers fire)
- Export/record the output using MediaRecorder API
- Explore loading real IR reverb files (churches, caves) instead of algorithmic reverb
- Add a "how long has it been playing" subtle display
- Explore the Nanou 2 aesthetic more directly: reduce synth layers, increase piano sparsity, longer silences
