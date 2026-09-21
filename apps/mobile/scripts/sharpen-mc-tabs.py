"""Crop, knockout fringe, and nearest-neighbor sharpen Minecraft tab icons."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "themes" / "minecraft" / "icons"
GRID = 64
OUT = 256
KEEP_ALPHA = 160
DILATE = 8


def largest_mask(im: Image.Image) -> list[list[bool]]:
    w, h = im.size
    pix = im.load()
    seen = [[False] * h for _ in range(w)]
    best: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if seen[x][y] or pix[x, y][3] < KEEP_ALPHA:
                continue
            q: deque[tuple[int, int]] = deque([(x, y)])
            seen[x][y] = True
            blob: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                blob.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[nx][ny] and pix[nx, ny][3] >= KEEP_ALPHA:
                        seen[nx][ny] = True
                        q.append((nx, ny))
            if len(blob) > len(best):
                best = blob
    mask = [[False] * h for _ in range(w)]
    for x, y in best:
        mask[x][y] = True
    for _ in range(DILATE):
        nxt = [row[:] for row in mask]
        for y in range(h):
            for x in range(w):
                if mask[x][y]:
                    continue
                if (
                    (x and mask[x - 1][y])
                    or (x + 1 < w and mask[x + 1][y])
                    or (y and mask[x][y - 1])
                    or (y + 1 < h and mask[x][y + 1])
                ):
                    nxt[x][y] = True
        mask = nxt
    return mask


def sharpen(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    pix = im.load()
    mask = largest_mask(im)
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if not mask[x][y] or pix[x, y][3] < 28:
                pix[x, y] = (0, 0, 0, 0)
            else:
                xs.append(x)
                ys.append(y)
    if not xs:
        print(f"{src.name}: empty after knockout")
        return
    pad = max(4, int(0.04 * max(max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)))
    left = max(0, min(xs) - pad)
    top = max(0, min(ys) - pad)
    right = min(w, max(xs) + 1 + pad)
    bottom = min(h, max(ys) + 1 + pad)
    cropped = im.crop((left, top, right, bottom))
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cropped.size[0]) // 2, (side - cropped.size[1]) // 2))
    small = square.resize((GRID, GRID), Image.Resampling.BOX)
    out = small.resize((OUT, OUT), Image.Resampling.NEAREST)
    out.save(src, "PNG")
    print(f"{src.name}: {w}x{h} -> crop {cropped.size} -> {OUT}x{OUT} grid {GRID}")


if __name__ == "__main__":
    for name in ("home.png", "tasks.png", "learn.png", "shop.png", "profile.png"):
        sharpen(ROOT / name)
