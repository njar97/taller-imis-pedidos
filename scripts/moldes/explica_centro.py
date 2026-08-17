# -*- coding: utf-8 -*-
"""De donde sale el CENTRO — explicado sobre la pieza, paso por paso.

    python explica_centro.py 6            # delantera de la talla 6

No es una ficha de taller: es el dibujo para entender la construccion. Muestra
las lineas que se trazan (no las cotas del resultado) para llegar al punto
donde va el centro del arte.
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

import ubicacion_artes as UA

ESC = 22.0                          # px por cm en pantalla
TINTA = (28, 28, 34)
COTA = (196, 52, 52)
GUIA = (46, 116, 181)
AUX = (150, 154, 166)
TELA = (241, 240, 236)
PASO = (16, 122, 92)


def fnt(nombre, px):
    return ImageFont.truetype(os.path.join(r'C:\Windows\Fonts', nombre), px)


def punteada(d, p0, p1, color, paso=11, ancho=2):
    x0, y0 = p0
    x1, y1 = p1
    largo = max(abs(x1-x0), abs(y1-y0))
    n = max(1, int(largo//paso))
    for i in range(0, n, 2):
        a, b = i/float(n), min(1.0, (i+1)/float(n))
        d.line([(x0+(x1-x0)*a, y0+(y1-y0)*a),
                (x0+(x1-x0)*b, y0+(y1-y0)*b)], fill=color, width=ancho)


def globo(d, xy, n, texto, f_n, f_t, ancho=430):
    """El numerito del paso con su explicacion al lado."""
    x, y = xy
    d.ellipse([x-15, y-15, x+15, y+15], fill=PASO)
    w = d.textlength(str(n), font=f_n)
    d.text((x-w/2, y-11), str(n), font=f_n, fill=(255, 255, 255))
    d.text((x+26, y-11), texto, font=f_t, fill=TINTA)


def dibujar(talla, regla):
    piezas = UA.cargar()[talla]
    lados = UA.LADOS_NUM if talla in UA.NUMERICAS else UA.LADOS_LET
    pieza = piezas[lados['delantera']]
    m = UA.efes(talla, piezas, regla)

    w_cm, h_cm = pieza['bbox_cm']
    esc_cm = UA.escote_de(pieza)
    f_m, c_m = m['monograma_f'], m['monograma_c']
    alto_m = m['monograma_alto']
    # el ancho util a la altura del centro: del doblez a la sisa
    _, x_der = UA.orilla_a_la_altura(pieza['puntos'], esc_cm + f_m)
    medio_ancho = x_der - w_cm/2.0

    # el bloque de pasos va ARRIBA, completo, y la pieza empieza debajo: si se
    # ponen al lado, el texto cae encima del dibujo
    ox, oy = 300, 660
    W = int(w_cm*ESC) + ox + 420
    H = int(h_cm*ESC) + oy + 190
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    f_tit = fnt('arialbd.ttf', 30)
    f_sub = fnt('arial.ttf', 19)
    f_n = fnt('arialbd.ttf', 19)
    f_t = fnt('arial.ttf', 19)
    f_c = fnt('arialbd.ttf', 18)

    d.text((40, 40), 'DE DONDE SALE EL CENTRO — delantera, talla %s' % talla,
           font=f_tit, fill=TINTA)
    d.text((40, 80), 'La pieza se ve POR FUERA: el pecho izquierdo de quien la '
                     'usa cae a la derecha del dibujo.', font=f_sub, fill=(170, 90, 60))

    def X(cm):
        return ox + cm*ESC

    def Y(cm):
        return oy + cm*ESC

    def ah_px(cm):
        return cm*ESC/2.0

    pol = [(X(px), Y(py)) for px, py in pieza['puntos']]
    d.polygon(pol, fill=TELA)
    d.line(pol+[pol[0]], fill=TINTA, width=3)

    cx = X(w_cm/2.0)
    y_esc = Y(esc_cm)
    y_cen = Y(esc_cm + f_m)
    x_eje = X(w_cm/2.0 + c_m)
    x_sisa = X(x_der)

    # ── 1. el punto de partida: el pico del escote
    punteada(d, (X(0)-70, y_esc), (X(w_cm)+70, y_esc), AUX)
    d.ellipse([cx-9, y_esc-9, cx+9, y_esc+9], fill=PASO)
    globo(d, (40, 150), 1, 'El pico del escote. Es el unico punto de registro:', f_n, f_t)
    d.text((66, 172), 'todo lo demas cuelga de ahi.', font=f_t, fill=TINTA)

    # ── 2. la linea central (el doblez) y la bajada
    punteada(d, (cx, Y(0)-40), (cx, Y(h_cm)+40), GUIA, ancho=3)
    d.text((cx-150, Y(h_cm)+46), 'linea central (doblez)', font=f_c, fill=GUIA)
    d.line([(cx, y_esc), (cx, y_cen)], fill=COTA, width=4)
    for y in (y_esc, y_cen):
        d.line([(cx-9, y), (cx+9, y)], fill=COTA, width=3)
    d.text((cx+16, (y_esc+y_cen)/2-12), '%.1f' % f_m, font=fnt('arialbd.ttf', 26), fill=COTA)
    globo(d, (40, 208), 2, 'Se baja %.1f cm sobre esa linea. Ahi esta la ALTURA' % f_m,
          f_n, f_t)
    d.text((66, 230), 'del centro — la unica medida que se toma con cinta.',
           font=f_t, fill=TINTA)

    # ── 3. a esa altura, del doblez a la sisa, y la mitad
    punteada(d, (X(0)-70, y_cen), (X(w_cm)+70, y_cen), GUIA, ancho=3)
    d.text((X(w_cm)+78, y_cen-11), 'altura del centro', font=f_c, fill=GUIA)
    # las dos cotas horizontales van bien abajo del arte, no a su altura
    y1 = y_cen + ah_px(alto_m) + 46
    y2 = y1 + 62
    d.line([(cx, y1), (x_sisa, y1)], fill=TINTA, width=3)
    for x in (cx, x_sisa):
        d.line([(x, y1-8), (x, y1+8)], fill=TINTA, width=3)
    d.text(((cx+x_sisa)/2-30, y1+12), '%.1f' % medio_ancho, font=f_c, fill=TINTA)
    d.text((x_sisa+12, y1-28), 'sisa', font=f_c, fill=TINTA)
    d.line([(cx, y2), (x_eje, y2)], fill=COTA, width=4)
    for x in (cx, x_eje):
        d.line([(x, y2-8), (x, y2+8)], fill=COTA, width=3)
    d.text(((cx+x_eje)/2-26, y2+12), '%.1f' % c_m, font=f_c, fill=COTA)

    # ── 4. el cruce: ahi va el centro del arte
    punteada(d, (x_eje, Y(0)-40), (x_eje, Y(h_cm)+40), COTA, ancho=3)
    ruta = os.path.join(UA.ARTES, UA.MONOGRAMA_PNG)
    im = Image.open(ruta).convert('RGBA')
    aw = int(UA.ANCHO_MONOGRAMA*ESC)
    ah = int(alto_m*ESC)
    fant = im.resize((aw, ah), Image.LANCZOS)
    fant.putalpha(fant.getchannel('A').point(lambda v: int(v*0.45)))
    img.paste(fant, (int(x_eje-aw/2), int(y_cen-ah/2)), fant)
    d.rectangle([x_eje-aw/2, y_cen-ah/2, x_eje+aw/2, y_cen+ah/2],
                outline=COTA, width=2)
    d.line([(x_eje-26, y_cen), (x_eje+26, y_cen)], fill=COTA, width=3)
    d.line([(x_eje, y_cen-26), (x_eje, y_cen+26)], fill=COTA, width=3)

    # ── las dos cotas contra puntos REALES de la pieza cortada: el pico del
    # escote y el pico de abajo de la sisa. Con esas dos el operario ubica el
    # centro sin doblar la pieza ni buscar el doblez.
    sx, sy = UA.punta_sisa(pieza)
    x_sis, y_sis = X(sx), Y(sy)
    d.ellipse([x_sis-9, y_sis-9, x_sis+9, y_sis+9], fill=PASO)

    # desde el PICO DEL HOMBRO, no desde el del escote: contra el escote la
    # cota horizontal daba el mismo 8.0 de la construccion y no comprobaba nada
    hx, hy = UA.punta_hombro(pieza)
    x_hom, y_hom = X(hx), Y(hy)
    d.ellipse([x_hom-9, y_hom-9, x_hom+9, y_hom+9], fill=PASO)
    d.text((x_hom-30, y_hom-34), 'pico del hombro', font=f_c, fill=PASO)

    d.line([(x_hom, y_hom-62), (x_eje, y_hom-62)], fill=PASO, width=4)
    for x in (x_hom, x_eje):
        d.line([(x, y_hom-70), (x, y_hom-54)], fill=PASO, width=3)
    punteada(d, (x_hom, y_hom), (x_hom, y_hom-62), PASO, paso=8)
    d.text(((x_hom+x_eje)/2-22, y_hom-100), '%.1f' % abs(hx - (w_cm/2.0 + c_m)),
           font=fnt('arialbd.ttf', 26), fill=PASO)

    d.line([(x_hom-52, y_hom), (x_hom-52, y_cen)], fill=PASO, width=4)
    for y in (y_hom, y_cen):
        d.line([(x_hom-60, y), (x_hom-44, y)], fill=PASO, width=3)
    punteada(d, (x_hom-52, y_hom), (x_hom, y_hom), PASO, paso=8)
    d.text((x_hom-136, (y_hom+y_cen)/2-14), '%.1f' % (esc_cm + f_m - hy),
           font=fnt('arialbd.ttf', 26), fill=PASO)
    d.text((x_hom-146, (y_hom+y_cen)/2+18), 'bajo el hombro', font=f_c, fill=PASO)

    d.line([(x_sis+56, y_cen), (x_sis+56, y_sis)], fill=PASO, width=4)
    for y in (y_cen, y_sis):
        d.line([(x_sis+48, y), (x_sis+64, y)], fill=PASO, width=3)
    punteada(d, (x_sis, y_sis), (x_sis+56, y_sis), PASO, paso=8)
    d.text((x_sis+74, (y_cen+y_sis)/2-14), '%.1f' % (sy - (esc_cm+f_m)),
           font=fnt('arialbd.ttf', 26), fill=PASO)
    d.text((x_sis+74, (y_cen+y_sis)/2+16), 'sobre el pico', font=f_c, fill=PASO)
    d.text((x_sis+74, (y_cen+y_sis)/2+38), 'de la sisa', font=f_c, fill=PASO)

    globo(d, (40, 266), 3, 'A esa altura se mide del doblez a la sisa (%.1f cm)' % medio_ancho,
          f_n, f_t)
    d.text((66, 288), 'y se parte a la mitad: %.1f cm. Esa es la POSICION' % c_m,
           font=f_t, fill=TINTA)
    d.text((66, 310), 'de lado — queda a media camisa entre el pecho y la manga.',
           font=f_t, fill=TINTA)
    globo(d, (40, 348), 4, 'Donde se cruzan las dos, va el CENTRO del arte.', f_n, f_t)
    d.text((66, 370), 'El transfer se dobla en cuatro y el cruce de los dobleces',
           font=f_t, fill=TINTA)
    d.text((66, 392), 'se pone sobre esa marca. Sirve con cualquier diseno,',
           font=f_t, fill=TINTA)
    d.text((66, 414), 'de cualquier tamano y de cualquier forma.', font=f_t, fill=TINTA)
    globo(d, (40, 452), 5, 'En VERDE, el mismo punto contra el PICO DEL HOMBRO —', f_n, f_t)
    d.text((66, 474), 'el punto mas alto de la pieza. Con esas dos queda ubicado',
           font=f_t, fill=TINTA)
    d.text((66, 496), 'sin doblar nada. La de la sisa es solo comprobacion:',
           font=f_t, fill=TINTA)
    d.text((66, 518), 'esa orilla lleva 1 cm de costura y se pierde al armar.',
           font=f_t, fill=TINTA)

    d.text((40, H-60), 'El arte se muestra transparente solo para que se vea el '
                       'cruce: no se mide contra sus filos, solo contra su centro.',
           font=f_sub, fill=AUX)
    return img


def comparar(talla, regla):
    """Antes vs ahora. La F parece un salto enorme contra la B vieja, pero es
    que miden cosas distintas: una al filo de arriba y otra al centro."""
    piezas = UA.cargar()[talla]
    lados = UA.LADOS_NUM if talla in UA.NUMERICAS else UA.LADOS_LET
    pieza = piezas[lados['delantera']]
    m = UA.efes(talla, piezas, regla)
    w_cm, h_cm = pieza['bbox_cm']
    esc_cm = UA.escote_de(pieza)
    alto_m = m['monograma_alto']
    b_viejo = UA.b_de('monograma', pieza, regla)          # sin el +1 cm
    b_nuevo = m['monograma_f'] - alto_m/2.0

    ox, oy = 240, 300
    W = int(w_cm*ESC) + ox + 470
    H = int((esc_cm + b_nuevo + alto_m + 6)*ESC) + oy
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    f_tit = fnt('arialbd.ttf', 30)
    f_t = fnt('arial.ttf', 20)
    f_c = fnt('arialbd.ttf', 22)

    d.text((40, 40), '"BAJO BASTANTE" — no: cambio la referencia', font=f_tit, fill=TINTA)
    d.text((40, 82), 'El 5.5 de antes era al FILO DE ARRIBA del logo. El 10.0 de '
                     'ahora es a su CENTRO.', font=f_t, fill=TINTA)
    d.text((40, 110), 'El logo mide %.2f de alto, o sea %.1f del filo al centro: '
                      '%.1f + %.1f = %.1f.' % (alto_m, alto_m/2, b_viejo, alto_m/2,
                                               b_viejo + alto_m/2), font=f_t, fill=AUX)
    d.text((40, 138), 'De filo a filo, el logo bajo exactamente el 1 cm que pediste: '
                      'de %.1f a %.1f.' % (b_viejo, b_nuevo), font=f_t, fill=PASO)

    def X(cm):
        return ox + cm*ESC

    def Y(cm):
        return oy + cm*ESC

    pol = [(X(px), Y(py)) for px, py in pieza['puntos']]
    d.polygon(pol, fill=TELA)
    d.line(pol+[pol[0]], fill=TINTA, width=3)
    cx = X(w_cm/2.0)
    y_esc = Y(esc_cm)
    punteada(d, (X(0)-60, y_esc), (X(w_cm)+60, y_esc), AUX)
    d.ellipse([cx-8, y_esc-8, cx+8, y_esc+8], fill=PASO)
    d.text((X(w_cm)+68, y_esc-12), 'escote', font=f_c, fill=AUX)

    im = Image.open(os.path.join(UA.ARTES, UA.MONOGRAMA_PNG)).convert('RGBA')
    aw, ah = int(UA.ANCHO_MONOGRAMA*ESC), int(alto_m*ESC)
    x_eje = X(w_cm/2.0 + m['monograma_c'])

    # 'antes' rotulado a la izquierda y 'ahora' a la derecha: estan a 1 cm uno
    # del otro y las etiquetas del mismo lado se tapaban
    for b, color, etq, alfa, lado in ((b_viejo, AUX, 'antes', 0.30, -1),
                                      (b_nuevo, COTA, 'ahora', 0.95, 1)):
        y_top = Y(esc_cm + b)
        g = im.resize((aw, ah), Image.LANCZOS)
        g.putalpha(g.getchannel('A').point(lambda v: int(v*alfa)))
        img.paste(g, (int(x_eje-aw/2), int(y_top)), g)
        d.rectangle([x_eje-aw/2, y_top, x_eje+aw/2, y_top+ah], outline=color, width=3)
        txt = '%s · filo %.1f' % (etq, b)
        ancho = d.textlength(txt, font=f_c)
        tx = x_eje+aw/2+16 if lado > 0 else x_eje-aw/2-16-ancho
        d.line([(x_eje-aw/2 if lado < 0 else x_eje+aw/2, y_top),
                (tx+ancho+6 if lado < 0 else tx-6, y_top)], fill=color, width=2)
        d.text((tx, y_top-13), txt, font=f_c, fill=color)

    # la cota del centro nuevo, para que se vea que el 10.0 cae a media altura
    y_cen = Y(esc_cm + b_nuevo + alto_m/2.0)
    punteada(d, (X(0)-60, y_cen), (X(w_cm)+60, y_cen), COTA, ancho=2)
    d.line([(cx, y_esc), (cx, y_cen)], fill=COTA, width=4)
    for y in (y_esc, y_cen):
        d.line([(cx-9, y), (cx+9, y)], fill=COTA, width=3)
    d.text((cx-92, (y_esc+y_cen)/2-14), '%.1f' % m['monograma_f'],
           font=fnt('arialbd.ttf', 28), fill=COTA)
    d.text((cx-96, (y_esc+y_cen)/2+18), 'al CENTRO', font=f_t, fill=COTA)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('talla', nargs='?', default='6')
    ap.add_argument('--comparar', action='store_true')
    ap.add_argument('--regla', choices=['fija', 'proporcional'],
                    default='proporcional')
    args = ap.parse_args()
    if args.comparar:
        img = comparar(args.talla, args.regla)
        nombre = 'EXPLICA-CENTRO_antes-vs-ahora_talla-%s.png' % args.talla
    else:
        img = dibujar(args.talla, args.regla)
        nombre = 'EXPLICA-CENTRO_delantera_talla-%s.png' % args.talla
    img.save(nombre)
    print('-> %s' % nombre)


if __name__ == '__main__':
    main()
