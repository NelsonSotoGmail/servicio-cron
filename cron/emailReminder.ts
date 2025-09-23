// serivicio-cron/cron/emailReminder.ts

import cron from "node-cron";
import { obtenerCampanaMesDíasPorRegistrarCron } from "../lib/campanaExtraccion.js";
import { obtenerCampanaDiaReporteGerencia, obtenerCampanaDiaReporteGerenciaPorcentualGeneral } from "../lib/campanaExtraccionGerencia.js";
import { sendGroupedReminderEmails, sendReporteGerenciaEmail } from "./email.js";



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
    if (yaFueEjecutado(hora)) {
      console.log(
        `⚠️ Cron ya fue ejecutado recientemente para ${hora}, se omite.`
      );
      return;
    }

    try {
      console.log(
        `⏰ Ejecutando tarea programada (${hora}) - Reporte Gerencia`
      );

      // 🔹 Datos de ausentes por equipo
      const datosEquipos = await obtenerCampanaDiaReporteGerencia();
      console.log("🚀 ~ datosEquipos ~", datosEquipos);
      const datosUnicos = Array.from(
        new Map(
          datosEquipos.map((e) => [`${e.campana_nombre}-${e.equipo_nombre}`, e])
        ).values()
      );

      // 🔹 Inicializamos totales
      let totalIntegrantes = 0;
      let totalAsistentes = 0;
      let totalAusencias = 0;

      // 🔹 Recorremos todos los equipos y sumamos
      datosUnicos.forEach((equipo) => {
        const total = Number(equipo.cantidad_equipo || 0);
        const asistentes = Number(equipo.cantidad_asistentes || 0);
        const ausentes = Number(equipo.cantidad_ausentes || 0);

        totalIntegrantes += total;
        totalAsistentes += asistentes;
        totalAusencias += ausentes;
      });

      // 🔹 Totales a enviar al correo
      const totales = {
        dotacion: totalIntegrantes,
        presentes: totalAsistentes,
        ausentes: totalAusencias,
      };

      // 🔹 Calculamos porcentajes
      const safePercentage = (value: number) =>
        !isNaN(value) ? `${value.toFixed(2)}%` : "0.00%";

      // 🔹 Calculamos porcentajes globales desde la BD
      const resumenPorcentual =
        await obtenerCampanaDiaReporteGerenciaPorcentualGeneral();
      console.log("🚀 ~ resumenPorcentual (desde BD) ~", resumenPorcentual);

      // 🔹 Enviar correo con los datos reales
      await sendReporteGerenciaEmail(
        "patricia@2call.cl,romina@2call.cl,asistencia@2call.cl,marco@2call.cl,ana.valderrama@2call.cl,jorge.gomez@2callcenter.com,nelson.soto@kyros.cl,ignacio.fuentes@2call.cl,rita.montenegro@2call.cl,adrian@2call.cl,gonzalo.calderon@2call.cl,margarita@2call.cl,miguelangel@2call.cl,benjamin.arce@kyros.cl",
        new Date().toISOString().split("T")[0],
        datosUnicos,
        resumenPorcentual, // 👈 ahora sí usa los valores de la BD
        [],
        [],
        totales
      );

      
      // Aquí puedes enviar ambos por correo, por ejemplo:
      // await sendGroupedReminderEmails(datosEquipos, resumenPorcentual);
    } catch (error) {
      console.error(`❌ Error en reporte gerencia (${hora}):`, error);
    }
  };

  // 📌 Recordatorios normales
  // Ejecutar a las 10:00
cron.schedule("0 12 * * *", async () => {
  await ejecutarRecordatorio("12:00");
});

// Ejecutar a las 17:00
// cron.schedule("0 17 * * *", async () => {
//   await ejecutarRecordatorio("17:00");
// });

// Ejecutar a las 20:00
cron.schedule("0 14 * * *", async () => {
  await ejecutarReporteGerencia("14:00");
});
//   // ===== MODO PRUEBA =====
(async () => {
  // console.log("🛠️ Ejecutando recordatorio en modo DEBUG...");
  //await ejecutarRecordatorio("DEBUG");

  // console.log("🛠️ Ejecutando reporte Gerencia ahora en modo DEBUG...");
  // await ejecutarReporteGerencia("DEBUG");
})();
}
