# ESSMAR SIGVI

Plataforma de gestión de reportes ciudadanos (PQR), despacho de cuadrillas, verificación de evidencias, indicadores SLA y archivo documental PDF para Santa Marta.

## Arquitectura

| Componente | Tecnología | Puerto local |
|---|---|---|
| **Frontend** | Vue 3 + TypeScript + Vite + Pinia + Leaflet + Chart.js | `5173` (dev) / `8080` (Docker) |
| **Backend API + SSE** | Node.js + Express + JWT + `scrypt` + `pdfkit` | `3001` |
| **Base de datos** | PostgreSQL 17 (esquema único + triggers + vistas SLA) | `5432` |
| **Object Storage (S3)** | MinIO local (compatible AWS S3 / R2) — fotos y PDFs | `9000` (API) / `9001` (Consola) |
| **Correo electrónico** | Mailpit local (dev) o Gmail / SMTP corporativo | `1025` (SMTP) / `8025` (Bandeja) |

---

## Arranque rápido (Windows, macOS y Linux)

### Opción 1: Desarrollo local con un solo comando (recomendado)

Requisitos: **Node.js 20+** y **Docker Desktop** (Windows/macOS) o **Podman / Docker** (Linux).

```bash
git clone <url-del-repo>
cd proyectoF
npm run up
```

`npm run up` hace todo automáticamente en cualquier sistema operativo:
1. Genera `.env` con un `JWT_SECRET` aleatorio si no existe.
2. Instala `node_modules` de frontend y `server/` si faltan.
3. Detecta **Docker** o **Podman** (con o sin `compose`) y levanta PostgreSQL 17, MinIO S3 y Mailpit.
4. Espera a que la infraestructura esté saludable, inicia la API (`:3001`) y el frontend (`:5173`) y muestra las URLs y credenciales.

### Opción 2: Despliegue 100% en contenedores (sin Node en el host)

```bash
cp .env.example .env
docker compose --profile full up -d --build
```

La aplicación completa queda disponible en **http://127.0.0.1:8080** (Nginx sirviendo la SPA y haciendo proxy de `/api` y SSE hacia el contenedor `api`).

---

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run up` | Prepara entorno, levanta contenedores, API y frontend |
| `npm run doctor` | Revisa SO, Docker/Podman, `.env`, dependencias y salud de todos los servicios |
| `npm run setup` | Solo crea `.env` e instala dependencias |
| `npm run infra:up` | Levanta solo PostgreSQL, MinIO S3 y Mailpit |
| `npm run infra:down` | Detiene los contenedores (conserva los datos) |
| `npm run infra:reset` | Borra contenedores y volúmenes para empezar desde cero |
| `npm run build` | Verifica tipos (`vue-tsc -b`) y compila producción (`vite build`) |

---

## Cuentas iniciales de desarrollo

Se crean automáticamente al iniciar el servidor (configurables en `.env`):

| Rol | Correo | Contraseña por defecto |
|---|---|---|
| **Administrador** | `admin@essmar.gov.co` | `AdminEssmar2026!` |
| **Supervisor** | `supervisor@essmar.gov.co` | `SupervisorEssmar2026!` |
| **Operarios (1–10)** | `operador1@essmar.co` … `operador10@essmar.co` | `OperarioEssmar2026!` |

---

## Servicios locales y correo Gmail

- **App Web:** http://127.0.0.1:5173
- **API Health:** http://127.0.0.1:3001/api/health
- **MinIO S3 Consola:** http://127.0.0.1:9001 (`essmar_minio_admin` / `EssmarMinio2026!`)
- **Mailpit Bandeja Web:** http://127.0.0.1:8025

### Cambiar de Mailpit a Gmail real
En `.env` ajusta:
```env
MAIL_PROVIDER=gmail
GMAIL_USER=tu-correo@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PUBLIC_APP_URL=https://tu-dominio.com
```
También soporta `MAIL_PROVIDER=gmail_oauth2` y `MAIL_PROVIDER=smtp`. Puedes validar la entrega llamando a `POST /api/notifications/test` con sesión de `admin`.
