# -*- coding: utf-8 -*-
"""Trazo (marcada) de un pedido de camisetas, con el contorno real.

    python marcada.py                 # pedido 60 (EPAL), 180 cm
    python marcada.py --ancho 150
    python marcada.py --cajas         # el trazo por cajas, para comparar

Acomoda las piezas en el ancho de la tela y dice cuantos metros salen.
Dibuja el contorno de verdad, no la caja: eso era lo que hacia que el trazo
saliera como un tablero de cuadros.

Reglas que respeta:
  * tela de punto -> hilo vertical: las piezas giran 0 o 180 grados, NUNCA 90;
  * separacion minima entre piezas configurable (por defecto 1 cm);
  * cada color va en su propio trazo (no se comparte tela entre colores).

El resultado es un piso realista, no un milagro: sigue siendo un acomodo
automatico y una marcada hecha a mano por alguien con oficio puede mejorarlo.
"""
import argparse
import json
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import fftconvolve

AQUI = os.path.dirname(os.path.abspath(__file__))
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

RES = 2.0            # celdas por cm
SEP_CM = 1.0         # separacion entre piezas
YARDA = 91.44

NUMERICAS = set('2 4 6 8 10 12 14'.split())
RECETA_NUM = [('cuerpo-fila1', 1), ('cuerpo-fila4', 1), ('manga-2', 2), ('tira-cuello', 1)]
RECETA_LET = [('cuerpo-fila1', 1), ('cuerpo-fila3', 1), ('manga-1', 2), ('tira-cuello', 1)]

# pedido 60 (EPAL): seccion -> color, y las tallas de cada seccion.
# Alisson va a la medida y no entra en el trazo.
PEDIDO_60 = {
    'verde':    {'4': 7, '6': 6, '8': 5, '10': 1, '12': 1, 'M': 2},
    'celeste':  {'4': 1, '6': 8, '8': 3, '10': 2, '14': 1, 'M': 2},
    'amarillo': {'4': 11, '6': 3, '10': 2, '12': 1, 'XXL': 1},
}
TELA = {'verde': (120, 175, 120), 'celeste': (140, 190, 220),
        'amarillo': (235, 220, 130)}


def cargar():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    por_talla = {}
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            por_talla.setdefault(m.group(1), {})[m.group(2)] = d
    return por_talla


def mascara(pieza, cajas=False):
    """Rasteriza la pieza. Devuelve (mask bool, poligono en celdas)."""
    pol = [(x*RES, y*RES) for x, y in pieza['puntos']]
    w = int(np.ceil(max(p[0] for p in pol))) + 1
    h = int(np.ceil(max(p[1] for p in pol))) + 1
    img = Image.new('1', (w, h), 0)
    if cajas:
        ImageDraw.Draw(img).rectangle([0, 0, w-1, h-1], fill=1)
    else:
        ImageDraw.Draw(img).polygon(pol, fill=1)
    m = np.array(img, dtype=bool)
    # margen de separacion: se engorda la mascara con la que se busca hueco
    pad = int(round(SEP_CM*RES))
    gordo = np.zeros((h+2*pad, w+2*pad), dtype=bool)
    for dy in range(2*pad+1):
        for dx in range(2*pad+1):
            gordo[dy:dy+h, dx:dx+w] |= m
    return m, gordo, pol, pad


def acomodar(piezas, ancho_cm, cajas=False):
    """Bottom-left con colision real. piezas = [(etiqueta, dato)]."""
    W = int(round(ancho_cm*RES))
    # las mas grandes primero; las chicas despues rellenan huecos
    orden = sorted(piezas, key=lambda p: -p[1]['area_cm2'])
    area = sum(p[1]['area_cm2'] for p in piezas)
    H = int(round((area/ancho_cm)*2.6*RES)) + 400      # con aire de sobra
    grid = np.zeros((H, W), dtype=np.float32)
    techo = 0
    puestas = []

    for etiqueta, dato in orden:
        m0, gordo0, pol0, pad = mascara(dato, cajas)
        # tela de punto: se puede voltear 180 grados (el hilo sigue vertical),
        # nunca 90. Voltear es lo que deja encajar hombro con hombro.
        variantes = [(gordo0, pol0, False)]
        alto0 = max(p[1] for p in pol0)
        ancho0 = max(p[0] for p in pol0)
        variantes.append((gordo0[::-1, ::-1].copy(),
                          [(ancho0-px, alto0-py) for px, py in pol0], True))

        mejor = None
        for gordo, pol, volteada in variantes:
            gh, gw = gordo.shape
            if gw > W:
                raise SystemExit('la pieza %s (%.1f cm) no cabe en %s cm'
                                 % (etiqueta, gw/RES, ancho_cm))
            lim = min(H, techo + gh + int(60*RES))
            conv = fftconvolve(grid[:lim],
                               gordo[::-1, ::-1].astype(np.float32), mode='valid')
            libre = conv < 0.5
            if not libre.any():
                continue
            ys, xs = np.nonzero(libre)
            i = np.lexsort((xs, ys))[0]      # el mas arriba, y a la izquierda
            y, x = int(ys[i]), int(xs[i])
            # gana la que deja el borde de abajo mas arriba
            puntaje = (y+gh, y, x)
            if mejor is None or puntaje < mejor[0]:
                mejor = (puntaje, gordo, pol, x, y, volteada)
        if mejor is None:
            raise SystemExit('sin lugar para %s' % etiqueta)

        _, gordo, pol, x, y, volteada = mejor
        gh, gw = gordo.shape
        grid[y:y+gh, x:x+gw] = np.maximum(grid[y:y+gh, x:x+gw], gordo)
        techo = max(techo, y+gh)
        puestas.append((etiqueta, pol, x+pad, y+pad, volteada))

    largo_cm = techo/RES
    return puestas, largo_cm


def dibujar(puestas, ancho_cm, largo_cm, color, titulo, salida):
    esc = 2.2                     # px por cm en el dibujo
    W = int(ancho_cm*esc)
    H = int(largo_cm*esc)
    img = Image.new('RGB', (W+240, H+150), (250, 250, 252))
    d = ImageDraw.Draw(img)
    ox, oy = 120, 110
    d.rectangle([ox, oy, ox+W, oy+H], fill=TELA.get(color, (200, 200, 200)),
                outline=(70, 70, 80))

    for etiqueta, pol, x, y, _ in puestas:
        pts = [(ox + (x+px)/RES*esc, oy + (y+py)/RES*esc) for px, py in pol]
        d.polygon(pts, fill=(255, 255, 255), outline=(40, 40, 50))
        d.line(pts+[pts[0]], fill=(40, 40, 50), width=1)

    try:
        f = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 26)
        fp = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 19)
    except OSError:
        f = fp = ImageFont.load_default()
    d.text((ox, 30), titulo, font=f, fill=(20, 20, 25))
    d.text((ox, 66), '%.0f cm de ancho  ·  %.2f m de largo  ·  %.1f yd'
           % (ancho_cm, largo_cm/100.0, largo_cm/YARDA), font=fp, fill=(60, 60, 70))

    # regla en metros por la orilla
    for mcm in range(0, int(largo_cm)+1, 50):
        yy = oy + mcm*esc
        d.line([(ox-12, yy), (ox, yy)], fill=(70, 70, 80), width=2)
        if mcm % 100 == 0:
            d.text((14, yy-11), '%.0f m' % (mcm/100.0), font=fp, fill=(60, 60, 70))
    img.save(salida)
    return salida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ancho', type=float, default=180.0)
    ap.add_argument('--cajas', action='store_true')
    args = ap.parse_args()

    por_talla = cargar()
    total = 0.0
    print('TRAZO %s  ·  tela de %.0f cm\n'
          % ('POR CAJAS' if args.cajas else 'POR CONTORNO REAL', args.ancho))
    for color, tallas in PEDIDO_60.items():
        piezas = []
        for talla, n in tallas.items():
            receta = RECETA_NUM if talla in NUMERICAS else RECETA_LET
            for pieza, k in receta:
                for _ in range(n*k):
                    piezas.append(('%s-%s' % (talla, pieza), por_talla[talla][pieza]))
        puestas, largo = acomodar(piezas, args.ancho, args.cajas)
        total += largo
        prendas = sum(tallas.values())
        sufijo = '_cajas' if args.cajas else ''
        arch = 'trazo_%s_%.0fcm%s.png' % (color, args.ancho, sufijo)
        dibujar(puestas, args.ancho, largo, color,
                'EPAL · %s · %d camisetas' % (color.upper(), prendas), arch)
        print('  %-9s %2d camisetas · %3d piezas · %6.2f m · %5.1f yd  -> %s'
              % (color, prendas, len(piezas), largo/100.0, largo/YARDA, arch))

    print('\n  TOTAL %.2f m = %.1f yd' % (total/100.0, total/YARDA))


if __name__ == '__main__':
    main()
