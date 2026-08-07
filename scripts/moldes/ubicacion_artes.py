# -*- coding: utf-8 -*-
"""Ficha de ubicacion de artes sobre las piezas cortadas, acotada de verdad.

    python ubicacion_artes.py                  # tallas 4, 6 y M
    python ubicacion_artes.py 2 8 XXL
    python ubicacion_artes.py --regla proporcional

Sirve para cualquier pedido, no solo para EPAL: se cambian los artes en ARTES_*
y la regla de altura en REGLAS. La misma norma aplica a un bordado de filipina.

# La norma de la casa

Todo se referencia a landmarks que el operario TIENE ENFRENTE en la pieza ya
cortada:

  * `linea de hombro` — la orilla de arriba de la pieza (el punto mas alto).
  * `filo del escote`  — el punto mas bajo de la curva del cuello, al centro.
  * `centro`           — el eje vertical de la pieza.
  * `ruedo`            — la orilla de abajo (en la manga).

De ahi salen 5 cotas por arte, que es lo que se pone en la ficha de taller:

  A  hombro  -> borde superior del arte
  B  escote  -> borde superior del arte
  C  centro  -> centro del arte (horizontal; 0 = centrado)
  D  ancho del arte
  E  alto del arte

# Las dos reglas posibles para B

  'fija'          el mismo B en todas las tallas. Facil de dictar al taller,
                  pero en la talla 2 el arte queda proporcionalmente mas abajo
                  que en la XXL.
  'proporcional'  B = un porcentaje del alto de la pieza, redondeado a 0.5 cm.
                  Se ve parejo en todo el rango; el taller necesita la tabla.

`estandar_ubicacion.py` saca la tabla por talla de las dos, para elegir.
"""
import argparse
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
ARTES = (r'C:\Users\confe\My Embroidery\_Referencias'
         r'\Albino-Luciani-Intramuros-2026')
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

ESC = 10.0
NUMERICAS = set('2 4 6 8 10 12 14'.split())
LADOS_NUM = {'delantera': 'cuerpo-fila1', 'espalda': 'cuerpo-fila4', 'manga': 'manga-2'}
LADOS_LET = {'delantera': 'cuerpo-fila1', 'espalda': 'cuerpo-fila3', 'manga': 'manga-1'}

# ─── medidas reales, de la hoja de Canva DAHQx96jQEE (90 x 100 cm a 96 dpi) ──
ANCHO_ESPALDA = 21.37          # 807.73 x 677.61 px girada 90 -> 21.37 x 17.93
ANCHO_MONOGRAMA = 6.82         # 257.77 x 264.71 px           ->  6.82 x  7.00
ANCHO_NOMBRE = 9.76            # 368.996 x 92.151 px          ->  9.76 x  2.44
# ⚠ los PNG de produccion-300dpi\ estan CHICOS: se dimensionaron para meter el
# film abajo de $1 en un rollo de 59 cm. No usarlos como medida.

REGLAS = {
    # arte: (B fijo en cm, fraccion del alto de la pieza)
    'monograma': (5.0, 0.105),
    'espalda':   (6.0, 0.125),
}
NOMBRE_DEL_RUEDO = 4.0         # pedido por el usuario el 6-ago (era 3.0)

ESPALDA_PNG = 'Arte_Albino-Luciani_ESPALDA_ninos.png'
MONOGRAMA_PNG = 'Logo_Albino-Luciani_escudo-EPAL_recortado.png'

TINTA = (35, 35, 45)
COTA = (196, 52, 52)
AUX = (128, 132, 150)
TELA = (238, 238, 242)


def fuentes():
    return (ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 22),
            ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 16),
            ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 15),
            ImageFont.truetype(r'C:\Windows\Fonts\consolab.ttf', 16))


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


def orilla_a_la_altura(pts, y):
    xs = []
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i+1) % n]
        if ((y1 <= y <= y2) or (y2 <= y <= y1)) and abs(y2-y1) > 1e-9:
            xs.append(x1 + (x2-x1)*(y-y1)/(y2-y1))
    return (min(xs), max(xs)) if len(xs) >= 2 else (0, 0)


def b_de(arte, pieza, regla):
    fijo, frac = REGLAS[arte]
    if regla == 'fija':
        return fijo
    return round(pieza['bbox_cm'][1]*frac*2)/2.0     # al 0.5 cm


# ─── dibujo ─────────────────────────────────────────────────────────────────
def punteada(d, p0, p1, color=AUX, paso=12):
    x0, y0 = p0
    x1, y1 = p1
    largo = max(abs(x1-x0), abs(y1-y0))
    if largo < 1:
        return
    n = int(largo//paso)
    for i in range(0, n, 2):
        a = i/float(max(n, 1))
        b = min(1.0, (i+1)/float(max(n, 1)))
        d.line([(x0+(x1-x0)*a, y0+(y1-y0)*a),
                (x0+(x1-x0)*b, y0+(y1-y0)*b)], fill=color, width=1)


def cota_v(d, x, y0, y1, texto, f, lado=1):
    if abs(y1-y0) < 2:
        return
    d.line([(x, y0), (x, y1)], fill=COTA, width=2)
    for y in (y0, y1):
        d.line([(x-6, y), (x+6, y)], fill=COTA, width=2)
    ancho = d.textlength(texto, font=f)
    tx = x+10 if lado > 0 else x-10-ancho
    d.text((tx, (y0+y1)/2-9), texto, font=f, fill=COTA)


def cota_h(d, y, x0, x1, texto, f, arriba=True):
    if abs(x1-x0) < 2:
        return
    d.line([(x0, y), (x1, y)], fill=COTA, width=2)
    for x in (x0, x1):
        d.line([(x, y-6), (x, y+6)], fill=COTA, width=2)
    ancho = d.textlength(texto, font=f)
    d.text(((x0+x1)/2-ancho/2, y-24 if arriba else y+8), texto, font=f, fill=COTA)


def panel(pieza, titulo, arte, fs):
    """arte = dict(ruta, ancho, b|desde_ruedo, c) — c=0 es centrado."""
    f_tit, f_txt, f_cota, f_mono = fs
    w_cm, h_cm = pieza['bbox_cm']
    W, H = int(w_cm*ESC), int(h_cm*ESC)
    ox, oy = 150, 108
    marg_der, marg_bot = 250, 210
    img = Image.new('RGB', (W+ox+marg_der, H+oy+marg_bot), (255, 255, 255))
    d = ImageDraw.Draw(img)

    pol = [(ox+px*ESC, oy+py*ESC) for px, py in pieza['puntos']]
    d.polygon(pol, fill=TELA)
    d.line(pol+[pol[0]], fill=TINTA, width=3)
    d.text((ox, 20), titulo, font=f_tit, fill=TINTA)
    d.text((ox, 50), 'pieza %.1f x %.1f cm' % (w_cm, h_cm), font=f_txt, fill=AUX)

    im = Image.open(arte['ruta']).convert('RGBA')
    ancho = arte['ancho']
    alto = ancho*im.size[1]/float(im.size[0])
    aw, ah = max(1, int(ancho*ESC)), max(1, int(alto*ESC))

    cx_cm = w_cm/2.0
    centro_arte_cm = cx_cm + arte.get('c', 0.0)
    ax = ox + int((centro_arte_cm - ancho/2.0)*ESC)
    if arte.get('desde_ruedo') is not None:
        top_cm = h_cm - arte['desde_ruedo'] - alto
    else:
        top_cm = escote_de(pieza) + arte['b']
    ay = oy + int(top_cm*ESC)

    # landmarks
    esc_y = oy + int(escote_de(pieza)*ESC)
    cx = ox + int(cx_cm*ESC)
    punteada(d, (ox-40, oy), (ox+W+40, oy))
    d.text((ox-146, oy-9), 'hombro', font=f_cota, fill=AUX)
    if arte.get('desde_ruedo') is None:
        punteada(d, (ox-40, esc_y), (ox+W+40, esc_y))
        d.text((ox-146, esc_y-9), 'escote', font=f_cota, fill=AUX)
    else:
        punteada(d, (ox-40, oy+H), (ox+W+40, oy+H))
        d.text((ox-146, oy+H-9), 'ruedo', font=f_cota, fill=AUX)
    punteada(d, (cx, oy-30), (cx, oy+H+30))
    d.text((cx-24, oy+H+34), 'centro', font=f_cota, fill=AUX)

    esc_im = im.resize((aw, ah), Image.LANCZOS)
    img.paste(esc_im, (ax, ay), esc_im)
    d.rectangle([ax, ay, ax+aw, ay+ah], outline=COTA, width=2)
    # cruz en el centro del arte
    mx, my = ax+aw//2, ay+ah//2
    d.line([(mx-11, my), (mx+11, my)], fill=COTA, width=1)
    d.line([(mx, my-11), (mx, my+11)], fill=COTA, width=1)

    # cotas
    if arte.get('desde_ruedo') is None:
        cota_v(d, ox+W+38, oy, ay, 'A %.1f' % ((ay-oy)/ESC), f_cota)
        cota_v(d, ox+W+120, esc_y, ay, 'B %.1f' % ((ay-esc_y)/ESC), f_cota)
    else:
        cota_v(d, ox+W+38, ay+ah, oy+H, 'A %.1f' % arte['desde_ruedo'], f_cota)
    cota_v(d, ax-22, ay, ay+ah, 'E %.2f' % alto, f_cota, lado=-1)
    cota_h(d, ay-18, ax, ax+aw, 'D %.2f' % ancho, f_cota)
    if abs(arte.get('c', 0.0)) > 0.05:
        # va debajo del arte para no encimarse con la cota del alto
        punteada(d, (mx, my), (mx, ay+ah+28), color=COTA, paso=8)
        cota_h(d, ay+ah+28, cx, mx, 'C %.1f' % abs(arte['c']), f_cota, arriba=False)

    # tabla de la ficha
    ty = oy+H+58
    filas = [('D  ancho del arte', '%.2f cm' % ancho),
             ('E  alto del arte', '%.2f cm' % alto)]
    if arte.get('desde_ruedo') is None:
        filas = [('A  hombro -> arte', '%.1f cm' % ((ay-oy)/ESC)),
                 ('B  escote -> arte', '%.1f cm' % ((ay-esc_y)/ESC)),
                 ('C  centro -> arte', 'centrado' if abs(arte.get('c', 0)) < 0.05
                  else '%.1f cm' % abs(arte['c']))] + filas
    else:
        filas = [('A  ruedo -> arte', '%.1f cm' % arte['desde_ruedo']),
                 ('C  centro -> arte', 'centrado')] + filas
    for i, (k, v) in enumerate(filas):
        d.text((ox, ty+i*22), k, font=f_mono, fill=(70, 70, 82))
        d.text((ox+230, ty+i*22), v, font=f_mono, fill=TINTA)
    return img


def ficha(talla, piezas, regla):
    fs = fuentes()
    lados = LADOS_NUM if talla in NUMERICAS else LADOS_LET
    delantera = piezas[lados['delantera']]
    w_del = delantera['bbox_cm'][0]

    b_mono = b_de('monograma', delantera, regla)
    _, x_der = orilla_a_la_altura(delantera['puntos'], escote_de(delantera)+b_mono)
    # el monograma va a media distancia entre el centro y la sisa
    c_mono = (x_der - w_del/2.0)/2.0

    paneles = [
        panel(delantera, 'DELANTERA — monograma, pecho izquierdo',
              {'ruta': os.path.join(ARTES, MONOGRAMA_PNG), 'ancho': ANCHO_MONOGRAMA,
               'b': b_mono, 'c': c_mono}, fs),
        panel(piezas[lados['espalda']], 'ESPALDA — ilustracion',
              {'ruta': os.path.join(ARTES, ESPALDA_PNG), 'ancho': ANCHO_ESPALDA,
               'b': b_de('espalda', piezas[lados['espalda']], regla), 'c': 0.0}, fs),
        panel(piezas[lados['manga']], 'MANGA — nombre',
              {'ruta': os.path.join(ARTES, 'nombres-manga', 'canva',
                                    sorted(os.listdir(os.path.join(
                                        ARTES, 'nombres-manga', 'canva')))[0]),
               'ancho': ANCHO_NOMBRE, 'desde_ruedo': NOMBRE_DEL_RUEDO, 'c': 0.0}, fs),
    ]

    f_tit, f_txt, _, _ = fs
    Wt = sum(p.size[0] for p in paneles) + 60
    Ht = max(p.size[1] for p in paneles) + 118
    out = Image.new('RGB', (Wt, Ht), (255, 255, 255))
    d = ImageDraw.Draw(out)
    d.text((24, 18), 'EPAL · Intramuros 2026 · UBICACION DE ARTES · talla %s' % talla,
           font=f_tit, fill=TINTA)
    d.text((24, 48), 'A=desde el hombro · B=desde el filo del escote · C=desde el '
                     'centro · D=ancho · E=alto.   Regla de altura: %s.' % regla.upper(),
           font=f_txt, fill=(120, 120, 130))
    d.text((24, 72), 'La pieza se ve POR FUERA: el pecho izquierdo de quien la usa '
                     'cae a la derecha del dibujo.', font=f_txt, fill=(170, 90, 60))
    x = 20
    for p in paneles:
        out.paste(p, (x, 102))
        x += p.size[0] + 20
    nombre = 'ubicacion-artes_talla-%s_%s.png' % (talla, regla)
    out.save(nombre)
    print('  talla %-4s B monograma %.1f · B espalda %.1f  -> %s'
          % (talla, b_de('monograma', piezas[lados['delantera']], regla),
             b_de('espalda', piezas[lados['espalda']], regla), nombre))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tallas', nargs='*', default=['4', '6', 'M'])
    ap.add_argument('--regla', choices=['fija', 'proporcional'], default='fija')
    args = ap.parse_args()
    piezas = cargar()
    print('UBICACION DE ARTES · regla %s\n' % args.regla)
    for t in (args.tallas or ['4', '6', 'M']):
        if t not in piezas:
            print('  talla %s: no esta en el catalogo' % t)
            continue
        ficha(t, piezas[t], args.regla)


if __name__ == '__main__':
    main()
