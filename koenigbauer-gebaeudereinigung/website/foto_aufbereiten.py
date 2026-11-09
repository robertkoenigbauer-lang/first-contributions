#!/usr/bin/env python3
"""Bereitet ein Handyfoto dezent für Website, Visitenkarte und Flyer auf – ohne KI-Look.

  pip install pillow
  python foto_aufbereiten.py mein-foto.jpg            -> img/robert-koenigbauer.jpg (4:5, 1200x1500)
  python foto_aufbereiten.py arbeit1.jpg --galerie 1  -> img/galerie/1.jpg (4:3, 1600x1200)

Was passiert: Drehung laut Handy korrigieren, mittig zuschneiden (bei Porträts etwas oberhalb der Mitte),
leicht aufhellen, Kontrast/Farbe minimal anheben, leicht schärfen, Metadaten (GPS!) entfernen.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

HIER = Path(__file__).parent


def zuschneiden(im, verhaeltnis, oben_bevorzugen):
    w, h = im.size
    if w / h > verhaeltnis:
        nw = int(h * verhaeltnis); x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = int(w / verhaeltnis)
    y = int((h - nh) * (0.25 if oben_bevorzugen else 0.5))
    return im.crop((0, y, w, y + nh))


def aufbereiten(quelle, ziel, verhaeltnis, groesse, portrait):
    im = ImageOps.exif_transpose(Image.open(quelle)).convert("RGB")
    im = zuschneiden(im, verhaeltnis, portrait)
    im = ImageOps.autocontrast(im, cutoff=0.5)
    im = ImageEnhance.Brightness(im).enhance(1.04)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Color(im).enhance(1.04)
    im = im.resize(groesse, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))
    ziel.parent.mkdir(parents=True, exist_ok=True)
    im.save(ziel, "JPEG", quality=86, optimize=True, progressive=True)  # ohne EXIF = ohne GPS
    print(f"✅ {ziel}")


if __name__ == "__main__":
    a = argparse.ArgumentParser(); a.add_argument("foto"); a.add_argument("--galerie", type=int, choices=range(1, 7))
    x = a.parse_args()
    if x.galerie:
        aufbereiten(x.foto, HIER / "img" / "galerie" / f"{x.galerie}.jpg", 4 / 3, (1600, 1200), False)
    else:
        aufbereiten(x.foto, HIER / "img" / "robert-koenigbauer.jpg", 4 / 5, (1200, 1500), True)
