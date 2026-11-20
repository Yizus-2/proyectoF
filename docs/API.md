# Referencia de API REST y SSE

URL base por defecto en desarrollo: `http://127.0.0.1:3001` (el frontend consume `/api/*` mediante proxy en Vite o Nginx).

Los endpoints protegidos requieren cabecera:
```http
Authorization: Bearer <token_jwt>
```

---

## 1. Salud, archivos y tiempo real

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Verifica conectividad con PostgreSQL, bucket S3 y proveedor de correo activo |
| `GET` | `/api/files/:folder/:filename` | Público | Sirve imágenes desde S3 (`reports`, `evidences`) con streaming seguro |
| `GET` | `/api/events` | `admin`, `supervisor`, `operator` | Stream **Server-Sent Events (SSE)** para refresco en tiempo real |

---

## 2. Autenticación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público (rate limit) | Valida correo y contraseña; devuelve JWT y perfil del usuario |
| `GET` | `/api/auth/me` | Autenticado | Devuelve el perfil actual asociado al token |

Ejemplo de login:
```bash
curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@essmar.gov.co","password":"AdminEssmar2026!"}'
```

---

## 3. Portal ciudadano y rastreo PQR

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/zones` | Público | Lista las 10 zonas habilitadas de Santa Marta |
| `POST` | `/api/reports` | Público (rate limit) | Radica un reporte PQR (`multipart/form-data`, campo opcional `photo`), intenta asignar cuadrilla y envía confirmación por correo |
| `GET` | `/api/reports/track/:code` | Público | Consulta estado, historial y evidencias públicas por código PQR (ej. `REP-20261120-0001`) |
| `GET` | `/api/reports/track/:code/pdf` | Público | Genera/recupera el comprobante PDF firmado con `SHA-256` desde S3 |
| `POST` | `/api/ratings` | Público | Registra calificación (1–5) y comentario cuando el reporte está `CERRADO` |

---

## 4. Gestión operativa, evidencias y verificaciones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/reports` | `admin`, `supervisor`, `operator` | Lista reportes (filtrado por cuadrilla cuando el rol es `operator`) |
| `PATCH` | `/api/reports/:id` | `admin`, `supervisor`, `operator` | Actualiza estado, prioridad, cuadrilla o sube evidencia opcional (`multipart/form-data`, campo `evidence`) |
| `POST` | `/api/reports/:id/assign-auto` | `admin`, `supervisor` | Ejecuta asignación automática en PostgreSQL (`assign_crew_automatically`) |
| `GET` | `/api/reports/:id/evidences` | `admin`, `supervisor`, `operator` | Lista evidencias fotográficas y observaciones del reporte |
| `POST` | `/api/reports/:id/evidences` | `admin`, `supervisor`, `operator` | Carga una nueva evidencia de campo (`photo` + `description`) |
| `POST` | `/api/reports/:id/verifications` | `admin`, `supervisor` | Aprueba cierre (`CERRADO`, genera PDF S3 y envía correo con adjunto) o rechaza devolviendo a `EN_PROGRESO` |

---

## 5. Cuadrillas y operarios

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/crews` | `admin`, `supervisor`, `operator` | Lista cuadrillas con zona y carga actual (`workload`) |
| `GET` | `/api/operators` | `admin`, `supervisor` | Lista cuentas con rol `operator` y su asignación actual |
| `PATCH` | `/api/operators/:id` | `admin` | Reasigna zona, cuadrilla o estado activo de un operario |

---

## 6. Indicadores SLA, documentos y notificaciones

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/analytics/zones` | `admin`, `supervisor`, `operator` | Métricas por zona desde `reports_by_zone` |
| `GET` | `/api/analytics/sla` | `admin`, `supervisor` | KPIs de SLA y eficiencia de cuadrillas |
| `POST` | `/api/analytics/export/pdf` | `admin`, `supervisor` | Genera y archiva en S3 un informe ejecutivo PDF según filtros |
| `GET` | `/api/analytics/export/csv` | `admin`, `supervisor` | Descarga dataset filtrado en CSV UTF-8 con BOM |
| `GET` | `/api/documents` | `admin`, `supervisor` | Historial de documentos PDF almacenados en S3 con su `SHA-256` |
| `GET` | `/api/documents/:id/download` | Público / Autenticado | Descarga un documento específico del repositorio documental |
| `GET` | `/api/notifications` | `admin`, `supervisor` | Consulta bitácora `notification_logs` de correos enviados/fallidos |
| `POST` | `/api/notifications/test` | `admin` | Envía un correo de prueba con el `MAIL_PROVIDER` activo |
