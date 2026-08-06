# -*- coding: utf-8 -*-
"""Cuanta tela pide UNA camiseta por talla: caja contra contorno real.

Una camiseta armada = 1 delantera + 1 trasera + 2 mangas + 1 tira de cuello.
De los 6 "cuerpos" que trae el pack por talla, cuatro son duplicados o no son
cuerpo (ver notas en taller_moldes), asi que aca se toma uno de cada cosa.

El area real NO es el metraje: entre pieza y pieza queda desperdicio. Sirve
como piso teorico y para medir cuanto deja sobre la mesa el calculo por cajas.
"""
import json
import os
import re

AQUI = os.path.dirname(os.path.abspath(__file__))
CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')

# ⚠ La numeracion de las filas NO significa lo mismo en las dos familias de
# tallas: en las numericas la trasera es fila4, en las de letra es fila3.
# Y la manga tampoco: en las numericas manga-1 es un marco y la buena es
# manga-2; en las de letra manga-1 SI es la manga. Ver clasificar_cuerpos.py.
RECETA_NUM = {'cuerpo-fila1': 1,   # delantera, cuello redondo
              'cuerpo-fila4': 1,   # trasera
              'manga-2': 2,        # el par (manga-3 es su gemela)
              'tira-cuello': 1}
RECETA_LET = {'cuerpo-fila1': 1,   # delantera, cuello redondo
              'cuerpo-fila3': 1,   # trasera
              'manga-1': 2,
              'tira-cuello': 1}

NUMERICAS = ['2', '4', '6', '8', '10', '12', '14']
LETRAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
TALLAS = NUMERICAS + LETRAS


def main():
    datos = json.load(open(os.path.join(AQUI, 'contornos_camiseta.json'),
                           encoding='utf-8'))
    por_talla = {}
    for d in datos:
        m = CLAVE.match(d['archivo_pdf'])
        if m:
            por_talla.setdefault(m.group(1), {})[m.group(2)] = d

    print('%-6s %10s %10s %8s   %s' % ('talla', 'caja cm2', 'real cm2', 'ahorro', 'piezas'))
    print('-'*62)
    tot_caja = tot_real = 0.0
    for t in TALLAS:
        piezas = por_talla.get(t)
        if not piezas:
            continue
        receta = RECETA_NUM if t in NUMERICAS else RECETA_LET
        caja = real = 0.0
        usadas, faltan = [], []
        for pieza, n in receta.items():
            d = piezas.get(pieza)
            if not d:
                faltan.append(pieza)
                continue
            caja += n*d['declarado'][0]*d['declarado'][1]
            real += n*d['area_cm2']
            usadas.append('%dx%s' % (n, pieza))
        if faltan:
            usadas.append('FALTAN: ' + ','.join(faltan))
        if not caja:
            continue
        tot_caja += caja
        tot_real += real
        print('%-6s %10.0f %10.0f %7.1f%%   %s'
              % (t, caja, real, 100*(1-real/caja), ', '.join(usadas)))

    print('-'*62)
    print('%-6s %10.0f %10.0f %7.1f%%' % ('TOTAL', tot_caja, tot_real,
                                          100*(1-tot_real/tot_caja)))
    print('\nOJO: el area real es el piso teorico, no el metraje. El desperdicio')
    print('entre piezas se calcula al acomodarlas en el ancho de la tela.')


if __name__ == '__main__':
    main()
