-- Simplificación de estatus en Bordados y Cuellos (21-may-2026).
-- Mismo patrón que se hizo con Pedidos: 4 estados visibles + Cancelado
-- pasa a soft-delete.
--
-- Aplicado en producción via Management API. Idempotente.

-- BORDADOS: Tomado, Diseño Wilcom, Prueba bordado, En producción, Listo,
-- Entregado, Cancelado → Diseño, Bordado, Listo, Entregado, [papelera]
UPDATE public.taller_bordados
   SET estatus = 'Diseño'
 WHERE estatus IN ('Tomado', 'Diseño Wilcom', 'Prueba bordado')
   AND deleted_at IS NULL;

UPDATE public.taller_bordados
   SET estatus = 'Bordado'
 WHERE estatus = 'En producción'
   AND deleted_at IS NULL;

UPDATE public.taller_bordados
   SET deleted_at = now()
 WHERE estatus = 'Cancelado'
   AND deleted_at IS NULL;

-- CUELLOS: Tomado, En tejido, Control calidad, Listo, Entregado, Cancelado
-- → Pendiente, Tejido, Listo, Entregado, [papelera]
UPDATE public.taller_cuellos
   SET estatus = 'Pendiente'
 WHERE estatus = 'Tomado'
   AND deleted_at IS NULL;

UPDATE public.taller_cuellos
   SET estatus = 'Tejido'
 WHERE estatus IN ('En tejido', 'Control calidad')
   AND deleted_at IS NULL;

UPDATE public.taller_cuellos
   SET deleted_at = now()
 WHERE estatus = 'Cancelado'
   AND deleted_at IS NULL;
