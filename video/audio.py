"""Synthesises the film's restrained sound layer from timeline.json cues.

Soft UI clicks on the real interaction frames, very quiet keystroke ticks,
airy whooshes on the blur->sharp refocus beats and two low, soft thumps.
No music. Seeded noise, so the output is identical on every run.

    python3 audio.py  ->  output/audio.wav (exactly `duration` seconds)
"""
import json
import os
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, "timeline.json")))
C = TL["cues"]
SR = 48000
N = int(SR * TL["duration"])
rng = np.random.default_rng(650)
mix = np.zeros((N, 2))


def place(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    sig = sig[: N - i] * gain
    left, right = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mix[i : i + len(sig), 0] += sig * left
    mix[i : i + len(sig), 1] += sig * right


def click(bright=1.0):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1850 * bright * t) * np.exp(-t * 140)
    tick = rng.standard_normal(n) * np.exp(-t * 900) * 0.6
    low = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 60) * 0.5
    return (body * 0.5 + tick + low) * 0.5


def key_tick():
    n = int(0.025 * SR)
    t = np.arange(n) / SR
    return rng.standard_normal(n) * np.exp(-t * 700) * 0.18 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 400) * 0.05


def whoosh(length=0.42, lo=500, hi=4200):
    """Filtered noise whose band sweeps up then settles: a soft 'refocus'."""
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    # Sweep a one-pole low-pass cutoff (block-wise for speed).
    out = np.zeros(n)
    block = 256
    acc = 0.0
    for b in range(0, n, block):
        p = b / n
        cut = lo + (hi - lo) * np.sin(np.pi * min(1, p * 1.15)) ** 2
        a = np.exp(-2 * np.pi * cut / SR)
        seg = x[b : b + block]
        for j, v in enumerate(seg):
            acc = (1 - a) * v + a * acc
            out[b + j] = acc
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.6
    return out * env * 0.9


def thump(freq=52, length=0.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 18))
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 7) * (1 - np.exp(-t * 400))


# Hook: four quiet ticks on the type beats, low thump on "5 websites."
h = C["hook"]
for k in ("finding", "rightPrice", "shouldnt"):
    place(key_tick(), h[k] + 0.3, 0.9)
place(thump(48, 0.7), h["websites"] + 0.38, 0.55)

# Refocus transitions.
place(whoosh(0.45), C["searchIn"] - 0.12, 0.30, -0.2)
place(whoosh(0.36), C["searchOut"] - 0.06, 0.22, 0.2)
place(whoosh(0.32), C["continueClick"] - 0.02, 0.2, 0.1)
place(whoosh(0.5, 300, 3000), C["endOut"] - 0.06, 0.28, 0.0)

# Typing on the real search input.
for i in range(len("Dolo 650")):
    place(key_tick(), C["typeStart"] + i * C["typeStep"], 0.75, 0.1 * ((i % 3) - 1))

# Real clicks.
place(click(1.0), C["cardClick"], 0.55, 0.15)
place(click(1.15), C["addClick"], 0.6, 0.25)
place(click(1.0), C["continueClick"], 0.45, 0.2)
place(click(0.9), C["buyClick"], 0.55, 0.2)

# Settle on the final frame.
place(thump(44, 0.5), C["endSharp"] - 0.04, 0.35)

# Gentle master: soft-clip, normalise to -3 dBFS, 8 ms fades.
mix = np.tanh(mix * 1.2)
mix *= 10 ** (-3 / 20) / max(1e-9, np.abs(mix).max())
fade = int(0.008 * SR)
mix[:fade] *= np.linspace(0, 1, fade)[:, None]
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

os.makedirs(os.path.join(HERE, "output"), exist_ok=True)
path = os.path.join(HERE, "output", "audio.wav")
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", path, f"{N / SR:.3f}s")
