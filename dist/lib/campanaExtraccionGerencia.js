//serivicio-cron/lib/campanaExtraccionGerencia.ts
import { pool } from "./db.js";
export async function obtenerCampanaDiaReporteGerencia() {
    const query = `
   WITH campanas_activas AS (
  SELECT  DISTINCT ON (c.id, t.id, e.id)
    c.id AS campana_id,
    c.nombre AS campana_nombre,
    t.id AS turno_id,
    t.nombre AS turno_nombre,
    e.id AS equipo_id,
    e.nombre AS equipo_nombre,
    CONCAT_WS(',', 
      (SELECT email FROM usuario WHERE id = e.id_supervisor), 
      (SELECT email FROM usuario WHERE id = e.id_coordinador)
    ) AS emails_supervisor_coordinador,
    (SELECT nombres || ' ' || apellidos FROM usuario WHERE id = e.id_supervisor) AS nombre_completo_supervisor,
    (SELECT nombres || ' ' || apellidos FROM usuario WHERE id = e.id_coordinador) AS nombre_completo_coordinador
  FROM campana c
  JOIN campana_turno ct ON ct.campana_id = c.id
  JOIN turno t ON t.id = ct.turno_id
  JOIN campana_turno_equipo cte ON cte.campana_id = c.id AND cte.turno_id = t.id
  JOIN equipo e ON e.id = cte.equipo_id
  WHERE c.estado = true
),
equipo_conteo AS (
  SELECT
    id_equipo,
    COUNT(id_empleado) AS cantidad_equipo
  FROM equipo_colaborador
  GROUP BY id_equipo
),
asistentes_hoy AS (
  SELECT ec.id_equipo, COUNT(ae.id) AS cantidad_asistentes
  FROM asistencias_empleados ae
  JOIN equipo_colaborador ec ON ec.id_empleado = ae.empleado_id
  WHERE ae.fecha_creacion::date = NOW()::date
    AND ae.estado = 'Asistente'
  GROUP BY ec.id_equipo
)
SELECT
  ca.campana_nombre,
  ca.turno_nombre,
  ca.equipo_nombre,
  ca.emails_supervisor_coordinador,
  ca.nombre_completo_supervisor,
  ca.nombre_completo_coordinador,
  NOW()::date AS fecha,
  COALESCE(ec.cantidad_equipo, 0) AS cantidad_equipo,
  COALESCE(ah.cantidad_asistentes, 0) AS cantidad_asistentes,
  COALESCE(ec.cantidad_equipo, 0) - COALESCE(ah.cantidad_asistentes, 0) AS cantidad_ausentes
FROM campanas_activas ca
LEFT JOIN equipo_conteo ec ON ec.id_equipo = ca.equipo_id
LEFT JOIN asistentes_hoy ah ON ah.id_equipo = ca.equipo_id
ORDER BY ca.campana_nombre, ca.turno_nombre, ca.equipo_nombre;

  `;
    try {
        const { rows } = await pool.query(query);
        return rows;
    }
    catch (error) {
        console.error("Database Error:", error);
        throw new Error("Error al obtener reporte del día de hoy con conteo de equipo y asistencia");
    }
}
export async function obtenerCampanaDiaReporteGerenciaPorcentualGeneral() {
    const query = `
    WITH datos AS (
  SELECT 
    ec.id_equipo,
    COUNT(ec.id_empleado) AS cantidad_equipo,
    SUM(CASE WHEN ae.estado = 'Asistente' THEN 1 ELSE 0 END) AS cantidad_asistentes,
    SUM(CASE WHEN ae.estado = 'Licencia' THEN 1 ELSE 0 END) AS cantidad_licencias,
    SUM(CASE WHEN ae.estado = 'Libre' THEN 1 ELSE 0 END) AS cantidad_libres,
    SUM(CASE WHEN ae.estado = 'Vacaciones' THEN 1 ELSE 0 END) AS cantidad_vacaciones,
    SUM(CASE WHEN ae.estado = 'Permiso' THEN 1 ELSE 0 END) AS cantidad_permisos,
    SUM(CASE WHEN ae.estado = 'Ausente sin Justificación' THEN 1 ELSE 0 END) AS cantidad_ausentes_sin_justificacion,
    SUM(CASE WHEN ae.estado = 'Otro' THEN 1 ELSE 0 END) AS cantidad_otros
  FROM equipo_colaborador ec
  LEFT JOIN asistencias_empleados ae 
    ON ae.empleado_id = ec.id_empleado
   AND ae.asistencia_id IN (
       SELECT id FROM asistencias WHERE fecha::date = NOW()::date
   )
  GROUP BY ec.id_equipo
)
SELECT
  ROUND(100.0 * SUM(cantidad_equipo - cantidad_asistentes) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_total_ausencia,
  ROUND(100.0 * SUM(cantidad_asistentes) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_asistentes,
  ROUND(100.0 * SUM(cantidad_licencias) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_licencias,
  ROUND(100.0 * SUM(cantidad_libres) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_libres,
  ROUND(100.0 * SUM(cantidad_vacaciones) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_vacaciones,
  ROUND(100.0 * SUM(cantidad_permisos) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_permisos,
  ROUND(100.0 * SUM(cantidad_ausentes_sin_justificacion) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_ausentes_sin_justificacion,
  ROUND(100.0 * SUM(cantidad_otros) / NULLIF(SUM(cantidad_equipo),0), 2) AS porcentaje_otros
FROM datos;

  `;
    try {
        const { rows } = await pool.query(query);
        return rows[0];
    }
    catch (error) {
        console.error("Database Error:", error);
        throw new Error("Error al obtener resumen porcentual general del día de hoy");
    }
}
