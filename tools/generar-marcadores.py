#!/usr/bin/env python3
"""
GREY SPACES · AR — generador de cartelas-marcador
IRIDIA / SLStudio

Cada cartela es a la vez pieza gráfica y marcador de seguimiento. Lleva:

  · las barras del Tratado del Espacio Exterior como volúmenes sin letras,
    igual que en los sprues GS01–GS10
  · la barra vertical del claiming
  · un 16 Psyche grabado a talla y punteado
  · el hito de distancia en Lato, la misma tipografía de los bloques

Nota técnica, aprendida a golpes: un punteado fino y uniforme es precioso en
papel pero inútil como marcador. A dos metros, la cámara del móvil lo promedia
y lo convierte en un degradado liso, sin un solo punto característico estable.
Lo que sí sobrevive al reescalado son las masas: siluetas cerradas, contornos
con peso, manchas de sombra sólidas y tipografía grande. De ahí que el grabado
combine talla (masa) con punteado (transición), y no solo punteado.

Uso:
    python3 tools/generar-marcadores.py [--dpi 300] [--salida targets]
"""

import argparse
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------------------------------------------------------------- parámetros
A4 = (297.0, 210.0)          # mm, apaisado
TINTA = (24, 26, 28)
GRIS = (150, 156, 161)
GRIS_OSC = (86, 91, 96)
CLAIMING = (18, 19, 21)      # el claiming es un silencio, no un grito
PAPEL = (247, 246, 243)

HITO_KM = 39573000
C_LUZ = 299792.458

# Los diez artículos que se leen como volúmenes en los sprues.
ARTICULOS = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV",
]

CARTELAS = [
    # id, nombre, índice de hito (0..9), semilla, giro del asteroide
    ("A", "Cartela principal", 0, 11, -18),
    ("B", "Cartela derecha", 4, 47, 63),
    ("C", "Peana central", 6, 89, 142),
    ("D", "Cartela lateral", 9, 131, 227),
]


def fuente(ruta_lato, px, peso=300):
    for base in (ruta_lato, "/tmp", os.path.dirname(__file__)):
        p = os.path.join(base, f"Lato-{peso}.ttf")
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    for p in ("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()


# --------------------------------------------------- 16 Psyche a talla dulce
def campo_luminancia(n, semilla, giro_deg):
    """Luminancia y máscara del asteroide en una rejilla n x n."""
    rng = np.random.default_rng(semilla)
    coef = rng.normal(0, 1, 8)

    ejeY = 0.84                        # 16 Psyche es alargada
    ys, xs = np.mgrid[0:n, 0:n]
    u = (xs - n / 2) / (n * 0.415)
    v = (ys - n / 2) / (n * 0.415 * ejeY)
    rad = np.hypot(u, v)
    th = np.arctan2(v, u) - math.radians(giro_deg)

    borde = np.ones_like(th)
    for k in range(2, 10):
        borde += coef[k - 2] * 0.085 / (k - 1) ** 0.75 * np.cos(k * th + coef[k - 2] * 3.1)
    borde = np.clip(borde, 0.70, 1.24)
    dentro = rad <= borde

    q = np.clip(rad / np.maximum(borde, 1e-6), 0, 1)
    nz = np.sqrt(np.maximum(0.0, 1.0 - q * q))
    nx, ny = u.copy(), v.copy()
    sombra = np.zeros_like(u)

    # Cráteres: dos grandes depresiones y un reparto de impactos menores.
    for i in range(18):
        a = rng.uniform(0, 2 * math.pi)
        rr = math.sqrt(rng.uniform(0, 1)) * 0.80
        crad = 0.36 if i < 2 else rng.uniform(0.07, 0.21)
        cu, cv = rr * math.cos(a), rr * math.sin(a)
        du, dv = u - cu, v - cv
        dd = np.hypot(du, dv) / crad
        peso = np.exp(-dd * dd * 1.4)
        nx += du * peso * 1.7
        ny += dv * peso * 1.7
        sombra += peso * 0.40

    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    nn[nn == 0] = 1
    luz = np.array([-0.62, -0.66, 0.42]); luz /= np.linalg.norm(luz)
    lum = (nx / nn) * luz[0] + (ny / nn) * luz[1] + (nz / nn) * luz[2]
    lum = np.clip(lum, 0, None) * 0.92 + 0.08
    lum = np.clip(lum - sombra * 0.60, 0, 1)
    # Terminador más marcado hacia el borde: da contorno con peso.
    lum *= 1.0 - 0.55 * np.clip((q - 0.72) / 0.28, 0, 1)

    lum[~dentro] = 1.0
    return lum, dentro


def asteroide_grabado(lado, semilla, giro_deg):
    """Grabado calcográfico: masa sólida donde hay sombra, punteado en la
    transición. Las masas son lo que el seguimiento reconoce a distancia."""
    n = max(320, lado // 2)
    lum, dentro = campo_luminancia(n, semilla, giro_deg)

    # 1. Masa sólida: la zona de sombra, como una talla.
    masa = ((lum < 0.255) & dentro).astype(np.uint8) * 255
    masa_img = Image.fromarray(masa, "L").resize((lado, lado), Image.LANCZOS)
    masa_img = masa_img.filter(ImageFilter.MedianFilter(3))

    capa = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    tinta = Image.new("RGBA", (lado, lado), TINTA + (255,))
    capa.paste(tinta, (0, 0), masa_img.point(lambda v: 255 if v > 128 else 0))

    # 2. Contorno: un filo continuo alrededor de la silueta.
    borde = Image.fromarray((dentro.astype(np.uint8) * 255), "L")
    borde = borde.resize((lado, lado), Image.LANCZOS).point(lambda v: 255 if v > 128 else 0)
    contorno = borde.filter(ImageFilter.MaxFilter(5)).point(lambda v: 255 if v > 128 else 0)
    anillo = Image.fromarray(
        np.clip(np.asarray(contorno, int) - np.asarray(
            borde.filter(ImageFilter.MinFilter(3)), int), 0, 255).astype(np.uint8), "L")
    capa.paste(Image.new("RGBA", (lado, lado), TINTA + (255,)), (0, 0), anillo)

    # 3. Punteado en la transición, con densidad según el tono.
    d = ImageDraw.Draw(capa)
    rng = np.random.default_rng(semilla + 7)
    paso = max(1.7, lado / 260.0)
    m = int(lado / paso)
    esc = n / lado
    for iy in range(m):
        for ix in range(m):
            x = (ix + rng.uniform(0.1, 0.9)) * paso
            y = (iy + rng.uniform(0.1, 0.9)) * paso
            gx, gy = int(x * esc), int(y * esc)
            if gx >= n or gy >= n or not dentro[gy, gx]:
                continue
            l = lum[gy, gx]
            if l < 0.255 or l > 0.88:
                continue
            tono = (0.88 - l) / 0.625
            if rng.uniform() > tono * 1.15:
                continue
            r = 0.45 + tono * paso * 0.40
            d.ellipse([x - r, y - r, x + r, y + r],
                      fill=TINTA + (int(120 + 135 * tono),))

    return capa


# ----------------------------------------------------------- barras tratado
def barras_tratado(d, x, y, ancho, alto, semilla, fuente_micro, n=14):
    """Los artículos del Tratado como volúmenes, sin letras. Las barras varían
    en ancho, en grosor y en sangrado: eso es lo que produce esquinas, que es
    lo que el reconocimiento de imagen busca."""
    rng = np.random.default_rng(semilla)
    hueco = alto / n
    anchos = []
    for i in range(n):
        w = ancho * (0.24 + 0.76 * rng.beta(2.1, 1.7))
        sangre = ancho * rng.uniform(0, 0.16) if rng.uniform() < 0.45 else 0.0
        grosor = hueco * rng.uniform(0.38, 0.66)
        solida = rng.uniform() < 0.30
        yy = y + i * hueco
        d.rectangle([x + sangre, yy, x + sangre + w, yy + grosor],
                    fill=TINTA if solida else GRIS)
        anchos.append((sangre, w))
        d.text((x - hueco * 0.75, yy), ARTICULOS[i % len(ARTICULOS)],
               font=fuente_micro, fill=GRIS_OSC, anchor="ra")

    # La barra vertical: el claiming.
    ix = int(rng.integers(3, n - 3))
    sangre, w = anchos[ix]
    vx = x + sangre + w * 0.62
    d.rectangle([vx, y - hueco * 0.5, vx + hueco * 0.30, y + alto + hueco * 0.25],
                fill=CLAIMING)
    return anchos


# ------------------------------------------------------------------ cartela
def cartela(id_, nombre, hito_idx, semilla, giro, dpi, ruta_lato):
    px = lambda mm: int(round(mm / 25.4 * dpi))
    W, H = px(A4[0]), px(A4[1])
    img = Image.new("RGB", (W, H), PAPEL)
    d = ImageDraw.Draw(img)

    m = px(13)
    d.rectangle([m, m, W - m, H - m], outline=(198, 195, 189), width=max(1, px(0.5)))

    f_micro = fuente(ruta_lato, px(2.5))
    f_peq = fuente(ruta_lato, px(3.6))
    f_med = fuente(ruta_lato, px(6.2))
    f_num = fuente(ruta_lato, px(16.0))

    # Encabezado. Un bloque sólido a la izquierda ancla la esquina.
    d.rectangle([m + px(7), m + px(7), m + px(7) + px(4.6), m + px(7) + px(11)],
                fill=TINTA)
    d.text((m + px(15), m + px(7)), "GREY SPACES", font=f_med, fill=TINTA)
    d.text((m + px(15), m + px(15.5)), "IRIDIA · SLStudio", font=f_peq, fill=GRIS_OSC)
    d.text((W - m - px(8), m + px(7)), f"MARCADOR {id_}", font=f_peq, fill=GRIS_OSC,
           anchor="ra")
    d.text((W - m - px(8), m + px(13)), nombre.upper(), font=f_micro, fill=GRIS,
           anchor="ra")

    # Barras del Tratado
    barras_tratado(d, m + px(16), m + px(32), px(72), px(98), semilla, f_micro)

    # Asteroide grabado
    lado = px(122)
    ast = asteroide_grabado(lado, semilla, giro)
    img.paste(ast, (W - m - px(10) - lado, m + px(20)), ast)

    # Marca de puntería en el centro exacto de la cartela. En modo libre el
    # visitante centra ahí la retícula antes de tocar; en modo imagen no
    # molesta y da un par de esquinas más al seguimiento.
    cx, cy = W // 2, H // 2
    b = px(5.5); g = px(1.6); w = max(1, px(0.35))
    d.rectangle([cx - b, cy - w, cx - g, cy + w], fill=GRIS_OSC)
    d.rectangle([cx + g, cy - w, cx + b, cy + w], fill=GRIS_OSC)
    d.rectangle([cx - w, cy - b, cx + w, cy - g], fill=GRIS_OSC)
    d.rectangle([cx - w, cy + g, cx + w, cy + b], fill=GRIS_OSC)
    r = px(0.9)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TINTA)
    d.text((cx, cy + b + px(1.5)), "CENTRAR AQUÍ", font=f_micro, fill=GRIS, anchor="ma")

    # Hito de distancia
    km = HITO_KM * (hito_idx + 1)
    seg = km / C_LUZ
    etiqueta = f"{km:,}".replace(",", ".")
    y0 = H - m - px(42)
    d.text((m + px(15), y0), etiqueta, font=f_num, fill=TINTA)
    w = d.textlength(etiqueta, font=f_num)
    d.text((m + px(15) + w + px(3), y0 + px(9)), "km", font=f_med, fill=GRIS_OSC)
    d.text((m + px(15), y0 + px(22)),
           f"{int(seg // 60)} min {int(round(seg % 60)):02d} s luz  ·  "
           f"TIERRA · 16 PSYCHE  ·  BLOQUE {hito_idx + 1:02d}",
           font=f_peq, fill=GRIS_OSC)

    # Tira de los diez hitos: contenido de la obra y textura fina repartida.
    ty = H - m - px(11)
    tx = m + px(15)
    for i in range(10):
        txt = f"{HITO_KM * (i + 1):,}".replace(",", ".")
        activo = i == hito_idx
        if activo:
            d.rectangle([tx - px(1.5), ty - px(1), tx + px(20), ty + px(7)], fill=TINTA)
        d.text((tx, ty), f"{i+1:02d}", font=f_micro,
               fill=PAPEL if activo else GRIS_OSC)
        d.text((tx, ty + px(3.4)), txt, font=f_micro,
               fill=PAPEL if activo else GRIS)
        tx += px(23)

    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--salida", default="targets")
    ap.add_argument("--lato", default="/tmp", help="carpeta con Lato-300.ttf")
    args = ap.parse_args()

    os.makedirs(os.path.join(args.salida, "imprimir"), exist_ok=True)
    os.makedirs(os.path.join(args.salida, "compilar"), exist_ok=True)

    for (id_, nombre, hito, semilla, giro) in CARTELAS:
        img = cartela(id_, nombre, hito, semilla, giro, args.dpi, args.lato)
        p1 = os.path.join(args.salida, "imprimir", f"marcador-{id_}.png")
        img.save(p1, optimize=True)
        chico = img.resize((1024, int(1024 * img.height / img.width)), Image.LANCZOS)
        p2 = os.path.join(args.salida, "compilar", f"marcador-{id_}.png")
        chico.save(p2, optimize=True)
        print(f"{id_}  {p1} ({img.width}x{img.height})  →  {p2}")


if __name__ == "__main__":
    main()
