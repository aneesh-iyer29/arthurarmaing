"""Turns Aneesh's portrait into a game-style overworld map.

The photo's darkness becomes elevation (hair and glasses rise into mountain
ridges, skin settles into plains, the brightest patches flood into lakes),
then it gets hillshading, contour lines, an earthy map palette, and a faint
blend of the original photo so the face still reads.

Usage: python3 tools/build-map.py   (needs numpy and Pillow)
Writes img/aneesh-hyrule.jpg.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "aneesh-map.jpg"
OUT = ROOT / "img" / "aneesh-hyrule.jpg"
SIZE = 1600

rng = np.random.default_rng(29)


def blur(a, sigma):
    """Gaussian blur of a float array, done in the frequency domain with reflected edges."""
    pad = int(3 * sigma) + 1
    p = np.pad(a, pad, mode="reflect")
    fy = np.fft.fftfreq(p.shape[0])[:, None]
    fx = np.fft.fftfreq(p.shape[1])[None, :]
    g = np.exp(-2 * np.pi ** 2 * sigma ** 2 * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(p) * g))[pad:-pad, pad:-pad]


def lerp(a, b, t):
    return a + (b - a) * t[..., None]


def ramp(h, stops):
    """Map heights in [0, 1] through color stops [(pos, (r, g, b)), ...]."""
    out = np.zeros(h.shape + (3,))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (h >= p0) & (h <= p1)
        t = np.clip((h - p0) / (p1 - p0), 0, 1)
        out[m] = lerp(np.array(c0, float), np.array(c1, float), t)[m]
    return out / 255


def main():
    photo = Image.open(SRC).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    rgb = np.asarray(photo, dtype=np.float64) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114])

    # Elevation: dark is high. Blur away pores and hair strands, keep features.
    height = 1 - blur(lum, 9)
    # Rolling large-scale noise so flat areas still read as terrain.
    noise = rng.random((SIZE // 32, SIZE // 32))
    noise = np.asarray(Image.fromarray((noise * 255).astype(np.uint8)).resize((SIZE, SIZE), Image.BICUBIC), float) / 255
    height = np.clip(0.85 * height + 0.15 * blur(noise, 20), 0, 1)
    height = (height - height.min()) / (height.max() - height.min())

    # Lakes in the lowest (brightest) ground.
    sea = np.quantile(height, 0.07)
    water = height < sea
    water_soft = blur(water.astype(float), 3)

    # Hillshade, lit from the northwest like a printed map.
    gy, gx = np.gradient(height * 60)
    nx, ny, nz = -gx, -gy, np.ones_like(gx)
    norm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    light = np.array([-0.55, -0.55, 0.63])
    shade = np.clip((nx * light[0] + ny * light[1] + nz * light[2]) / norm, 0, 1)

    land = ramp(height, [
        (0.00, (104, 128, 98)),   # river valleys
        (0.25, (118, 138, 96)),   # grassland
        (0.45, (146, 146, 102)),  # dry plains
        (0.62, (164, 150, 112)),  # foothills
        (0.80, (150, 128, 96)),   # rock
        (0.92, (196, 186, 160)),  # high rock
        (1.00, (232, 228, 214)),  # snow
    ])
    land *= (0.62 + 0.55 * shade)[..., None]

    depth = np.clip((sea - height) / max(sea, 1e-6), 0, 1)
    lake = lerp(np.array([92, 132, 140.0]) / 255, np.array([52, 86, 100.0]) / 255, depth)
    img = lerp(land, lake, water_soft)

    # Contours: thin lines every level, heavier every fifth.
    levels = 34
    q = np.floor(height * levels)
    edge = np.zeros_like(height, dtype=bool)
    edge[:, 1:] |= q[:, 1:] != q[:, :-1]
    edge[1:, :] |= q[1:, :] != q[:-1, :]
    major = edge & (q % 5 == 0)
    contour = blur(edge.astype(float), 0.6) * 0.18 + blur(major.astype(float), 0.8) * 0.22
    contour *= 1 - water_soft
    img *= (1 - contour)[..., None]

    # Shoreline highlight.
    shore = np.clip(blur(water.astype(float), 2.5) - water_soft * 0.9, 0, 1)
    img = lerp(img, np.full(3, 0.86), np.clip(shore * 1.4, 0, 0.6))

    # Let the face come through: a soft-light blend of the photo's tones.
    face = blur(lum, 1.2)
    soft = np.where(face[..., None] < 0.5, 2 * img * face[..., None] + img ** 2 * (1 - 2 * face[..., None]),
                    2 * img * (1 - face[..., None]) + np.sqrt(np.clip(img, 0, 1)) * (2 * face[..., None] - 1))
    img = lerp(img, soft, np.full(face.shape, 0.75))

    # Paper grain and a slightly cool, faded print.
    grain = blur(rng.random((SIZE, SIZE)), 0.7)
    img *= (0.96 + 0.08 * grain)[..., None]
    img = img * 0.92 + np.array([0.05, 0.06, 0.06])

    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(OUT, quality=84, optimize=True)
    print(OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
