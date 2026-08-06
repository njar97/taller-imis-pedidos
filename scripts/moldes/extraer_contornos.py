# -*- coding: utf-8 -*-
"""Extrae el contorno real de cada molde del pack y deja el JSON para cargar.

    python extraer_contornos.py [carpeta_pdfs] [salida.json]

Por defecto lee `_Pack_Comprado_camiseta` de OneDrive. NO toca la base: solo
escribe el JSON y un informe. La carga va aparte, con el SQL de
`sql/2026-08-06_moldes_contorno.sql`.

Requiere PyMuPDF (`pip install pymupdf`).
"""
import json
import os
import re
import sys
from collections import defaultdict

from contornos import contorno_de, medidas_del_nombre

POR_DEFECTO = (r'C:\Users\confe\OneDrive\Documentos\UDP Confecciones'
               r'\Uniformes Escolares\Patrones_Tallas\_Pack_Comprado_camiseta')

CLAVE = re.compile(r'camiseta-T([\dA-Z]+)-(.+?)-[\d.]+x[\d.]+\.pdf$')


def clave(nom):
    m = CLAVE.match(nom)
    return (m.group(1), m.group(2)) if m else (None, None)


def escote(d):
    """Cuanto baja el punto mas hondo del cuello desde la orilla de arriba."""
    ancho = d['bbox_cm'][0]
    centro = [p for p in d['puntos'] if abs(p[0]-ancho/2.0) < ancho*0.06]
    return round(min(centro, key=lambda p: p[1])[1], 1) if centro else None


def main(carpeta, salida):
    archivos = sorted(f for f in os.listdir(carpeta)
                      if f.lower().endswith('.pdf') and f.startswith('camiseta-'))
    ok, fallo = [], []
    for nom in archivos:
        a, h = medidas_del_nombre(nom)
        if a is None:
            fallo.append((nom, 'el nombre no trae medidas'))
            continue
        try:
            r, motivo = contorno_de(os.path.join(carpeta, nom), a, h)
        except Exception as e:                       # PDF roto o inesperado
            fallo.append((nom, 'error: %s' % e))
            continue
        if r is None:
            fallo.append((nom, motivo))
            continue
        r['archivo_pdf'] = nom
        r['declarado'] = [a, h]
        r['escote_cm'] = escote(r)
        ok.append(r)

    print('extraidos %d de %d' % (len(ok), len(archivos)))
    for n, m in fallo:
        print('  FALLO %-46s %s' % (n, m))

    caja = sum(r['declarado'][0]*r['declarado'][1] for r in ok)
    real = sum(r['area_cm2'] for r in ok)
    print('\narea por cajas %.0f cm2 -> area real %.0f cm2 (%.1f%% menos)'
          % (caja, real, 100*(1-real/caja)))

    # piezas que son un rectangulo puro: la tira de cuello lo es de verdad,
    # una manga NO. Si una manga sale rectangular es un marco de la hoja.
    sosp = [r['archivo_pdf'] for r in ok
            if r['forma'] == 'rectangulo' and 'tira-cuello' not in r['archivo_pdf']]
    if sosp:
        print('\nRECTANGULOS SOSPECHOSOS (no son molde, son marco de la hoja):')
        for n in sosp:
            print('   ' + n)

    # piezas identicas dentro de una misma talla
    firmas = defaultdict(list)
    for r in ok:
        t, p = clave(r['archivo_pdf'])
        if t:
            firmas[(t, round(r['perimetro_cm'], 1), round(r['area_cm2'], 1))].append(p)
    rep = {k: v for k, v in firmas.items() if len(v) > 1}
    if rep:
        print('\nPIEZAS DUPLICADAS (mismo contorno dentro de la talla): %d grupos' % len(rep))
        for k in sorted(rep):
            print('   T%-5s %s' % (k[0], ', '.join(sorted(rep[k]))))

    json.dump(ok, open(salida, 'w', encoding='utf-8'))
    print('\n-> %s (%.0f KB)' % (salida, os.path.getsize(salida)/1024.0))
    return 0 if not fallo else 1


if __name__ == '__main__':
    carpeta = sys.argv[1] if len(sys.argv) > 1 else POR_DEFECTO
    salida = sys.argv[2] if len(sys.argv) > 2 else 'contornos_camiseta.json'
    sys.exit(main(carpeta, salida))
