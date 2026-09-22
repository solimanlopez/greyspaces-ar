#!/usr/bin/env python3
"""
GREY SPACES · AR — cartela del QR
IRIDIA / SLStudio

Genera dos archivos a partir de la URL de la obra:

  targets/imprimir/qr-cartela.png   A5 vertical a 300 ppp, en el mismo lenguaje
                                    que la cartela A: papel, barras del Tratado,
                                    el claiming, Lato, y el QR en tinta
  targets/imprimir/qr-solo.png      el QR limpio con su zona de silencio, para
                                    ponerlo donde haga falta

Uso:
    python3 tools/generar-qr.py https://ar.iridia.world
"""

import os
import sys

import numpy as np
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

TINTA = (24, 26, 28)
GRIS = (150, 156, 161)
GRIS_OSC = (86, 91, 96)
PAPEL = (247, 246, 243)
A5 = (148.0, 210.0)          # mm, vertical


def fuente(px, peso=300):
    for base in ("/tmp", os.path.dirname(__file__), "."):
        p = os.path.join(base, f"Lato-{peso}.ttf")
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    for p in ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()


def qr_imagen(url, lado_px):
    """QR con corrección H: aguanta impresión, reflejos y una esquina tapada."""
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=10, border=4)
    q.add_data(url)
    q.make(fit=True)
    im = q.make_image(fill_color=TINTA, back_color=PAPEL).convert("RGB")
    return im.resize((lado_px, lado_px), Image.NEAREST)


def barras(d, x, y, ancho, alto, n=9, semilla=3):
    rng = np.random.default_rng(semilla)
    hueco = alto / n
    for i in range(n):
        w = ancho * (0.24 + 0.76 * rng.beta(2.1, 1.7))
        grosor = hueco * rng.uniform(0.38, 0.62)
        d.rectangle([x, y + i * hueco, x + w, y + i * hueco + grosor],
                    fill=TINTA if rng.uniform() < 0.3 else GRIS)
    vx = x + ancho * 0.36
    d.rectangle([vx, y - hueco * 0.4, vx + hueco * 0.28, y + alto + hueco * 0.1], fill=TINTA)


def cartela(url, dpi=300, titulo="AR Grey Areas"):
    px = lambda mm: int(round(mm / 25.4 * dpi))
    W, H = px(A5[0]), px(A5[1])
    img = Image.new("RGB", (W, H), PAPEL)
    d = ImageDraw.Draw(img)
    m = px(11)
    d.rectangle([m, m, W - m, H - m], outline=(198, 195, 189), width=max(1, px(0.5)))

    f_micro = fuente(px(2.6))
    f_peq = fuente(px(3.6))
    f_med = fuente(px(5.6))
    f_url = fuente(px(6.4), 400)

    # Cabecera
    d.rectangle([m + px(7), m + px(7), m + px(7) + px(4.2), m + px(7) + px(10)], fill=TINTA)
    d.text((m + px(14), m + px(6.5)), "GREY SPACES", font=f_med, fill=TINTA)
    d.text((m + px(14), m + px(14.5)), "IRIDIA · SLStudio", font=f_peq, fill=GRIS_OSC)
    d.text((W - m - px(7), m + px(7.5)), "REALIDAD AUMENTADA", font=f_peq,
           fill=GRIS_OSC, anchor="ra")

    # Barras del Tratado, pequeñas, arriba a la derecha
    barras(d, W - m - px(7) - px(36), m + px(16), px(36), px(22))

    # El QR, centrado
    lado = px(82)
    qr = qr_imagen(url, lado)
    qx, qy = (W - lado) // 2, m + px(42)
    img.paste(qr, (qx, qy))

    # Título debajo del QR, y la URL legible por si el QR no va
    f_tit = fuente(px(8.2))
    d.text((W / 2, qy + lado + px(6)), titulo, font=f_tit, fill=TINTA, anchor="ma")
    limpia = url.replace("https://", "").replace("http://", "").rstrip("/")
    d.text((W / 2, qy + lado + px(17.5)), limpia, font=f_url, fill=GRIS_OSC, anchor="ma")

    # Instrucción
    y = qy + lado + px(30)
    lineas = [
        "Escanea con la cámara del móvil.",
        "Apunta a la cartela de la pared.",
        "Cuando la obra aparezca, camina y rodéala.",
    ]
    for i, t in enumerate(lineas):
        d.text((W / 2, y + i * px(6.2)), t, font=f_peq, fill=TINTA, anchor="ma")

    d.text((W / 2, y + px(21)), "En iPhone, abrir en Safari. No funciona desde Instagram ni WhatsApp.",
           font=f_micro, fill=GRIS_OSC, anchor="ma")

    # Pie
    d.text((m + px(7), H - m - px(9)), "16 PSYCHE · 39.573.000 a 395.730.000 KM",
           font=f_micro, fill=GRIS, anchor="la")
    d.text((W - m - px(7), H - m - px(9)), "8,4 GHZ · BANDA X", font=f_micro,
           fill=GRIS, anchor="ra")
    return img


def main():
    if len(sys.argv) < 2:
        print("uso: generar-qr.py https://ar.iridia.world"); sys.exit(1)
    url = sys.argv[1].strip()
    salida = os.path.join(os.path.dirname(__file__), "..", "targets", "imprimir")
    os.makedirs(salida, exist_ok=True)

    cartela(url).save(os.path.join(salida, "qr-cartela.png"), optimize=True)
    qr_imagen(url, 1600).save(os.path.join(salida, "qr-solo.png"), optimize=True)
    print("ok:", url)
    print(" ", os.path.join(salida, "qr-cartela.png"))
    print(" ", os.path.join(salida, "qr-solo.png"))


if __name__ == "__main__":
    main()
