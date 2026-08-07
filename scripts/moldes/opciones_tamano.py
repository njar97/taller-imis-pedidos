# -*- coding: utf-8 -*-
"""Compara tamanos de arte sobre la pieza real, para elegir por ojo.

    python opciones_tamano.py [talla]     # por defecto la 6

Los archivos que hay en `produccion-300dpi\` miden 8.00 x 0.79 cm el nombre de
manga y 13.38 x 17.50 el pecho. Esos tamanos NO salieron del diseno: salieron
de meter el film abajo de $1. Aca se ven contra la pieza para decidir de
verdad, con el costo de film al lado de cada opcion.

El monograma va al PECHO IZQUIERDO. Ojo: la pieza se dibuja vista por fuera,
asi que el pecho izquierdo de quien la usa cae a la DERECHA del dibujo.
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
ARTES = (r'C:\Users\confe\My Embroidery\_Referencias'
         r'\Albino-Luciani-Intramuros-2026')
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

ESC = 8.0
NUMERICAS = set('2 4 6 8 10 12 14'.split())
LADOS_NUM = {'delantera': 'cuerpo-fila1', 'manga': 'manga-2'}
LADOS_LET = {'delantera': 'cuerpo-fila1', 'manga': 'manga-1'}

ROLLO, PRECIO_M, SEP = 59.0, 15.0, 1.0

MONOGRAMA = 'Logo_Albino-Luciani_escudo-EPAL_recortado.png'
NOMBRE = os.path.join('nombres-manga', 'menta', '6-ano_Alessandro.png')

# anchos a comparar para el monograma de pecho, en cm
OPC_MONOGRAMA = [4.45, 7.0, 9.0, 11.0]
# alturas de letra a comparar para el nombre de manga, en cm
OPC_NOMBRE = [0.79, 1.2, 1.6, 2.2]

TINTA = (35, 35, 45)
COTA = (200, 60, 60)
TELA = (238, 238, 242)


def fuentes():
    return (ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 21),
            ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 15),
            ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 14))


def cargar():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    out = {}
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            out.setdefault(m.group(1), {})[m.group(2)] = d
    return out


def costo_film(ancho, alto):
    por_fila = int((ROLLO + SEP) // (ancho + SEP))
    if por_fila < 1:
        return None, 0
    return (alto + SEP)/por_fila/100.0*PRECIO_M, por_fila


def ancho_a_la_altura(pts, y):
    xs = []
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i+1) % n]
        if (y1 <= y <= y2) or (y2 <= y <= y1):
            if abs(y2-y1) > 1e-9:
                xs.append(x1 + (x2-x1)*(y-y1)/(y2-y1))
    return (min(xs), max(xs)) if len(xs) >= 2 else (0, 0)


def panel(pieza, arte_ruta, ancho_cm, pos, etiqueta, costo, f_tit, f_txt, f_cota):
    w_cm, h_cm = pieza['bbox_cm']
    W, H = int(w_cm*ESC), int(h_cm*ESC)
    img = Image.new('RGB', (W+56, H+118), (255, 255, 255))
    d = ImageDraw.Draw(img)
    ox, oy = 28, 88
    pol = [(ox+px*ESC, oy+py*ESC) for px, py in pieza['puntos']]
    d.polygon(pol, fill=TELA)
    d.line(pol+[pol[0]], fill=TINTA, width=3)

    im = Image.open(arte_ruta).convert('RGBA')
    alto_cm = ancho_cm*im.size[1]/float(im.size[0])
    aw, ah = max(1, int(ancho_cm*ESC)), max(1, int(alto_cm*ESC))
    ax, ay = ox+int(pos[0]*ESC), oy+int(pos[1]*ESC)
    esc_im = im.resize((aw, ah), Image.LANCZOS)
    img.paste(esc_im, (ax, ay), esc_im)
    d.rectangle([ax, ay, ax+aw, ay+ah], outline=COTA, width=2)

    d.text((28, 14), etiqueta, font=f_tit, fill=TINTA)
    d.text((28, 40), '%.2f x %.2f cm' % (ancho_cm, alto_cm), font=f_txt, fill=COTA)
    d.text((28, 60), costo, font=f_txt, fill=(90, 90, 100))
    return img


def main():
    talla = sys.argv[1] if len(sys.argv) > 1 else '6'
    piezas = cargar()[talla]
    lados = LADOS_NUM if talla in NUMERICAS else LADOS_LET
    delantera = piezas[lados['delantera']]
    manga = piezas[lados['manga']]
    f_tit, f_txt, f_cota = fuentes()

    w_cm, h_cm = delantera['bbox_cm']
    # el pecho izquierdo cae a la derecha del dibujo (vemos la pieza por fuera).
    # se coloca 8 cm bajo el hombro y centrado en el medio de ese lado.
    y_logo = 8.0
    x0, x1 = ancho_a_la_altura(delantera['puntos'], y_logo)
    centro_lado = (w_cm/2.0 + x1)/2.0

    filas = []
    for a in OPC_MONOGRAMA:
        c, pf = costo_film(a, a*1.023)
        filas.append(panel(delantera, os.path.join(ARTES, MONOGRAMA), a,
                           (centro_lado-a/2.0, y_logo),
                           'monograma %.1f cm' % a,
                           '$%.3f de film · %d por fila' % (c, pf),
                           f_tit, f_txt, f_cota))
    im_n = Image.open(os.path.join(ARTES, NOMBRE))
    rel = im_n.size[0]/float(im_n.size[1])
    mw, mh = manga['bbox_cm']
    for alto in OPC_NOMBRE:
        anc = alto*rel
        c, pf = costo_film(anc, alto)
        filas.append(panel(manga, os.path.join(ARTES, NOMBRE), anc,
                           ((mw-anc)/2.0, mh-3.0-alto),
                           'nombre letra %.1f cm' % alto,
                           '$%.3f de film · %d por fila' % (c, pf),
                           f_tit, f_txt, f_cota))

    cols = 4
    cw = max(p.size[0] for p in filas[:4])
    ch1 = max(p.size[1] for p in filas[:4])
    ch2 = max(p.size[1] for p in filas[4:])
    out = Image.new('RGB', (cw*cols+40, ch1+ch2+150), (255, 255, 255))
    d = ImageDraw.Draw(out)
    d.text((24, 18), 'EPAL · talla %s · QUE TAMANO DEBE TENER CADA ARTE' % talla,
           font=f_tit, fill=TINTA)
    d.text((24, 46), 'El primero de cada fila es lo que hay hoy en produccion-300dpi. '
                     'Los otros tres son para comparar.', font=f_txt, fill=(120, 120, 130))
    d.text((24, 68), 'MONOGRAMA: va al pecho IZQUIERDO de quien la usa; como vemos la '
                     'pieza por fuera, se dibuja a la derecha.', font=f_txt, fill=(170, 90, 60))
    for i, p in enumerate(filas[:4]):
        out.paste(p, (20+i*cw, 96))
    for i, p in enumerate(filas[4:]):
        out.paste(p, (20+i*cw, 96+ch1+40))
    out.save('opciones-tamano_talla-%s.png' % talla)
    print('-> opciones-tamano_talla-%s.png' % talla)


if __name__ == '__main__':
    main()
