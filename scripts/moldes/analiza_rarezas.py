# -*- coding: utf-8 -*-
"""Dos rarezas de la lamina: (1) filas que se repiten, (2) manga-1 rectangular."""
import json
import os
import re
from collections import defaultdict

import fitz

from contornos import a_cm, medidas_del_nombre

BASE = (r'C:\Users\confe\OneDrive\Documentos\UDP Confecciones'
        r'\Uniformes Escolares\Patrones_Tallas\_Pack_Comprado_camiseta')

datos = json.load(open('contornos_camiseta.json', encoding='utf-8'))
por_arch = {d['archivo_pdf']: d for d in datos}


def clave(nom):
    m = re.match(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$', nom)
    return (m.group(1), m.group(2)) if m else (None, None)


# ---------- 1. profundidad del escote y piezas repetidas ----------
def escote(d):
    """Cuanto baja el punto mas hondo del cuello desde la orilla de arriba."""
    pts = d['puntos']
    ancho = d['bbox_cm'][0]
    centro = [p for p in pts if abs(p[0]-ancho/2.0) < ancho*0.06]
    return round(min(centro, key=lambda p: p[1])[1], 1) if centro else None


print('=== cuerpos de la T6: que es cada fila ===')
for nom in sorted(n for n in por_arch if n.startswith('camiseta-T6-cuerpo')):
    d = por_arch[nom]
    print('  %-26s escote %-5s perim %6.1f  area %7.1f'
          % (clave(nom)[1], escote(d), d['perimetro_cm'], d['area_cm2']))

print('\n=== firmas repetidas (misma talla) ===')
firmas = defaultdict(list)
for nom, d in por_arch.items():
    t, p = clave(nom)
    if t:
        firmas[(t, round(d['perimetro_cm'], 1), round(d['area_cm2'], 1))].append(p)
rep = {k: v for k, v in firmas.items() if len(v) > 1}
for k in sorted(rep)[:10]:
    print('  T%-4s perim %7.1f -> %s' % (k[0], k[1], ', '.join(sorted(rep[k]))))
print('  (%d grupos repetidos de %d piezas)' % (len(rep), len(por_arch)))

# ---------- 2. manga-1: hay algun trazo con curvas a esa medida? ----------
print('\n=== manga-1: existe un trazo con curvas en ese bbox? ===')
for nom in sorted(n for n in por_arch if '-manga-1-' in n):
    a, h = medidas_del_nombre(nom)
    doc = fitz.open(os.path.join(BASE, nom))
    curvos = rectos = 0
    for dr in doc[0].get_drawings():
        b = dr['rect']
        if b.is_empty or abs(a_cm(b.width)-a) > 0.45 or abs(a_cm(b.height)-h) > 0.45:
            continue
        if any(it[0] == 'c' for it in dr['items']):
            curvos += 1
        else:
            rectos += 1
    doc.close()
    print('  %-40s curvos=%d rectos=%d  %s'
          % (nom, curvos, rectos, 'SOSPECHOSO: solo marco' if not curvos else ''))

# ---------- 3. inventario de piezas por talla ----------
print('\n=== piezas por talla ===')
inv = defaultdict(list)
for nom in por_arch:
    t, p = clave(nom)
    if t:
        inv[t].append(p)
for t in sorted(inv, key=lambda x: (len(x), x)):
    print('  T%-5s (%d) %s' % (t, len(inv[t]), ', '.join(sorted(inv[t]))))
