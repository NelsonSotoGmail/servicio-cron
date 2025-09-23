// servicio-cron/cron-runner.ts
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// --------------------
// Configuración de paths
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path absoluto del archivo de entorno
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

// --------------------
// Leer versión de package.json
// --------------------
const packageJsonPath = path.resolve(__dirname, 'package.json');
let version = '0.0.0';
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(packageJsonContent);
  version = packageJson.version || version;
} catch (err) {
  console.warn('No se pudo leer la versión desde package.json, se usará 0.0.0');
}

// --------------------
// Logs iniciales
// --------------------
console.log('Servicio Cron iniciado');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('Versión del servicio:', version);

// --------------------
// Determinar extensión según entorno
// --------------------
const isProd = process.env.NODE_ENV === 'production';
const cronFileName = isProd ? 'emailReminder.js' : 'emailReminder.ts';

// Construir path absoluto al módulo de cron
const emailReminderPath = pathToFileURL(
  path.resolve(__dirname, './cron', cronFileName)
).href;

// --------------------
// Import dinámico del cron
// --------------------
(async () => {
  try {
    const emailReminder = await import(emailReminderPath);

    if (typeof emailReminder.startCronJobs === 'function') {
      emailReminder.startCronJobs();
      console.log(`Cron jobs iniciados v${version}`);
    } else {
      console.error('Error: startCronJobs no es una función exportada.');
    }
  } catch (error) {
    console.error('Error importando o ejecutando cron jobs:', error);
  }
})();
