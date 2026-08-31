#!/usr/bin/env python3
"""Brawl Stars–inspired quest loop (CC0 original — plucky, bouncy, western-adventure vibe)."""
import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050
BPM = 128
BEAT = 60.0 / BPM
OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "bgm" / "quest-loop.wav"

NOTES = {
    "G2": 98.00, "A2": 110.00, "B2": 123.47, "C3": 130.81, "D3": 146.83,
    "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.00,
    "A4": 440.00, "B4": 493.88, "D5": 587.33, "E5": 659.25, "G5": 783.99,
    "_": 0.0,
}

# G mixolydian — bouncy plucks, 32 beats (8 bars @ 128 BPM)
MELODY = [
    ("G4", 0.5), ("_", 0.5), ("B4", 0.5), ("D5", 0.5),
    ("E5", 0.5), ("D5", 0.25), ("B4", 0.25), ("G4", 0.5), ("_", 0.5),
    ("A4", 0.5), ("B4", 0.5), ("D5", 0.5), ("B4", 0.5),
    ("A4", 0.5), ("G4", 1), ("_", 1),
    ("B4", 0.5), ("D5", 0.5), ("E5", 0.5), ("G5", 0.5),
    ("E5", 0.5), ("D5", 0.5), ("B4", 0.5), ("G4", 0.5),
    ("A4", 0.5), ("B4", 0.5), ("D5", 1),
    ("B4", 0.5), ("A4", 0.5), ("G4", 1), ("_", 1),
    # repeat hook with variation (beats 17–32)
    ("G4", 0.5), ("_", 0.5), ("B4", 0.5), ("D5", 0.5),
    ("E5", 0.5), ("G5", 0.5), ("E5", 0.5), ("D5", 0.5),
    ("B4", 0.5), ("A4", 0.5), ("G4", 0.5), ("_", 0.5),
    ("A4", 0.5), ("B4", 0.5), ("D5", 0.5), ("E5", 0.5),
    ("D5", 0.5), ("B4", 0.5), ("G4", 0.5), ("_", 0.5),
    ("A4", 0.5), ("G4", 0.5), ("B4", 1),
    ("D5", 0.5), ("B4", 0.5), ("G4", 1.5),
]

COUNTER = [
    ("D4", 0.5), ("_", 0.5), ("G4", 0.5), ("_", 0.5),
    ("E4", 0.5), ("_", 0.5), ("D4", 0.5), ("B3", 0.5),
    ("C4", 0.5), ("_", 0.5), ("D4", 0.5), ("_", 0.5),
    ("B3", 0.5), ("G3", 1), ("_", 1),
    ("G4", 0.5), ("_", 0.5), ("B4", 0.5), ("_", 0.5),
    ("A4", 0.5), ("_", 0.5), ("G4", 0.5), ("E4", 0.5),
    ("D4", 0.5), ("_", 0.5), ("B3", 0.5), ("_", 0.5),
    ("A3", 0.5), ("B3", 0.5), ("G3", 1), ("_", 1),
    ("D4", 0.5), ("_", 0.5), ("G4", 0.5), ("B4", 0.5),
    ("A4", 0.5), ("_", 0.5), ("G4", 0.5), ("E4", 0.5),
    ("D4", 0.5), ("B3", 0.5), ("G3", 0.5), ("_", 0.5),
    ("C4", 0.5), ("D4", 0.5), ("B3", 0.5), ("G3", 0.5),
    ("A3", 0.5), ("B3", 0.5), ("D4", 0.5), ("G4", 0.5),
    ("E4", 0.5), ("D4", 0.5), ("B3", 0.5), ("G3", 0.5),
    ("A3", 0.5), ("G3", 0.5), ("B3", 1), ("G3", 0.5),
]

# Syncopated bouncy bass — 8 × 4 beats
BASS = [
    ("G2", 1.5), ("D3", 0.5), ("G2", 1), ("B2", 1),
    ("C3", 1.5), ("G2", 0.5), ("D3", 2),
    ("G2", 1), ("D3", 0.5), ("B2", 0.5), ("G2", 2),
    ("A2", 1), ("C3", 1.5), ("G2", 1.5),
    ("G2", 1.5), ("D3", 0.5), ("G2", 1), ("B2", 1),
    ("E3", 1.5), ("D3", 0.5), ("B2", 2),
    ("G2", 0.5), ("B2", 0.5), ("D3", 2), ("G2", 1),
    ("B2", 1.5), ("G2", 1), ("D3", 1.5),
]

# Brass stabs on bar downbeats (beat, duration_beats, [freqs])
BRASS = [
    (0, 0.2, [196.00, 246.94, 293.66]),   # G
    (8, 0.2, [130.81, 164.81, 196.00]),   # C
    (16, 0.2, [196.00, 246.94, 293.66]),  # G
    (24, 0.2, [146.83, 185.00, 220.00]),  # D (F# ≈ 185)
]

KICK_BEATS = {0, 4, 8, 12, 16, 20, 24, 28}
CLAP_BEATS = {2, 6, 10, 14, 18, 22, 26, 30}


def lfsr_noise(t: float) -> float:
    x = int(t * SAMPLE_RATE) & 0xFFFF
    x ^= x << 7
    x ^= x >> 9
    x ^= x << 8
    return ((x & 0xFFFF) / 32768.0) * 2.0 - 1.0


def lowpass(buf: list[float], coef: float = 0.12) -> list[float]:
    out = [0.0] * len(buf)
    prev = 0.0
    for i, s in enumerate(buf):
        prev += coef * (s - prev)
        out[i] = prev
    return out


def expand_pattern(pattern):
    events = []
    t = 0.0
    for note, beats in pattern:
        events.append((t, beats * BEAT, NOTES[note]))
        t += beats * BEAT
    return events, t


def render_plucks(events, total_dur, volume, twang=0.06):
    """Short plucky synth — signature Brawl Stars–style lead."""
    buf = [0.0] * int(total_dur * SAMPLE_RATE)
    for start, _dur, freq in events:
        if freq <= 0:
            continue
        pluck_len = min(0.38, _dur * 0.85)
        n = int(pluck_len * SAMPLE_RATE)
        i0 = int(start * SAMPLE_RATE)
        for i in range(n):
            idx = i0 + i
            if idx >= len(buf):
                break
            t = i / SAMPLE_RATE
            decay = math.exp(-t * (10.0 + freq * 0.006))
            bend = 1.0 + twang * math.exp(-t * 35.0)
            f = freq * bend
            s = math.sin(2 * math.pi * f * t)
            s += math.sin(2 * math.pi * f * 2 * t) * 0.12 * decay
            s += math.sin(2 * math.pi * f * 3 * t) * 0.04 * decay
            buf[idx] += s * decay * volume
    return lowpass(buf, 0.22)


def render_bass(events, total_dur, volume):
    buf = [0.0] * int(total_dur * SAMPLE_RATE)
    for start, dur, freq in events:
        if freq <= 0:
            continue
        n = int(dur * SAMPLE_RATE)
        i0 = int(start * SAMPLE_RATE)
        for i in range(n):
            idx = i0 + i
            if idx >= len(buf):
                break
            t = i / SAMPLE_RATE
            atk = min(0.012, dur * 0.08)
            if t < atk:
                e = t / atk
            elif t > dur - 0.04:
                e = max(0.0, (dur - t) / 0.04)
            else:
                e = 1.0
            punch = math.exp(-t * 4.5)
            body = math.sin(2 * math.pi * freq * t)
            sub = math.sin(2 * math.pi * freq * 0.5 * t) * 0.35
            buf[idx] += (body * 0.65 + sub) * e * punch * volume
    return lowpass(buf, 0.14)


def render_brass(stabs, total_dur, volume):
    buf = [0.0] * int(total_dur * SAMPLE_RATE)
    for beat, dur_beats, freqs in stabs:
        start = beat * BEAT
        stab_len = dur_beats * BEAT
        n = int(stab_len * SAMPLE_RATE)
        i0 = int(start * SAMPLE_RATE)
        for i in range(n):
            idx = i0 + i
            if idx >= len(buf):
                break
            t = i / SAMPLE_RATE
            env = math.exp(-t * 18.0) * (1.0 - math.exp(-t * 120.0))
            sample = sum(math.sin(2 * math.pi * f * t) for f in freqs) / len(freqs)
            buf[idx] += sample * env * volume
    return lowpass(buf, 0.16)


def render_drums(total_dur):
    buf = [0.0] * int(total_dur * SAMPLE_RATE)
    half_beats = int(total_dur / BEAT * 2)

    for hb in range(half_beats):
        t = hb * BEAT * 0.5
        beat = hb // 2
        i0 = int(t * SAMPLE_RATE)

        if beat in KICK_BEATS and hb % 2 == 0:
            for i in range(int(0.06 * SAMPLE_RATE)):
                idx = i0 + i
                if idx < len(buf):
                    p = i / SAMPLE_RATE
                    freq = 85 * math.exp(-p * 20)
                    decay = math.exp(-i / (SAMPLE_RATE * 0.06))
                    buf[idx] += math.sin(2 * math.pi * freq * p) * decay * 0.32

        if beat in CLAP_BEATS and hb % 2 == 0:
            for i in range(int(0.04 * SAMPLE_RATE)):
                idx = i0 + i
                if idx < len(buf):
                    decay = math.exp(-i / (SAMPLE_RATE * 0.012))
                    n1 = lfsr_noise(t + i / SAMPLE_RATE)
                    n2 = lfsr_noise(t + i / SAMPLE_RATE + 0.003)
                    buf[idx] += (n1 * 0.55 + n2 * 0.45) * decay * 0.16

        for i in range(int(0.012 * SAMPLE_RATE)):
            idx = i0 + i
            if idx < len(buf):
                decay = math.exp(-i / (SAMPLE_RATE * 0.005))
                buf[idx] += lfsr_noise(t + i / SAMPLE_RATE) * decay * 0.014

    return lowpass(buf, 0.25)


def mix(*tracks):
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for track in tracks:
        for i, s in enumerate(track):
            out[i] += s
    return out


def soft_clip(x: float) -> float:
    return math.tanh(x * 0.9)


def main():
    melody_ev, _ = expand_pattern(MELODY)
    counter_ev, _ = expand_pattern(COUNTER)
    bass_ev, dur = expand_pattern(BASS)

    m = render_plucks(melody_ev, dur, 0.13, twang=0.07)
    c = render_plucks(counter_ev, dur, 0.06, twang=0.04)
    b = render_bass(bass_ev, dur, 0.15)
    br = render_brass(BRASS, dur, 0.07)
    d = render_drums(dur)

    mixed = mix(m, c, b, br, d)
    pcm = struct.pack(
        "<" + "h" * len(mixed),
        *[int(max(-32767, min(32767, soft_clip(s) * 32767))) for s in mixed],
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)

    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Wrote {OUTPUT} ({size_kb:.0f} KB, {dur:.1f}s loop @ {BPM} BPM)")


if __name__ == "__main__":
    main()
