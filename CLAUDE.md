# Adrift — Project Context & Build Log

A generative ambient music player built in a single HTML file using the Web Audio API. No frameworks, no build step — open in a browser and it plays.

---

## Inspiration

Based on **loscil's *Adrift*** (loscil.ca/adrift), a web port of an iOS/Android generative music app by musician Scott Morgan. The concept: structured random selection continuously weaves discrete musical components together with no beginning or end. Every listen is unique. The aesthetic target is **Aphex Twin's *Nanou 2*** — sparse, ambient piano with heavy reverb and a lot of space.

---

## Architecture

### Core concept
Seven independent layers fire probabilistically on staggered timers. Each layer is key-aware — all notes come from the current key's scale or pentatonic. A key-change system rotates through six keys every 3–6 minutes, with the drone retuning gradually over 12 seconds.

### Signal chain
All synth sources → single 6-second algorithmic reverb (ConvolverNode with decaying noise impulse) → master gain → analyser → destination. Acoustic instruments (piano, cello, harp) create their own per-event reverb nodes and connect directly to master gain.

### Swing / humanisation
Two helpers are applied throughout:
- `jit(amt)` — random offset ±amt
- `velJ(v, frac)` — velocity ±frac%
- `swingSeq(events, timingAmt, velFrac)` — applies both to a sequence of events before playback

Chord hits: each note after the first gets a ±28% spread timing nudge. Sequences: ±70ms timing jitter, ±5.5% velocity variation per note.

---

## The Seven Layers

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
- **Effects**: Studio (1s reverb, 50% dry) or Live Room (1.8s reverb, 35% dry) only — deliberately natural, not heavily processed
- **Voice types**: single note, open 5th, minor triad, wide spread voicing — all from current key
- **Fires**: every 18–48s, 72% probability
- **Mode split**: 45% plays a phrase, 55% plays a chord hit

#### Cello (amber indicator)
- **Samples**: nbrosowsky/tonejs-instruments cello via `https://nbrosowsky.github.io/tonejs-instruments/samples/cello/`
- **Files loaded**: 12 notes (C2–A4 in thirds/fourths)
- **Register**: deliberately kept in C2–A3 (deep bass) to complement the drone
- **Effects**: 3.5–6s reverb + ~30% dry so bow attack comes through
- **Voice types**: single bass note, two staggered notes, or one of four phrases (slow descent, slow ascent, two-note motif, open 5th)
- **Fires**: every 22–50s, 65% probability

#### Harp (teal indicator)
- **Samples**: nbrosowsky/tonejs-instruments harp via `https://nbrosowsky.github.io/tonejs-instruments/samples/harp/`
- **Files loaded**: 24 notes (E1–E5)
- **Register**: A2–E4 for most material; occasional bass pluck down to E1
- **Effects**: 5–7s reverb + ~25% dry
- **Voice types**: slow arpeggio up or down key pentatonic (1.8–3s between notes), wide-span phrase (bass pluck + upper figure), or single bass pluck
- **Fires**: every 25–60s, 60% probability

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

**Key change cadence**: 3–6 minutes. Drone reglides over 12s. All new acoustic events immediately use the new key.

---

## Startup Sequence

1. **Immediately**: synth drone starts, visualiser starts
2. **3s**: synth scheduler starts (pad, melody, texture)
3. **All three sample sets load in parallel**: piano (9 files) + cello (12 files) + harp (24 files) = 45 files total
4. **Piano enters**: 10–25s after load completes
5. **Cello enters**: 15–35s after load completes
6. **Harp enters**: 20–40s after load completes

---

## Visualiser

60-bar frequency spectrum canvas. Colour-coded by frequency range to match the layers:
- **Amber** (left, low frequencies) — cello register
- **Blue** (centre) — synth register
- **Teal** (right, high frequencies) — harp register

---

## Decisions Made Along the Way

### Effects explored and discarded
An **effects explorer** (`piano-effects-explorer.html`) was built to audition 10+ effects chains before committing. The following were **rejected**:
- Ghost note (too quiet/disappearing)
- Freeze (too slow/unnatural for hits)
- Cathedral, Nanou fog, Shimmer, Tape warmth, Delay bloom, Underwater, Bright hall, Double reverb — all too heavily processed for chord hits

**Kept for chord hits**: Studio and Live Room only — present, natural, slightly roomy.

**All phrases** use baked-in reverb appropriate to the musical material (longer reverb for slower, spacer phrases).

### Velocity
Medium (0.65) and Loud (0.88) only. Very soft and very hard velocities were dropped as they didn't serve the aesthetic.

### Chord spread
Four spread speeds for chord hits: Tight (30ms), Easy (70ms), Roll (130ms), Slow roll (220ms). "Very slow" and "Glacial" options were explored and removed — 220ms is the practical maximum before notes feel disconnected.

### Instrument selection
A **cello & harp audition demo** (`cello-harp-audition.html`) was built before integration, covering:
- Individual notes at each register
- Dry vs. reverb comparisons
- Both instruments played against a synth drone
- Cello + harp played together

The user confirmed both instruments suited the project.

---

## File Structure

| File | Description |
|------|-------------|
| `adrift.html` | The main application — self-contained, open in browser |
| `piano-effects-explorer.html` | Effects audition tool (reference/archive) |
| `cello-harp-audition.html` | Instrument audition tool (reference/archive) |

---

## Sample Sources

| Instrument | Source | License |
|------------|--------|---------|
| Piano | Salamander Grand Piano (Yamaha C5) via tonejs.github.io | Public domain (relicensed 2022) |
| Cello | nbrosowsky/tonejs-instruments | Public domain sources (see repo) |
| Harp | nbrosowsky/tonejs-instruments | Public domain sources (see repo) |

All samples loaded at runtime via fetch — no local files needed.

---

## Technical Notes

- **No dependencies** — pure Web Audio API + vanilla JS
- **Reverb** — all reverb is algorithmic (ConvolverNode with generated noise impulse), not convolution from IR files
- **Pitch shifting** — Web Audio `detune` parameter (cents) applied to BufferSourceNode; nearest available sample is selected and shifted
- **Sample loading** — graceful: failed fetches are silently skipped; `nearest` still works with whatever loaded
- **Key transpose** — piano phrases are written in D minor (root=50) and transposed at play time via a semitone offset
- **Octave labelling note** — the nbrosowsky library has a known issue where some instruments have octave labels off by one; cello and harp are reported as correct, but the `nearest` + `detune` approach means small errors self-correct perceptually

---

## Possible Future Directions

- Add contrabass layer (very low, would reinforce drone)
- Add violin layer (high sparse melodic lines, could replace or complement synth melody)
- Explore the harmonium sample for an alternative pad character
- Add a UI control for overall tempo/density (how often layers fire)
- Export/record the output using MediaRecorder API
- Explore loading real IR reverb files (churches, caves) instead of algorithmic reverb
- Add a "how long has it been playing" subtle display
- Explore the Nanou 2 aesthetic more directly: reduce synth layers, increase piano sparsity, longer silences
