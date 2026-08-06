# -*- coding: utf-8 -*-
"""Carga los contornos extraidos a `taller_moldes` via PostgREST.

    python cargar_contornos.py            # ensayo, no escribe
    python cargar_contornos.py --aplicar  # escribe

Escribe `contorno`, `perimetro_cm` y `ancho_25/50/75`, y ademas ordena tres
cosas que salieron de la extraccion:

  * las `manga-1` de las tallas numericas son MARCOS de la hoja, no moldes ->
    se van a la papelera (`deleted_at`), que es reversible;
  * las piezas con contorno identico dentro de una talla se anotan como
    duplicadas, para que el calculo de tela no las cuente dos veces;
  * se anota que es cada `cuerpo-filaN` (redondo / en V / trasera), que era
    una pregunta abierta del pack.

La key es la publishable (anon). `taller_moldes` tiene politica `anon all`.
"""
import json
import math
import os
import re
import sys
import urllib.request
from collections import defaultdict

URL = 'https://kszdievqesveluzcnzsh.supabase.co/rest/v1/taller_moldes'
KEY = 'sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX'
TOL_SIMPL = 0.05        # cm; por debajo de esto no hay tijera que lo note

APLICAR = '--aplicar' in sys.argv
AQUI = os.path.dirname(os.path.abspath(__file__))
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

MARCA_FANTASMA = 'NO ES MOLDE: es el marco de la hoja de ploter'
ESCOTES = {'cuerpo-fila1': 'cuello redondo', 'cuerpo-fila2': 'cuello redondo',
           'cuerpo-fila3': 'cuello en V', 'cuerpo-fila4': 'trasera',
           'cuerpo-fila5': 'trasera',
           'cuerpo-fila6': 'NO es cuerpo: por forma y medidas es una manga larga'}


def pedir(metodo, ruta, cuerpo=None, params=''):
    req = urllib.request.Request(
        URL + ruta + params, method=metodo,
        data=json.dumps(cuerpo).encode('utf-8') if cuerpo is not None else None,
        headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(req, timeout=60) as r:
        txt = r.read().decode('utf-8')
        return json.loads(txt) if txt.strip() else None


# ---------------- simplificacion ----------------
def _dist(p, a, b):
    if a == b:
        return math.hypot(p[0]-a[0], p[1]-a[1])
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = max(0.0, min(1.0, ((p[0]-a[0])*dx + (p[1]-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy))


def simplificar(pts, tol=TOL_SIMPL):
    """Douglas-Peucker. Baja el peso de la fila sin mover el trazo."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    i, peor = 0, 0.0
    for k in range(1, len(pts)-1):
        d = _dist(pts[k], a, b)
        if d > peor:
            i, peor = k, d
    if peor <= tol:
        return [a, b]
    return simplificar(pts[:i+1], tol)[:-1] + simplificar(pts[i:], tol)


def perimetro(pts):
    return sum(math.hypot(pts[(i+1) % len(pts)][0]-p[0],
                          pts[(i+1) % len(pts)][1]-p[1])
               for i, p in enumerate(pts))


def main():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    filas = pedir('GET', '',
                  params='?prenda=eq.camiseta&select=id,talla,pieza,archivo_pdf,nota&limit=500')
    por_pdf = {f['archivo_pdf']: f for f in filas}
    print('en la base: %d filas de camiseta' % len(filas))

    # piezas identicas dentro de una misma talla
    firmas = defaultdict(list)
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            firmas[(m.group(1), round(d['perimetro_cm'], 1),
                    round(d['area_cm2'], 1))].append(d['archivo_pdf'])
    gemelas = {}
    for grupo in firmas.values():
        if len(grupo) > 1:
            for a in grupo:
                gemelas[a] = [CLAVE.match(x).group(2) for x in sorted(grupo)
                              if x != a]

    antes = despues = 0
    sin_fila, actualizadas, fantasmas = [], 0, []
    for d in datos:
        fila = por_pdf.get(d['archivo_pdf'])
        if not fila:
            sin_fila.append(d['archivo_pdf'])
            continue
        m = CLAVE.match(d['archivo_pdf'])
        pieza = m.group(2) if m else ''

        pts = d['puntos']
        antes += len(pts)
        simple = simplificar(pts) if len(pts) > 4 else pts
        despues += len(simple)

        notas = [n for n in [fila.get('nota')] if n]
        marcado = ' · '.join(notas)

        es_fantasma = d['forma'] == 'rectangulo' and 'tira-cuello' not in d['archivo_pdf']
        if es_fantasma and MARCA_FANTASMA not in marcado:
            notas.append(MARCA_FANTASMA)
        if pieza in ESCOTES and ESCOTES[pieza] not in marcado:
            notas.append(ESCOTES[pieza])
        if d['archivo_pdf'] in gemelas and 'contorno identico' not in marcado:
            notas.append('contorno identico a ' + ', '.join(gemelas[d['archivo_pdf']])
                         + ' — no contar dos veces al calcular tela')

        parche = {
            'contorno': {'puntos': simple, 'forma': d['forma'],
                         'area_cm2': d['area_cm2'], 'escote_cm': d.get('escote_cm')},
            'perimetro_cm': round(perimetro(simple), 2),
            'ancho_25': d['ancho_25'], 'ancho_50': d['ancho_50'],
            'ancho_75': d['ancho_75'],
            'nota': ' · '.join(notas) or None,
        }
        if es_fantasma:
            fantasmas.append((fila['id'], d['archivo_pdf']))
            parche['deleted_at'] = '2026-08-06T00:00:00Z'

        if APLICAR:
            pedir('PATCH', '', parche, params='?id=eq.%d' % fila['id'])
        actualizadas += 1

    print('puntos: %d -> %d tras simplificar (%.0f%% menos)'
          % (antes, despues, 100*(1-despues/float(antes))))
    print('filas a actualizar: %d' % actualizadas)
    print('sin fila en la base: %d %s' % (len(sin_fila), sin_fila[:5]))
    print('a la papelera (marcos, no moldes): %d' % len(fantasmas))
    for i, n in fantasmas:
        print('   id %-5s %s' % (i, n))
    print('\n%s' % ('APLICADO' if APLICAR else 'ENSAYO: no se escribio nada'))


if __name__ == '__main__':
    main()
