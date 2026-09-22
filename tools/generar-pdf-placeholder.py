#!/usr/bin/env python3
"""
GREY SPACES · AR — PDF provisional de la obra
IRIDIA / SLStudio

Genera docs/grey-spaces.pdf, el archivo que abre el enlace "About the work"
de la app. Es un marcador de sitio con los datos de la pieza: cuando tengas
el PDF de la descripción de la obra, sustituye docs/grey-spaces.pdf por él,
con el mismo nombre, y publica. No hay que tocar nada más.

Uso:
    python3 tools/generar-pdf-placeholder.py
"""
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'docs', 'grey-spaces.pdf')
TINTA = (0.09, 0.10, 0.11)
GRIS = (0.55, 0.58, 0.61)
VERDE = (0.0, 0.72, 0.13)


def fuente(peso):
    for base in ('/tmp', AQUI, '.'):
        p = os.path.join(base, f'Lato-{peso}.ttf')
        if os.path.exists(p):
            nombre = f'Lato{peso}'
            pdfmetrics.registerFont(TTFont(nombre, p))
            return nombre
    return 'Helvetica'


def main():
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    f300, f400 = fuente(300), fuente(400)
    W, H = A4
    c = canvas.Canvas(SALIDA, pagesize=A4)
    c.setTitle('GREY SPACES · Solimán López')
    c.setAuthor('Solimán López · SLStudio')
    m = 22 * mm

    c.setFillColorRGB(*TINTA)
    c.rect(m, H - m - 12 * mm, 3.2 * mm, 12 * mm, fill=1, stroke=0)
    c.setFont(f300, 26); c.drawString(m + 8 * mm, H - m - 9 * mm, 'GREY SPACES')
    c.setFont(f400, 9.5); c.setFillColorRGB(*GRIS)
    c.drawString(m + 8 * mm, H - m - 15 * mm, 'IRIDIA  ·  Solimán López  ·  SLStudio')
    c.drawRightString(W - m, H - m - 9 * mm, 'GREY SPACES EXHIBITION')
    c.drawRightString(W - m, H - m - 15 * mm, 'FOUNDRY · DOWNTOWN DUBAI')

    y = H - m - 40 * mm
    c.setFillColorRGB(*TINTA); c.setFont(f300, 12.5)
    parrafos = [
        'Two parallel copper tubes carry a signal that cannot be seen. Ten grey',
        'blocks hold the line and mark the distance from Earth to asteroid',
        '16 Psyche, from 39.573.000 to 395.730.000 km. The augmented-reality',
        'layer gives the signal back to the room: the field around the line, the',
        'pulse crossing the ten milestones, and the asteroid itself, hanging in',
        'the middle of the work.',
    ]
    for t in parrafos:
        c.drawString(m, y, t); y -= 7.2 * mm

    y -= 6 * mm
    c.setFont(f400, 9); c.setFillColorRGB(*GRIS)
    datos = [
        ('SIGNAL', '8,4 GHz · X band · Deep Space Network'),
        ('MILESTONES', '39.573.000 km × 1 … 10'),
        ('LIGHT TIME', '2 min 12 s  →  22 min 00 s'),
        ('CELESTIAL BODY', '16 Psyche · 278 × 238 × 171 km'),
    ]
    for k, v in datos:
        c.setFillColorRGB(*VERDE); c.drawString(m, y, k)
        c.setFillColorRGB(*TINTA); c.setFont(f300, 11); c.drawString(m + 38 * mm, y, v)
        c.setFont(f400, 9); y -= 7 * mm

    c.setFont(f400, 8.5); c.setFillColorRGB(*GRIS)
    c.drawString(m, m + 4 * mm, 'This is a placeholder. Replace docs/grey-spaces.pdf with the description of the work.')
    c.drawRightString(W - m, m + 4 * mm, 'www.solimanlopez.com  ·  iridia.world')
    c.showPage(); c.save()
    print('ok', os.path.normpath(SALIDA), os.path.getsize(SALIDA) // 1024, 'KB')


if __name__ == '__main__':
    main()
