// servicio-cron/cron/email.ts
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function sendReminderEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"B1 Nómina" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

type CampanaMesConEmails = {
  campana_nombre: string;
  turno_nombre: string;
  equipo_nombre: string;
  emails_supervisor_coordinador: string;
  nombre_completo_supervisor: string;
  nombre_completo_coordinador: string;
  mes: string;
  dias_no_reportados: number;
  dias_faltantes: string[];
};

//REPORTE DIARIO A COORDINADOR Y SUPERVISOR
export async function sendGroupedReminderEmails(datos: CampanaMesConEmails[]) {
  const yearActual = new Date().getFullYear();

  // Agrupamos por email
  const datosPorEmail = datos.reduce<Record<string, CampanaMesConEmails[]>>((acc, item) => {
    if (!acc[item.emails_supervisor_coordinador]) {
      acc[item.emails_supervisor_coordinador] = [];
    }
    acc[item.emails_supervisor_coordinador].push(item);
    return acc;
  }, {});

  for (const [email, items] of Object.entries(datosPorEmail)) {
    const supervisor = items[0].nombre_completo_supervisor;
    const coordinador = items[0].nombre_completo_coordinador;

    // Contar días faltantes totales de todos los items
    const totalDiasFaltantes = items.reduce((sum, item) => sum + item.dias_faltantes.length, 0);

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Recordatorio de Asistencia</title>
        <style>
          body {
            font-family: 'Segoe UI', sans-serif;
            margin: 0; padding: 0;
            background-color: #f6f8fa;
            color: #333;
          }
          .email-container {
            max-width: 950px;
            margin: auto;
            background: #fff;
            border: 1px solid #e1e4e8;
            border-radius: 6px;
            overflow: hidden;
          }
          .header {
            background: #fff;
            padding: 20px;
            text-align: center;
            color: #1A245B;
          }
          .header img {
            max-width: 150px;
            margin-bottom: 10px;
          }
          .preheader {
            font-size: 12px;
            color: #999;
            padding: 10px 20px;
            background-color: #F8F8F8;
            border-bottom: 1px solid #e1e4e8;
          }
          .content {
            padding: 20px;
            font-size: 15px;
            line-height: 1.6;
          }
          .footer {
            font-size: 13px;
            color: #777;
            padding: 20px;
            background-color: #F8F8F8;
            text-align: center;
            border-top: 1px solid #e1e4e8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          ul {
            padding-left: 18px;
            margin: 0;
          }
          a {
            color: #0047AB;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img src="https://kyros.cl/wp-content/uploads/${yearActual}/07/Logo.png" alt="B1 Bonos" />
            <h2>Falta de Registro de Asistencia</h2>
          </div>
          <div class="preheader">
            El supervisor acumula <b>${totalDiasFaltantes} día${totalDiasFaltantes !== 1 ? 's' : ''} consecutivo${totalDiasFaltantes !== 1 ? 's' : ''}</b> sin registrar la asistencia del equipo.
          </div>
          <div class="content">
            <p>Estimado/a <strong>${coordinador}</strong>,</p>
            <p>El supervisor <strong>${supervisor}</strong> acumula <b>${totalDiasFaltantes} día${totalDiasFaltantes !== 1 ? 's' : ''} consecutivo${totalDiasFaltantes !== 1 ? 's' : ''} sin registrar asistencia.</b></p>
            ${items.map(item => `
              <table>
                <thead>
                  <tr>
                    <th>Campaña</th>
                    <th>Turno</th>
                    <th>Equipo</th>
                    <th>Días faltantes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${item.campana_nombre}</td>
                    <td>${item.turno_nombre}</td>
                    <td>${item.equipo_nombre}</td>
                    <td>
                      <ul>
                        ${item.dias_faltantes.map(dia =>
                          `<li>${format(new Date(dia), 'dd-MM-yyyy', { locale: es })}</li>`
                        ).join('')}
                      </ul>
                    </td>
                  </tr>
                </tbody>
              </table>
            `).join('')}
            <p>Le sugerimos hacer seguimiento directo para garantizar el cumplimiento de los procesos operativos.</p>
            <p>Saludos cordiales,<br/><strong>Equipo B1 Bonos</strong></p>
          </div>
          <div class="footer">
            <p>📧 contacto@b1bonos.com | 📞 +1 (234) 567-8901</p>
            <p>© ${yearActual} B1 Bonos. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
     await sendReminderEmail(email + ", ignacio.fuentes@2call.cl,marco@2call.cl,nelson.soto@kyros.cl,benjamin.arce@kyros.cl", '📅 Recordatorio de asistencia', html);
    
      console.log(`✅ Correo enviado a ${email}`);
    } catch (error) {
      console.error(`❌ Error enviando correo a ${email}:`, error);
    }
  }
}

// // 📧 REPORTE DIARIO A GERENCIA
// export async function sendReporteGerenciaEmail(
//   destinatario: string,
//   fechaReporte: string,
//   datosEquipos: any[],
//   resumenPorcentual: any,
//   estadisticasEquipos: any[],
//   detalleColaboradores: any[],
//   totales: { dotacion: number; presentes: number; ausentes: number }
// ) {
//   const yearActual = new Date().getFullYear();

//   // 👉 Helper para formatear a porcentaje con 2 decimales
//   const formatPorcentaje = (valor: any) =>
//     !isNaN(Number(valor)) ? `${Number(valor).toFixed(2)}%` : "0.00%";

//   // 👉 HTML dinámico
//   const html = `
// <!DOCTYPE html>
// <html lang="es">
// <head>
//   <meta charset="UTF-8">
//   <title>Reporte Diario de Asistencia - B1 Bonos</title>
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <style>
//     body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f6f8fa; color: #333; }
//     .email-container { max-width: 900px; margin: auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
//     .header { background-color: #fff; padding: 20px; text-align: center; color: #1A245B; }
//     .header img { max-width: 140px; margin-bottom: 10px; }
//     .preheader { font-size: 12px; color: #999; padding: 10px 20px; background-color: #f0f0f0; border-bottom: 1px solid #e1e4e8; }
//     .content { padding: 20px; font-size: 15px; line-height: 1.6; }
//     .content h3 { margin-top: 30px; color: #1A245B; }
//     table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
//     th { background-color: #1A245B; color: #fff; padding: 8px; text-align: center; }
//     td { border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: top; }
//     td:first-child, th:first-child { text-align: left; }
//     .footer { font-size: 13px; color: #777; padding: 20px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e1e4e8; }
//     .present { color: green; font-weight: bold; }
//     .absent { color: red; font-weight: bold; }
//   </style>
// </head>
// <body>
//   <div class="email-container">

//     <!-- HEADER -->
//     <div class="header">
//       <img src="https://kyros.cl/wp-content/uploads/${yearActual}/07/Logo.png" alt="B1 Bonos">
//       <h2>B1 Bonos - Reporte Diario de Asistencia</h2>
//       <p>📅 Fecha del reporte: <strong>${fechaReporte}</strong></p>
//     </div>

//     <!-- PREHEADER -->
//     <div class="preheader">
//       Reporte diario de dotación, porcentajes de asistencia y detalle de colaboradores
//     </div>

//     <!-- CONTENIDO -->
//     <div class="content">

//       <h3>Resumen de Campañas</h3>
//       <table>
//         <thead>
//           <tr>
//             <th>Campaña</th>
//             <th>Dotación Total</th>
//             <th>Presentes</th>
//             <th>Ausentes</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${datosEquipos.map(eq => `
//             <tr>
//               <td style="text-align: left;">${eq.campana_nombre}</td>
//               <td>${eq.cantidad_equipo}</td>
//               <td>${eq.cantidad_asistentes}</td>
//               <td>${eq.cantidad_ausentes}</td>
//             </tr>
//           `).join('')}
//           <tr>
//             <td><strong>Totales</strong></td>
//             <td><strong>${totales.dotacion}</strong></td>
//             <td><strong>${totales.presentes}</strong></td>
//             <td><strong>${totales.ausentes}</strong></td>
//           </tr>
//         </tbody>
//       </table>

//       <h3>Resumen Porcentual General</h3>
//       <table>
//         <thead>
//           <tr>
//             <th>% Total Ausencia</th>
//             <th>Asistentes</th>
//             <th>Licencias</th>
//             <th>Libres</th>
//             <th>Vacaciones</th>
//             <th>Permisos</th>
//             <th>Ausentes sin Justificación</th>
//             <th>Otros</th>
//           </tr>
//         </thead>
//         <tbody>
//           <tr>
//             <td><strong>${formatPorcentaje(resumenPorcentual.porcentaje_total_ausencia)}</strong></td>
//             <td><strong>${formatPorcentaje(resumenPorcentual.porcentaje_asistentes)}</strong></td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_licencias)}</td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_libres)}</td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_vacaciones)}</td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_permisos)}</td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_ausentes_sin_justificacion)}</td>
//             <td>${formatPorcentaje(resumenPorcentual.porcentaje_otros)}</td>
//           </tr>
//         </tbody>
//       </table>

      

//       <p>Saludos cordiales,<br><strong>Equipo B1 Bonos</strong></p>
//     </div>

//     <!-- FOOTER -->
//     <div class="footer">
//       <p>📧 contacto@b1bonos.com | 📍 Calle Pocuro #2255, Providencia, Santiago, Chile</p>
//       <p>📞 +56 (2)944 71 00</p>
//       <p>© ${yearActual} B1 Bonos. Todos los derechos reservados.</p>
//     </div>
//   </div>
// </body>
// </html>
// `;

//   // 👉 Envío del correo
//   await sendReminderEmail(destinatario, "📊 Reporte Diario de Gerencia", html);
// }
// 📧 REPORTE DIARIO A GERENCIA (Chile + Colombia)
export async function sendReporteGerenciaEmail(
  destinatario: string,
  fechaReporte: string,
  datosChile: any[],
  datosColombia: any[],
  resumenPorcentualChile: any, // 👈 Usamos directamente este
  resumenPorcentualColombia: any, // 👈 Y este
  totalesChile: { dotacion: number; presentes: number; ausentes: number },
  totalesColombia: { dotacion: number; presentes: number; ausentes: number },
  resumenTotalPorcentual: any // 👈 Global
) {
  const yearActual = new Date().getFullYear();

  const formatPorcentaje = (valor: any) =>
    !isNaN(Number(valor)) ? `${Number(valor).toFixed(2)}%` : "0.00%";

  const generarTabla = (datos: any[], totales: any) => `
    <table>
      <thead>
        <tr>
          <th>Campaña</th>
          <th>Dotación Total</th>
          <th>Presentes</th>
          <th>Ausentes</th>
        </tr>
      </thead>
      <tbody>
        ${datos
          .map(
            (eq) => `
          <tr>
            <td style="text-align: left;">${eq.campana_nombre}</td>
            <td>${eq.cantidad_equipo}</td>
            <td>${eq.cantidad_asistentes}</td>
            <td>${eq.cantidad_ausentes}</td>
          </tr>
        `
          )
          .join("")}
        <tr>
          <td><strong>Totales</strong></td>
          <td><strong>${totales.dotacion}</strong></td>
          <td><strong>${totales.presentes}</strong></td>
          <td><strong>${totales.ausentes}</strong></td>
        </tr>
      </tbody>
    </table>
  `;

  const generarTablaPorcentual = (resumen: any) => `
    <table>
      <thead>
        <tr>
          <th>% Total Ausencia</th>
          <th>% Asistentes</th>
          <th>% Licencias</th>
          <th>% Libres</th>
          <th>% Vacaciones</th>
          <th>% Permisos</th>
          <th>% Ausentes sin Justificación</th>
          <th>% Otros</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${formatPorcentaje(resumen.porcentaje_total_ausencia)}</strong></td>
          <td><strong>${formatPorcentaje(resumen.porcentaje_asistentes)}</strong></td>
          <td>${formatPorcentaje(resumen.porcentaje_licencias)}</td>
          <td>${formatPorcentaje(resumen.porcentaje_libres)}</td>
          <td>${formatPorcentaje(resumen.porcentaje_vacaciones)}</td>
          <td>${formatPorcentaje(resumen.porcentaje_permisos)}</td>
          <td>${formatPorcentaje(resumen.porcentaje_ausentes_sin_justificacion)}</td>
          <td>${formatPorcentaje(resumen.porcentaje_otros)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Diario de Asistencia - B1 Bonos</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f6f8fa; color: #333; }
    .email-container { max-width: 900px; margin: auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
    .header { background-color: #fff; padding: 20px; text-align: center; color: #1A245B; }
    .header img { max-width: 140px; margin-bottom: 10px; }
    .preheader { font-size: 12px; color: #999; padding: 10px 20px; background-color: #f0f0f0; border-bottom: 1px solid #e1e4e8; }
    .content { padding: 20px; font-size: 15px; line-height: 1.6; }
    .content h3, .content h4 { margin-top: 30px; color: #1A245B; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 14px; }
    th { background-color: #1A245B; color: #fff; padding: 8px; text-align: center; }
    td { border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: top; }
    td:first-child, th:first-child { text-align: left; }
    .footer { font-size: 13px; color: #777; padding: 20px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e1e4e8; }
  </style>
</head>
<body>
  <div class="email-container">

    <div class="header">
      <img src="https://kyros.cl/wp-content/uploads/${yearActual}/07/Logo.png" alt="B1 Bonos">
      <h2>B1 Bonos - Reporte Diario de Asistencia</h2>
      <p>📅 Fecha del reporte: <strong>${fechaReporte}</strong></p>
    </div>

    <div class="preheader">
      Reporte diario de dotación, porcentajes de asistencia y detalle de colaboradores
    </div>

    <div class="content">

      <h3>Campaña Chile 🇨🇱</h3>
      ${generarTabla(datosChile, totalesChile)}

      <h4>Resumen Porcentual - Chile</h4>
      ${generarTablaPorcentual(resumenPorcentualChile)}

      <h3>Campaña Colombia 🇨🇴</h3>
      ${generarTabla(datosColombia, totalesColombia)}

      <h4>Resumen Porcentual - Colombia</h4>
      ${generarTablaPorcentual(resumenPorcentualColombia)}

      <h3>Resumen Porcentual Global 🌎</h3>
      ${generarTablaPorcentual(resumenTotalPorcentual)}

      <p>Saludos cordiales,<br><strong>Equipo B1 Bonos</strong></p>
    </div>

    <div class="footer">
      <p>📧 contacto@b1bonos.com | 📍 Calle Pocuro #2255, Providencia, Santiago, Chile</p>
      <p>📞 +56 (2)944 71 00</p>
      <p>© ${yearActual} B1 Bonos. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  await sendReminderEmail(destinatario, "📊 Reporte Diario de Gerencia", html);
}



// export async function sendReporteGerenciaEmail(
//   destinatario: string,
//   fechaReporte: string,
//   datosEquipos: any[],
//   resumenPorcentual: any,
//   datosChile: any[],
//   datosColombia: any[]
// ) {
//   const yearActual = new Date().getFullYear();

//   // ✅ Formateo seguro de porcentajes
//   const formatPorcentaje = (valor: any) => {
//     const num = Number(valor);
//     return !isNaN(num) ? `${num.toFixed(2)}%` : "0.00%";
//   };

//   // ✅ Totales y porcentajes por país
//   const calcularTotalesPorPais = (datos: any[]) => {
//     const totales = datos.reduce(
//       (acc, eq) => {
//         acc.dotacion += Number(eq.cantidad_equipo || 0);
//         acc.presentes += Number(eq.cantidad_asistentes || 0);
//         acc.ausentes += Number(eq.cantidad_ausentes || 0);
//         acc.licencias += Number(eq.cantidad_licencias || 0);
//         acc.libres += Number(eq.cantidad_libres || 0);
//         acc.vacaciones += Number(eq.cantidad_vacaciones || 0);
//         acc.permisos += Number(eq.cantidad_permisos || 0);
//         acc.ausentes_sin_justificacion += Number(eq.cantidad_ausentes_sin_justificacion || 0);
//         acc.otros += Number(eq.cantidad_otros || 0);
//         return acc;
//       },
//       {
//         dotacion: 0,
//         presentes: 0,
//         ausentes: 0,
//         licencias: 0,
//         libres: 0,
//         vacaciones: 0,
//         permisos: 0,
//         ausentes_sin_justificacion: 0,
//         otros: 0,
//       }
//     );

//     const calcPct = (v: number) =>
//       totales.dotacion > 0 ? (v / totales.dotacion) * 100 : 0;

//     return {
//       ...totales,
//       porcentaje_total_ausencia: calcPct(totales.ausentes),
//       porcentaje_asistentes: calcPct(totales.presentes),
//       porcentaje_licencias: calcPct(totales.licencias),
//       porcentaje_libres: calcPct(totales.libres),
//       porcentaje_vacaciones: calcPct(totales.vacaciones),
//       porcentaje_permisos: calcPct(totales.permisos),
//       porcentaje_ausentes_sin_justificacion: calcPct(totales.ausentes_sin_justificacion),
//       porcentaje_otros: calcPct(totales.otros),
//     };
//   };

//   // ✅ Totales por país y globales
//   const totalesChile = calcularTotalesPorPais(datosChile);
//   const totalesColombia = calcularTotalesPorPais(datosColombia);

//   const totalesGlobal = {
//     dotacion: totalesChile.dotacion + totalesColombia.dotacion,
//     presentes: totalesChile.presentes + totalesColombia.presentes,
//     ausentes: totalesChile.ausentes + totalesColombia.ausentes,
//     licencias: totalesChile.licencias + totalesColombia.licencias,
//     libres: totalesChile.libres + totalesColombia.libres,
//     vacaciones: totalesChile.vacaciones + totalesColombia.vacaciones,
//     permisos: totalesChile.permisos + totalesColombia.permisos,
//     ausentes_sin_justificacion:
//       totalesChile.ausentes_sin_justificacion +
//       totalesColombia.ausentes_sin_justificacion,
//     otros: totalesChile.otros + totalesColombia.otros,
//   };

//   const resumenGlobal = {
//     porcentaje_total_ausencia: (totalesGlobal.ausentes / totalesGlobal.dotacion) * 100,
//     porcentaje_asistentes: (totalesGlobal.presentes / totalesGlobal.dotacion) * 100,
//     porcentaje_licencias: (totalesGlobal.licencias / totalesGlobal.dotacion) * 100,
//     porcentaje_libres: (totalesGlobal.libres / totalesGlobal.dotacion) * 100,
//     porcentaje_vacaciones: (totalesGlobal.vacaciones / totalesGlobal.dotacion) * 100,
//     porcentaje_permisos: (totalesGlobal.permisos / totalesGlobal.dotacion) * 100,
//     porcentaje_ausentes_sin_justificacion:
//       (totalesGlobal.ausentes_sin_justificacion / totalesGlobal.dotacion) * 100,
//     porcentaje_otros: (totalesGlobal.otros / totalesGlobal.dotacion) * 100,
//   };

  

//   // ✅ HTML del correo
//   const html = `
// <!DOCTYPE html>
// <html lang="es">
// <head>
//   <meta charset="UTF-8">
//   <title>Reporte Diario de Asistencia - B1 Bonos</title>
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <style>
//     body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f6f8fa; color: #333; }
//     .email-container { max-width: 900px; margin: auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
//     .header { background-color: #fff; padding: 20px; text-align: center; color: #1A245B; }
//     .header img { max-width: 140px; margin-bottom: 10px; }
//     .preheader { font-size: 12px; color: #999; padding: 10px 20px; background-color: #f0f0f0; border-bottom: 1px solid #e1e4e8; }
//     .content { padding: 20px; font-size: 15px; line-height: 1.6; }
//     .content h3 { margin-top: 30px; color: #1A245B; }
//     table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
//     th { background-color: #1A245B; color: #fff; padding: 8px; text-align: center; }
//     td { border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: top; }
//     td:first-child, th:first-child { text-align: left; }
//     .footer { font-size: 13px; color: #777; padding: 20px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e1e4e8; }
//     .present { color: green; font-weight: bold; }
//     .absent { color: red; font-weight: bold; }
//   </style>
// </head>
// <body>
//   <div class="email-container">
//     <div class="header">
//       <img src="https://kyros.cl/wp-content/uploads/${yearActual}/07/Logo.png" alt="B1 Bonos">
//       <h2>B1 Bonos - Reporte Diario de Asistencia</h2>
//       <p>📅 Fecha del reporte: <strong>${fechaReporte}</strong></p>
//     </div>

//     <div class="preheader">Reporte diario de dotación, porcentajes de asistencia y detalle de colaboradores</div>

//     <div class="content">
//       <h3>🇨🇱 Resumen de Campañas - Chile</h3>
//       ${generarTablaPais(datosChile, "Chile", "🇨🇱")}

//       <h3>🇨🇴 Resumen de Campañas - Colombia</h3>
//       ${generarTablaPais(datosColombia, "Colombia", "🇨🇴")}

//       <h3>🌎 Resumen Porcentual Global</h3>
//       <table>
//         <thead>
//           <tr>
//             <th>% Total Ausencia</th>
//             <th>% Asistentes</th>
//             <th>% Licencias</th>
//             <th>% Libres</th>
//             <th>% Vacaciones</th>
//             <th>% Permisos</th>
//             <th>% Ausentes sin Justificación</th>
//             <th>% Otros</th>
//           </tr>
//         </thead>
//         <tbody>
//           <tr>
//             <td><strong>${formatPorcentaje(resumenGlobal.porcentaje_total_ausencia)}</strong></td>
//             <td><strong>${formatPorcentaje(resumenGlobal.porcentaje_asistentes)}</strong></td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_licencias)}</td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_libres)}</td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_vacaciones)}</td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_permisos)}</td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_ausentes_sin_justificacion)}</td>
//             <td>${formatPorcentaje(resumenGlobal.porcentaje_otros)}</td>
//           </tr>
//         </tbody>
//       </table>

//       <p>Saludos cordiales,<br><strong>Equipo B1 Bonos</strong></p>
//     </div>

//     <div class="footer">
//       <p>📧 contacto@b1bonos.com | 📍 Calle Pocuro #2255, Providencia, Santiago, Chile</p>
//       <p>📞 +56 (2)944 71 00</p>
//       <p>© ${yearActual} B1 Bonos. Todos los derechos reservados.</p>
//     </div>
//   </div>
// </body>
// </html>
// `;

//   await sendReminderEmail(destinatario, "📊 Reporte Diario de Gerencia", html);
// }







