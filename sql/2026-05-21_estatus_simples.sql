-- Simplificación de estatus de pedidos: de 9 a 4 estados visibles.
-- Cancelado deja de ser un estatus y se convierte en soft-delete.
--
-- Mapeo:
--   Tomado, En corte                                 → Corte
--   Diseño Wilcom, Bordado, En costura, En acabados → Producción
--   Listo                                             → Listo (sin cambio)
--   Entregado                                         → Entregado (sin cambio)
--   Cancelado                                         → soft-delete (deleted_at)
--
-- Aplicado en producción el 21-may-2026 via Management API.
-- Este archivo queda como documentación / repetible idempotente.

UPDATE public.taller_pedidos
   SET estatus = 'Corte'
 WHERE estatus IN ('Tomado', 'En corte')
   AND deleted_at IS NULL;

UPDATE public.taller_pedidos
   SET estatus = 'Producción'
 WHERE estatus IN ('Diseño Wilcom', 'Bordado', 'En costura', 'En acabados')
   AND deleted_at IS NULL;

UPDATE public.taller_pedidos
   SET deleted_at = now()
 WHERE estatus = 'Cancelado'
   AND deleted_at IS NULL;
