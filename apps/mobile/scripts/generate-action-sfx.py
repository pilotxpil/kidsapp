"""UI SFX: crowd cheer (task done). Tab switches reuse the theme tap."""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 22050
OUT = Path(__file__).resolve().parent.parent / "assets" / "sfx"


def clamp(x: float) -> float:
    return max(-1.0, min(1.0, x))


def write_wav(name: str, samples: list[float]) -> None:
    peak = max(abs(s) for s in samples) or 1.0
    gain = 0.88 / peak
    path = OUT / name
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(clamp(s * gain) * 32767)) for s in samples)
        w.writeframes(frames)
    print(f"wrote {path}  {len(samples) / SR:.2f}s")


def noise(rng: random.Random) -> float:
    return rng.uniform(-1.0, 1.0)


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


def bandpass(buf: list[float], lo: float, hi: float) -> list[float]:
    return highpass(lowpass(buf, hi), lo)


def env(t: float, dur: float, a: float, r: float) -> float:
    if t < 0 or t > dur:
        return 0.0
    if t < a:
        return t / a
    if t > dur - r:
        return max(0.0, (dur - t) / r)
    return 1.0


def make_cheer() -> list[float]:
    rng = random.Random(7)
    dur = 1.35
    n = int(SR * dur)
    buf = [0.0] * n

    # Crowd bed
    bed = [noise(rng) for _ in range(n)]
    bed = bandpass(bed, 0.18, 0.45)
    for i in range(n):
        t = i / SR
        swell = env(t, dur, 0.08, 0.45) * (0.55 + 0.2 * math.sin(2 * math.pi * 7.5 * t))
        buf[i] += bed[i] * 0.38 * swell

    # Claps
    for _ in range(70):
        start = rng.uniform(0.02, 0.95)
        amp = rng.uniform(0.12, 0.38)
        decay = rng.uniform(0.012, 0.04)
        i0 = int(start * SR)
        length = int(decay * 6 * SR)
        for j in range(length):
            if i0 + j >= n:
                break
            tt = j / SR
            buf[i0 + j] += noise(rng) * amp * math.exp(-tt / decay)

    # Woo / cheers
    for _ in range(10):
        start = rng.uniform(0.05, 0.7)
        length = rng.uniform(0.18, 0.42)
        f0 = rng.uniform(380, 620)
        f1 = f0 * rng.uniform(1.15, 1.45)
        amp = rng.uniform(0.06, 0.13)
        i0 = int(start * SR)
        steps = int(length * SR)
        for j in range(steps):
            if i0 + j >= n:
                break
            u = j / steps
            freq = f0 + (f1 - f0) * u
            e = math.sin(math.pi * u)
            t = j / SR
            vib = 1 + 0.012 * math.sin(2 * math.pi * 6 * t)
            buf[i0 + j] += math.sin(2 * math.pi * freq * vib * t) * amp * e

    return buf


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write_wav("cheer.wav", make_cheer())
