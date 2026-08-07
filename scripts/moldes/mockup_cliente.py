# -*- coding: utf-8 -*-
"""Mockup para aprobacion del cliente: la prenda, en flat lay sobre fondo limpio.

    python mockup_cliente.py            # los 3 colores, frente y espalda

No es una escena ni un modelo: es la camiseta sola, que es lo que el cliente
tiene que aprobar. La silueta sale de las medidas reales del molde (talla 6),
asi que el arte se ve al tamano que de verdad va a quedar.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

import ubicacion_artes as UA

TALLA = '6'
ESC = 15.0                      # px por cm
FONDO = (247, 247, 250)

COLORES = [
    ('VERDE',    (74, 150, 95),  22),
    ('CELESTE',  (126, 190, 226), 18),
    ('AMARILLO', (240, 212, 88), 18),
]

NEGRO = (32, 32, 40)
GRIS = (122, 122, 136)


def fnt(nombre, tam):
    return ImageFont.truetype(r'C:\Windows\Fonts\%s' % nombre, tam)


def silueta(w, h, esc_prof, manga_largo, manga_boca):
    """Contorno de la camiseta armada, en cm, origen arriba-izquierda.

    El molde es la pieza PLANA; la prenda cosida se ve distinta (la manga sale
    del cuerpo). Aca se arma la silueta con las proporciones del molde: ancho de
    pecho, largo, profundidad de escote y largo de manga son los reales.
    """
    cx = w/2.0
    nw = w*0.30                 # ancho del escote
    hombro_x = w*0.44           # del centro al punto de hombro
    hombro_y = h*0.045
    sisa_y = h*0.30             # donde la manga se junta con el cuerpo
    cintura = w*0.485           # medio ancho en el ruedo (leve entalle)

    izq = []
    # escote: del centro hacia la izquierda, curva suave
    for i in range(13):
        t = i/12.0
        izq.append((cx - nw/2.0*t, esc_prof*(1-t*t)))
    # hombro
    izq.append((cx-hombro_x, hombro_y))
    # manga: baja y se abre
    izq.append((cx-hombro_x-manga_largo*0.58, hombro_y+manga_largo*0.60))
    izq.append((cx-hombro_x-manga_largo*0.46, hombro_y+manga_largo*0.60+manga_boca))
    # de la boca de la manga a la sisa
    izq.append((cx-w*0.47, sisa_y+manga_boca*0.35))
    # costado con leve entalle
    izq.append((cx-cintura, h*0.62))
    izq.append((cx-cintura, h))
    pts = izq + [(2*cx-x, y) for x, y in reversed(izq)]
    return pts


def prenda(color, vista, arte_ruta, arte_ancho, arte_f, arte_c, piezas):
    """Dibuja una camiseta con su arte. arte_f = del escote al EJE del arte."""
    lados = UA.LADOS_NUM if TALLA in UA.NUMERICAS else UA.LADOS_LET
    cuerpo = piezas[lados['delantera' if vista == 'frente' else 'espalda']]
    manga = piezas[lados['manga']]
    w, h = cuerpo['bbox_cm']
    esc_prof = UA.escote_de(cuerpo)
    m_largo, m_boca = manga['bbox_cm'][1], manga['bbox_cm'][1]*0.30

    pts = silueta(w, h, esc_prof, m_largo, m_boca)
    minx = min(p[0] for p in pts)
    maxx = max(p[0] for p in pts)
    W = int((maxx-minx)*ESC)+80
    H = int(h*ESC)+80

    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px = [((x-minx)*ESC+40, y*ESC+40) for x, y in pts]

    # sombra suave para que se lea como prenda y no como calcomania
    som = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(som).polygon([(x+7, y+9) for x, y in px], fill=(0, 0, 0, 46))
    img.alpha_composite(som.filter(ImageFilter.GaussianBlur(9)))

    d.polygon(px, fill=color+(255,))
    d.line(px+[px[0]], fill=tuple(max(0, c-52) for c in color)+(255,), width=3)

    # ribete del cuello: la misma curva del escote, un poco mas abierta y honda
    cx = (w/2.0-minx)*ESC+40
    nw = w*0.30
    borde = tuple(max(0, c-52) for c in color)+(255,)
    rib = []
    for i in range(25):
        t = (i/24.0)*2-1                      # de -1 a 1, izquierda a derecha
        rib.append((cx + nw/2.0*1.12*t*ESC,
                    ((esc_prof+1.0)*(1-t*t))*ESC+40))
    d.line(rib, fill=borde, width=5, joint='curve')

    # el arte
    im = Image.open(arte_ruta).convert('RGBA')
    alto = arte_ancho*im.size[1]/float(im.size[0])
    aw, ah = int(arte_ancho*ESC), int(alto*ESC)
    eje_y = (esc_prof + arte_f)*ESC + 40
    eje_x = cx + arte_c*ESC
    esc_im = im.resize((aw, ah), Image.LANCZOS)
    img.alpha_composite(esc_im, (int(eje_x-aw/2), int(eje_y-ah/2)))
    return img


def main():
    piezas = UA.cargar()[TALLA]
    lados = UA.LADOS_NUM if TALLA in UA.NUMERICAS else UA.LADOS_LET
    delantera = piezas[lados['delantera']]
    espalda = piezas[lados['espalda']]

    # las mismas alturas de la ficha de taller (regla proporcional)
    b_m = UA.b_de('monograma', delantera, 'proporcional')
    im_m = Image.open(os.path.join(UA.ARTES, UA.MONOGRAMA_PNG))
    alto_m = UA.ANCHO_MONOGRAMA*im_m.size[1]/float(im_m.size[0])
    f_m = b_m + alto_m/2.0
    _, x_der = UA.orilla_a_la_altura(delantera['puntos'],
                                     UA.escote_de(delantera)+b_m)
    c_m = (x_der - delantera['bbox_cm'][0]/2.0)/2.0

    b_e = UA.b_de('espalda', espalda, 'proporcional')
    im_e = Image.open(os.path.join(UA.ARTES, UA.ESPALDA_PNG))
    alto_e = UA.ANCHO_ESPALDA*im_e.size[1]/float(im_e.size[0])
    f_e = b_e + alto_e/2.0

    filas = []
    for nombre, rgb, cant in COLORES:
        frente = prenda(rgb, 'frente', os.path.join(UA.ARTES, UA.MONOGRAMA_PNG),
                        UA.ANCHO_MONOGRAMA, f_m, c_m, piezas)
        atras = prenda(rgb, 'espalda', os.path.join(UA.ARTES, UA.ESPALDA_PNG),
                       UA.ANCHO_ESPALDA, f_e, 0.0, piezas)
        filas.append((nombre, cant, frente, atras))

    cw = max(f[2].size[0] for f in filas)
    ch = max(f[2].size[1] for f in filas)
    pad_x, pad_y, cab = 70, 60, 150
    W = 160 + 2*cw + pad_x
    H = cab + len(filas)*(ch+pad_y) + 250
    out = Image.new('RGB', (W, H), FONDO)
    d = ImageDraw.Draw(out)
    d.text((60, 44), 'Camisetas Intramuros 2026', font=fnt('arialbd.ttf', 46), fill=NEGRO)
    d.text((60, 100), 'Escuela Parvularia "Albino Luciani"  ·  propuesta para aprobacion',
           font=fnt('arial.ttf', 30), fill=GRIS)

    for i, (nombre, cant, frente, atras) in enumerate(filas):
        y = cab + i*(ch+pad_y)
        d.text((60, y+ch//2-40), nombre, font=fnt('arialbd.ttf', 32), fill=NEGRO)
        d.text((60, y+ch//2+4), '%d camisetas' % cant, font=fnt('arial.ttf', 28), fill=GRIS)
        out.paste(frente, (170, y), frente)
        out.paste(atras, (170+cw+pad_x//2, y), atras)

    y = cab + len(filas)*(ch+pad_y) - 20
    d.text((170, y), 'frente', font=fnt('arialbd.ttf', 30), fill=GRIS)
    d.text((170+cw+pad_x//2, y), 'espalda', font=fnt('arialbd.ttf', 30), fill=GRIS)

    # La manga no se dibuja, se menciona: dibujarla obligaria a agrandar el
    # nombre para que se lea y quedaria fuera de escala contra el resto.
    y += 62
    d.line([(60, y), (W-60, y)], fill=(214, 214, 224), width=2)
    d.text((60, y+26), 'Ademas, en la manga:', font=fnt('arialbd.ttf', 34), fill=NEGRO)
    for i, t in enumerate([
            'el NOMBRE DE CADA ALUMNO, estampado, en letra de 1 cm de alto;',
            'cada camiseta lleva el suyo, asi que ninguna se repite.']):
        d.text((60, y+76+i*44), t, font=fnt('arial.ttf', 32), fill=GRIS)
    out.save('MOCKUP-CLIENTE_EPAL-Intramuros-2026.png')
    print('-> MOCKUP-CLIENTE_EPAL-Intramuros-2026.png  %s' % (out.size,))


if __name__ == '__main__':
    main()
