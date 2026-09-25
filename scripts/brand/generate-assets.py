#!/usr/bin/env python3
"""Generate EcoTrack brand assets for the web and mobile apps.

Run from anywhere:  python3 ecotrack-web/scripts/brand/generate-assets.py

Sources (in the workspace-level "Logo and styles/" folder, transparent 1000x1000):
  - Logo 2.png  -> the mark for LIGHT backgrounds (dark outline, no rim)
  - Logo.png    -> the mark for DARK backgrounds (dark outline with a white rim)

Outputs are written straight into ecotrack-web/ and ecotrack-mobile/; re-running
is idempotent. Requires Pillow.
"""
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "Logo and styles"
WEB = ROOT / "ecotrack-web"
MOBILE = ROOT / "ecotrack-mobile"

DARK_GREEN = (0x0E, 0x3B, 0x2E, 255)
LIGHT_GREEN = (0xE8, 0xF5, 0xE9, 255)


def load_trimmed(name: str) -> Image.Image:
    im = Image.open(SRC / name).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


def fit(mark: Image.Image, box: int) -> Image.Image:
    """Scale the mark so its longest side is `box` pixels."""
    scale = box / max(mark.size)
    size = (max(1, round(mark.width * scale)), max(1, round(mark.height * scale)))
    return mark.resize(size, Image.LANCZOS)


def canvas(mark: Image.Image, size: int, mark_box: int, bg=(0, 0, 0, 0)) -> Image.Image:
    """Centre the mark (longest side `mark_box`) on a `size` x `size` canvas."""
    out = Image.new("RGBA", (size, size), bg)
    m = fit(mark, mark_box)
    out.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return out


def monochrome(mark: Image.Image) -> Image.Image:
    """White silhouette of just the dark outline strokes, for Android themed icons."""
    r, g, b, a = mark.split()
    lum = Image.merge("RGB", (r, g, b)).convert("L")
    # Dark outline pixels -> opaque; greens/highlights -> transparent.
    stroke = lum.point(lambda v: 255 if v < 55 else (0 if v > 85 else int((85 - v) * 255 / 30)))
    alpha = ImageChops.multiply(stroke, a)
    white = Image.new("RGBA", mark.size, (255, 255, 255, 0))
    white.putalpha(alpha)
    return white


def save(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print(f"  {path.relative_to(ROOT)}  {im.width}x{im.height}")


def main() -> None:
    light = load_trimmed("Logo 2.png")  # for light backgrounds
    dark = load_trimmed("Logo.png")  # for dark backgrounds (white rim)

    print("web:")
    save(canvas(light, 512, 480), WEB / "public/brand/logo-mark.png")
    save(canvas(dark, 512, 480), WEB / "public/brand/logo-mark-dark.png")
    # The white-rimmed mark reads on both light and dark browser chrome.
    save(canvas(dark, 192, 186), WEB / "app/icon.png")
    save(canvas(light, 180, 140, LIGHT_GREEN), WEB / "app/apple-icon.png")
    ico = canvas(dark, 256, 252)
    ico.save(WEB / "app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  ecotrack-web/app/favicon.ico  16/32/48")

    print("mobile:")
    assets = MOBILE / "assets"
    for suffix, px in (("", 96), ("@2x", 192), ("@3x", 288)):
        save(canvas(light, px, px), assets / f"brand/logo-mark{suffix}.png")
        save(canvas(dark, px, px), assets / f"brand/logo-mark-dark{suffix}.png")
    save(canvas(dark, 1024, 1024), assets / "splash-icon.png")
    save(canvas(dark, 1024, 640, DARK_GREEN), assets / "icon.png")
    # Adaptive icons: 108dp canvas, only the centre 66dp circle is guaranteed visible.
    save(canvas(dark, 512, 290), assets / "android-icon-foreground.png")
    save(Image.new("RGBA", (512, 512), DARK_GREEN), assets / "android-icon-background.png")
    save(canvas(monochrome(light), 432, 245), assets / "android-icon-monochrome.png")
    save(canvas(dark, 48, 46), assets / "favicon.png")


if __name__ == "__main__":
    main()
