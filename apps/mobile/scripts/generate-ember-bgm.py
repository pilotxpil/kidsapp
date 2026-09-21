#!/usr/bin/env python3
"""Ember BGM — slow volcanic drone. CC0 original. Bowed low strings, distant drum, fire crackle."""
import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 22050
BPM = 58
BEAT = 60.0 / BPM
BARS = 8
BEATS = BARS * 4
DURATION = BEATS * BEAT
OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "bgm" / "ember-loop.wav"

# D phrygian-ish: D, Eb, F, G, A, Bb, C
D2, F2, A2, C3, D3, F3, G3, A3, Bb3, C4 = (
    73.42, 87.31, 110.00, 130.81, 146.83, 174.61, 196.00, 220.00, 233.08, 261.63
)


def noise(i: int) -> float:
    x = (i * 1103515245 + 12345) & 0x7FFFFFFF
    return (x / 0x40000000) - 1.0


def lowpass(buf: list[float], coef: float) -> list[float]:
    out = [0.0] * len(buf)
    prev = 0.0
    for i, s in enumerate(buf):
        prev += coef * (s - prev)
        out[i] = prev
    return out


def highpass(buf: list[float], coef: float) -> list[float]:
    lp = lowpass(buf, coef)
    return [a - b for a, b in zip(buf, lp)]


def env_adsr(t: float, dur: float, a: float, d: float, s: float, r: float) -> float:
    if t < 0 or t > dur:
        return 0.0
    if t < a:
        return t / a if a > 0 else 1.0
    if t < a + d:
        return 1.0 - (1.0 - s) * ((t - a) / d)
    if t > dur - r:
        return s * max(0.0, (dur - t) / r)
    return s


def mix(*tracks: list[float]) -> list[float]:
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for track in tracks:
        for i, s in enumerate(track):
            out[i] += s
    return out


def render_rumble(n: int) -> list[float]:
    buf = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        wobble = 1.0 + 0.04 * math.sin(2 * math.pi * 0.07 * t)
        sub = math.sin(2 * math.pi * 36.7 * wobble * t)
        fund = math.sin(2 * math.pi * 55.0 * t + 0.4 * math.sin(2 * math.pi * 0.11 * t))
        buf[i] = sub * 0.22 + fund * 0.10
    return lowpass(buf, 0.08)


def render_bowed(n: int, freqs: list[tuple[float, float, float]]) -> list[float]:
    """Slow bowed drone: (start_beat, dur_beats, freq)."""
    buf = [0.0] * n
    for start_b, dur_b, freq in freqs:
        start = start_b * BEAT
        dur = dur_b * BEAT
        i0 = int(start * SAMPLE_RATE)
        length = int(dur * SAMPLE_RATE)
        detune = freq * 1.007
        for i in range(length):
            idx = i0 + i
            if idx >= n:
                break
            t = i / SAMPLE_RATE
            e = env_adsr(t, dur, 1.4, 0.8, 0.72, 2.2)
            # band-limited-ish saw via a few harmonics, then heavy LP = cello body
            phase = t
            s = 0.0
            for h, amp in ((1, 0.55), (2, 0.18), (3, 0.08), (4, 0.04)):
                s += amp * math.sin(2 * math.pi * freq * h * phase)
            s += 0.22 * math.sin(2 * math.pi * detune * t)
            breath = 0.04 * noise(i + int(freq * 10)) * e
            buf[idx] += (s + breath) * e * 0.11
    return lowpass(buf, 0.10)


def render_horn(n: int) -> list[float]:
    buf = [0.0] * n
    swells = [
        (0.0, 6.0, D3),
        (8.0, 5.5, F3),
        (16.0, 6.0, A2),
        (24.0, 7.0, D3),
    ]
    for start_b, dur_b, freq in swells:
        start = start_b * BEAT
        dur = dur_b * BEAT
        i0 = int(start * SAMPLE_RATE)
        length = int(dur * SAMPLE_RATE)
        for i in range(length):
            idx = i0 + i
            if idx >= n:
                break
            t = i / SAMPLE_RATE
            e = env_adsr(t, dur, 1.8, 1.0, 0.55, 2.4)
            vibr = 1.0 + 0.004 * math.sin(2 * math.pi * 4.2 * t)
            s = math.sin(2 * math.pi * freq * vibr * t)
            s += 0.25 * math.sin(2 * math.pi * freq * 2 * t)
            s += 0.08 * math.sin(2 * math.pi * freq * 3 * t)
            buf[idx] += s * e * 0.09
    return lowpass(buf, 0.12)


def render_taiko(n: int) -> list[float]:
    buf = [0.0] * n
    hits = [0, 7.5, 16, 23.5, 28]
    for beat in hits:
        i0 = int(beat * BEAT * SAMPLE_RATE)
        for i in range(int(0.55 * SAMPLE_RATE)):
            idx = i0 + i
            if idx >= n:
                break
            p = i / SAMPLE_RATE
            freq = 62 * math.exp(-p * 6.5)
            body = math.sin(2 * math.pi * freq * p) * math.exp(-p * 4.2)
            skin = noise(i + 9000) * math.exp(-p * 18.0) * 0.22
            buf[idx] += (body * 0.55 + skin) * 0.34
    return lowpass(buf, 0.16)


def render_crackle(n: int) -> list[float]:
    buf = [0.0] * n
    rng = random.Random(7)
    t = 0.0
    while t < DURATION:
        gap = 0.04 + rng.random() * 0.22
        t += gap
        i0 = int(t * SAMPLE_RATE)
        burst = 40 + int(rng.random() * 180)
        for i in range(burst):
            idx = i0 + i
            if 0 <= idx < n:
                p = i / SAMPLE_RATE
                buf[idx] += noise(idx) * math.exp(-p * 70.0) * 0.07
    return highpass(lowpass(buf, 0.45), 0.35)


def main():
    n = int(DURATION * SAMPLE_RATE)
    drones = [
        (0, 18, D2),
        (0, 18, A2),
        (12, 20, F2),
        (16, 16, D2),
        (20, 12, C3),
    ]
    mixed = mix(
        render_rumble(n),
        render_bowed(n, drones),
        render_horn(n),
        render_taiko(n),
        render_crackle(n),
    )
    # loop crossfade last 1.2s into first 1.2s
    fade = int(1.2 * SAMPLE_RATE)
    for i in range(fade):
        w = i / fade
        mixed[i] = mixed[i] * w + mixed[len(mixed) - fade + i] * (1.0 - w)
    mixed = mixed[:-fade]

    peak = max(abs(s) for s in mixed) or 1.0
    gain = 0.86 / peak
    pcm = struct.pack(
        "<" + "h" * len(mixed),
        *[int(max(-32767, min(32767, math.tanh(s * gain) * 32767))) for s in mixed],
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} KB, {len(mixed) / SAMPLE_RATE:.1f}s)")


if __name__ == "__main__":
    main()
