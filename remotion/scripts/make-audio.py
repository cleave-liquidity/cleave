"""
Synthesised score for the YELTRA launch film. No samples, no network: everything is generated from sine waves and
filtered noise, then written to public/audio/yeltra-score.wav (44.1 kHz, stereo, 16-bit, exactly 30 s).

Every sound is placed by FRAME NUMBER (30 fps), copied from the scene files, so the audio lands on the visuals.
Run:  python3 scripts/make-audio.py
"""
import wave
import numpy as np

SR = 44100
FPS = 30
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)  # deterministic: same file every run

dry = np.zeros((2, N))
send = np.zeros((2, N))  # reverb send


def T(frame):
    return frame / FPS


def add(t, sig, gain=1.0, pan=0.0, rev=0.3):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i]
    l = np.cos((pan + 1) * np.pi / 4) * 1.414
    r = np.sin((pan + 1) * np.pi / 4) * 1.414
    dry[0, i:j] += s * gain * l
    dry[1, i:j] += s * gain * r
    send[0, i:j] += s * gain * rev * l
    send[1, i:j] += s * gain * rev * r


def ts(d):
    return np.arange(int(d * SR)) / SR


def decay_env(d, rate, attack=0.002):
    t = ts(d)
    e = np.exp(-rate * t)
    a = np.minimum(1, t / max(attack, 1e-4))
    return e * a


def band_noise(n, lo, hi):
    """White noise restricted to [lo, hi] Hz, FFT mask with soft edges."""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.clip((f - lo) / max(lo * 0.3, 20), 0, 1) * np.clip((hi - f) / max(hi * 0.3, 20), 0, 1)
    y = np.fft.irfft(X * m, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def sweep_noise(d, f0, f1, width=0.9):
    """Noise whose band-centre glides from f0 to f1 (log), built from crossfaded narrow bands."""
    n = int(d * SR)
    t = np.linspace(0, 1, n)
    centre = np.log(f0) + (np.log(f1) - np.log(f0)) * t
    out = np.zeros(n)
    centres = np.exp(np.linspace(np.log(min(f0, f1)) - 0.3, np.log(max(f0, f1)) + 0.3, 14))
    for fc in centres:
        band = band_noise(n, fc / 1.5, fc * 1.5)
        w = np.exp(-((np.log(fc) - centre) ** 2) / (2 * width**2 * 0.18))
        out += band * w
    return out / (np.max(np.abs(out)) + 1e-9)


def sine_sweep(d, f0, f1, curve=1.0):
    n = int(d * SR)
    u = np.linspace(0, 1, n) ** curve
    f = f0 * (f1 / f0) ** u
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------------------------------------------------------- voices
def tick(freq=2600, vol=1.0):
    d = 0.035
    s = np.sin(2 * np.pi * freq * ts(d)) * decay_env(d, 120)
    c = band_noise(int(d * SR), 3000, 9000) * decay_env(d, 200)
    return (s * 0.6 + c * 0.4) * vol


def pluck(freq, d=1.4, rate=3.5):
    t = ts(d)
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.005 * t) + 0.15 * np.sin(2 * np.pi * freq * 3.01 * t)
    return s * decay_env(d, rate, 0.003)


def chime(freq, d=3.0, rate=1.6):
    t = ts(d)
    s = np.sin(2 * np.pi * freq * t) + 0.38 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-2 * t) + 0.16 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-4 * t)
    return s * decay_env(d, rate, 0.004)


def hit(d=2.4, f0=120, f1=34, noise=0.7, rate=2.2):
    t = ts(d)
    f = f1 + (f0 - f1) * np.exp(-t * 14)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay_env(d, rate, 0.002)
    crack = band_noise(len(t), 200, 7000) * decay_env(d, 9, 0.001)
    return body + noise * crack


def kick():
    d = 0.32
    t = ts(d)
    f = 42 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * decay_env(d, 11, 0.002)


def hat():
    d = 0.05
    return band_noise(int(d * SR), 6000, 14000) * decay_env(d, 90, 0.001)


def bass(freq, d=0.45):
    t = ts(d)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t)
    return s * decay_env(d, 7, 0.004)


def whoosh(d, f0, f1, shape="swell", peak=0.5):
    n = int(d * SR)
    x = sweep_noise(d, f0, f1)
    u = np.linspace(0, 1, n)
    if shape == "in":
        env = u**2.2
    elif shape == "out":
        env = (1 - u) ** 1.6
    else:
        env = np.where(u < peak, (u / peak) ** 1.5, ((1 - u) / (1 - peak)) ** 1.5)
    return x * env


def riser(d, f0, f1, noise=0.6, curve=1.8):
    n = int(d * SR)
    u = np.linspace(0, 1, n)
    env = u**2.4
    tone = sine_sweep(d, f0, f1, curve) * env
    nz = sweep_noise(d, f0 * 2, f1 * 3) * env
    return tone * (1 - noise * 0.5) + nz * noise


def pad(freqs, d, attack=0.9, release=1.2, det=0.4):
    n = int((d + release) * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, f in enumerate(freqs):
        for dt in (-det, det):
            ff = f + dt * (1 + 0.3 * k)
            s += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) / (1 + 0.15 * k)
            s += 0.12 * np.sin(2 * np.pi * ff * 2 * t + rng.uniform(0, 6.28))
    s *= 1 + 0.06 * np.sin(2 * np.pi * 0.22 * t)
    env = np.minimum(1, t / attack) * np.where(t < d, 1, np.maximum(0, 1 - (t - d) / release)) ** 1.5
    return s * env / (len(freqs) * 2)


def glitch(d=0.14):
    n = int(d * SR)
    x = rng.standard_normal(n)
    x = np.round(x * 3) / 3  # bit-crush
    gate = (np.sin(2 * np.pi * np.cumsum(rng.uniform(60, 220, n)) / SR) > 0).astype(float)
    return x * gate * decay_env(d, 8, 0.001) * 0.5


# ---------------------------------------------------------------- frame map (30 fps) ---------------------------------
# Interrupt · 0–90 -----------------------------------------------------------------------------------------------------
ALLPTS = [(140, 760), (260, 700), (380, 690), (470, 610), (540, 540), (610, 585), (690, 660), (760, 705), (850, 676), (960, 666), (1060, 676),
          (1160, 606), (1260, 520), (1350, 450), (1420, 400), (1500, 350), (1580, 322), (1700, 340), (1830, 410), (1990, 500), (2400, 540)]
cum = [0.0]
for a, b in zip(ALLPTS, ALLPTS[1:]):
    cum.append(cum[-1] + np.hypot(b[0] - a[0], b[1] - a[1]))
at = lambda i: cum[i] / cum[-1]
CHART_END = at(16)


def ease_io(x):
    return 4 * x**3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def draw_frac(f):
    lin = min(1, f / 42)
    return CHART_END * (lin + (ease_io(lin) - lin) * 0.45)


def hit_frame(i):
    for f in range(43):
        if draw_frac(f) >= at(i) - 0.002:
            return f
    return 42


# the drone under the whole opening: low, tense (A + tritone)
add(0.0, pad([55, 77.8, 82.4], 2.9, attack=1.6, release=0.5), 0.9, rev=0.2)
add(0.0, whoosh(1.4, 120, 500, "in"), 0.10, rev=0.1)  # the line being drawn: a faint scribble
for k, i in enumerate((4, 12, 16)):  # the three yield numbers
    f = hit_frame(i)
    add(T(f), tick(1500 + 450 * k, 1.0), 0.55, pan=-0.3 + 0.3 * k)
    add(T(f), pluck(660 * 2 ** (k * 4 / 12), 0.9, 6), 0.10, pan=-0.3 + 0.3 * k, rev=0.4)
add(T(42), hit(1.6, 90, 30, 0.35, 3.2), 0.85, rev=0.2)  # FREEZE
add(T(42), sine_sweep(0.35, 300, 3000, 1.0) * decay_env(0.35, 6), 0.10)  # scan line
add(T(44), glitch(0.17), 0.7, pan=0.0, rev=0.1)  # headline breaks in
for k in range(9):
    add(T(46 + k * 2.4), tick(1900 + (k % 3) * 300, 0.6), 0.22, pan=-0.2 + 0.05 * k)
add(T(62), whoosh(0.3, 3000, 400, "out"), 0.3)  # headline scrambles away
add(T(66), hit(2.8, 130, 32, 0.9, 1.8), 1.15, rev=0.35)  # TRADE IT.
add(T(66), chime(220, 2.5, 1.2), 0.14, rev=0.5)
add(T(64), whoosh(0.95, 300, 5200, "in"), 0.55, rev=0.15)  # the line leaves the frame

# Reveal · 90–180 ------------------------------------------------------------------------------------------------------
add(T(90), riser(0.9, 180, 900, 0.5), 0.34, rev=0.3)  # the line bends into an orbit
add(T(112), chime(880, 3.8, 0.9), 0.38, rev=0.6)  # the planet appears
add(T(112), hit(2.8, 100, 36, 0.3, 1.3), 0.7, rev=0.5)
add(T(111), pad([110, 164.8, 220, 277.2, 329.6], 5.2, attack=0.9, release=1.4), 1.0, rev=0.55)
for k in range(7):  # the orbit shimmer
    add(T(114 + k * 3.4), chime([1318, 1760, 1568, 2093, 1976, 1760, 2349][k], 1.4, 2.6), 0.07, pan=-0.7 + 0.23 * k, rev=0.6)
add(T(134), hit(1.8, 90, 40, 0.15, 2.6), 0.5, rev=0.5)  # YELTRA wordmark
add(T(134), pluck(440, 1.8, 2.2), 0.14, rev=0.6)
for k in range(10):  # tagline typewriter
    add(T(152 + k * 1.8), tick(3200, 0.5), 0.12, pan=0.25)
add(T(154), riser(0.95, 140, 1600, 0.75, 2.4), 0.50, rev=0.25)  # push through the orbit

# Markets · 180–330 ----------------------------------------------------------------------------------------------------
add(T(180), whoosh(0.6, 1200, 200, "out"), 0.35, rev=0.3)
add(T(181), pluck(220, 1.6, 3), 0.18, rev=0.5)
add(T(180), pad([92.5, 138.6, 164.8, 220], 5.4, attack=0.8, release=1.2), 0.8, rev=0.5)  # F#m7: a new room
PENT = [440, 495, 554, 659, 740, 880, 988]
for i in range(7):  # rows populate
    add(T(192 + i * 5), tick(2200 + i * 160, 0.7), 0.35, pan=0.45)
    add(T(192 + i * 5), pluck(PENT[i], 0.7, 7), 0.07, pan=0.45, rev=0.4)
for k in range(6):  # six markets converge on one layer
    add(T(218 + k * 4), pluck(PENT[(k * 2) % 7] / 2, 0.8, 6), 0.11, pan=-0.6 + 0.12 * k, rev=0.5)
add(T(242), chime(660, 2.4, 1.6), 0.22, pan=-0.4, rev=0.6)  # the hub forms
add(T(240), whoosh(0.5, 400, 2400, "swell"), 0.18, pan=-0.4)
add(T(278), sine_sweep(0.55, 300, 900) * decay_env(0.55, 4, 0.05), 0.12)  # a row opens
add(T(280), whoosh(0.5, 600, 3000, "swell", 0.4), 0.2)
add(T(296), riser(1.05, 120, 1500, 0.7, 2.6), 0.5, rev=0.25)  # the dive

# Fixed Yield · 330–480 ------------------------------------------------------------------------------------------------
add(T(330), whoosh(0.5, 2000, 200, "out"), 0.3, rev=0.3)
add(T(330), pad([73.4, 110, 146.8, 185, 277.2], 4.6, attack=0.9, release=1.2), 0.95, rev=0.6)  # Dmaj: cool, open
add(T(336), whoosh(0.5, 300, 1800, "swell"), 0.14)  # FIXED YIELD.
for k in range(24):  # the rate spins until it locks
    add(T(334 + k * 2.2), tick(1700 + (k % 5) * 60, 0.5), 0.14, pan=0.35)
add(T(364), sine_sweep(0.6, 400, 4200, 1.4) * decay_env(0.6, 3.2, 0.1), 0.14, rev=0.4)  # the strike line
add(T(384), hit(1.6, 160, 46, 0.5, 3.4), 1.0, rev=0.3)  # SNAP
add(T(384), pluck(1174, 1.4, 5), 0.30, rev=0.5)
add(T(392), chime(1760, 3.0, 1.3), 0.28, rev=0.6)  # locked
for k in range(13):  # the maturity ticks
    add(T(396 + k * 1.5), tick(1300 + k * 40, 0.7), 0.20, pan=-0.3 + 0.05 * k)
add(T(414), sine_sweep(0.8, 260, 740, 1.0) * np.sin(np.linspace(0, np.pi, int(0.8 * SR))), 0.10, rev=0.4)  # the handle slides
add(T(434), glitch(0.12), 0.35, rev=0.1)  # LOCK THE RATE.
add(T(437), hit(0.5, 260, 90, 0.8, 9), 0.7, pan=-0.35, rev=0.2)  # brackets close
add(T(437.5), hit(0.5, 260, 90, 0.8, 9), 0.7, pan=0.35, rev=0.2)
add(T(446), tick(900, 1.0), 0.6, rev=0.1)  # padlock click
add(T(447.5), tick(1400, 1.0), 0.5, rev=0.1)
add(T(446), chime(2349, 2.6, 1.8), 0.14, rev=0.6)

# Trading Yield · 480–630 (120 bpm = 15 frames per beat) --------------------------------------------------------------
add(T(482), riser(0.8, 90, 700, 0.5, 1.8), 0.34, rev=0.3)  # energy comes back
add(T(500), pad([55, 82.4, 110, 164.8, 220], 4.9, attack=0.6, release=1.2), 0.85, rev=0.4)
ROOT = [55, 55, 82.4, 55, 73.4, 55, 82.4, 73.4]
for b in range(10):
    f = 495 + b * 15
    add(T(f), kick(), 0.85, rev=0.05)
    add(T(f + 7.5), hat(), 0.14, pan=0.3, rev=0.1)
    add(T(f + 3.75), bass(ROOT[b % 8], 0.4), 0.55, rev=0.05)
    add(T(f + 11.25), bass(ROOT[(b + 3) % 8] * 2, 0.3), 0.30, rev=0.05)
for k, f in enumerate((510, 525, 540, 555, 570, 585, 600)):  # arpeggio over the beat
    add(T(f + 3.75), pluck([440, 554, 659, 880, 659, 554, 988][k], 0.7, 6), 0.11, pan=-0.5 + 0.17 * k, rev=0.45)
add(T(508), hit(1.0, 140, 40, 0.6, 5), 0.6, rev=0.3)  # camera punch
add(T(502), whoosh(0.7, 500, 3500, "swell", 0.5), 0.22)  # the curve fits the interface
for f in (520, 528, 536):  # scenario pills
    add(T(f), tick(1800, 0.8), 0.35, pan=0.3)
add(T(556), hit(1.4, 150, 38, 0.8, 3.4), 0.95, rev=0.3)  # TRADE WHAT YIELD DOES NEXT.
add(T(556), whoosh(0.5, 400, 4200, "swell", 0.3), 0.25)
add(T(620), whoosh(0.8, 3000, 300, "out"), 0.2)

# Dividend Earn · 630–750 ----------------------------------------------------------------------------------------------
add(T(628), whoosh(0.5, 2200, 220, "out"), 0.25, rev=0.4)
add(T(630), pad([73.4, 110, 164.8, 185, 277.2, 370], 4.7, attack=1.0, release=1.2), 0.75, rev=0.7)  # calmer
for k in range(4):  # the distribution rail
    add(T(652 + k * 4), chime([587, 659, 784, 880][k], 1.6, 2.4), 0.10, pan=-0.4 + 0.25 * k, rev=0.6)
add(T(658), sine_sweep(1.1, 440, 1320, 1.2) * np.sin(np.linspace(0, np.pi, int(1.1 * SR))) ** 0.7, 0.10, rev=0.6)  # the event travels
add(T(690), chime(1568, 2.6, 1.5), 0.24, rev=0.6)  # it connects
add(T(690), whoosh(0.45, 1500, 4800, "swell", 0.5), 0.12)
add(T(698), sine_sweep(0.7, 260, 560) * decay_env(0.7, 3, 0.05), 0.09)  # the module unfolds inside the frame
add(T(702), whoosh(0.5, 500, 2600, "swell", 0.4), 0.15)  # + DIVIDEND EARN
for k in range(3):
    add(T(712 + k * 4), tick(2100 + 150 * k, 0.6), 0.2, pan=0.2)
add(T(720), chime(1175, 3.0, 1.4), 0.24, rev=0.6)  # ELIGIBLE
add(T(720), chime(1568, 3.0, 1.6), 0.14, rev=0.6)
for k in range(10):
    add(T(716 + k * 2.6), tick(3000, 0.4), 0.09, pan=-0.3)
add(T(738), riser(0.5 + 0.43, 150, 900, 0.65, 2.0), 0.42, rev=0.3)  # everything pulls inward

# System + final lockup · 750–900 -------------------------------------------------------------------------------------
add(T(750), hit(1.8, 110, 40, 0.3, 2.4), 0.6, rev=0.5)
add(T(748), pad([55, 110, 164.8, 220, 277.2, 329.6], 5.9, attack=0.8, release=1.5), 0.85, rev=0.6)  # Amaj add9: resolved
add(T(752), chime(659, 3.0, 1.3), 0.16, rev=0.6)
for k, f in enumerate((768, 778, 784, 794)):  # Markets · Fixed · Trading · Dividend Earn
    add(T(f), chime([554, 659, 880, 1109][k], 2.4, 2.0), 0.20, pan=[0.0, -0.5, 0.5, 0.55][k], rev=0.6)
for k in range(8):
    add(T(786 + k * 2.4), tick(2400, 0.45), 0.09, pan=0.3)
add(T(808), riser(1.0, 120, 1900, 0.8, 2.6), 0.55, rev=0.25)  # the system collapses
add(T(834), hit(3.4, 100, 26, 1.0, 1.4), 1.25, rev=0.45)  # pulse: the planet takes everything in
add(T(834), chime(440, 4.0, 0.9), 0.30, rev=0.7)
add(T(836), pad([55, 82.4, 110, 164.8, 220, 277.2, 329.6, 440], 5.6, attack=0.6, release=1.6), 1.0, rev=0.7)
add(T(844), whoosh(0.8, 300, 2800, "swell", 0.5), 0.18)  # the planet lifts
add(T(850), hit(1.8, 90, 44, 0.12, 2.4), 0.5, rev=0.6)  # YELTRA wordmark
add(T(850), chime(880, 4.5, 0.8), 0.20, rev=0.7)
add(T(866), whoosh(0.7, 400, 2600, "swell", 0.4), 0.20)  # YIELD YOU CAN TRADE.
add(T(866), pluck(659, 2.4, 2.2), 0.16, rev=0.7)
for k in range(22):
    add(T(868 + k * 0.9), tick(3000 + (k % 4) * 150, 0.4), 0.075, pan=0.0)
add(T(878), pluck(554, 2.0, 2.6), 0.10, pan=-0.3, rev=0.7)
add(T(882), chime(1760, 4.5, 0.9), 0.22, rev=0.8)  # yeltra.tech
add(T(884), pluck(1318, 2.4, 2.0), 0.10, pan=0.3, rev=0.8)

# ---------------------------------------------------------------- mix ------------------------------------------------
def reverb(x, decay=1.35, length=2.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * (6.9 / decay))
        # soften the highs so the tail is dark and expensive rather than hissy
        k = np.ones(5) / 5
        ir = np.convolve(ir, k, mode="same")
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        size = N + n
        out[ch] = np.fft.irfft(np.fft.rfft(x[ch], size) * np.fft.rfft(ir, size), size)[:N]
    return out / 90


mix = dry + reverb(send) * 1.0

# gentle high-pass (remove DC / sub rumble), then soft saturation and a clean fade
for ch in range(2):
    y = np.copy(mix[ch])
    mix[ch] = y - np.convolve(y, np.ones(1500) / 1500, mode="same")  # ~30 Hz high-pass (moving-average subtraction)
mix = np.tanh(mix * 0.8) / np.tanh(0.8)
peak = np.max(np.abs(mix))
mix = mix / peak * 0.72

fade_in = np.minimum(1, np.arange(N) / (0.02 * SR))
fade_out = np.clip((N - np.arange(N)) / (1.1 * SR), 0, 1) ** 1.5  # final ~1 s into silence = the cut to black
mix *= fade_in * fade_out

pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
import os

os.makedirs("public/audio", exist_ok=True)
with wave.open("public/audio/yeltra-score.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

rms = [float(np.sqrt(np.mean(mix[:, s * SR : (s + 1) * SR] ** 2))) for s in range(30)]
print("duration", N / SR, "s  peak", round(float(np.max(np.abs(mix))), 3))
print("rms per second:", " ".join(f"{r:.2f}" for r in rms))
