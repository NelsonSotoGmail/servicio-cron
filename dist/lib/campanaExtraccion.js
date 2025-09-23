//serivicio-cron/lib/campanaExtraccion.ts
import { pool } from "./db.js";
export async function obtenerCampanaMesDíasPorRegistrarCron() {
    const query = `
   WITH dias_relevantes AS (
  SELECT generate_series(
    date_trunc('month', current_date),
    current_date,
    interval '1 day'
  )::date AS fecha
),
dias_filtrados AS (
  SELECT fecha
  FROM dias_relevantes
  WHERE EXTRACT(DOW FROM fecha) BETWEEN 1 AND 5 -- lunes a viernes
),
campanas_activas AS (
  SELECT DISTINCT
    c.id AS campana_id,
    c.nombre AS campana_nombre,
    t.id AS turno_id,
    t.nombre AS turno_nombre,
    e.id AS equipo_id,
    e.nombre AS equipo_nombre,
    -- Emails concatenados
    CONCAT_WS(',', 
      (SELECT email FROM usuario WHERE id = e.id_supervisor), 
      (SELECT email FROM usuario WHERE id = e.id_coordinador)
    ) AS emails_supervisor_coordinador,
    -- Nombre completo supervisor y coordinador
    (SELECT nombres || ' ' || apellidos FROM usuario WHERE id = e.id_supervisor) AS nombre_completo_supervisor,
    (SELECT nombres || ' ' || apellidos FROM usuario WHERE id = e.id_coordinador) AS nombre_completo_coordinador
  FROM campana c
  JOIN campana_turno ct ON ct.campana_id = c.id
  JOIN turno t ON t.id = ct.turno_id
  JOIN campana_turno_equipo cte ON cte.campana_id = c.id AND cte.turno_id = t.id
  JOIN equipo e ON e.id = cte.equipo_id
  WHERE c.estado = true
),
cruce AS (
  SELECT
    c.campana_id,
    c.campana_nombre,
    c.turno_id,
    c.turno_nombre,
    c.equipo_id,
    c.equipo_nombre,
    c.emails_supervisor_coordinador,
    c.nombre_completo_supervisor,
    c.nombre_completo_coordinador,
    d.fecha
  FROM campanas_activas c
  CROSS JOIN dias_filtrados d
),
asistencias_registradas AS (
  SELECT DISTINCT campana_id, turno_id, equipo_id, fecha::date
  FROM asistencias
),
faltantes AS (
  SELECT
    cruce.campana_nombre,
    cruce.turno_nombre,
    cruce.equipo_nombre,
    cruce.emails_supervisor_coordinador,
    cruce.nombre_completo_supervisor,
    cruce.nombre_completo_coordinador,
    cruce.fecha
  FROM cruce
  LEFT JOIN asistencias_registradas a ON
    cruce.campana_id = a.campana_id
    AND cruce.turno_id = a.turno_id
    AND cruce.equipo_id = a.equipo_id
    AND cruce.fecha = a.fecha
  WHERE a.fecha IS NULL
),
resumen AS (
  SELECT
    campana_nombre,
    turno_nombre,
    equipo_nombre,
    emails_supervisor_coordinador,
    nombre_completo_supervisor,
    nombre_completo_coordinador,
    TO_CHAR(fecha, 'TMMonth') AS mes,
    DATE_TRUNC('month', fecha) AS mes_orden,
    COUNT(*) AS dias_no_reportados,
    array_agg(fecha ORDER BY fecha) AS dias_faltantes
  FROM faltantes
  GROUP BY
    campana_nombre,
    turno_nombre,
    equipo_nombre,
    emails_supervisor_coordinador,
    nombre_completo_supervisor,
    nombre_completo_coordinador,
    DATE_TRUNC('month', fecha),
    TO_CHAR(fecha, 'TMMonth')
)
SELECT
  campana_nombre,
  turno_nombre,
  equipo_nombre,
  emails_supervisor_coordinador,
  nombre_completo_supervisor,
  nombre_completo_coordinador,
  TRIM(mes) AS mes,
  dias_no_reportados,
  dias_faltantes
FROM resumen
ORDER BY campana_nombre, turno_nombre, equipo_nombre, mes_orden;

  
  `;
    try {
        const { rows } = await pool.query(query);
        return rows;
    }
    catch (error) {
        console.error('Database Error:', error);
        throw new Error('Error al obtener días faltantes del mes actual');
    }
}
