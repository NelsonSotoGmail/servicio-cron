# Manual: Preparación del proyecto B1ALERT

## 1️⃣ Compilar el proyecto

# B1ALERT - Instrucciones de ejecución para ejecutable (`npm run build`)
RECORDAR PRIMERO PARA REALIZAR BUILD en package.json cambiar a "start": "node dist/cron-runner.js"

Desde la terminal en tu proyecto, ejecuta:

```bash
npm run build
```

Esto compilará tu proyecto con **TypeScript** y generará la carpeta `.next` (si es Next.js) o los archivos de salida que tengas configurados.

---

## 2️⃣ Crear la carpeta de destino

Para mantener un “deploy” o copia limpia, crea una carpeta llamada `B1ALERT`:

```bash
mkdir B1ALERT
```

Esto creará la carpeta en el directorio actual.

---

## 3️⃣ Copiar archivos y carpetas esenciales

Copia las carpetas y archivos necesarios para ejecutar el proyecto:

```bash
cp -R dist package.json package-lock.json B1ALERT/
```

* `-R` significa recursivo, necesario para copiar carpetas con su contenido.
* `public` → Archivos estáticos
* `package.json` y `package-lock.json` → Dependencias y scripts

---

## 4️⃣ Copiar archivo de configuración de entorno

Si tienes variables de entorno, copia el archivo `.env.local`:

```bash
cp .env.local B1ALERT/
```

Esto asegura que tu proyecto tenga la misma configuración que en desarrollo.

---

## 5️⃣ Verificar los archivos copiados

```bash
ls B1ALERT
```

Deberías ver:

```
.next
public
package.json
package-lock.json
.env.local
```
## 6️⃣ Comprimir carpeta B1ALERT
## 7️⃣ Pasar al servidor 192.168.10.9 a E:\B1BONOS\EnvioReporte\B1ALERTA  
## 8️⃣ Cambiar el nombre a carpeta dejando la versión B1ALERTA V13.
## 9️⃣ Copiar todos los archivo a E:\B1BONOS\EnvioReporte\B1ALERTA  

# B1ALERT - Instrucciones de ejecución desarrollo (`npm run start`)

```json
{
  "name": "servicio-cron",
  "version": "1.1.11",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node --import 'data:text/javascript,import { register } from \"node:module\"; import { pathToFileURL } from \"node:url\"; register(\"ts-node/esm\", pathToFileURL(\"./\"));' cron-runner.ts"
  },
  "dependencies": {
    "date-fns": "^3.3.1",
    "dotenv": "^17.2.0",
    "node-cron": "^4.2.1",
    "nodemailer": "^6.9.8",
    "pg": "^8.16.3",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.8.3"
  },
  "devDependencies": {
    "@types/nodemailer": "^7.0.1",
    "@types/pg": "^8.15.5"
  }
}
```

---

# B1ALERT - Instrucciones de ejecución para ejecutable (`npm run build`)

> Se debe reemplazar `start` a `node dist/cron-runner.js`

```json
{
  "name": "servicio-cron",
  "version": "1.1.11",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/cron-runner.js"
  },
  "dependencies": {
    "date-fns": "^3.3.1",
    "dotenv": "^17.2.0",
    "node-cron": "^4.2.1",
    "nodemailer": "^6.9.8",
    "pg": "^8.16.3",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.8.3"
  },
  "devDependencies": {
    "@types/nodemailer": "^7.0.1",
    "@types/pg": "^8.15.5"
  }
}
```

---

# B1ALERT - Instrucciones de ejecución con PM2

Este archivo explica cómo levantar y mantener el servicio `cron-runner.js` usando PM2 en Windows.


* EN cron-runners.ts en servidor reemplazar
* 1) const envPath = path.resolve(process.cwd(), '.env.local');
*    dotenv.config({ path: envPath });
* 2) const cronFileName = isProd ? 'emailReminder.js' : 'emailReminder.js';  FORZAR A UTILIZAR extension JS
* 3) utilizar en el servidor process.cwd()
* const packageJsonPath = path.resolve(process.cwd(), 'package.json'); // <-- aquí
* let version = '0.0.0';
* 4) Reemplazar const emailReminderPath = pathToFileURL(path.resolve(process.cwd(), 'servicio-cron', 'cron', cronFileName)).href;


### 1. Entrar al proyecto

```bash
cd E:\B1BONOS\EnvioReporte\B1ALERTA
```

### 2. Limpiar procesos antiguos

```bash
pm2 delete all
```

Eliminar procesos previos que pudieron quedar en estado "errored".

### 3. Iniciar el proceso

```bash
pm2 start dist/cron-runner.js --name B1ALERTA
```

### 4. Verificar estado

```bash
pm2 list
```

Debe mostrar algo como:

```
┌────┬───────────┬──────┬────────┬────────┬────────┐
│ id │ name      │ mode │ status │ cpu    │ memory │
├────┼───────────┼──────┼────────┼────────┼────────┤
│ 0  │ B1ALERTA  │ fork │ online │ 0%     │ 72mb   │
└────┴───────────┴──────┴────────┴────────┴────────┘
```

### 5. Revisar logs

```bash
pm2 logs B1ALERTA
```

### 6. Guardar configuración para reinicio automático

```bash
pm2 save
pm2 startup
```

Sigue las instrucciones que PM2 muestre después de `pm2 startup`.

### 7. Comandos útiles

* Reiniciar el servicio: `pm2 restart B1ALERTA`
* Detener el servicio: `pm2 stop B1ALERTA`
* Eliminar el servicio: `pm2 delete B1ALERTA`
* Ver logs: `pm2 logs B1ALERTA`

### Notas adicionales

* Este procedimiento asegura que el servicio `cron-runner.js` siga corriendo aunque cierres la consola o reinicies el servidor.
* Todos los errores anteriores que quedaron en PM2 se eliminaron en el paso 2.
* Para cualquier modificación en `cron-runner.js`, reinicia el servicio: `pm2 restart B1ALERTA`.


