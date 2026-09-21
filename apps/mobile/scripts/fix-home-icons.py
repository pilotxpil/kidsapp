"""Knock out Ember gem black studio; draw a sharp Minecraft diamond."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "assets" / "themes"


def luma(p: tuple[int, ...]) -> float:
    r, g, b = p[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def chroma(p: tuple[int, ...]) -> int:
    r, g, b = p[:3]
    return max(r, g, b) - min(r, g, b)


def is_studio_black(p: tuple[int, ...]) -> bool:
    r, g, b, a = p
    if a < 10:
        return True
    return luma((r, g, b)) < 22 and chroma((r, g, b)) < 20


def knockout_ember_gem() -> None:
    src = ROOT / "ember" / "gem.png"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    pix = im.load()
    mark = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or mark[x][y]:
            return
        if not is_studio_black(pix[x, y]):
            return
        mark[x][y] = True
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    killed = 0
    for x in range(w):
        for y in range(h):
            if mark[x][y]:
                pix[x, y] = (0, 0, 0, 0)
                killed += 1
    # fringe: dark pixels that touch already-transparent
    extra = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            if a < 10:
                continue
            if luma((r, g, b)) > 28 or chroma((r, g, b)) > 28:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and pix[nx, ny][3] < 10:
                    pix[x, y] = (0, 0, 0, 0)
                    extra += 1
                    break
    im.save(src, "PNG")
    print(f"ember gem: killed {killed / (w * h):.0%} + fringe {extra} of {w}x{h}")


def knockout_ingot() -> None:
    src = Path(__file__).resolve().parent.parent / "assets" / "daily-word-ingot.png"
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    pix = im.load()
    killed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pix[x, y]
            L = luma((r, g, b))
            c = chroma((r, g, b))
            if a < 12 or (L < 42 and c < 38):
                pix[x, y] = (0, 0, 0, 0)
                killed += 1
    bbox = im.getbbox()
    if bbox:
        pad = 8
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        im = im.crop((left, top, right, bottom))
    im.save(src, "PNG")
    print(f"ingot: killed {killed} dark px, crop {im.size}")


def draw_mc_diamond() -> None:
    """Hard-edged isometric diamond, then nearest-neighbor upscale."""
    n = 32
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    top, left, right, bottom, mid = (16, 1), (1, 14), (30, 14), (16, 30), (16, 14)
    light = (165, 255, 250, 255)
    mid_l = (48, 224, 232, 255)
    mid_r = (20, 168, 196, 255)
    dark = (8, 102, 128, 255)
    ink = (4, 42, 58, 255)
    spark = (255, 255, 255, 255)
    d.polygon([top, right, bottom, left], fill=ink)
    d.polygon([top, right, mid], fill=light)
    d.polygon([top, left, mid], fill=mid_l)
    d.polygon([mid, right, bottom], fill=mid_r)
    d.polygon([mid, left, bottom], fill=dark)
    d.point([(13, 6), (14, 6), (13, 7), (18, 8)], fill=spark)
    out = im.resize((256, 256), Image.Resampling.NEAREST)
    dest = ROOT / "minecraft" / "gem.png"
    out.save(dest, "PNG")
    print(f"minecraft gem: wrote {dest}")


if __name__ == "__main__":
    knockout_ember_gem()
    knockout_ingot()
    draw_mc_diamond()
