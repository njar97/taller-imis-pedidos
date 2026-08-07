# -*- coding: utf-8 -*-
"""Que es cada `cuerpo-filaN`, deducido del trazo y no de un mapa fijo.

    python clasificar_cuerpos.py            # ensayo
    python clasificar_cuerpos.py --aplicar  # corrige la nota en taller_moldes

⚠ La numeracion de las filas NO significa lo mismo en las dos familias de
tallas. En las numericas (2-14) la trasera es `fila4`; en las de letra
(XS-XXL) es `fila3`, y `fila4` ni siquiera es un cuerpo. Por eso esto se
decide midiendo, no por nombre:

  * area muy por debajo del cuerpo mas grande de la talla -> no es cuerpo
    (es la manga larga que quedo mal nombrada);
  * entre los cuerpos: el escote mas hondo es el cuello en V, el mas somero
    es la trasera, y el del medio es el cuello redondo.
"""
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

URL = 'https://kszdievqesveluzcnzsh.supabase.co/rest/v1/taller_moldes'
KEY = 'sb_publishable_XCwHC4aEI6g4_AFXLXbzIg_QpUL_FpX'
APLICAR = '--aplicar' in sys.argv
AQUI = os.path.dirname(os.path.abspath(__file__))
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

ETIQUETAS = ['cuello redondo', 'cuello en V', 'trasera',
             'NO es cuerpo: por forma y medidas es una manga larga']


def pedir(metodo, ruta, cuerpo=None, params=''):
    req = urllib.request.Request(
        URL + ruta + params, method=metodo,
        data=json.dumps(cuerpo).encode('utf-8') if cuerpo is not None else None,
        headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY,
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(req, timeout=60) as r:
        txt = r.read().decode('utf-8')
        return json.loads(txt) if txt.strip() else None


def clasificar(piezas):
    """{pieza: etiqueta} para los cuerpo-filaN de una talla."""
    cuerpos = {p: d for p, d in piezas.items() if p.startswith('cuerpo-fila')}
    if not cuerpos:
        return {}
    mayor = max(d['area_cm2'] for d in cuerpos.values())
    reales = {p: d for p, d in cuerpos.items() if d['area_cm2'] >= 0.65*mayor}
    fuera = {p: ETIQUETAS[3] for p in cuerpos if p not in reales}

    esc = {p: (d.get('escote_cm') if d.get('escote_cm') is not None else 0.0)
           for p, d in reales.items()}
    hondo = max(esc.values())
    somero = min(esc.values())
    out = dict(fuera)
    for p, v in esc.items():
        out[p] = ETIQUETAS[1] if v == hondo else (
                 ETIQUETAS[2] if v == somero else ETIQUETAS[0])
    return out


def main():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    por_talla = defaultdict(dict)
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            por_talla[m.group(1)][m.group(2)] = d

    filas = pedir('GET', '', params='?prenda=eq.camiseta&select=id,archivo_pdf,nota&limit=500')
    por_pdf = {f['archivo_pdf']: f for f in filas}

    cambios = 0
    for talla in ['2', '4', '6', '8', '10', '12', '14',
                  'XS', 'S', 'M', 'L', 'XL', 'XXL']:
        piezas = por_talla.get(talla)
        if not piezas:
            continue
        etq = clasificar(piezas)
        print('T%-4s %s' % (talla, '  '.join(
            '%s=%s' % (p.replace('cuerpo-', ''), e.split(':')[0])
            for p, e in sorted(etq.items()))))
        for pieza, etiqueta in etq.items():
            fila = por_pdf.get(piezas[pieza]['archivo_pdf'])
            if not fila:
                continue
            # saca cualquier etiqueta vieja y deja la correcta adelante
            partes = [x.strip() for x in (fila.get('nota') or '').split('·')]
            partes = [x for x in partes if x and x not in ETIQUETAS]
            nueva = ' · '.join([etiqueta] + partes)
            if nueva != (fila.get('nota') or ''):
                cambios += 1
                if APLICAR:
                    pedir('PATCH', '', {'nota': nueva}, params='?id=eq.%d' % fila['id'])

    print('\nnotas a corregir: %d' % cambios)
    print('%s' % ('APLICADO' if APLICAR else 'ENSAYO: no se escribio nada'))


if __name__ == '__main__':
    main()
