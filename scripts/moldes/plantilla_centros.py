# -*- coding: utf-8 -*-
"""Molde para marcar el CENTRO del estampado — uno por talla y por pieza.

    python plantilla_centros.py 6                    # delantera talla 6
    python plantilla_centros.py 6 --pieza espalda
    python plantilla_centros.py todas                # las 8, delantera

El molde tiene la FORMA del hombro y el escote de esa talla, asi que se calza
solo: se acomoda hasta que los tres filos coincidan con la pieza cortada y se
marca con tiza por el agujero. No se mide nada.

(La version anterior era una paleta rectangular con agujeros flotando y Javier
la rechazo: "ese molde no se entiende". El problema era que nada indicaba como
se relacionaba con la camiseta.)
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

import ubicacion_artes as UA

DPI = 150.0
ESC = DPI/2.54                      # px por cm: sale 1:1 al imprimir
TALLAS = ['4', '6', '8', '10', '12', '14', 'M', 'XXL']
BROCA = 0.5                         # agujero para meter la punta de la tiza
SOBRA = 4.0                         # cuanto material queda debajo del agujero

TINTA = (28, 28, 34)
COTA = (196, 52, 52)
AUX = (150, 154, 166)
CUERPO = (244, 243, 239)
PASO = (16, 122, 92)


def fnt(nombre, px):
    return ImageFont.truetype(os.path.join(r'C:\Windows\Fonts', nombre), px)


def contorno_superior(pieza, y_limite):
    """El filo de la pieza desde el pico del escote, por el hombro, hasta donde
    la sisa corta a `y_limite`. Es el trozo que el molde tiene que copiar."""
    pts = pieza['puntos']
    w = pieza['bbox_cm'][0]
    cxx = w/2.0
    esc_y = UA.escote_de(pieza)

    def dist(p, q):
        return (p[0]-q[0])**2 + (p[1]-q[1])**2

    i_esc = min(range(len(pts)), key=lambda i: dist(pts[i], (cxx, esc_y)))
    cand = [i for i, p in enumerate(pts) if p[0] > cxx and p[1] <= y_limite]
    i_fin = max(cand, key=lambda i: pts[i][1]) if cand else i_esc

    for paso in (1, -1):
        camino, i = [], i_esc
        for _ in range(len(pts)):
            camino.append(pts[i])
            if i == i_fin:
                break
            i = (i + paso) % len(pts)
        else:
            continue
        if all(p[1] <= y_limite + 0.6 and p[0] >= cxx - 0.6 for p in camino):
            return camino
    return [pts[i_esc], pts[i_fin]]


def molde(talla, pieza_nom, regla):
    piezas = UA.cargar()[talla]
    lados = UA.LADOS_NUM if talla in UA.NUMERICAS else UA.LADOS_LET
    pieza = piezas[lados['delantera' if pieza_nom == 'delantera' else 'espalda']]
    m = UA.efes(talla, piezas, regla)

    w_cm = pieza['bbox_cm'][0]
    cxx = w_cm/2.0
    esc_y = UA.escote_de(pieza)
    if pieza_nom == 'delantera':
        marcas = [(m['monograma_c'], m['monograma_f'], 'MONOGRAMA')]
    else:
        marcas = [(0.0, m['arco_f'], 'ARCO'), (0.0, m['ilustracion_f'], 'ILUSTRACION')]
    y_hondo = esc_y + max(f for _, f, _ in marcas)
    y_lim = y_hondo + SOBRA

    borde = contorno_superior(pieza, y_lim)
    poli = [(cxx, esc_y)] + borde + [(borde[-1][0], y_lim), (cxx, y_lim)]

    xs = [p[0] for p in poli]
    ys = [p[1] for p in poli]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    ox, oy = 150, 230
    W = int((x1-x0)*ESC) + ox + 300
    H = int((y1-y0)*ESC) + oy + 130

    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    def X(cm):
        return ox + (cm-x0)*ESC

    def Y(cm):
        return oy + (cm-y0)*ESC

    d.polygon([(X(p[0]), Y(p[1])) for p in poli], fill=CUERPO)
    d.line([(X(p[0]), Y(p[1])) for p in poli] + [(X(poli[0][0]), Y(poli[0][1]))],
           fill=TINTA, width=4)

    f_tit = fnt('arialbd.ttf', 27)
    f_t = fnt('arial.ttf', 17)
    f_c = fnt('arialbd.ttf', 19)
    f_ch = fnt('arial.ttf', 15)

    d.text((22, 16), 'MOLDE DEL CENTRO · %s · TALLA %s'
           % (pieza_nom.upper(), talla), font=f_tit, fill=TINTA)
    for i, t in enumerate([
            'Se acomoda sobre la pieza CORTADA hasta que el escote y el hombro '
            'del molde calcen con los de la tela.',
            'Se marca con tiza por el agujero. Ahi va el CENTRO del arte: el '
            'transfer se dobla en cuatro y el cruce va en la marca.',
            'Imprimir al 100%, sin ajustar a la pagina — la barra de abajo tiene '
            'que medir 10.0 cm. Pegar en carton y recortar.']):
        d.text((22, 52+i*24), '·  ' + t, font=f_t, fill=AUX)
    d.text((22, 130), 'La pieza se ve POR FUERA: este molde es para el lado '
                      'DERECHO del dibujo (pecho izquierdo de quien la usa).',
           font=f_t, fill=(170, 90, 60))

    # Cada filo rotulado sobre si mismo. Los tres primeros son los que hacen el
    # registro: si los tres calzan, el molde solo puede estar en una posicion.
    def en_borde(t):
        """Punto al t (0..1) del recorrido del filo curvo."""
        largos = [0.0]
        for a, b in zip(borde, borde[1:]):
            largos.append(largos[-1] + ((b[0]-a[0])**2 + (b[1]-a[1])**2)**0.5)
        objetivo = largos[-1]*t
        for i, l in enumerate(largos):
            if l >= objetivo:
                return borde[min(i, len(borde)-1)]
        return borde[-1]

    def rotulo(pt, texto, dx, dy, color=PASO):
        x, y = X(pt[0]), Y(pt[1])
        d.line([(x, y), (x+dx, y+dy)], fill=color, width=2)
        anclaje = x+dx if dx >= 0 else x+dx-d.textlength(texto, font=f_c)
        d.text((anclaje, y+dy-10), texto, font=f_c, fill=color)

    rotulo(en_borde(0.16), '1 · ESCOTE', -30, -46)
    rotulo(en_borde(0.46), '2 · HOMBRO', 40, -40)
    rotulo(en_borde(0.86), '3 · SISA', 46, 0)
    medio = (esc_y + y_lim)/2.0
    d.text((X(cxx)+14, Y(medio)), 'filo recto: va sobre el DOBLEZ del centro',
           font=f_c, fill=AUX)
    d.text((X(cxx)+14, Y(y_lim)-34), 'este filo no registra nada: es solo el '
                                     'corte de abajo del molde', font=f_ch, fill=AUX)

    r = BROCA/2.0*ESC
    for c, f, etq in marcas:
        x, y = X(cxx + c), Y(esc_y + f)
        d.ellipse([x-r, y-r, x+r, y+r], outline=COTA, width=4)
        d.line([(x-r-16, y), (x+r+16, y)], fill=COTA, width=2)
        d.line([(x, y-r-16), (x, y+r+16)], fill=COTA, width=2)
        d.text((x+r+22, y-10), etq, font=f_c, fill=COTA)
        d.text((x+r+22, y+12), '%.1f del escote' % f, font=f_ch, fill=AUX)

    bx, by = 22, H-40
    d.line([(bx, by), (bx+10*ESC, by)], fill=TINTA, width=3)
    for x in (bx, bx+10*ESC):
        d.line([(x, by-9), (x, by+9)], fill=TINTA, width=3)
    d.text((bx+10*ESC+12, by-11), '10.0 cm', font=f_c, fill=TINTA)
    return img


def molde_unico(pieza_nom, regla):
    """UN molde para las 8 tallas (Javier, 9-ago). Las curvas se anidan todas
    en el pico del escote, que es el punto del que ya cuelgan las medidas: por
    eso salen en abanico desde una sola esquina.

    Va en ACETATO, no en carton: se usa alineando la curva de la talla con la
    orilla de la tela, y para eso hay que ver a traves.
    """
    piezas_all = UA.cargar()
    datos = []
    for t in TALLAS:
        if t not in piezas_all:
            continue
        piezas = piezas_all[t]
        lados = UA.LADOS_NUM if t in UA.NUMERICAS else UA.LADOS_LET
        pieza = piezas[lados['delantera' if pieza_nom == 'delantera' else 'espalda']]
        # El molde usa el ESTANDAR de la casa, no las medidas de este pedido:
        # tiene que servir para los que vengan. Lo unico que sale del pedido es
        # el corrimiento lateral del pecho, que depende de la pieza y no del arte.
        if t not in UA.CENTROS_ESTANDAR:
            continue
        f_pecho, f_espalda = UA.CENTROS_ESTANDAR[t]
        if pieza_nom == 'delantera':
            m = UA.efes(t, piezas, regla)
            marcas = [(m['monograma_c'], f_pecho, '')]
        else:
            marcas = [(0.0, f_espalda, '')]
        datos.append((t, pieza, marcas))

    y_lim = max(f for _, _, ms in datos for _, f, _ in ms) + SOBRA
    curvas = []
    for t, pieza, marcas in datos:
        cxx = pieza['bbox_cm'][0]/2.0
        esc_y = UA.escote_de(pieza)
        borde = contorno_superior(pieza, esc_y + y_lim)
        curvas.append((t, [(p[0]-cxx, p[1]-esc_y) for p in borde], marcas))
    # la mas grande manda el filo del molde
    grande = max(curvas, key=lambda c: max(p[0] for p in c[1]))

    poli = [(0.0, 0.0)] + grande[1] + [(grande[1][-1][0], y_lim), (0.0, y_lim)]
    xs = [p[0] for p in poli]
    ys = [p[1] for p in poli]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    ox, oy = 150, 250
    W = int((x1-x0)*ESC) + ox + 330
    H = int((y1-y0)*ESC) + oy + 130
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    def X(cm):
        return ox + (cm-x0)*ESC

    def Y(cm):
        return oy + (cm-y0)*ESC

    d.polygon([(X(p[0]), Y(p[1])) for p in poli], fill=CUERPO)
    d.line([(X(p[0]), Y(p[1])) for p in poli] + [(X(poli[0][0]), Y(poli[0][1]))],
           fill=TINTA, width=4)

    f_tit = fnt('arialbd.ttf', 27)
    f_t = fnt('arial.ttf', 17)
    f_c = fnt('arialbd.ttf', 19)
    f_ch = fnt('arialbd.ttf', 16)

    d.text((22, 16), 'MOLDE DE CENTROS · %s · TODAS LAS TALLAS · ESTANDAR DE LA CASA'
           % pieza_nom.upper(), font=f_tit, fill=TINTA)
    for i, t in enumerate([
            'En ACETATO transparente: se usa viendo a traves, no en carton.',
            'Se pone la esquina de arriba-izquierda en el PICO DEL ESCOTE y el '
            'filo recto sobre el DOBLEZ del centro.',
            'Se comprueba que la curva de la talla coincida con la orilla de la '
            'tela, y se marca con tiza por el agujero de esa talla.',
            'Imprimir al 100% — la barra de abajo tiene que medir 10.0 cm.']):
        d.text((22, 52+i*24), '·  ' + t, font=f_t, fill=AUX)

    # las 8 curvas anidadas, cada una rotulada donde termina
    for i, (t, curva, _) in enumerate(curvas):
        pts = [(X(p[0]), Y(p[1])) for p in curva]
        es_grande = t == grande[0]
        if not es_grande:
            d.line(pts, fill=(120, 124, 140), width=2)
        px, py = pts[len(pts)//2]
        d.text((px+8, py-24), t, font=f_ch, fill=TINTA)

    d.ellipse([X(0)-11, Y(0)-11, X(0)+11, Y(0)+11], outline=PASO, width=4)
    d.text((X(0)+18, Y(0)-34), 'PICO DEL ESCOTE — aqui se calza todo',
           font=f_c, fill=PASO)
    d.text((X(0)+14, Y(y_lim/2.0)), 'filo recto: va sobre el DOBLEZ del centro',
           font=f_c, fill=AUX)

    r = BROCA/2.0*ESC
    for t, _, marcas in curvas:
        for c, f, sub in marcas:
            x, y = X(c), Y(f)
            d.ellipse([x-r, y-r, x+r, y+r], outline=COTA, width=4)
            d.line([(x-r-14, y), (x+r+14, y)], fill=COTA, width=2)
            d.line([(x, y-r-14), (x, y+r+14)], fill=COTA, width=2)
            d.text((x+r+20, y-9), t + ('  ' + sub if sub else ''),
                   font=f_ch, fill=COTA)

    bx, by = 22, H-40
    d.line([(bx, by), (bx+10*ESC, by)], fill=TINTA, width=3)
    for x in (bx, bx+10*ESC):
        d.line([(x, by-9), (x, by+9)], fill=TINTA, width=3)
    d.text((bx+10*ESC+12, by-11), '10.0 cm', font=f_c, fill=TINTA)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('talla', nargs='?', default='6')
    ap.add_argument('--pieza', choices=['delantera', 'espalda'],
                    default='delantera')
    ap.add_argument('--regla', choices=['fija', 'proporcional'],
                    default='proporcional')
    args = ap.parse_args()
    if args.talla == 'unico':
        img = molde_unico(args.pieza, args.regla)
        png = 'MOLDE-CENTRO_%s_TODAS.png' % args.pieza
        img.save(png, dpi=(DPI, DPI))
        img.save(png.replace('.png', '.pdf'), 'PDF', resolution=DPI)
        print('-> %s  (%.1f x %.1f cm al 1:1)'
              % (png, img.size[0]/ESC, img.size[1]/ESC))
        return
    tallas = TALLAS if args.talla == 'todas' else [args.talla]
    for t in tallas:
        img = molde(t, args.pieza, args.regla)
        png = 'MOLDE-CENTRO_%s_talla-%s.png' % (args.pieza, t)
        img.save(png, dpi=(DPI, DPI))
        img.save(png.replace('.png', '.pdf'), 'PDF', resolution=DPI)
        print('-> %s  (%.1f x %.1f cm al 1:1)'
              % (png, img.size[0]/ESC, img.size[1]/ESC))


if __name__ == '__main__':
    main()
