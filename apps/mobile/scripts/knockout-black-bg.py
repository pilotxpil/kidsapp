"""Flood-fill backdrop from the image edges to alpha.

Interior blacks (eyes, dark coats) stay unless they connect to the border
through a similar color. Chromatic pixels (lava, gems, visor glow) are kept.
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets"
SKIP_STEMS = {"bg", "hero", "chest", "map"}
SKIP_DIRS = {"images"}


def luma(p: tuple[int, ...]) -> float:
    r, g, b = p[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def chroma(p: tuple[int, ...]) -> int:
    r, g, b = p[:3]
    return max(r, g, b) - min(r, g, b)


def dist(a: tuple[int, ...], b: tuple[int, ...]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def corner_color(im: Image.Image) -> tuple[int, int, int]:
    px = im.convert("RGB").load()
    w, h = im.size
    samples = [
        px[2, 2],
        px[w - 3, 2],
        px[2, h - 3],
        px[w - 3, h - 3],
        px[w // 2, 2],
        px[2, h // 2],
        px[w - 3, h // 2],
        px[w // 2, h - 3],
    ]
    samples = sorted(samples, key=luma)
    return samples[len(samples) // 2]


def corners_clear(im: Image.Image) -> bool:
    if im.mode not in ("RGBA", "LA") and "A" not in im.mode:
        return False
    px = im.convert("RGBA").load()
    w, h = im.size
    corners = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    return all(p[3] < 16 for p in corners)


def flood(im: Image.Image, bg: tuple[int, int, int], threshold: float) -> list[list[bool]]:
    w, h = im.size
    pix = im.load()
    mark = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    def try_push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or mark[x][y]:
            return
        r, g, b, a = pix[x, y]
        if a < 16:
            return
        if chroma((r, g, b)) > 28 and dist((r, g, b), bg) > threshold:
            return
        if dist((r, g, b), bg) <= threshold:
            mark[x][y] = True
            q.append((x, y))

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    while q:
        x, y = q.popleft()
        try_push(x + 1, y)
        try_push(x - 1, y)
        try_push(x, y + 1)
        try_push(x, y - 1)
    return mark


def center_killed(mark: list[list[bool]]) -> float:
    w, h = len(mark), len(mark[0])
    x0, x1 = w // 3, (2 * w) // 3
    y0, y1 = h // 3, (2 * h) // 3
    total = 0
    dead = 0
    for x in range(x0, x1):
        for y in range(y0, y1):
            total += 1
            if mark[x][y]:
                dead += 1
    return dead / total if total else 0


def knockout(src: Path, dry: bool) -> str:
    raw = Image.open(src)
    im = raw.convert("RGBA")
    if corners_clear(im):
        return f"skip-clear  {src.relative_to(ROOT)}"
    if src.parent.name in SKIP_DIRS or src.parent.parent.name in SKIP_DIRS:
        return f"skip-dir    {src.relative_to(ROOT)}"

    bg = corner_color(im)
    if luma(bg) > 58:
        return f"skip-bright {src.relative_to(ROOT)}  corner={bg}"

    chosen = None
    for threshold in (42, 34, 26, 18, 12):
        mark = flood(im, bg, threshold)
        frac = sum(1 for x in range(im.size[0]) for y in range(im.size[1]) if mark[x][y]) / (
            im.size[0] * im.size[1]
        )
        mid = center_killed(mark)
        if frac < 0.06:
            continue
        if mid > 0.52:
            continue
        chosen = (mark, frac, mid, threshold)
        break

    if chosen is None:
        return f"skip-unsafe {src.relative_to(ROOT)}  corner={bg}"

    mark, frac, mid, threshold = chosen
    w, h = im.size
    pix = im.load()
    for x in range(w):
        for y in range(h):
            if not mark[x][y]:
                continue
            edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not mark[nx][ny]:
                    edge = True
                    break
            r, g, b, _ = pix[x, y]
            pix[x, y] = (r, g, b, 80 if edge else 0)

    dest = src.with_suffix(".png")
    rel = dest.relative_to(ROOT)
    if dry:
        return f"would-fix   {src.relative_to(ROOT)}  kill={frac:.0%} mid={mid:.0%} thr={threshold}"
    im.save(dest, "PNG")
    extra = ""
    if dest != src and src.suffix.lower() in {".jpg", ".jpeg"}:
        extra = f"  (from {src.name})"
    return f"wrote       {rel}{extra}  kill={frac:.0%} mid={mid:.0%} thr={threshold}"


def candidates() -> list[Path]:
    out: list[Path] = []
    for p in ROOT.rglob("*"):
        if p.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if p.stem.lower() in SKIP_STEMS:
            continue
        if "images" in p.parts:
            continue
        out.append(p)
    return sorted(out)


def main() -> None:
    dry = "--apply" not in sys.argv
    print("DRY RUN" if dry else "APPLY")
    for p in candidates():
        try:
            print(knockout(p, dry), flush=True)
        except Exception as e:
            print(f"error       {p}: {e}", flush=True)


if __name__ == "__main__":
    main()
