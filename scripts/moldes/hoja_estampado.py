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
        ('ESPALDA', 'ilustracion, centrada',
         os.path.join(UA.ARTES, UA.ESPALDA_PNG), UA.ANCHO_ESPALDA),
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
    cols = [MARG+8, MARG+220, MARG+460, MARG+700, MARG+940, MARG+1200]
    cab = ['talla', 'monograma F', 'espalda F', 'manga F', 'monograma C']
    for i, c in enumerate(cab):
        d.text((cols[i], y), c, font=fnt('arialbd.ttf', 21), fill=NEGRO)
    y += 34
    d.line([(MARG, y), (CARTA[0]-MARG, y)], fill=NEGRO, width=2)
    y += 10
    for t in TALLAS:
        if t not in piezas:
            continue
        fam = 'num' if t in UA.NUMERICAS else 'let'
        lados = UA.LADOS_NUM if fam == 'num' else UA.LADOS_LET
        delantera = piezas[t][lados['delantera']]
        espalda = piezas[t][lados['espalda']]
        manga = piezas[t][lados['manga']]

        b_m = UA.b_de('monograma', delantera, regla)
        alto_m = UA.ANCHO_MONOGRAMA*Image.open(
            os.path.join(UA.ARTES, UA.MONOGRAMA_PNG)).size[1]/float(
            Image.open(os.path.join(UA.ARTES, UA.MONOGRAMA_PNG)).size[0])
        f_m = UA.escote_de(delantera)+b_m+alto_m/2.0 - UA.escote_de(delantera)

        b_e = UA.b_de('espalda', espalda, regla)
        im_e = Image.open(os.path.join(UA.ARTES, UA.ESPALDA_PNG))
        alto_e = UA.ANCHO_ESPALDA*im_e.size[1]/float(im_e.size[0])
        f_e = b_e + alto_e/2.0

        f_mg = UA.NOMBRE_DEL_RUEDO + 2.44/2.0

        _, x_der = UA.orilla_a_la_altura(delantera['puntos'],
                                         UA.escote_de(delantera)+b_m)
        c_m = (x_der - delantera['bbox_cm'][0]/2.0)/2.0

        vals = ['%.1f cm' % f_m, '%.1f cm' % f_e, '%.1f cm' % f_mg, '%.1f cm' % c_m]
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--regla', choices=['fija', 'proporcional'],
                    default='proporcional')
    args = ap.parse_args()
    piezas = UA.cargar()
    p1 = pagina1(piezas, args.regla)
    p2 = pagina2(args.regla)
    # PdfImagePlugin lee Image.SAVE["JPEG"] directo y Pillow carga los plugins
    # de forma perezosa: sin este init() el guardado del PDF revienta con
    # KeyError: 'JPEG'.
    Image.init()
    salida = 'HOJA-ESTAMPADO_EPAL-pedido60_%s.pdf' % args.regla
    p1.save(salida, save_all=True, append_images=[p2], resolution=DPI)
    p1.save(salida.replace('.pdf', '_p1.png'))
    print('-> %s  (2 paginas, carta, %d dpi)' % (salida, DPI))


if __name__ == '__main__':
    main()
