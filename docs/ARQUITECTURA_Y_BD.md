# Arquitectura, Base de Datos, S3 y Seguridad

## 1. Modelo de datos (PostgreSQL 17)

El esquema completo reside en `db/init/01_schema.sql` y los datos base (10 zonas de Santa Marta y 10 cuadrillas) en `db/init/02_seed.sql`.

### Tablas (`public`)

| Tabla | Propósito |
|---|---|
| `zones` | 10 zonas geográficas de Santa Marta (Centro Histórico, Rodadero, Mamatoco, Bastidas, Gaira, Taganga, Bonda, Zona Industrial, Pescaíto y Otros) con su SLA base en horas |
| `crews` | Cuadrillas operativas asociadas a una zona, con especialidades, control de carga (`workload` entre `0` y `3`) y disponibilidad (`is_available`) |
| `users` | Cuentas del sistema (`admin`, `supervisor`, `operator`, `citizen`) con contraseña en hash `scrypt` y referencia a zona/cuadrilla |
| `reports` | Radicados PQR con código único (`REP-YYYYMMDD-NNNN`), coordenadas GPS, prioridad, recurrencia, foto inicial y estado |
| `report_history` | Bitácora inmutable de transiciones de estado con actor, notas y marcas de tiempo |
| `evidences` | Evidencias fotográficas y descripciones técnicas cargadas por operarios en campo |
| `verifications` | Dictámenes de aprobación o rechazo emitidos por supervisores antes del cierre |
| `ratings` | Calificaciones ciudadanas (1–5 estrellas y comentario) vinculadas al reporte cerrado |
| `documents` | Catálogo de PDFs generados (comprobantes PQR e informes ejecutivos) con llave S3, tamaño y hash `SHA-256` |
| `notification_logs` | Auditoría de correos enviados o fallidos (`ENVIADO` / `ERROR`), asunto, destinatario y `provider_id` |

### Triggers y funciones de negocio

| Objeto | Disparador / Uso | Comportamiento |
|---|---|---|
| `generate_tracking_code()` | `BEFORE INSERT` en `reports` | Asigna código atómico `REP-YYYYMMDD-NNNN` (hora `America/Bogota`) usando `report_tracking_seq` |
| `check_recurrence()` | `BEFORE INSERT` en `reports` | Marca reincidencia si existen reportes previos en un radio aproximado de 100 m durante los últimos 90 días |
| `log_status_change()` | `AFTER INSERT / UPDATE` en `reports` | Registra automáticamente cada cambio de estado en `report_history` |
| `sync_crew_workload()` | `AFTER INSERT / UPDATE / DELETE` en `reports` | Recalcula `crews.workload` y actualiza `is_available` (tope 3 casos activos por cuadrilla) |
| `mark_report_as_evaluated()` | `AFTER INSERT` en `ratings` | Transiciona el reporte de `CERRADO` a `EVALUADO` |
| `assign_crew_automatically(p_report_id)` | Invocada desde la API | Selecciona la cuadrilla con menor carga en la zona usando `FOR UPDATE SKIP LOCKED` para evitar colisiones concurrentes |

### Vistas analíticas (SLA e indicadores)

- `reports_by_zone`: totales y distribución de estados por zona.
- `reports_sla_status`: clasificación de cumplimiento por ventana SLA según urgencia.
- `vw_kpi_sla_compliance`: métricas consolidadas de cumplimiento global y tiempos promedio.
- `crew_efficiency`: rendimiento, carga actual y casos resueltos por cuadrilla.

> En `server/src/db.js`, los tipos `BIGINT` (OID `20`) y `NUMERIC` (OID `1700`) de PostgreSQL se convierten a `Number` de JavaScript para mantener contratos JSON consistentes con TypeScript.

---

## 2. Almacenamiento S3 y generación documental

Todos los archivos binarios se guardan en un bucket compatible con S3 (por defecto **MinIO** local en `http://127.0.0.1:9000`, bucket `essmar-sigvi`). Al cambiar `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY` y `S3_SECRET_KEY` en `.env`, el mismo código opera sobre **AWS S3** o **Cloudflare R2** sin modificaciones.

### Estructura de objetos en el bucket

```text
essmar-sigvi/
├── reports/               # Foto inicial adjuntada por el ciudadano
├── evidences/             # Fotos de campo subidas por operarios
└── documents/
    ├── pqr/               # Comprobantes PDF de radicado y cierre PQR
    └── executive/         # Informes ejecutivos PDF exportados desde /indicadores
```

### Documentos PDF y CSV

- **Comprobante PQR (`GET /api/reports/track/:code/pdf`):** generado con `pdfkit`, incluye radicado, metadatos, cronología completa, estado de cierre, firma de integridad `SHA-256` y almacenamiento en S3 + tabla `documents`. También se genera y adjunta automáticamente al correo cuando el supervisor aprueba el cierre (`CERRADO`).
- **Informe ejecutivo PDF (`POST /api/analytics/export/pdf`):** snapshot con KPIs globales, SLA por zona y desempeño de cuadrillas según los filtros activos del tablero; queda archivado en S3 y en `documents`.
- **Exportación CSV (`GET /api/analytics/export/csv`):** archivo UTF-8 con BOM (`EF BB BF`) listo para abrir directamente en Excel sin problemas de tildes ni eñes.

---

## 3. Controles de seguridad implementados

1. **Autenticación y contraseñas:** contraseñas con `crypto.scrypt` + sal aleatoria por usuario y comparación en tiempo constante (`timingSafeEqual`); sesiones firmadas con JWT (`HS256`).
2. **Control de acceso (RBAC):** middlewares `requireAuth` y `requireRoles(...)` en todos los endpoints internos y en el stream SSE (`/api/events`). Un operario solo puede gestionar los reportes asignados a su cuadrilla.
3. **Validación de archivos en memoria:** las imágenes se reciben en memoria (`multer` 2.x, límite 5 MB) y se verifican por **magic bytes reales** (JPEG, PNG, WebP) antes de subirlas a S3, evitando suplantación de MIME o extensión.
4. **Rate limiting:** límites en `/api/auth/login` y `/api/reports` con respuesta `429 Too Many Requests`.
5. **Validación de entrada:** coordenadas GPS acotadas (`lat` en `[-90, 90]`, `lng` en `[-180, 180]`), validación estricta de UUID e IDs numéricos (`400 Bad Request`) y escape HTML en plantillas de correo.
6. **Cabeceras HTTP:** `X-Powered-By` deshabilitado, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` y `Permissions-Policy`.
