# -*- coding: utf-8 -*-
"""Saca los patrones del uniforme DEPORTIVO del COED Salomon David Gonzalez.

    python deportivo_salomon.py                 # lamina de todas las tallas
    python deportivo_salomon.py --polo M --pans 12 --pdf

De donde sale cada pieza (nada se dibuja a mano, todo sale de `taller_moldes`):

  POLO  -> molde del pack, 8 piezas por talla. Se le hacen tres cambios:
           1. la DELANTERA se parte al medio, porque el frente es mitad gris y
              mitad navy. Cada mitad lleva 1 cm de costura en el corte nuevo.
           2. se le RESTA al cuerpo el alto del fajon tejido del ruedo, y a la
              manga el del puno: esas dos no se cortan en tela, se tejen.
           3. la tira de cuello del molde NO se usa — el cuello tambien es
              tejido, con las dos lineas.

  PANS  -> ⚠ APROXIMADO. En la base solo hay pantalon de VESTIR (trae platina de
           bragueta, bolsillo trasero y tapadera). El pants del deportivo es de
           buzo: cintura con resorte y sin bragueta. Se deriva quitando la
           platina, subiendo la cintura para el tunel del resorte y dejando
           solo la bolsa de lado. Sirve para calcular tela y para trazar una
           prueba — NO para cortar produccion sin probarlo antes en tela.

SUPUESTOS QUE HAY QUE CONFIRMAR EN EL TALLER (van impresos en la lamina):
  * que el contorno de los moldes YA trae margen de costura — sigue siendo
    pregunta abierta; por eso solo se agrega margen en el corte nuevo del centro;
  * fajon del ruedo 4.5 cm terminado (158 filas) y puno 3.0 cm;
  * la equivalencia entre las tallas de LETRA del polo y las NUMERICAS del
    pantalon: el pack no la trae, hay que fijarla midiendo.
"""
import json
import os
import sys

from cargar_contornos import pedir

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '_deportivo')

# lo que se teje y por lo tanto NO se corta en tela — ver [[fajon_medidas_por_talla]]
FAJON_CM = 4.5          # 158 filas doblado
PUNO_CM = 3.0           # 62-64 filas
COSTURA_CENTRO = 1.0    # el corte gris/navy es nuevo: si lleva margen

COLOR = {'gris': (0.62, 0.63, 0.65), 'navy': (0.11, 0.15, 0.27),
         'amarillo': (0.95, 0.76, 0.0), 'blanco': (0.97, 0.97, 0.96)}


# ─────────────────────────── geometria ───────────────────────────
def recortar(pts, x_corte, lado, margen=COSTURA_CENTRO):
    """Parte un contorno por una vertical y devuelve un lado, con margen.

    Recorre el contorno cerrado y, cada vez que un segmento cruza la vertical,
    mete el punto del cruce. Asi el borde nuevo queda pegado al trazo original
    y no hay que suponer nada de la forma de la pieza.
    """
    dentro = (lambda x: x <= x_corte) if lado == 'izq' else (lambda x: x >= x_corte)
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        if dentro(a[0]):
            out.append(a)
        if dentro(a[0]) != dentro(b[0]):            # el segmento cruza
            t = (x_corte - a[0]) / float(b[0] - a[0])
            out.append((x_corte, a[1] + t * (b[1] - a[1])))
    if not out:
        return []
    # el margen se agrega corriendo el borde nuevo hacia afuera
    d = margen if lado == 'izq' else -margen
    return [(p[0] + d, p[1]) if abs(p[0] - x_corte) < 1e-6 else p for p in out]


def acortar(pts, cm):
    """Le quita `cm` por abajo a una pieza (el ruedo o la boca de manga)."""
    if cm <= 0:
        return pts
    ymax = max(p[1] for p in pts) - cm
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        if a[1] <= ymax:
            out.append(a)
        if (a[1] <= ymax) != (b[1] <= ymax):
            t = (ymax - a[1]) / float(b[1] - a[1])
            out.append((a[0] + t * (b[0] - a[0]), ymax))
    return out


def alargar_arriba(pts, cm):
    """Sube el borde de arriba (para el tunel del resorte del pans)."""
    ymin = min(p[1] for p in pts)
    return [(x, y - cm if abs(y - ymin) < 0.6 else y) for x, y in pts]


def caja(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


# ─────────────────────────── datos ───────────────────────────
def moldes(prenda, talla):
    filas = pedir('GET', '', params=(
        '?prenda=eq.%s&talla=eq.%s&deleted_at=is.null'
        '&select=pieza,contorno,ancho_cm,alto_cm&limit=60' % (prenda, talla)))
    return {f['pieza']: f for f in filas if f.get('contorno')}


def piezas_polo(talla, genero='masculino'):
    """Las piezas del polo del deportivo, ya con los cambios aplicados."""
    m = moldes('polo', talla)
    g = ' · ' + genero
    out = []

    d = m.get('delantera' + g)
    if d:
        pts = acortar([tuple(p) for p in d['contorno']['puntos']], FAJON_CM)
        medio = (min(p[0] for p in pts) + max(p[0] for p in pts)) / 2.0
        out.append(('delantera IZQ (gris)', 'gris', recortar(pts, medio, 'izq'), 1))
        out.append(('delantera DER (navy)', 'navy', recortar(pts, medio, 'der'), 1))

    t = m.get('trasera' + g)
    if t:
        out.append(('trasera entera', 'amarillo',
                    acortar([tuple(p) for p in t['contorno']['puntos']], FAJON_CM), 1))

    mg = m.get('manga-1' + g)
    if mg:
        out.append(('manga', 'amarillo',
                    acortar([tuple(p) for p in mg['contorno']['puntos']], PUNO_CM), 2))

    for pieza, nom in (('tapeta' + g, 'tapeta'), ('vista-tapeta' + g, 'vista de tapeta')):
        p = m.get(pieza)
        if p:
            out.append((nom, 'navy', [tuple(q) for q in p['contorno']['puntos']], 1))
    return out


def piezas_pans(talla):
    """⚠ Derivado del pantalon de VESTIR: aproximado, ver el encabezado."""
    m = moldes('pantalon', talla)
    out = []
    for pieza, nom, n in (('delantera', 'delantera', 2), ('trasera', 'trasera', 2)):
        p = m.get(pieza)
        if p:
            pts = alargar_arriba([tuple(q) for q in p['contorno']['puntos']], 4.0)
            out.append((nom + ' (+4 cm de tunel para el resorte)', 'navy', pts, n))
    b = m.get('bolsa')
    if b:
        out.append(('bolsa de lado', 'navy', [tuple(q) for q in b['contorno']['puntos']], 2))
    return out


# ─────────────────────────── dibujo ───────────────────────────
def lamina(grupos, ruta, titulo, notas):
    """Una hoja con todas las piezas a escala, acotadas. Para ver el conjunto."""
    import fitz
    ESC = 28.35 / 10.0            # 1 cm = 2.835 pt  (o sea 1:10 en pt)
    MARG, GAP, CAB = 40, 22, 96

    filas = []
    for tit, ps in grupos:
        filas.append((tit, ps))
    anchos = [sum(caja(p[2])[2] - caja(p[2])[0] for p in ps) * ESC + GAP * len(ps)
              for _, ps in filas]
    altos = [max((caja(p[2])[3] - caja(p[2])[1]) for p in ps) * ESC for _, ps in filas]
    W = max(anchos) + MARG * 2
    H = CAB + sum(a + 66 for a in altos) + MARG + 20 * (len(notas) + 1)

    doc = fitz.open()
    pg = doc.new_page(width=W, height=H)
    pg.insert_text((MARG, 44), titulo, fontsize=19, fontname='hebo')
    pg.insert_text((MARG, 64), 'Escala del dibujo 1:10 — las medidas van en cm',
                   fontsize=8.5, color=(0.45, 0.45, 0.45))

    y = CAB
    for (tit, ps), alto in zip(filas, altos):
        pg.insert_text((MARG, y - 8), tit, fontsize=11, fontname='hebo')
        x = MARG
        for i, (nom, col, pts, n) in enumerate(ps):
            x0, y0, x1, y1 = caja(pts)
            poli = [fitz.Point(x + (px - x0) * ESC, y + (py - y0) * ESC) for px, py in pts]
            pg.draw_polyline(poli + [poli[0]], color=(0.15, 0.15, 0.2),
                             fill=COLOR[col], width=0.7, fill_opacity=0.5)
            # ⚠ Las piezas angostas (tapeta, bolsa) son mas cortas que su
            # etiqueta y los textos se montaban unos sobre otros. Se alternan
            # en dos renglones.
            dy = 12 if i % 2 == 0 else 34
            pg.insert_text((x, y + alto + dy),
                           '%s%s' % (nom, '  x%d' % n if n > 1 else ''), fontsize=7.5)
            pg.insert_text((x, y + alto + dy + 10), '%.1f x %.1f cm · %.0f cm2'
                           % (x1 - x0, y1 - y0, area(pts)), fontsize=7,
                           color=(0.45, 0.45, 0.45))
            x += (x1 - x0) * ESC + GAP
        y += alto + 66

    y += 6
    for nota in notas:
        pg.insert_text((MARG, y), nota, fontsize=8, color=(0.35, 0.35, 0.35))
        y += 13
    doc.save(ruta)
    doc.close()


def pdf_pieza(nom, pts, ruta):
    """Un PDF por pieza a escala 1:1 real, como los moldes del taller."""
    import fitz
    PT = 28.3465                                   # 1 cm en puntos
    x0, y0, x1, y1 = caja(pts)
    W, H = (x1 - x0) * PT + 2 * PT, (y1 - y0) * PT + 3 * PT
    doc = fitz.open()
    pg = doc.new_page(width=W, height=H)
    poli = [fitz.Point(PT + (px - x0) * PT, PT + (py - y0) * PT) for px, py in pts]
    pg.draw_polyline(poli + [poli[0]], color=(0, 0, 0), width=0.9)
    pg.insert_text((PT, H - PT), '%s   %.1f x %.1f cm   escala 1:1'
                   % (nom, x1 - x0, y1 - y0), fontsize=9)
    doc.save(ruta)
    doc.close()


# ─────────────────────────── main ───────────────────────────
def main():
    talla_polo = sys.argv[sys.argv.index('--polo') + 1] if '--polo' in sys.argv else 'M'
    talla_pans = sys.argv[sys.argv.index('--pans') + 1] if '--pans' in sys.argv else '12'
    os.makedirs(SALIDA, exist_ok=True)

    polo = piezas_polo(talla_polo)
    pans = piezas_pans(talla_pans)
    print('polo T%s: %d piezas   pans T%s: %d piezas'
          % (talla_polo, len(polo), talla_pans, len(pans)))

    tela = {}
    for nom, col, pts, n in polo + pans:
        tela[col] = tela.get(col, 0) + area(pts) * n
    for col, a in sorted(tela.items(), key=lambda t: -t[1]):
        print('   %-10s %7.0f cm2 = %.2f m2' % (col, a, a / 10000.0))

    largo_costado = max((caja(p[2])[3] - caja(p[2])[1]) for p in pans) if pans else 0
    cinta = largo_costado * 2 / 100.0
    print('   franjas: %.2f m de banda por pantalon (2 costados de %.0f cm)'
          % (cinta, largo_costado))

    notas = [
        'Las TRES franjas del costado no son pieza de corte: van sobre la costura lateral. Por pantalon se ocupan %.2f m de banda (2 costados de %.0f cm).' % (cinta, largo_costado),
        'APROXIMADO. El polo sale del molde del pack; el pans se deriva del pantalon de VESTIR de la base y hay que probarlo en tela antes de cortar produccion.',
        'Al cuerpo se le restaron %.1f cm por el fajon tejido del ruedo y a la manga %.1f cm por el puno. El cuello no se corta: tambien es tejido.' % (FAJON_CM, PUNO_CM),
        'La delantera se parte al medio (gris / navy) con %.1f cm de costura en el corte nuevo. La tapeta va sobre la mitad navy.' % COSTURA_CENTRO,
        'SIN CONFIRMAR: si el contorno de los moldes ya incluye margen de costura, y la equivalencia entre las tallas de letra del polo y las numericas del pantalon.',
    ]
    ruta = os.path.join(SALIDA, 'PATRONES_deportivo-Salomon_polo-%s_pans-%s.pdf'
                        % (talla_polo, talla_pans))
    lamina([('POLO  talla %s' % talla_polo, polo),
            ('PANS  talla %s  (aproximado)' % talla_pans, pans)],
           ruta, 'Deportivo COED Salomon David Gonzalez — patrones', notas)
    print('->', os.path.basename(ruta))

    if '--pdf' in sys.argv:
        uno = os.path.join(SALIDA, '1a1')
        os.makedirs(uno, exist_ok=True)
        for etiqueta, ps in (('polo-%s' % talla_polo, polo), ('pans-%s' % talla_pans, pans)):
            for nom, col, pts, n in ps:
                limpio = nom.split('(')[0].strip().replace(' ', '-')
                pdf_pieza(nom, pts, os.path.join(uno, '%s_%s.pdf' % (etiqueta, limpio)))
        print('-> %d PDF 1:1 en %s' % (len(polo) + len(pans), uno))
    return ruta


if __name__ == '__main__':
    main()
