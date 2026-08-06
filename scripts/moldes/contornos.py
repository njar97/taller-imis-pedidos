# -*- coding: utf-8 -*-
"""Extrae el contorno vectorial real de cada molde de camiseta del pack.

OJO: los PDF por pieza NO estan recortados, estan ENCUADRADOS. Cada archivo
trae TODOS los trazos de la hoja de ploter original y solo cambia el mediabox.
Por eso "el path mas grande" devuelve la pieza equivocada: hay que elegir el
trazo cuyo bbox coincide con el ancho x alto que declara el nombre/la BD.
"""
import math
import os
import re

import fitz

PT = 2.54/72.0          # puntos -> cm
TOL = 0.45              # cm de tolerancia al emparejar el bbox declarado
PASOS_BEZIER = 16


def a_cm(v):
    return v*PT


# ---------------- aplanado de los items de un path ----------------
def _bezier(p0, p1, p2, p3, n=PASOS_BEZIER):
    for i in range(1, n+1):
        t = i/float(n)
        u = 1-t
        yield (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
               u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])


def aplanar(dib):
    """Los items de un drawing -> lista de puntos en pt."""
    pts = []

    def add(p):
        p = (p[0], p[1])
        if not pts or abs(p[0]-pts[-1][0]) > 1e-6 or abs(p[1]-pts[-1][1]) > 1e-6:
            pts.append(p)

    for it in dib['items']:
        k = it[0]
        if k == 'l':
            add((it[1].x, it[1].y)); add((it[2].x, it[2].y))
        elif k == 'c':
            p0 = (it[1].x, it[1].y)
            add(p0)
            for p in _bezier(p0, (it[2].x, it[2].y), (it[3].x, it[3].y), (it[4].x, it[4].y)):
                add(p)
        elif k == 're':
            r = it[1]
            for p in [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]:
                add(p)
        elif k == 'qu':
            q = it[1]
            for p in [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]:
                add(p)
    return pts


# ---------------- geometria ----------------
def perimetro(pts):
    t = 0.0
    for i in range(len(pts)):
        x, y = pts[i]
        x2, y2 = pts[(i+1) % len(pts)]
        t += math.hypot(x2-x, y2-y)
    return t


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x, y = pts[i]
        x2, y2 = pts[(i+1) % len(pts)]
        s += x*y2 - x2*y
    return abs(s)/2.0


def ancho_a_la_altura(pts, y):
    """Extension horizontal del poligono en la horizontal y (max - min)."""
    xs = []
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i+1) % n]
        if (y1 <= y <= y2) or (y2 <= y <= y1):
            if abs(y2-y1) < 1e-9:
                xs += [x1, x2]
            else:
                xs.append(x1 + (x2-x1)*(y-y1)/(y2-y1))
    return (max(xs)-min(xs)) if len(xs) >= 2 else None


# ---------------- eleccion del trazo correcto ----------------
def elegir(pagina, ancho_cm, alto_cm):
    """El trazo cuyo bbox calza con las medidas declaradas y cae en el encuadre.

    Devuelve (puntos_pt, motivo) o (None, motivo del fallo).
    """
    rect = pagina.rect
    cands = []
    for d in pagina.get_drawings():
        b = d['rect']
        if b.is_empty or b.is_infinite:
            continue
        w, h = a_cm(b.width), a_cm(b.height)
        dw, dh = abs(w-ancho_cm), abs(h-alto_cm)
        if dw > TOL or dh > TOL:
            continue
        # tiene que estar dentro del encuadre, no ser otra talla de la hoja
        if not rect.intersects(b):
            continue
        solape = (rect & b).get_area() / max(b.get_area(), 1e-9)
        # Un molde tiene curvas; un marco es un rectangulo suelto. Con el mismo
        # bbox pueden convivir los dos (pasa en todas las mangas), asi que la
        # curva gana siempre. La tira-cuello es la excepcion legitima: ES un
        # rectangulo, y ahi no hay candidato con curvas al que ceder.
        curvas = sum(1 for it in d['items'] if it[0] == 'c')
        cands.append((0 if curvas else 1, -round(solape, 3), dw+dh, d, curvas))
    if not cands:
        return None, 'ningun trazo calza con %.1fx%.1f' % (ancho_cm, alto_cm)
    cands.sort(key=lambda c: c[:3])
    mejor = cands[0]
    pts = aplanar(mejor[3])
    if len(pts) < 4:
        return None, 'trazo con %d puntos, muy pobre' % len(pts)
    forma = 'curva' if mejor[4] else 'rectangulo'
    return pts, ('%d cand., %s, %d puntos' % (len(cands), forma, len(pts)))


def contorno_de(ruta, ancho_cm, alto_cm):
    """-> dict con el poligono en cm relativo a la caja, y las medidas derivadas."""
    doc = fitz.open(ruta)
    try:
        pts, motivo = elegir(doc[0], ancho_cm, alto_cm)
        if pts is None:
            return None, motivo
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        x0, y0 = min(xs), min(ys)
        # a cm, origen en la esquina de la caja, y hacia abajo (como alto_cm)
        pol = [(round(a_cm(x-x0), 3), round(a_cm(y-y0), 3)) for p in pts for x, y in [p]]
        h = max(p[1] for p in pol)
        med = {}
        for k, frac in (('ancho_25', 0.25), ('ancho_50', 0.50), ('ancho_75', 0.75)):
            v = ancho_a_la_altura(pol, h*frac)
            med[k] = round(v, 2) if v else None
        return {
            'puntos': pol,
            'forma': 'rectangulo' if 'rectangulo' in motivo else 'curva',
            'perimetro_cm': round(perimetro(pol), 2),
            'area_cm2': round(area(pol), 2),
            'bbox_cm': [round(max(p[0] for p in pol), 2), round(h, 2)],
            **med,
        }, motivo
    finally:
        doc.close()


MEDIDAS_EN_NOMBRE = re.compile(r'-(\d+\.?\d*)x(\d+\.?\d*)\.pdf$')


def medidas_del_nombre(nombre):
    m = MEDIDAS_EN_NOMBRE.search(nombre)
    return (float(m.group(1)), float(m.group(2))) if m else (None, None)
