# -*- coding: utf-8 -*-
"""Norma de la casa: a que altura va un arte segun la talla.

    python estandar_ubicacion.py            # tabla en pantalla + PNG

Saca la tabla de las dos reglas para que se elija una y quede fija. Aplica a
cualquier prenda cuyos moldes esten en `taller_moldes` con contorno: camiseta
hoy, filipina cuando se trace.

# El problema que resuelve

«5 cm bajo el escote» dicho asi no significa lo mismo en una talla 2 que en una
XXL: la talla 2 mide 42 cm de alto y la XXL 85. Con la misma cifra, en la chica
el arte queda proporcionalmente mucho mas abajo.

# Las dos salidas

  FIJA          un solo numero para todo el rango. El taller no consulta nada.
  PROPORCIONAL  un porcentaje del alto de la pieza, redondeado a 0.5 cm para
                que se pueda medir con cinta. Se ve parejo en todas las tallas,
                pero el taller necesita esta tabla pegada en la pared.

Los porcentajes salen de mirar donde cae hoy el arte en las tallas del medio
(la 6 y la 8), que son las que ya se vieron bien, y estirar de ahi.
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

ORDEN = ['2', '4', '6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
NUMERICAS = set('2 4 6 8 10 12 14'.split())
DELANTERA = 'cuerpo-fila1'
ESPALDA = {'num': 'cuerpo-fila4', 'let': 'cuerpo-fila3'}
MANGA = {'num': 'manga-2', 'let': 'manga-1'}

# (B fijo, fraccion del alto de la pieza)
REGLAS = {'monograma de pecho': (5.0, 0.105),
          'arte de espalda': (6.0, 0.125)}
MANGA_DEL_RUEDO = 4.0


def cargar():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    out = {}
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            out.setdefault(m.group(1), {})[m.group(2)] = d
    return out


def escote_de(pieza):
    ancho = pieza['bbox_cm'][0]
    centro = [p for p in pieza['puntos'] if abs(p[0]-ancho/2.0) < ancho*0.06]
    return min(centro, key=lambda p: p[1])[1] if centro else 0.0


def al_medio(v):
    return round(v*2)/2.0


def tabla(piezas):
    filas = []
    for t in ORDEN:
        if t not in piezas:
            continue
        fam = 'num' if t in NUMERICAS else 'let'
        d = piezas[t][DELANTERA]
        e = piezas[t][ESPALDA[fam]]
        alto_d = d['bbox_cm'][1]
        esc = escote_de(d)
        fila = {'talla': t, 'alto': alto_d, 'escote': esc}
        for arte, (fijo, frac) in REGLAS.items():
            base = piezas[t][DELANTERA if 'pecho' in arte else ESPALDA[fam]]
            fila[arte] = (fijo, al_medio(base['bbox_cm'][1]*frac))
        fila['manga'] = MANGA_DEL_RUEDO
        filas.append(fila)
    return filas


def imprimir(filas):
    print('%-6s %7s %7s | %-18s | %-18s' % ('talla', 'alto', 'escote',
                                            'B monograma', 'B espalda'))
    print('%-6s %7s %7s | %8s %9s | %8s %9s'
          % ('', 'cm', 'cm', 'fija', 'proporc.', 'fija', 'proporc.'))
    print('-'*72)
    for f in filas:
        print('%-6s %7.1f %7.1f | %8.1f %9.1f | %8.1f %9.1f'
              % (f['talla'], f['alto'], f['escote'],
                 f['monograma de pecho'][0], f['monograma de pecho'][1],
                 f['arte de espalda'][0], f['arte de espalda'][1]))
    print('\nnombre de manga: %.1f cm del ruedo, centrado, en todas las tallas'
          % MANGA_DEL_RUEDO)


def png(filas, salida='ESTANDAR_ubicacion-artes.png'):
    tit = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 30)
    sub = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 17)
    cab = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 17)
    mono = ImageFont.truetype(r'C:\Windows\Fonts\consolab.ttf', 19)

    ancho, alto_fila = 960, 34
    img = Image.new('RGB', (ancho, 250+len(filas)*alto_fila), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((40, 28), 'NORMA DE UBICACION DE ARTES — camiseta', font=tit,
           fill=(30, 30, 40))
    d.text((40, 70), 'B = del filo del escote al borde superior del arte. '
                     'C = centrado salvo el monograma.', font=sub, fill=(110, 110, 125))
    d.text((40, 94), 'El nombre de manga va a %.1f cm del ruedo, centrado, en '
                     'todas las tallas.' % MANGA_DEL_RUEDO, font=sub, fill=(110, 110, 125))

    y0 = 146
    cols = [40, 150, 250, 380, 500, 650, 790]
    d.text((cols[0], y0), 'talla', font=cab, fill=(30, 30, 40))
    d.text((cols[1], y0), 'alto', font=cab, fill=(30, 30, 40))
    d.text((cols[2], y0), 'escote', font=cab, fill=(30, 30, 40))
    d.text((cols[3], y0), 'B monograma', font=cab, fill=(30, 30, 40))
    d.text((cols[5], y0), 'B espalda', font=cab, fill=(30, 30, 40))
    d.text((cols[3], y0+20), 'fija   proporc.', font=sub, fill=(140, 140, 155))
    d.text((cols[5], y0+20), 'fija   proporc.', font=sub, fill=(140, 140, 155))
    d.line([(40, y0+46), (ancho-40, y0+46)], fill=(60, 60, 75), width=2)

    for i, f in enumerate(filas):
        y = y0+58+i*alto_fila
        if i % 2:
            d.rectangle([36, y-6, ancho-36, y+alto_fila-10], fill=(246, 246, 249))
        d.text((cols[0], y), f['talla'], font=mono, fill=(30, 30, 40))
        d.text((cols[1], y), '%.1f' % f['alto'], font=mono, fill=(90, 90, 105))
        d.text((cols[2], y), '%.1f' % f['escote'], font=mono, fill=(90, 90, 105))
        d.text((cols[3], y), '%.1f' % f['monograma de pecho'][0], font=mono, fill=(30, 30, 40))
        d.text((cols[4], y), '%.1f' % f['monograma de pecho'][1], font=mono, fill=(196, 52, 52))
        d.text((cols[5], y), '%.1f' % f['arte de espalda'][0], font=mono, fill=(30, 30, 40))
        d.text((cols[6], y), '%.1f' % f['arte de espalda'][1], font=mono, fill=(196, 52, 52))
    img.save(salida)
    print('\n-> %s' % salida)


if __name__ == '__main__':
    filas = tabla(cargar())
    imprimir(filas)
    png(filas)
