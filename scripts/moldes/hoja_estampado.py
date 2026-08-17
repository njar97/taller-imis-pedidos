# -*- coding: utf-8 -*-
"""Hoja de estampado para el taller: PDF carta, lista para imprimir.

    python hoja_estampado.py                    # regla proporcional
    python hoja_estampado.py --regla fija

Pagina 1  que va en cada pieza, cuantas van de cada color y talla, y la tabla
          de medidas por talla.
Pagina 2  el diagrama acotado, para entender las letras.

Pensada para que el que estampa la tenga en la mano y no pregunte nada.
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

import ubicacion_artes as UA

DPI = 200
CARTA = (int(8.5*DPI), int(11*DPI))          # 1700 x 2200
MARG = 90

# Pedido 60 (EPAL). Sale de taller_pedidos.personas: el color lo da `cargo`.
#   amarillo = "4 anos" · celeste = "6 anos" · verde = "Parvularia 5 anos"
PEDIDO = {
    'VERDE  (5 anos)':   {'4': 7, '6': 6, '8': 5, '10': 1, '12': 1, 'M': 2},
    'CELESTE (6 anos)':  {'4': 1, '6': 8, '8': 3, '10': 2, '14': 1, 'M': 2},
    'AMARILLO (4 anos)': {'4': 11, '6': 3, '10': 2, '12': 1, 'XXL': 1},
}
TALLAS = ['4', '6', '8', '10', '12', '14', 'M', 'XXL']
APARTE = 'Alisson (6 anos, celeste) va A LA MEDIDA — no entra en este cuadro'

NEGRO = (28, 28, 36)
GRIS = (118, 118, 132)
ROJO = (196, 52, 52)
LINEA = (206, 206, 216)


def fnt(nombre, tam):
    return ImageFont.truetype(r'C:\Windows\Fonts\%s' % nombre, tam)


def encabezado(d, titulo, sub, regla):
    d.text((MARG, 70), titulo, font=fnt('arialbd.ttf', 44), fill=NEGRO)
    d.text((MARG, 126), sub, font=fnt('arial.ttf', 24), fill=GRIS)
    d.line([(MARG, 176), (CARTA[0]-MARG, 176)], fill=NEGRO, width=3)
    aviso = 'ALTURA CON REGLA %s — confirmar antes de estampar' % regla.upper()
    d.text((MARG, 190), aviso, font=fnt('arialbd.ttf', 20), fill=ROJO)


def bloque_artes(img, d, y, regla, piezas6):
    d.text((MARG, y), 'QUE VA EN CADA PIEZA', font=fnt('arialbd.ttf', 28), fill=NEGRO)
    y += 46
    fila_h = 190
    artes = [
        ('DELANTERA', 'monograma al PECHO IZQUIERDO',
         os.path.join(UA.ARTES, UA.MONOGRAMA_PNG), UA.ANCHO_MONOGRAMA),
        # la espalda son DOS transfers sueltos: el arco va ARRIBA, la
        # ilustracion abajo, con 0.5 cm entre uno y otro
        ('ESPALDA · arriba', 'arco INTRAMUROS 2026, centrado',
         UA.ruta_arco()[0], UA.ANCHO_ARCO),
        ('ESPALDA · abajo', 'ilustracion, centrada · debajo del arco',
         os.path.join(UA.ARTES, UA.ILUSTRACION_PNG), UA.ANCHO_ESPALDA),
        ('MANGA', 'nombre del alumno, centrado',
         os.path.join(UA.ARTES, 'nombres-manga', 'canva',
                      sorted(os.listdir(os.path.join(UA.ARTES, 'nombres-manga',
                                                     'canva')))[0]), UA.ANCHO_NOMBRE),
    ]
    for etiqueta, detalle, ruta, ancho in artes:
        im = Image.open(ruta).convert('RGBA')
        alto = ancho*im.size[1]/float(im.size[0])
        h = min(150, int(alto*8))
        w = max(1, int(h*im.size[0]/float(im.size[1])))
        if w > 300:
            w, h = 300, max(1, int(300*im.size[1]/float(im.size[0])))
        mini = im.resize((w, h), Image.LANCZOS)
        fondo = Image.new('RGB', (w, h), (255, 255, 255))
        fondo.paste(mini, (0, 0), mini)
        img.paste(fondo, (MARG+14, y+(fila_h-h)//2))
        d.rectangle([MARG, y, CARTA[0]-MARG, y+fila_h], outline=LINEA, width=2)
        d.text((MARG+340, y+40), etiqueta, font=fnt('arialbd.ttf', 26), fill=NEGRO)
        d.text((MARG+340, y+78), detalle, font=fnt('arial.ttf', 22), fill=GRIS)
        d.text((MARG+340, y+116), 'arte de %.2f x %.2f cm' % (ancho, alto),
               font=fnt('consolab.ttf', 21), fill=ROJO)
        y += fila_h+12
    return y


def bloque_cantidades(d, y):
    d.text((MARG, y), 'CUANTAS VAN', font=fnt('arialbd.ttf', 28), fill=NEGRO)
    y += 46
    x0 = MARG
    col = 150
    anchos = [330] + [col]*len(TALLAS)
    d.text((x0+8, y), 'color', font=fnt('arialbd.ttf', 21), fill=NEGRO)
    for i, t in enumerate(TALLAS):
        d.text((x0+anchos[0]+i*col+8, y), t, font=fnt('arialbd.ttf', 21), fill=NEGRO)
    d.text((x0+anchos[0]+len(TALLAS)*col+8, y), 'total',
           font=fnt('arialbd.ttf', 21), fill=NEGRO)
    y += 34
    d.line([(x0, y), (CARTA[0]-MARG, y)], fill=NEGRO, width=2)
    y += 10
    totales = {t: 0 for t in TALLAS}
    for color, tallas in PEDIDO.items():
        d.text((x0+8, y), color, font=fnt('arialbd.ttf', 21), fill=NEGRO)
        for i, t in enumerate(TALLAS):
            n = tallas.get(t, 0)
            totales[t] += n
            d.text((x0+anchos[0]+i*col+8, y), str(n) if n else '·',
                   font=fnt('consolab.ttf', 21), fill=NEGRO if n else LINEA)
        d.text((x0+anchos[0]+len(TALLAS)*col+8, y), str(sum(tallas.values())),
               font=fnt('consolab.ttf', 21), fill=ROJO)
        y += 38
    d.line([(x0, y), (CARTA[0]-MARG, y)], fill=LINEA, width=1)
    y += 10
    d.text((x0+8, y), 'total', font=fnt('arialbd.ttf', 21), fill=NEGRO)
    for i, t in enumerate(TALLAS):
        d.text((x0+anchos[0]+i*col+8, y), str(totales[t]),
               font=fnt('consolab.ttf', 21), fill=NEGRO)
    d.text((x0+anchos[0]+len(TALLAS)*col+8, y), str(sum(totales.values())),
           font=fnt('consolab.ttf', 21), fill=ROJO)
    y += 44
    d.text((MARG, y), APARTE, font=fnt('arial.ttf', 20), fill=ROJO)
    return y+40


def bloque_medidas(d, y, piezas, regla):
    d.text((MARG, y), 'A QUE ALTURA VA CADA ARTE', font=fnt('arialbd.ttf', 28), fill=NEGRO)
    y += 40
    d.text((MARG, y), 'F = del filo del escote (o del ruedo en la manga) al EJE del '
                      'arte. Es por donde se alinea.', font=fnt('arial.ttf', 20), fill=GRIS)
    y += 40
    cols = [MARG+8, MARG+190, MARG+420, MARG+660, MARG+900, MARG+1130]
    cab = ['talla', 'monograma F', 'arco F', 'ilustracion F', 'manga F',
           'monograma C']
    for i, c in enumerate(cab):
        d.text((cols[i], y), c, font=fnt('arialbd.ttf', 21), fill=NEGRO)
    y += 34
    d.line([(MARG, y), (CARTA[0]-MARG, y)], fill=NEGRO, width=2)
    y += 10
    for t in TALLAS:
        if t not in piezas:
            continue
        # una sola fuente para las medidas: si la ficha y esta hoja las
        # calcularan cada una por su lado, tarde o temprano se contradicen
        m = UA.efes(t, piezas[t], regla)
        vals = ['%.1f cm' % m['monograma_f'], '%.1f cm' % m['arco_f'],
                '%.1f cm' % m['ilustracion_f'], '%.1f cm' % m['manga_f'],
                '%.1f cm' % m['monograma_c']]
        d.text((cols[0], y), t, font=fnt('arialbd.ttf', 22), fill=NEGRO)
        for i, v in enumerate(vals):
            d.text((cols[i+1], y), v, font=fnt('consolab.ttf', 21), fill=NEGRO)
        y += 38
    return y


def pagina1(piezas, regla):
    img = Image.new('RGB', CARTA, (255, 255, 255))
    d = ImageDraw.Draw(img)
    encabezado(d, 'HOJA DE ESTAMPADO',
               'EPAL · Intramuros 2026 · pedido 60 · 57 camisetas + 1 a la medida',
               regla)
    y = 250
    y = bloque_artes(img, d, y, regla, piezas.get('6'))
    y = bloque_cantidades(d, y+24)
    y = bloque_medidas(d, y, piezas, regla)

    y = CARTA[1]-MARG-150
    d.line([(MARG, y), (CARTA[0]-MARG, y)], fill=LINEA, width=2)
    for i, t in enumerate([
            'El PECHO IZQUIERDO es el de quien usa la camiseta.',
            'La espalda son DOS transfers: primero el arco, luego la ilustracion. '
            'No vienen pegados — cada uno se mide por su F.',
            'DTF sobre tela de color · plancha 130-140 C, presion media, papel siliconado.',
            'Probar en un retazo antes de la primera pieza buena.']):
        d.text((MARG, y+18+i*32), '·  ' + t, font=fnt('arial.ttf', 21), fill=GRIS)
    return img


def pagina2(regla):
    """El diagrama acotado, encogido a la carta."""
    arch = 'ubicacion-artes_talla-6_%s.png' % regla
    if not os.path.exists(arch):
        UA.ficha('6', UA.cargar()['6'], regla)
    dia = Image.open(arch).convert('RGB')
    img = Image.new('RGB', CARTA, (255, 255, 255))
    d = ImageDraw.Draw(img)
    encabezado(d, 'COMO SE MIDE', 'Las letras de la tabla, sobre la pieza · '
                                  'ejemplo en talla 6', regla)
    disp = (CARTA[0]-2*MARG, CARTA[1]-420)
    esc = min(disp[0]/dia.size[0], disp[1]/dia.size[1])
    dia = dia.resize((int(dia.size[0]*esc), int(dia.size[1]*esc)), Image.LANCZOS)
    img.paste(dia, (MARG, 250))
    y = 250+dia.size[1]+30
    for i, t in enumerate([
            'A  del hombro al filo de arriba del arte',
            'B  del filo del escote al filo de arriba del arte',
            'F  del filo del escote al EJE del arte  <- la que se usa',
            'C  del centro de la pieza al eje del arte (0 = centrado)',
            'D y E  ancho y alto del arte']):
        d.text((MARG, y+i*34), t, font=fnt('consolab.ttf', 22),
               fill=ROJO if t.startswith('F') else NEGRO)
    return img


CARTA_H = (CARTA[1], CARTA[0])          # horizontal, para las paginas graficas


def cuantas(talla):
    """(total, detalle por color) de una talla."""
    det = [(c.split()[0], t[talla]) for c, t in PEDIDO.items() if t.get(talla)]
    return sum(n for _, n in det), det


def recortar(im, borde=12):
    """Quita el blanco de alrededor, que es lo que hacia chico el dibujo."""
    from PIL import ImageChops
    fondo = Image.new(im.mode, im.size, (255, 255, 255))
    caja = ImageChops.difference(im, fondo).getbbox()
    if not caja:
        return im
    x0, y0, x1, y1 = caja
    return im.crop((max(0, x0-borde), max(0, y0-borde),
                    min(im.size[0], x1+borde), min(im.size[1], y1+borde)))


def pagina_talla(talla, piezas, regla):
    """Una hoja horizontal por talla, con las 3 piezas y el arte puesto.

    Los paneles van 2 arriba y 1 abajo en vez de los 3 en fila: en fila la
    imagen queda tan ancha que al meterla en la carta las piezas salen chicas
    y sobra media hoja en blanco.
    """
    paneles = [recortar(p.convert('RGB')) for p in
               UA.paneles_de(talla, piezas, regla)]

    hueco = (CARTA_H[0]-2*MARG, CARTA_H[1]-290)
    sup_w = paneles[0].size[0] + paneles[1].size[0] + 40
    sup_h = max(paneles[0].size[1], paneles[1].size[1])
    total_w = max(sup_w, paneles[2].size[0])
    total_h = sup_h + 40 + paneles[2].size[1]
    esc = min(hueco[0]/float(total_w), hueco[1]/float(total_h))

    lienzo = Image.new('RGB', (total_w, total_h), (255, 255, 255))
    lienzo.paste(paneles[0], (0, 0))
    lienzo.paste(paneles[1], (paneles[0].size[0]+40, 0))
    lienzo.paste(paneles[2], (0, sup_h+40))
    lienzo = lienzo.resize((max(1, int(total_w*esc)), max(1, int(total_h*esc))),
                           Image.LANCZOS)

    img = Image.new('RGB', CARTA_H, (255, 255, 255))
    d = ImageDraw.Draw(img)
    total, det = cuantas(talla)
    d.text((MARG, 56), 'TALLA %s' % talla, font=fnt('arialbd.ttf', 58), fill=NEGRO)
    d.text((MARG+430, 76), '%d camisetas' % total, font=fnt('arialbd.ttf', 34), fill=ROJO)
    d.text((MARG+430, 120), '   ·   '.join('%s %d' % (c.lower(), n) for c, n in det),
           font=fnt('arial.ttf', 26), fill=GRIS)
    d.line([(MARG, 168), (CARTA_H[0]-MARG, 168)], fill=NEGRO, width=3)
    img.paste(lienzo, (MARG+(hueco[0]-lienzo.size[0])//2, 196))

    d.text((MARG, CARTA_H[1]-72),
           'F = del filo del escote (del ruedo en la manga) al EJE del arte, '
           'que es la linea punteada roja.   El pecho izquierdo es el de quien '
           'usa la camiseta.', font=fnt('arial.ttf', 22), fill=GRIS)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--regla', choices=['fija', 'proporcional'],
                    default='proporcional')
    args = ap.parse_args()
    piezas = UA.cargar()
    p1 = pagina1(piezas, args.regla)
    p2 = pagina2(args.regla)
    graficas = [pagina_talla(t, piezas[t], args.regla)
                for t in TALLAS if t in piezas]
    # PdfImagePlugin lee Image.SAVE["JPEG"] directo y Pillow carga los plugins
    # de forma perezosa: sin este init() el guardado del PDF revienta con
    # KeyError: 'JPEG'.
    Image.init()
    salida = 'HOJA-ESTAMPADO_EPAL-pedido60_%s.pdf' % args.regla
    paginas = [p2] + graficas
    p1.save(salida, save_all=True, append_images=paginas, resolution=DPI)
    p1.save(salida.replace('.pdf', '_p1.png'))
    graficas[0].save(salida.replace('.pdf', '_talla4.png'))
    print('-> %s  (%d paginas, carta, %d dpi)' % (salida, 1+len(paginas), DPI))
    print('   1 resumen · 1 como se mide · %d graficas, una por talla'
          % len(graficas))


if __name__ == '__main__':
    main()
