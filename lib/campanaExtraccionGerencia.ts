//serivicio-cron/lib/campanaExtraccionGerencia.ts
import { pool } from "./db.js";

export type CampanaDiaConEmails = {
  campana_nombre: string;
  turno_nombre: string;
  equipo_nombre: string;
  emails_supervisor_coordinador: string;
  nombre_completo_supervisor: string;
  nombre_completo_coordinador: string;
  fecha: string; // ISO string
  cantidad_equipo: number;
  cantidad_asistentes: number;
  cantidad_ausentes: number;
  nacionalidad: string;
};

export async function obtenerCampanaDiaReporteGerencia(): Promise<
  CampanaDiaConEmails[]
> {
  const query = `
  WITH campanas_activas AS (
    SELECT DISTINCT ON (c.id, t.id, e.id)
      c.id AS campana_id,
      c.nombre AS campana_nombre,
      c.nacionalidad,
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
    SELECT id_equipo, COUNT(id_empleado) AS cantidad_equipo
    FROM equipo_colaborador
    GROUP BY id_equipo
  ),
  asistentes_hoy AS (
    SELECT ec.id_equipo, COUNT(DISTINCT ae.empleado_id) AS cantidad_asistentes
    FROM asistencias_empleados ae
    JOIN equipo_colaborador ec ON ec.id_empleado = ae.empleado_id
    WHERE ae.fecha_creacion::date = NOW()::date
      AND ae.estado = 'Asistente'
    GROUP BY ec.id_equipo
  )
  SELECT
    ca.campana_nombre,
    ca.nacionalidad,
    ca.turno_nombre,
    ca.equipo_nombre,
    ca.emails_supervisor_coordinador,
    ca.nombre_completo_supervisor,
    ca.nombre_completo_coordinador,
    NOW()::date AS fecha,
    COALESCE(ec.cantidad_equipo, 0) AS cantidad_equipo,
    COALESCE(ah.cantidad_asistentes, 0) AS cantidad_asistentes,
    GREATEST(COALESCE(ec.cantidad_equipo, 0) - COALESCE(ah.cantidad_asistentes, 0), 0) AS cantidad_ausentes
  FROM campanas_activas ca
  LEFT JOIN equipo_conteo ec ON ec.id_equipo = ca.equipo_id
  LEFT JOIN asistentes_hoy ah ON ah.id_equipo = ca.equipo_id
  ORDER BY ca.nacionalidad, ca.campana_nombre, ca.turno_nombre, ca.equipo_nombre;
  `;

  try {
    const { rows } = await pool.query<CampanaDiaConEmails>(query);
    return rows;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(
      "Error al obtener reporte del día de hoy con conteo de equipo y asistencia"
    );
  }
}

export type ResumenPorcentualGeneral = {
  porcentaje_total_ausencia: number;
  porcentaje_asistentes: number;
  porcentaje_licencias: number;
  porcentaje_libres: number;
  porcentaje_vacaciones: number;
  porcentaje_permisos: number;
  porcentaje_ausentes_sin_justificacion: number;
  porcentaje_otros: number;
};

export async function obtenerCampanaDiaReporteGerenciaPorcentualGeneral(): Promise<ResumenPorcentualGeneral> {
  const query = `
   WITH asistencia_unica AS (
      SELECT DISTINCT ON (ae.empleado_id) 
             ae.empleado_id, 
             ae.estado
      FROM asistencias_empleados ae
      INNER JOIN asistencias a 
              ON ae.asistencia_id = a.id
      WHERE a.fecha::date = NOW()::date
      ORDER BY ae.empleado_id, ae.id
    ),
    -- Segundo paso: calcular totales por equipo
    datos AS (
      SELECT 
        ec.id_equipo,
        COUNT(ec.id_empleado) AS cantidad_equipo,
        SUM(CASE WHEN au.estado = 'Asistente' THEN 1 ELSE 0 END) AS cantidad_asistentes,
        SUM(CASE WHEN au.estado = 'Licencia' THEN 1 ELSE 0 END) AS cantidad_licencias,
        SUM(CASE WHEN au.estado = 'Libre' THEN 1 ELSE 0 END) AS cantidad_libres,
        SUM(CASE WHEN au.estado = 'Vacaciones' THEN 1 ELSE 0 END) AS cantidad_vacaciones,
        SUM(CASE WHEN au.estado = 'Permiso' THEN 1 ELSE 0 END) AS cantidad_permisos,
        SUM(CASE WHEN au.estado = 'Ausente sin Justificación' THEN 1 ELSE 0 END) AS cantidad_ausentes_sin_justificacion,
        SUM(CASE WHEN au.estado = 'Otro' THEN 1 ELSE 0 END) AS cantidad_otros
      FROM equipo_colaborador ec
      LEFT JOIN asistencia_unica au
        ON au.empleado_id = ec.id_empleado
      GROUP BY ec.id_equipo
    )
    -- Tercer paso: calcular porcentajes generales
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
    console.log(
      "🚀 ~ obtenerCampanaDiaReporteGerenciaPorcentualGeneral ~ rows:",
      rows
    );
    return rows[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(
      "Error al obtener resumen porcentual general del día de hoy"
    );
  }
}

export async function obtenerCampanaDiaReporteGerenciaPorcentualGeneralChile(): Promise<ResumenPorcentualGeneral> {
  const query = `
  WITH dotacion_chile AS (
    SELECT ec.id_empleado
    FROM equipo_colaborador ec
    JOIN equipo e ON e.id = ec.id_equipo
    JOIN campana_turno_equipo cte ON cte.equipo_id = e.id
    JOIN campana c ON c.id = cte.campana_id
    WHERE c.nacionalidad = 'Chile'
),
asistencias_hoy AS (
    SELECT DISTINCT ON (ae.empleado_id)
        ae.empleado_id,
        ae.estado
    FROM asistencias_empleados ae
    WHERE ae.fecha_creacion::date = NOW()::date
    ORDER BY ae.empleado_id, ae.fecha_creacion DESC
),
conteo AS (
    SELECT
        COUNT(dc.id_empleado) AS dotacion_total,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Asistente') AS asistentes,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Licencia') AS licencias,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Libre') AS libres,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Vacaciones') AS vacaciones,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Permiso') AS permisos,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Ausente sin Justificación') AS ausentes_sin_justificacion,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Otro') AS otros
    FROM dotacion_chile dc
    LEFT JOIN asistencias_hoy ah ON ah.empleado_id = dc.id_empleado
)
SELECT
    'Chile' AS nacionalidad,
    dotacion_total,
    asistentes,
    (dotacion_total - asistentes) AS ausentes,
    ROUND(100.0 * asistentes / NULLIF(dotacion_total,0), 2) AS porcentaje_asistentes,
    ROUND(100.0 * (dotacion_total - asistentes) / NULLIF(dotacion_total,0), 2) AS porcentaje_total_ausencia,
    ROUND(100.0 * licencias / NULLIF(dotacion_total,0), 2) AS porcentaje_licencias,
    ROUND(100.0 * libres / NULLIF(dotacion_total,0), 2) AS porcentaje_libres,
    ROUND(100.0 * vacaciones / NULLIF(dotacion_total,0), 2) AS porcentaje_vacaciones,
    ROUND(100.0 * permisos / NULLIF(dotacion_total,0), 2) AS porcentaje_permisos,
    ROUND(100.0 * ausentes_sin_justificacion / NULLIF(dotacion_total,0), 2) AS porcentaje_ausentes_sin_justificacion,
    ROUND(100.0 * otros / NULLIF(dotacion_total,0), 2) AS porcentaje_otros
FROM conteo;


  `;

  try {
    const { rows } = await pool.query(query);
    return rows[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(
      "Error al obtener resumen porcentual general del día de hoy"
    );
  }
}

export async function obtenerCampanaDiaReporteGerenciaPorcentualGeneralColombia(): Promise<ResumenPorcentualGeneral> {
  const query = `
   WITH dotacion_chile AS (
    SELECT ec.id_empleado
    FROM equipo_colaborador ec
    JOIN equipo e ON e.id = ec.id_equipo
    JOIN campana_turno_equipo cte ON cte.equipo_id = e.id
    JOIN campana c ON c.id = cte.campana_id
    WHERE c.nacionalidad = 'Colombia'
),
asistencias_hoy AS (
    SELECT DISTINCT ON (ae.empleado_id)
        ae.empleado_id,
        ae.estado
    FROM asistencias_empleados ae
    WHERE ae.fecha_creacion::date = NOW()::date
    ORDER BY ae.empleado_id, ae.fecha_creacion DESC
),
conteo AS (
    SELECT
        COUNT(dc.id_empleado) AS dotacion_total,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Asistente') AS asistentes,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Licencia') AS licencias,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Libre') AS libres,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Vacaciones') AS vacaciones,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Permiso') AS permisos,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Ausente sin Justificación') AS ausentes_sin_justificacion,
        COUNT(ah.empleado_id) FILTER (WHERE ah.estado = 'Otro') AS otros
    FROM dotacion_chile dc
    LEFT JOIN asistencias_hoy ah ON ah.empleado_id = dc.id_empleado
)
SELECT
    'Chile' AS nacionalidad,
    dotacion_total,
    asistentes,
    (dotacion_total - asistentes) AS ausentes,
    ROUND(100.0 * asistentes / NULLIF(dotacion_total,0), 2) AS porcentaje_asistentes,
    ROUND(100.0 * (dotacion_total - asistentes) / NULLIF(dotacion_total,0), 2) AS porcentaje_total_ausencia,
    ROUND(100.0 * licencias / NULLIF(dotacion_total,0), 2) AS porcentaje_licencias,
    ROUND(100.0 * libres / NULLIF(dotacion_total,0), 2) AS porcentaje_libres,
    ROUND(100.0 * vacaciones / NULLIF(dotacion_total,0), 2) AS porcentaje_vacaciones,
    ROUND(100.0 * permisos / NULLIF(dotacion_total,0), 2) AS porcentaje_permisos,
    ROUND(100.0 * ausentes_sin_justificacion / NULLIF(dotacion_total,0), 2) AS porcentaje_ausentes_sin_justificacion,
    ROUND(100.0 * otros / NULLIF(dotacion_total,0), 2) AS porcentaje_otros
FROM conteo;


  `;

  try {
    const { rows } = await pool.query(query);
    return rows[0];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(
      "Error al obtener resumen porcentual general del día de hoy"
    );
  }
}
