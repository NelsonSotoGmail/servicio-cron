// serivicio-cron/cron/emailReminder.ts

import cron from "node-cron";
import { obtenerCampanaMesDíasPorRegistrarCron } from "../lib/campanaExtraccion.js";
import {
  obtenerCampanaDiaReporteGerencia,
  obtenerCampanaDiaReporteGerenciaPorcentualGeneral,
  obtenerCampanaDiaReporteGerenciaPorcentualGeneralChile,
  obtenerCampanaDiaReporteGerenciaPorcentualGeneralColombia
} from "../lib/campanaExtraccionGerencia.js";
import {
  sendGroupedReminderEmails,
  sendReporteGerenciaEmail,
} from "./email.js";

const ejecucionesRecientes = new Map<string, number>();

function yaFueEjecutado(hora: string, toleranciaMin = 5): boolean {
  const ahora = Date.now();
  const ultima = ejecucionesRecientes.get(hora);
  if (ultima && ahora - ultima < toleranciaMin * 60 * 1000) {
    return true;
  }
  ejecucionesRecientes.set(hora, ahora);
  return false;
}
export type CampanaDiaConEmails = {
  campana_nombre: string;
  turno_nombre: string;
  equipo_nombre: string;
  emails_supervisor_coordinador: string | null;
  nombre_completo_supervisor: string | null;
  nombre_completo_coordinador: string | null;
  fecha: string;
  cantidad_equipo: number;
  cantidad_asistentes: number;
  cantidad_ausentes: number;
  nacionalidad: "Chile" | "Colombia"; 
};

// 🔹 Función auxiliar para calcular totales por país
const calcularTotales = (datos: CampanaDiaConEmails[]) => {
  let totalIntegrantes = 0;
  let totalAsistentes = 0;
  let totalAusencias = 0;

  datos.forEach((equipo) => {
    const total = Number(equipo.cantidad_equipo || 0);
    const asistentes = Number(equipo.cantidad_asistentes || 0);
    const ausentes = Number(equipo.cantidad_ausentes || 0);

    totalIntegrantes += total;
    totalAsistentes += asistentes;
    totalAusencias += ausentes;
  });

  return {
    dotacion: totalIntegrantes,
    presentes: totalAsistentes,
    ausentes: totalAusencias,
  };
};





export function startCronJobs() {
  const ejecutarRecordatorio = async (hora: string) => {
    if (yaFueEjecutado(hora)) {
      console.log(
        `⚠️ Cron ya fue ejecutado recientemente para ${hora}, se omite.`
      );
      return;
    }

    try {
      console.log(
        `⏰ Ejecutando tarea programada (${hora}) - Enviando recordatorio`
      );
      const datos = await obtenerCampanaMesDíasPorRegistrarCron();
      console.log("🚀 ~ ejecutarRecordatorio ~ datos:", datos);

      if (datos.length === 0) {
        console.log(
          "✅ No hay días faltantes por reportar, no se envía correo."
        );
        return;
      }

      await sendGroupedReminderEmails(datos);
      console.log("✅ Correos enviados con éxito.");
    } catch (error) {
      console.error(`❌ Error en cron job (${hora}):`, error);
    }
  };

  const ejecutarReporteGerencia = async (hora: string) => {
    try {
      console.log(`⏰ Ejecutando tarea programada (${hora}) - Reporte Gerencia`);
  
      // 🔹 Datos de ausentes por equipo
      const datosEquipos = await obtenerCampanaDiaReporteGerencia();
  
      const datosChile = datosEquipos.filter((d) => d.nacionalidad === "Chile");
     // console.log("🚀 ~ ejecutarReporteGerencia ~ datosChile:", datosChile)
      const datosColombia = datosEquipos.filter((d) => d.nacionalidad === "Colombia");
      //console.log("🚀 ~ ejecutarReporteGerencia ~ datosColombia:", datosColombia)
  
      // 🔹 Función para calcular totales
      const calcularTotales = (datos: any[]) => {
        return datos.reduce(
          (acc, equipo) => {
            acc.dotacion += Number(equipo.cantidad_equipo || 0);
            acc.presentes += Number(equipo.cantidad_asistentes || 0);
            acc.ausentes += Number(equipo.cantidad_ausentes || 0);
            return acc;
          },
          { dotacion: 0, presentes: 0, ausentes: 0 }
        );
      };
  
      const totalesChile = calcularTotales(datosChile);
      const totalesColombia = calcularTotales(datosColombia);
  
      // 🔹 Función para calcular resumen porcentual
      const calcularResumenPorcentual = (datos: any[], totales: any) => {
        const sum = (estado: string) =>
          datos.reduce((acc, e) => acc + Number(e[estado] || 0), 0);
  
        const porcentaje = (cantidad: number) =>
          totales.dotacion > 0 ? Number(((cantidad / totales.dotacion) * 100).toFixed(2)) : 0;
  
        return {
          porcentaje_total_ausencia: porcentaje(totales.ausentes),
          porcentaje_asistentes: porcentaje(totales.presentes),
          porcentaje_licencias: porcentaje(sum("cantidad_licencias")),
          porcentaje_libres: porcentaje(sum("cantidad_libres")),
          porcentaje_vacaciones: porcentaje(sum("cantidad_vacaciones")),
          porcentaje_permisos: porcentaje(sum("cantidad_permisos")),
          porcentaje_ausentes_sin_justificacion: porcentaje(sum("cantidad_ausentes_sin_justificacion")),
          porcentaje_otros: porcentaje(sum("cantidad_otros")),
        };
      };
  
      const resumenPorcentualChile = calcularResumenPorcentual(datosChile, totalesChile);
      //console.log("🚀 ~ ejecutarReporteGerencia ~ resumenPorcentualChile:", resumenPorcentualChile)
      const resumenPorcentualColombia = calcularResumenPorcentual(datosColombia, totalesColombia);

      const resumenTotalPorcentualChile = await obtenerCampanaDiaReporteGerenciaPorcentualGeneralChile();
      console.log("🚀 ~ ejecutarReporteGerencia ~ resumenTotalPorcentualChile:", resumenTotalPorcentualChile)

      const resumenTotalPorcentualColombia = await obtenerCampanaDiaReporteGerenciaPorcentualGeneralColombia();
      console.log("🚀 ~ ejecutarReporteGerencia ~ resumenTotalPorcentualColombia:", resumenTotalPorcentualColombia)


      const resumenTotalPorcentual = await obtenerCampanaDiaReporteGerenciaPorcentualGeneral();
    //  console.log("🚀 ~ ejecutarReporteGerencia ~ resumenTotalPorcentual:", resumenTotalPorcentual)
  
      // 🔹 Enviar correo con los datos de ambos países
      await sendReporteGerenciaEmail(
        "patricia@2call.cl,romina@2call.cl,asistencia@2call.cl,marco@2call.cl,ana.valderrama@2call.cl,jorge.gomez@2callcenter.com,nelson.soto@kyros.cl,ignacio.fuentes@2call.cl,rita.montenegro@2call.cl,adrian@2call.cl,margarita@2call.cl,miguelangel@2call.cl,benjamin.arce@kyros.cl",
       // "nelson.soto@kyros.cl",
        new Date().toISOString().split("T")[0],
        datosChile,
        datosColombia,
        resumenTotalPorcentualChile,
        resumenTotalPorcentualColombia,
        totalesChile,
        totalesColombia,
        resumenTotalPorcentual // 👈 Nuevo parámetro
      );
      
    } catch (error) {
      console.error(`❌ Error en reporte gerencia (${hora}):`, error);
    }
  };
  

  // 📌 Recordatorios normales
  // Ejecutar a las 10:00
  cron.schedule("0 12 * * *", async () => {
    try {
      await ejecutarRecordatorio("12:00");
    } catch (err) {
      console.error(err);
    }
  });

  // Ejecutar a las 17:00
  // cron.schedule("0 17 * * *", async () => {
  //   await ejecutarRecordatorio("17:00");
  // });

  // Ejecutar a las 20:00
  cron.schedule("0 14 * * *", async () => {
    try {
      await ejecutarReporteGerencia("14:00");
    } catch (err) {
      console.error(err);
    }
  });
  //   // ===== MODO PRUEBA =====
  (async () => {
    // console.log("🛠️ Ejecutando recordatorio en modo DEBUG...");
    //await ejecutarRecordatorio("DEBUG");

    // console.log("🛠️ Ejecutando reporte Gerencia ahora en modo DEBUG...");
    await ejecutarReporteGerencia("DEBUG");
  })();
}
