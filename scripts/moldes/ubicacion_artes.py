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

De ahi salen 6 cotas por arte, que es lo que se pone en la ficha de taller:

  A  hombro  -> filo superior del arte      (en la manga, desde el ruedo)
  B  escote  -> filo superior del arte
  F  escote  -> EJE del arte                (en la manga, desde el ruedo)
  C  centro  -> eje del arte (horizontal; 0 = centrado)
  D  ancho del arte
  E  alto del arte

**F es la que se usa al planchar**: el operario alinea por el eje del arte, no
por su filo de arriba. A y B quedan de control cruzado. La ficha dibuja el eje
como una linea punteada roja que cruza toda la pieza, con una cruz en el centro
del arte.

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
# Javier pidio bajarlo 1 cm y despues lo revirtio: el 5.5 que le parecia bajo
# era al FILO del arte y lo estaba comparando contra una F, que va al CENTRO.
# Queda en 0 — si alguien lo vuelve a mover, que sea por como se ve, no por
# haber comparado dos medidas distintas.
BAJA_MONOGRAMA = 0.0

# La espalda son DOS transfers, no uno: el arco INTRAMUROS 2026 (20.95 x 4.43)
# ARRIBA y la ilustracion (21.37 x 17.20) abajo, separados 0.5 cm. Van sueltos
# en el film, asi que cada uno se plancha por su cuenta y necesita su propia F.
# El PNG combinado `..._ESPALDA_ninos-intramuros.png` los trae pegados y con el
# arco ABAJO — quedo obsoleto el 9-ago, no usarlo para acotar.
ANCHO_ARCO = 20.95
SEP_ESPALDA = 0.5
ILUSTRACION_PNG = 'Arte_Albino-Luciani_ESPALDA_ninos.png'
# El arco bueno es el ARRIBA (curva de arcoiris), el mismo que ya esta impreso
# en el film y que se ve en la foto de la prueba sobre la camiseta verde. Sale
# recortado de `letras-diseno\INTRAMUROS-2026_arco-arriba_opcion1.png`, que lo
# genero letras.py por codigo (Rockwell Extra Bold, negro con sombra blanca).
ARCO_PNG = 'Arte_Albino-Luciani_ESPALDA_arco-intramuros.png'
ARCO_FUENTE = os.path.join('letras-diseno', 'INTRAMUROS-2026_arco-arriba_opcion1.png')
MONOGRAMA_PNG = 'Logo_Albino-Luciani_escudo-EPAL_recortado.png'


def ruta_arco():
    """(ruta, provisional). Si falta el recortado se arma del original: el
    original trae 24 px de aire alrededor y sin recortar el alto sale mal."""
    real = os.path.join(ARTES, ARCO_PNG)
    if not os.path.exists(real):
        im = Image.open(os.path.join(ARTES, ARCO_FUENTE)).convert('RGBA')
        im.crop(im.getbbox()).save(real)
    return real, False

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


# Javier, 9-ago: la sisa lleva 1 cm de costura. El contorno del molde es la
# linea de CORTE, asi que al coser se pierde ese centimetro y el arte queda
# corrido hacia la manga si se centra contra la orilla cortada. Se centra
# contra la linea de COSTURA y las cotas se dan contra la orilla, que es lo
# que el operario tiene enfrente antes de armar.
COSTURA = 1.0


def punta_hombro(pieza):
    """(x, y) del pico alto del hombro — donde el hombro se junta con el
    escote. Es el punto mas alto de la pieza y el que la industria usa de
    referencia para ubicar estampados."""
    w, _ = pieza['bbox_cm']
    der = [p for p in pieza['puntos'] if p[0] > w/2.0]
    return min(der, key=lambda p: p[1]) if der else (w/2.0, 0.0)


def punta_sisa(pieza):
    """(x, y) del pico de abajo de la sisa — donde la curva de la manga se
    junta con el costado. Es el otro punto que el operario tiene enfrente en la
    pieza cortada, ademas del pico del escote: sirve para ubicar el arte sin
    tener que doblar nada."""
    w, h = pieza['bbox_cm']
    arriba = [p for p in pieza['puntos'] if p[1] < h*0.6 and p[0] > w/2.0]
    if not arriba:
        return (w, h*0.3)
    x_max = max(p[0] for p in arriba)
    # de los que estan en la orilla, el mas bajo: ahi termina la sisa
    return max([p for p in arriba if p[0] > x_max - 0.15], key=lambda p: p[1])


def b_de(arte, pieza, regla):
    fijo, frac = REGLAS[arte]
    if regla == 'fija':
        return fijo
    return round(pieza['bbox_cm'][1]*frac*2)/2.0     # al 0.5 cm


# ─── el estandar de la casa, congelado (Javier, 9-ago) ──────────────────────
# El molde de centros tiene que servir para OTROS pedidos, asi que sus agujeros
# no pueden salir del tamano del arte de este. Estos son los centros de la ZONA
# de estampado por talla: del pico del escote al centro, en cm.
#
# Salieron de EPAL-Intramuros (calibrados a ojo en las tallas 6 y 8) y se
# congelan aqui. Se probo definirlos como % del alto de la pieza y NO sirve:
# esa regla escala con la prenda, pero los artes de la casa son del mismo
# tamano en todas las tallas, asi que en la XXL mandaba el arte de espalda 15 cm
# mas abajo, a media espalda.
#
# ⚠ Valen para artes de alto parecido a los de siempre (pecho ~7 cm, espalda
# ~17-22 cm). Un arte mucho mas chico centrado aqui va a verse bajo: ahi hay
# que juzgar a ojo, no forzar el agujero.
CENTROS_ESTANDAR = {
    #        pecho  espalda
    '4':    (8.5,  19.5),
    '6':    (9.0,  20.0),
    '8':    (9.0,  20.0),
    '10':   (9.5,  20.5),
    '12':   (9.5,  21.0),
    '14':  (10.0,  21.5),
    'M':   (11.0,  22.5),
    'XXL': (12.0,  24.0),
}


def r05(v):
    """Al medio centimetro. Javier, 9-ago: la F es la que se mide con cinta
    contra la tela, asi que tiene que caer en una marca real, no en 8.7."""
    return round(v*2)/2.0


def alto_de(ruta, ancho):
    im = Image.open(ruta)
    return ancho*im.size[1]/float(im.size[0])


def efes(talla, piezas_talla, regla):
    """Las medidas de la talla, ya redondeadas. FUENTE UNICA: la usan la ficha
    acotada y la hoja de estampado, para que no puedan decir cosas distintas.

    F = del filo del escote (del ruedo en la manga) al EJE del arte. Se
    redondea la F, no el B: el operario alinea por el eje.
    """
    lados = LADOS_NUM if talla in NUMERICAS else LADOS_LET
    delantera = piezas_talla[lados['delantera']]
    espalda = piezas_talla[lados['espalda']]

    alto_m = alto_de(os.path.join(ARTES, MONOGRAMA_PNG), ANCHO_MONOGRAMA)
    b_m = b_de('monograma', delantera, regla) + BAJA_MONOGRAMA
    f_m = r05(b_m + alto_m/2.0)
    # el monograma va a media distancia entre el doblez y la sisa. Se mide a la
    # altura del CENTRO, no la del filo de arriba: si todo se refiere al centro,
    # la construccion tiene que hacerlo tambien o el dibujo no cuadra con el
    # numero.
    w_del = delantera['bbox_cm'][0]
    _, x_der = orilla_a_la_altura(delantera['puntos'], escote_de(delantera) + f_m)
    # descontando la costura de la sisa: lo que se ve en la camisa armada es
    # 1 cm menos, y el medio de ESO es donde tiene que caer el arte
    c_m = r05((x_der - COSTURA - w_del/2.0)/2.0)

    alto_a = alto_de(ruta_arco()[0], ANCHO_ARCO)
    alto_i = alto_de(os.path.join(ARTES, ILUSTRACION_PNG), ANCHO_ESPALDA)
    b_e = b_de('espalda', espalda, regla)
    f_a = r05(b_e + alto_a/2.0)
    f_i = r05(b_e + alto_a + SEP_ESPALDA + alto_i/2.0)

    return {'monograma_f': f_m, 'monograma_c': c_m, 'monograma_alto': alto_m,
            'arco_f': f_a, 'arco_alto': alto_a,
            'ilustracion_f': f_i, 'ilustracion_alto': alto_i,
            # la manga se coloca por A desde el ruedo (4.0, acordado el 6-ago):
            # ahi el numero limpio es el A, no el F
            'manga_a': NOMBRE_DEL_RUEDO,
            'manga_f': NOMBRE_DEL_RUEDO + 2.44/2.0,
            # separacion real que queda entre los dos transfers de la espalda
            # despues de redondear cada F por su lado
            'sep_espalda': (f_i - alto_i/2.0) - (f_a + alto_a/2.0)}


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


def cota_v(d, x, y0, y1, texto, f, lado=1, dy=0):
    if abs(y1-y0) < 2:
        return
    d.line([(x, y0), (x, y1)], fill=COTA, width=2)
    for y in (y0, y1):
        d.line([(x-6, y), (x+6, y)], fill=COTA, width=2)
    ancho = d.textlength(texto, font=f)
    tx = x+10 if lado > 0 else x-10-ancho
    d.text((tx, (y0+y1)/2-9+dy), texto, font=f, fill=COTA)


def cota_h(d, y, x0, x1, texto, f, arriba=True):
    if abs(x1-x0) < 2:
        return
    d.line([(x0, y), (x1, y)], fill=COTA, width=2)
    for x in (x0, x1):
        d.line([(x, y-6), (x, y+6)], fill=COTA, width=2)
    ancho = d.textlength(texto, font=f)
    d.text(((x0+x1)/2-ancho/2, y-24 if arriba else y+8), texto, font=f, fill=COTA)


def panel(pieza, titulo, artes, fs, sep=0.0):
    """artes = dict o [dict, ...] con (ruta, ancho, b|desde_ruedo, c, nombre).

    Con varios artes van APILADOS en ese orden, separados `sep` cm: el `b` del
    primero manda y los de abajo salen de el. Cada uno lleva sus propias cotas
    y su propio bloque en la tabla, porque son transfers sueltos que se
    planchan uno por uno.
    """
    if isinstance(artes, dict):
        artes = [artes]
    f_tit, f_txt, f_cota, f_mono = fs
    w_cm, h_cm = pieza['bbox_cm']
    W, H = int(w_cm*ESC), int(h_cm*ESC)
    ox, oy = 150, 108
    marg_der = 340 if len(artes) == 1 else 470
    marg_bot = 232 + (0 if len(artes) == 1 else 26 + 22*7)
    img = Image.new('RGB', (W+ox+marg_der, H+oy+marg_bot), (255, 255, 255))
    d = ImageDraw.Draw(img)

    pol = [(ox+px*ESC, oy+py*ESC) for px, py in pieza['puntos']]
    d.polygon(pol, fill=TELA)
    d.line(pol+[pol[0]], fill=TINTA, width=3)
    d.text((ox, 20), titulo, font=f_tit, fill=TINTA)
    d.text((ox, 50), 'pieza %.1f x %.1f cm' % (w_cm, h_cm), font=f_txt, fill=AUX)

    # geometria de cada arte: se resuelve antes de dibujar porque el segundo
    # cuelga del primero
    cx_cm = w_cm/2.0
    puestos = []
    abajo_cm = None
    for arte in artes:
        im = Image.open(arte['ruta']).convert('RGBA')
        ancho = arte['ancho']
        alto = ancho*im.size[1]/float(im.size[0])
        # cada arte se coloca por SU F (escote al eje), que es el numero
        # redondeado que el operario mide. Solo si no trae F cuelga del anterior.
        if arte.get('f') is not None:
            top_cm = escote_de(pieza) + arte['f'] - alto/2.0
        elif arte.get('desde_ruedo') is not None:
            top_cm = h_cm - arte['desde_ruedo'] - alto
        elif arte.get('b') is not None:
            top_cm = escote_de(pieza) + arte['b']
        else:
            top_cm = abajo_cm + sep
        ax = ox + int((cx_cm + arte.get('c', 0.0) - ancho/2.0)*ESC)
        # las cotas se sacan de ESTOS numeros, no de los pixeles: redondear a
        # pixel entero movia la F 1 mm y la ficha se contradecia con su propia
        # tabla (decia F 9.9 arriba y 10.0 abajo)
        puestos.append({'im': im, 'arte': arte, 'ancho': ancho, 'alto': alto,
                        'aw': max(1, int(ancho*ESC)), 'ah': max(1, int(alto*ESC)),
                        'ax': ax, 'ay': oy + int(top_cm*ESC),
                        'A': (arte['desde_ruedo']
                              if arte.get('desde_ruedo') is not None else top_cm),
                        'B': top_cm - escote_de(pieza),
                        'F': (h_cm - top_cm - alto/2.0
                              if arte.get('desde_ruedo') is not None
                              else top_cm + alto/2.0 - escote_de(pieza))})
        abajo_cm = top_cm + alto

    # landmarks
    esc_y = oy + int(escote_de(pieza)*ESC)
    cx = ox + int(cx_cm*ESC)
    arte = artes[0]
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

    filas = []
    for j, pu in enumerate(puestos):
        arte, ancho, alto = pu['arte'], pu['ancho'], pu['alto']
        ax, ay, aw, ah = pu['ax'], pu['ay'], pu['aw'], pu['ah']
        esc_im = pu['im'].resize((aw, ah), Image.LANCZOS)
        img.paste(esc_im, (ax, ay), esc_im)
        d.rectangle([ax, ay, ax+aw, ay+ah], outline=COTA, width=2)
        mx, my = ax+aw//2, ay+ah//2

        # el eje horizontal del arte, que es por donde se alinea al planchar
        punteada(d, (ox-40, my), (ox+W+40, my), color=COTA, paso=10)
        d.text((ox-146, my-9), arte.get('eje', 'eje arte'), font=f_cota, fill=COTA)
        d.line([(mx-13, my), (mx+13, my)], fill=COTA, width=2)
        d.line([(mx, my-13), (mx, my+13)], fill=COTA, width=2)

        # cotas — cada arte usa su propia columna a la derecha para que no se
        # encimen las lineas cuando son dos
        col = 130*j
        if arte.get('desde_ruedo') is None:
            if j == 0:
                cota_v(d, ox+W+38, oy, ay, 'A %.1f' % pu['A'], f_cota)
                cota_v(d, ox+W+124, esc_y, ay, 'B %.1f' % pu['B'], f_cota)
            cota_v(d, ox+W+228+col, esc_y, my, 'F %.1f' % pu['F'], f_cota)
        else:
            cota_v(d, ox+W+38, ay+ah, oy+H, 'A %.1f' % pu['A'], f_cota)
            cota_v(d, ox+W+124, my, oy+H, 'F %.1f' % pu['F'], f_cota)
        cota_v(d, ax-22, ay, ay+ah, 'E %.2f' % alto, f_cota, lado=-1, dy=-26)
        # el de arriba lleva su ancho arriba; los apilados abajo, porque entre
        # uno y otro solo hay medio centimetro y las dos cotas se encimaban
        if j == 0:
            cota_h(d, ay-18, ax, ax+aw, 'D %.2f' % ancho, f_cota)
        else:
            cota_h(d, ay+ah+18, ax, ax+aw, 'D %.2f' % ancho, f_cota, arriba=False)
        if abs(arte.get('c', 0.0)) > 0.05:
            # va debajo del arte para no encimarse con la cota del alto
            punteada(d, (mx, my), (mx, ay+ah+28), color=COTA, paso=8)
            cota_h(d, ay+ah+28, cx, mx, 'C %.1f' % abs(arte['c']), f_cota, arriba=False)

        if len(puestos) > 1:
            filas.append((arte.get('nombre', 'ARTE').upper(), ''))
        if arte.get('desde_ruedo') is None:
            filas += [('A  hombro -> filo', '%.1f cm' % pu['A']),
                      ('B  escote -> filo', '%.1f cm' % pu['B']),
                      ('F  escote -> EJE', '%.1f cm' % pu['F']),
                      ('C  centro -> eje', 'centrado' if abs(arte.get('c', 0)) < 0.05
                       else '%.1f cm' % abs(arte['c']))]
        else:
            filas += [('A  ruedo -> filo', '%.1f cm' % pu['A']),
                      ('F  ruedo -> EJE', '%.1f cm' % pu['F']),
                      ('C  centro -> eje', 'centrado')]
        filas += [('D  ancho del arte', '%.2f cm' % ancho),
                  ('E  alto del arte', '%.2f cm' % alto)]

    # la separacion entre los dos transfers es una cota mas: es lo que el
    # operario tiene que dejar entre uno y otro al planchar
    if len(puestos) > 1:
        a, b = puestos[0], puestos[1]
        real = (b['F'] - b['alto']/2.0) - (a['F'] + a['alto']/2.0)
        x = min(a['ax'], b['ax']) - 92
        cota_v(d, x, a['ay']+a['ah'], b['ay'], 'sep %.1f' % real, f_cota, lado=-1)

    # tabla de la ficha
    ty = oy+H+58
    for i, (k, v) in enumerate(filas):
        d.text((ox, ty+i*22), k, font=f_mono, fill=(70, 70, 82) if v else TINTA)
        d.text((ox+230, ty+i*22), v, font=f_mono, fill=TINTA)
    return img


def paneles_de(talla, piezas, regla):
    """Los 3 paneles ya dibujados. Lo usa la ficha y tambien hoja_estampado."""
    fs = fuentes()
    lados = LADOS_NUM if talla in NUMERICAS else LADOS_LET
    delantera = piezas[lados['delantera']]
    m = efes(talla, piezas, regla)

    return [
        panel(delantera, 'DELANTERA — monograma, pecho izquierdo',
              {'ruta': os.path.join(ARTES, MONOGRAMA_PNG), 'ancho': ANCHO_MONOGRAMA,
               'f': m['monograma_f'], 'c': m['monograma_c']}, fs),
        panel(piezas[lados['espalda']], 'ESPALDA — arco + ilustracion',
              [{'ruta': ruta_arco()[0], 'ancho': ANCHO_ARCO, 'c': 0.0,
                'nombre': 'arco INTRAMUROS 2026', 'eje': 'eje arco',
                'f': m['arco_f']},
               {'ruta': os.path.join(ARTES, ILUSTRACION_PNG),
                'ancho': ANCHO_ESPALDA, 'c': 0.0,
                'nombre': 'ilustracion', 'eje': 'eje ilustr.',
                'f': m['ilustracion_f']}],
              fs),
        panel(piezas[lados['manga']], 'MANGA — nombre',
              {'ruta': os.path.join(ARTES, 'nombres-manga', 'canva',
                                    sorted(os.listdir(os.path.join(
                                        ARTES, 'nombres-manga', 'canva')))[0]),
               'ancho': ANCHO_NOMBRE, 'desde_ruedo': NOMBRE_DEL_RUEDO, 'c': 0.0}, fs),
    ]


def ficha(talla, piezas, regla):
    fs = fuentes()
    paneles = paneles_de(talla, piezas, regla)
    lados = LADOS_NUM if talla in NUMERICAS else LADOS_LET

    f_tit, f_txt, _, _ = fs
    Wt = sum(p.size[0] for p in paneles) + 60
    Ht = max(p.size[1] for p in paneles) + 118
    out = Image.new('RGB', (Wt, Ht), (255, 255, 255))
    d = ImageDraw.Draw(out)
    d.text((24, 18), 'EPAL · Intramuros 2026 · UBICACION DE ARTES · talla %s' % talla,
           font=f_tit, fill=TINTA)
    d.text((24, 48), 'A=hombro al filo · B=escote al filo · F=escote al EJE del arte '
                     '(es por donde se alinea al planchar) · C=del centro · D=ancho · '
                     'E=alto.   Regla de altura: %s.' % regla.upper(),
           font=f_txt, fill=(120, 120, 130))
    aviso = ('La pieza se ve POR FUERA: el pecho izquierdo de quien la usa '
             'cae a la derecha del dibujo.')
    if ruta_arco()[1]:
        aviso += ('   ⚠ EL ARCO ES PROVISIONAL: falta el de Canva con la curva '
                  'invertida. Las medidas valen, el dibujo no.')
    d.text((24, 72), aviso, font=f_txt, fill=(170, 90, 60))
    x = 20
    for p in paneles:
        out.paste(p, (x, 102))
        x += p.size[0] + 20
    nombre = 'ubicacion-artes_talla-%s_%s.png' % (talla, regla)
    out.save(nombre)
    m = efes(talla, piezas, regla)
    print('  talla %-4s F monograma %.1f · arco %.1f · ilustracion %.1f  -> %s'
          % (talla, m['monograma_f'], m['arco_f'], m['ilustracion_f'], nombre))


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
