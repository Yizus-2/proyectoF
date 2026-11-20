# Configuración de Correo y Despliegue Multiplataforma

## 1. Notificaciones por correo electrónico

El backend (`server/src/mailer.js`) envía correos automáticamente en tres momentos siempre que el ciudadano haya ingresado `reporter_email`:
1. **Al radicar (`REPORT_CREATED`):** confirmación con código PQR y cuadrilla asignada.
2. **Al cambiar de estado:** aviso del avance operativo (`ASIGNADO`, `EN_PROGRESO`, `RESUELTO`, `RECHAZADO`).
3. **Al cerrar (`CERRADO`):** correo de cierre con **comprobante PDF adjunto** (archivado en S3 con `SHA-256`) y enlace directo a la encuesta `/encuesta/:code`.

Cada intento queda registrado en la tabla `notification_logs` (`ENVIADO` o `ERROR`).

### Proveedores soportados (`MAIL_PROVIDER`)

#### A. Mailpit local (por defecto en desarrollo)
Intercepta todos los correos localmente sin enviarlos a internet.
```env
MAIL_PROVIDER=mailpit
MAILPIT_HOST=127.0.0.1
MAILPIT_PORT=1025
MAILPIT_UI_PORT=8025
```
Bandeja web local: **http://127.0.0.1:8025**

#### B. Gmail con Contraseña de Aplicación (rápido para pruebas reales)
1. Activa la verificación en 2 pasos en tu cuenta de Google.
2. Crea una contraseña de aplicación en https://myaccount.google.com/apppasswords.
3. Configura `.env`:
```env
MAIL_PROVIDER=gmail
GMAIL_USER=tu-correo@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM="ESSMAR SIGVI <tu-correo@gmail.com>"
PUBLIC_APP_URL=https://tu-dominio.com
```
*(No requiere espacios exactos: el backend limpia los espacios automáticamente.)*

#### C. Gmail con OAuth2 (recomendado para producción con Google Workspace)
```env
MAIL_PROVIDER=gmail_oauth2
GMAIL_USER=notificaciones@tu-dominio.com
GMAIL_CLIENT_ID=...apps.googleusercontent.com
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
SMTP_FROM="ESSMAR SIGVI <notificaciones@tu-dominio.com>"
PUBLIC_APP_URL=https://tu-dominio.com
```

#### D. SMTP corporativo genérico (Brevo, SES, Postmark, Resend, Zimbra, etc.)
```env
MAIL_PROVIDER=smtp
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=clave
SMTP_FROM="ESSMAR SIGVI <notificaciones@tu-dominio.com>"
```

### Probar la entrega sin crear reportes

Con un token de `admin`:
```bash
curl -s -X POST http://127.0.0.1:3001/api/notifications/test \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"to":"destino@ejemplo.com"}'
```

---

## 2. Despliegue por sistema operativo

### Windows 10 / 11
1. Instala **Node.js 20 LTS** y **Docker Desktop** (con backend WSL 2 activo).
2. Abre PowerShell o Git Bash en la carpeta del proyecto:
   ```powershell
   npm run up
   ```
3. Para diagnosticar el entorno en cualquier momento:
   ```powershell
   npm run doctor
   ```

### macOS (Apple Silicon / Intel)
1. Instala **Node.js 20+** y **Docker Desktop** (o **OrbStack** / **Podman**).
2. Ejecuta:
   ```bash
   npm run up
   ```

### Linux (Ubuntu, Fedora, Arch, etc.)
1. Instala **Node.js 20+** y **Docker** o **Podman**.
2. Ejecuta `npm run up`.
   - Si usas Podman sin plugin `compose`, `scripts/cli.mjs` crea y gestiona los contenedores directamente y añade la etiqueta `:Z` de SELinux en el volumen `db/init`.

### Modo 100% contenedores (`--profile full`)
Si el servidor destino no tiene Node.js instalado:
```bash
cp .env.example .env
# Edita .env con contraseñas seguras y JWT_SECRET propio
docker compose --profile full up -d --build
```
- Frontend Nginx: `http://127.0.0.1:8080` (configurable con `WEB_PORT`).
- Para detener sin borrar datos: `docker compose --profile full down`.

---

## 3. Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `npm run up` indica que no encontró Docker ni Podman | Motor no instalado o demonio apagado | Abre Docker Desktop (Windows/macOS) o inicia el servicio `docker`/`podman` en Linux |
| Error de puerto ocupado (`5432`, `9000`, `3001`, `5173`) | Otro servicio local usa ese puerto | Cambia `POSTGRES_PORT`, `S3_PORT` o `API_PORT` en `.env` o detén el proceso previo |
| Cambiaste `db/init/01_schema.sql` y no se aplicó | PostgreSQL solo ejecuta `docker-entrypoint-initdb.d` con volumen vacío | Ejecuta `npm run infra:reset && npm run up` |
| Error de autenticación al usar `MAIL_PROVIDER=gmail` | Contraseña normal en lugar de App Password | Genera una contraseña de aplicación de 16 caracteres en Google Account |
| Migración a AWS S3 o Cloudflare R2 | Configuración local apunta a MinIO | Define `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` y `S3_FORCE_PATH_STYLE=false` (AWS) en `.env` |
