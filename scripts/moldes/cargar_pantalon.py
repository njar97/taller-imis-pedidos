# -*- coding: utf-8 -*-
"""Carga los contornos del pantalon a `taller_moldes`.

    python cargar_pantalon.py [--aplicar]

No se reusa `cargar_contornos.py` porque ese empareja por `archivo_pdf`, y los
PDF del pantalon se llaman distinto en disco (`-ACOTADO.pdf`) que en la base.
Aca el emparejamiento va por (talla, pieza), que es unico. Cuando una pieza
existe acotada y ademas interpolada, gana la ACOTADA: es el trazo real.
"""
import json
import sys

from cargar_contornos import pedir, perimetro, simplificar

APLICAR = '--aplicar' in sys.argv


def main():
    datos = json.load(open('contornos_pantalon.json', encoding='utf-8'))
    filas = pedir('GET', '',
                  params='?prenda=eq.pantalon&select=id,talla,pieza,origen&limit=500')
    por_clave = {(f['talla'], f['pieza']): f for f in filas}
    print('en la base: %d filas de pantalon' % len(filas))

    antes = despues = 0
    hechas, sin_fila, vistas = 0, [], set()
    for d in datos:
        k = (d['talla'], d['pieza'])
        fila = por_clave.get(k)
        if not fila:
            sin_fila.append(k)
            continue
        if k in vistas:
            continue
        vistas.add(k)
        pts = d['puntos']
        antes += len(pts)
        simple = simplificar(pts) if len(pts) > 4 else pts
        despues += len(simple)
        parche = {'contorno': {'puntos': simple, 'forma': d['forma'],
                               'area_cm2': d['area_cm2']},
                  'perimetro_cm': round(perimetro(simple), 2),
                  'ancho_25': d['ancho_25'], 'ancho_50': d['ancho_50'],
                  'ancho_75': d['ancho_75']}
        if APLICAR:
            pedir('PATCH', '', parche, params='?id=eq.%d' % fila['id'])
        hechas += 1

    print('puntos: %d -> %d (%.0f%% menos)'
          % (antes, despues, 100*(1-despues/float(antes))))
    print('filas actualizadas: %d   sin fila: %d %s'
          % (hechas, len(sin_fila), sin_fila[:6]))
    print('APLICADO' if APLICAR else 'ENSAYO: no se escribio nada')


if __name__ == '__main__':
    main()
