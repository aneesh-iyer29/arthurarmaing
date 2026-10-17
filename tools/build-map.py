"""Turns Aneesh's portrait into a game-style island overworld map.

His silhouette (picked out by its dark hair, hoodie, and warm skin) becomes
the island and the skyline behind him becomes the sea. Inside the island the
photo's darkness is elevation: hair and glasses rise into ridges, skin settles
into plains, and the brightest patches flood into lakes. Then it gets
hillshading, contour lines, coastal ripples, a few outlying isles, an earthy
map palette, and a faint blend of the original photo so the face still reads.

Usage: python3 tools/build-map.py   (needs numpy and Pillow)
Writes img/aneesh-hyrule.jpg. The portrait is shrunk by SCALE and moved down
by TOP, so a point at (x, y) on the photo (0..1) lands on the map at
(0.5 + (x - 0.5) * SCALE, TOP + y * SCALE). script.js places its markers
with the same numbers.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img" / "aneesh-map.jpg"
OUT = ROOT / "img" / "aneesh-hyrule.jpg"
SIZE = 1600
SCALE = 0.8
TOP = 0.07

# Outlying isles: (x, y, radius) as fractions of the map.
ISLES = [
    (0.11, 0.30, 0.055),   # Old City Isle
    (0.07, 0.40, 0.022),
    (0.90, 0.40, 0.050),   # Bay Area Isle
    (0.93, 0.50, 0.020),
    (0.83, 0.85, 0.038),   # Gift Isle
    (0.18, 0.90, 0.026),
    (0.24, 0.94, 0.014),
]

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


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def fractal(size, octaves=5, start=4):
    """Value noise summed over a few octaves, in [0, 1]."""
    out = np.zeros((size, size))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = start * 2 ** o
        n = rng.random((cells, cells))
        n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), float) / 255
        out += amp * n
        total += amp
        amp *= 0.5
    out /= total
    return (out - out.min()) / (out.max() - out.min())


def placed(img):
    """Shrink a SIZE x SIZE layer by SCALE and drop it onto an empty map at TOP."""
    small = int(SIZE * SCALE)
    left = (SIZE - small) // 2
    top = int(SIZE * TOP)
    out = np.zeros((SIZE, SIZE) + img.shape[2:])
    layer = np.asarray(Image.fromarray(img.astype(np.float32)).resize((small, small), Image.BILINEAR)) if img.ndim == 2 else \
        np.stack([np.asarray(Image.fromarray(img[..., c].astype(np.float32)).resize((small, small), Image.BILINEAR)) for c in range(img.shape[2])], -1)
    h = min(small, SIZE - top)
    out[top:top + h, left:left + small] = layer[:h]
    return out


def main():
    photo = Image.open(SRC).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
    rgb = np.asarray(photo, dtype=np.float64) / 255
    lum = rgb @ np.array([0.299, 0.587, 0.114])

    # Silhouette: dark hair and hoodie, or warm saturated skin.
    sat = (rgb.max(-1) - rgb.min(-1)) / (rgb.max(-1) + 1e-6)
    warm = rgb[..., 0] - rgb[..., 2]
    person = ((lum < 0.33) | ((warm > 0.12) & (sat > 0.25))).astype(float)
    person = (blur(person, 16) > 0.5).astype(float)

    # Everything onto the map canvas, leaving sea on every side.
    person = placed(person)
    lum = placed(lum)
    lum[person == 0] = 1
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE

    # The torso runs off the bottom of the photo, so round it off into a
    # southern coast, then rough up every shoreline with noise.
    rough = fractal(SIZE, 7)
    south = smoothstep(0.0, 0.06, 0.84 - yy - 0.16 * ((xx - 0.5) / 0.4) ** 2 + (rough - 0.5) * 0.12)
    land = person * south
    isles = np.zeros_like(land)
    for x, y, r in ISLES:
        isles = np.maximum(isles, (((xx - x) ** 2 + (yy - y) ** 2) < r * r).astype(float))
    land = np.maximum(land, isles)
    coast = fractal(SIZE, 4, 12)
    land = blur(land, 22) + (coast - 0.5) * 0.75
    land = (blur(land, 1.5) > 0.5).astype(float)
    land_soft = blur(land, 1.4)
    # The isles have no photo under them, so give them rolling hills of their own.
    lum = np.where((person == 0) & (land > 0), 0.35 + 0.5 * rough, lum)

    # Elevation: dark is high, and it climbs gently away from the coast.
    inland = smoothstep(0.5, 0.95, blur(land, 30))
    height = 1 - blur(lum, 9)
    height = np.clip(0.8 * height + 0.2 * blur(rough, 6), 0, 1)
    on = land > 0
    lo, hi = height[on].min(), height[on].max()
    height = np.clip((height - lo) / (hi - lo), 0, 1) * (0.35 + 0.65 * inland)

    # Lakes in the lowest (brightest) inland ground.
    mainland = on & (person > 0) & (inland > 0.7)
    lake_level = np.quantile(height[mainland], 0.03)
    lake = mainland & (height < lake_level)
    lake_soft = blur(lake.astype(float), 3)

    # Hillshade, lit from the northwest like a printed map.
    gy, gx = np.gradient(height * 60)
    nx, ny, nz = -gx, -gy, np.ones_like(gx)
    norm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    light = np.array([-0.55, -0.55, 0.63])
    shade = np.clip((nx * light[0] + ny * light[1] + nz * light[2]) / norm, 0, 1)

    ground = ramp(height, [
        (0.00, (176, 168, 124)),  # beaches
        (0.06, (112, 140, 92)),   # grassland
        (0.35, (128, 146, 98)),   # meadows
        (0.55, (156, 150, 106)),  # dry plains
        (0.68, (164, 150, 112)),  # foothills
        (0.80, (150, 128, 96)),   # rock
        (0.92, (196, 186, 160)),  # high rock
        (1.00, (232, 228, 214)),  # snow
    ])
    ground *= (0.62 + 0.55 * shade)[..., None]

    # Contours on land: thin lines every level, heavier every fifth.
    levels = 34
    q = np.floor(height * levels)
    edge = np.zeros_like(height, dtype=bool)
    edge[:, 1:] |= q[:, 1:] != q[:, :-1]
    edge[1:, :] |= q[1:, :] != q[:-1, :]
    major = edge & (q % 5 == 0)
    contour = blur(edge.astype(float), 0.6) * 0.18 + blur(major.astype(float), 0.8) * 0.22
    ground *= (1 - contour * land_soft)[..., None]

    # The sea: pale shallows by the coast, deep slate-blue farther out.
    near = blur(land, 28)
    depth = 1 - smoothstep(0.0, 0.35, near)
    sea = lerp(np.array([92, 138, 146.0]) / 255, np.array([34, 58, 76.0]) / 255, depth)
    sea *= (0.94 + 0.12 * blur(rough, 3))[..., None]
    # Ripple lines that follow the coast outward.
    reach = blur(land, 14)
    rq = np.floor(np.sqrt(np.clip(reach, 0, 1)) * 7)
    ripple = np.zeros_like(reach, dtype=bool)
    ripple[:, 1:] |= rq[:, 1:] != rq[:, :-1]
    ripple[1:, :] |= rq[1:, :] != rq[:-1, :]
    ripple &= reach > 0.004
    sea = lerp(sea, np.full(3, 0.80), blur(ripple.astype(float), 0.8) * 0.45 * (1 - depth * 0.5) * (1 - land_soft))

    lakes = lerp(np.array([92, 132, 140.0]) / 255, np.array([62, 98, 112.0]) / 255, smoothstep(0, 1, lake_soft))
    img = lerp(sea, ground, land_soft)
    img = lerp(img, lakes, lake_soft)

    # Bright surf line along every shore.
    shore = np.clip(blur(land, 2.2) * (1 - land_soft) * 3.2, 0, 1)
    img = lerp(img, np.full(3, 0.9), shore * 0.75)
    lake_shore = np.clip(blur(lake.astype(float), 2) - lake_soft * 0.9, 0, 1)
    img = lerp(img, np.full(3, 0.86), np.clip(lake_shore * 1.4, 0, 0.6))

    # Let the face come through on land: a soft-light blend of the photo's tones.
    face = blur(lum, 1.2)
    soft = np.where(face[..., None] < 0.5, 2 * img * face[..., None] + img ** 2 * (1 - 2 * face[..., None]),
                    2 * img * (1 - face[..., None]) + np.sqrt(np.clip(img, 0, 1)) * (2 * face[..., None] - 1))
    img = lerp(img, soft, 0.6 * land_soft * (1 - lake_soft) * person)

    # Paper grain and a slightly cool, faded print.
    grain = blur(rng.random((SIZE, SIZE)), 0.7)
    img *= (0.96 + 0.08 * grain)[..., None]
    img = img * 0.92 + np.array([0.05, 0.06, 0.06])

    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(OUT, quality=84, optimize=True)
    print(OUT, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
