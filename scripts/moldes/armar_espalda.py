# -*- coding: utf-8 -*-
"""Arma el arte de espalda: ilustracion + arco INTRAMUROS 2026.

En la hoja de Canva son DOS elementos separados, no uno solo:
    ilustracion  21.37 x 17.93 cm
    arco         20.96 x  4.93 cm
Aca se componen a esas medidas para poder verlos juntos en el mockup y en la
ficha de taller. Al imprimir siguen siendo dos transfers.
"""
from PIL import Image

BASE = (r'C:\Users\confe\My Embroidery\_Referencias'
        r'\Albino-Luciani-Intramuros-2026')
DPI = 300
CM = DPI/2.54

ANCHO_ILU = 21.37          # de Canva
ANCHO_ARCO = 20.96         # de Canva
SEPARACION = 0.5           # cm entre los dos, estimado

ilu = Image.open(BASE + r'\Arte_Albino-Luciani_ESPALDA_ninos.png').convert('RGBA')
arco = Image.open(BASE + r'\letras-diseno\INTRAMUROS-2026_arco-abajo_opcion2.png').convert('RGBA')
arco = arco.crop(arco.getbbox())

iw = int(ANCHO_ILU*CM)
ih = int(iw*ilu.size[1]/float(ilu.size[0]))
aw = int(ANCHO_ARCO*CM)
ah = int(aw*arco.size[1]/float(arco.size[0]))
sep = int(SEPARACION*CM)

W, H = iw, ih+sep+ah
out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
out.alpha_composite(ilu.resize((iw, ih), Image.LANCZOS), (0, 0))
out.alpha_composite(arco.resize((aw, ah), Image.LANCZOS), ((W-aw)//2, ih+sep))
out.save(BASE + r'\Arte_Albino-Luciani_ESPALDA_ninos-intramuros.png')

print('espalda armada: %d x %d px = %.2f x %.2f cm'
      % (W, H, W/CM, H/CM))
print('  ilustracion %.2f x %.2f cm' % (iw/CM, ih/CM))
print('  arco        %.2f x %.2f cm' % (aw/CM, ah/CM))
