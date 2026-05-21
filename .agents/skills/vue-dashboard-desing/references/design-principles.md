# Principios de Diseno de Dashboards

## Tabla de Contenidos
1. [Filosofia Core](#filosofia-core)
2. [Jerarquia Visual](#jerarquia-visual)
3. [Seleccion de Visualizaciones](#seleccion-de-visualizaciones)
4. [Densidad de Informacion](#densidad-de-informacion)
5. [Color y Contraste](#color-y-contraste)
6. [Tipografia](#tipografia)
7. [KPI Cards](#kpi-cards)
8. [Tablas Eficientes](#tablas-eficientes)
9. [Filtros y Controles](#filtros-y-controles)
10. [Estados de Carga y Vacio](#estados-de-carga-y-vacio)

---

## Filosofia Core

Un dashboard NO es un conjunto de graficas. Un dashboard es una herramienta de toma de decisiones que comunica informacion critica de forma inmediata.

### Regla de los 5 Segundos
El usuario debe entender el estado actual en 5 segundos. Si no lo logra, el dashboard falla en su proposito.

### Principios No Negociables
- **Claridad sobre belleza**: Un dashboard feo pero claro es mejor que uno hermoso pero confuso
- **Cada elemento justifica su espacio**: Si no aporta a una decision, eliminalo
- **Progresion de detalle**: Resumen primero, detalle bajo demanda
- **Contexto siempre**: Un numero sin comparacion (periodo anterior, meta, tendencia) es solo un numero

---

## Jerarquia Visual

### Patron F-Pattern (lectura natural)
Posiciona lo mas importante en la esquina superior izquierda, siguiendo el movimiento natural del ojo.

### Zona de Valor
```
+----------+----------+----------+----------+
|  ALTO    |   ALTO   |  MEDIO   |  MEDIO   |
| VALOR    |  VALOR   |  VALOR   |  VALOR   |
+----------+----------+----------+----------+
|  MEDIO   |   MEDIO  |  BAJO    |  BAJO    |
|  VALOR   |   VALOR  |  VALOR   |  VALOR   |
+----------+----------+----------+----------+
|  BAJO    |   BAJO   |  BAJO    |  BAJO    |
|  VALOR   |   VALOR  |  VALOR   |  VALOR   |
+----------+----------+----------+----------+
```

### Orden de Lectura Recomendado
1. **Fila 1**: KPIs criticos (cards compactos)
2. **Fila 2**: Tendencias principales (graficas de linea/barras)
3. **Fila 3**: Detalles y desglose (tablas, graficas secundarias)

---

## Seleccion de Visualizaciones

### Guia de Decision

| Tipo de Dato | Visualizacion Correcta | Evitar |
|-------------|----------------------|--------|
| Tendencia temporal | Linea, Area | Torta, Barras horizontales |
| Comparacion categorica | Barras verticales/horizontales | Linea |
| Proporcion de total (≤5 items) | Donut o Barras apiladas | Torta 3D |
| Proporcion de total (>5 items) | Tabla con barras de progreso | Torta |
| Distribucion | Histograma, Box plot | Barras simples |
| Correlacion | Scatter plot | Dos graficas separadas |
| Geografico | Mapa coropletico | Tabla de ciudades |

### Reglas de Oro
- **Maximo 3-4 tipos de grafica por dashboard**: Mas tipos = mas carga cognitiva
- **Las tortas/pie charts son la ultima opcion**: Las barras horizontales casi siempre son mejores para proporciones
- **Las lineas con doble eje Y son peligrosas**: Prefiere paneles separados o barras combinadas
- **Las graficas 3D distorsionan**: Nunca usar en dashboards serios

---

## Densidad de Informacion

### Principio de Escalera
```
Nivel 1: KPI Card      → "Ventes: $125K (+12%)"           → 1 segundo
Nivel 2: Mini chart    → Sparkline con tendencia de 30 dias  → 3 segundos
Nivel 3: Grafica full  → Desglose por categoria/region       → 10 segundos
Nivel 4: Drill-down    → Tabla detallada con filtros         → Tiempo necesario
```

### KPI Card Efectiva
```
+---------------------------+
| Titulo claro              |
| Valor principal  ↑ 12%    |
| vs. periodo anterior      |
| [sparkline miniatura]     |
+---------------------------+
```

- Titulo: accionable o descriptivo (ej: "Tasa de Conversion" no "Metrica #1")
- Valor: grande, con unidades claras
- Variacion: con indicador visual de direccion y color significativo
- Contexto: "vs mes anterior" o "meta: 85%"
- Sparkline: sin ejes, solo tendencia

---

## Color y Contraste

### Sistema de Color Funcional
```
Primario:   Acciones principales, datos principales
Secundario: Datos comparativos, categorias secundarias
Terciario:  Elementos de UI, bordes sutiles

Semantico:
  Positivo: Verde (o azul en ciertos contextos financieros)
  Negativo: Rojo
  Advertencia: Ambar/Naranja
  Info: Azul
  Neutro: Gris
```

### Reglas
- **Maximo 7 colores categoricos** por grafica. Mas = confusion
- **El color debe significar algo**: No uses color solo para decorar
- **Accesibilidad**: Todos los textos deben pasar WCAG AA (ratio 4.5:1)
- **No dependas solo del color**: Usa iconos + color para estados
- **Fondo**: Blanco o gris muy claro (#F8F9FA). Evita fondos oscuros para dashboards analiticos

---

## Tipografia

### Escalas Recomendadas
```
Dashboard title:  24px / font-weight: 600 / color: #1a1a2e
Section title:    16px / font-weight: 600 / color: #334155  / uppercase tracking
KPI value:        32px / font-weight: 700 / color: #0f172a
KPI label:        12px / font-weight: 500 / color: #64748b
Body:             13px / font-weight: 400 / color: #334155
Tabular data:     12px / font-weight: 400 / color: #475569
Caption:          11px / font-weight: 400 / color: #94a3b8
```

### Reglas
- **Maximo 2 familias de fuente** por dashboard
- **Los numeros deben ser tabulares** (monospace o font-variant-numeric: tabular-nums) para alineacion en tablas
- **Nunca justifiques texto en dashboards**: Alineacion izquierda siempre
- **Contraste minimo**: 4.5:1 para texto normal, 3:1 para texto grande

---

## Tablas Eficientes

### Cuando Usar Tablas
- Comparacion de multiples items con multiples metricas
- Datos que requieren precision numerica exacta
- Listados que necesitan ordenamiento

### Cuando NO Usar Tablas
- Para mostrar tendencias (usa lineas)
- Para comparar 2-3 valores (usa KPI cards o barras)
- Cuando hay mas de 15 columnas (drill-down o resumen)

### Optimizaciones
- **Sticky headers**: Siempre visibles al hacer scroll
- **Paginacion o virtual scroll** para >50 filas
- **Columnas con anchos fijos**: Evita tablas que se estiran infinitamente
- **Formateo contextual**: Colores para valores extremos, barras de progreso en porcentajes
- **Acciones inline**: Editar/eliminar al final de la fila, no en menus ocultos
- **Columnas derecha-alineadas para numeros**: Siempre

---

## Filtros y Controles

### Principios
- **Filtros globales arriba**: Fechas, regiones, y segmentos principales van en la parte superior
- **Filtros locales en contexto**: Filtros especificos de una grafica van cerca de ella
- **Estado visible siempre**: El usuario debe ver que filtros estan activos sin abrir dropdowns
- **Defaults inteligentes**: "Ultimos 30 dias" es mejor que "Seleccionar fecha"

### Anti-Patrones
- Mas de 5 filtros globales visibles simultaneamente (usa grupo colapsable)
- Filtros que requieren "Aplicar" manual (reaccionan en tiempo real o con debounce)
- Filtros que no afectan a todos los widgets (indica scope visualmente)

---

## Estados de Carga y Vacio

### Skeleton Loading
```
+---------------------------+
| [==== skeleton pulse ===] |
| [====]        [====]     |
| [==== skeleton pulse ===] |
+---------------------------+
```
- Usa placeholders con animacion pulse que imitan la estructura final
- Nunca uses spinners genericos para contenido de dashboard
- Carga progresiva: KPIs primero, graficas despues

### Estado Vacio
- Ilustracion sutil + texto explicativo
- Sugerencia de accion ("Prueba cambiar el rango de fechas")
- Nunca dejes un espacio en blanco sin explicacion

### Estado Error
- Mensaje claro sin jargon tecnico
- Boton de reintentar visible
- Datos cacheados si estan disponibles (stale-while-revalidate)
