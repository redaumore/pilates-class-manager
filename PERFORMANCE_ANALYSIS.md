# Análisis de Rendimiento - Pilates Class Manager

**Fecha:** 2026-02-04  
**Problema reportado:** Lentitud al cargar y guardar datos en la aplicación

## 🔍 Diagnóstico del Problema

### Problemas Identificados

#### 1. **Múltiples Llamadas Redundantes a Google Sheets API**

**Ubicación:** `Dashboard.tsx` - función `fetchData()` (líneas 139-197)

Cada vez que se carga la aplicación o cambia el año, se realizan **MÚLTIPLES** llamadas secuenciales a la API:

```typescript
// 1. Carga de datos principales
const { students, schedule, payments } = await loadDataFromSheet(year);

// 2. Carga de costos de planes
const loadedCosts = await loadPlanCosts();

// 3. Carga de días laborales
const loadedWorkingDays = await loadWorkingDays();

// 4. Actualización de hoja mensual
await updateMonthlySheet(schedule, students, monthYear, loadedWorkingDays || workingDays);

// 5. Carga de configuración de horarios
const loadedScheduleConfig = await loadScheduleConfig();

// 6. Carga de días no laborables
const loadedHolidays = await loadNonWorkingDays();
```

**Impacto:** 6 llamadas API secuenciales en cada carga inicial.

#### 2. **Carga Completa de Datos en Cada Operación**

**Ubicación:** `googleSheetsService.ts` - múltiples funciones

Muchas operaciones cargan **TODA** la hoja de datos para modificar una sola celda:

**Ejemplo 1:** `assignStudentToClassRecurring()` (línea 513)
```typescript
// Carga TODOS los datos solo para encontrar una fila
const response = await callRpc('loadDataFromSheet');
const rows = response.values; // Todas las filas
```

**Ejemplo 2:** `updatePaymentStatus()` (línea 771)
```typescript
// Carga TODOS los datos para actualizar un pago
const response = await callRpc('loadDataFromSheet');
```

**Ejemplo 3:** `registerStudentAbsence()` (línea 842)
```typescript
// Carga la hoja mensual completa
const response = await callRpc('getSheetValues', { range: `${sheetName}!A:G` });
```

**Impacto:** Cada operación de escritura requiere leer cientos de filas innecesariamente.

#### 3. **Actualización Automática de Hoja Mensual en Cada Cambio**

**Ubicación:** `Dashboard.tsx` - useEffect (líneas 128-137)

```typescript
useEffect(() => {
    if (!loading && students.length > 0 && Object.keys(schedule).length > 0) {
        const year = currentWeek.getFullYear().toString();
        const month = String(currentWeek.getMonth() + 1).padStart(2, '0');
        const monthYear = `${year}-${month}`;
        updateMonthlySheet(schedule, students, monthYear, workingDays).catch(err => {
            console.warn('Error proactively updating monthly sheet:', err);
        });
    }
}, [currentWeek, students, schedule, workingDays, loading]);
```

**Impacto:** La hoja mensual se regenera completamente cada vez que:
- Cambia la semana actual
- Se modifica un estudiante
- Se modifica el horario
- Cambian los días laborales

Esto puede generar **docenas** de escrituras innecesarias.

#### 4. **Operaciones No Optimizadas en `updateMonthlySheet()`**

**Ubicación:** `googleSheetsService.ts` - líneas 387-511

Esta función:
1. Lee toda la hoja mensual
2. Borra todo el contenido (`clearSheet`)
3. Regenera todas las filas desde cero
4. Escribe todo de nuevo

```typescript
// Borra TODO
await callRpc('clearSheet', { range: `'${monthYear}'!A:Z` });

// Escribe TODO de nuevo
await callRpc('updateSheet', { range: `'${monthYear}'!A1`, values: finalData });
```

**Impacto:** Operación muy costosa que se ejecuta frecuentemente.

#### 5. **Falta de Caché Local**

No hay ningún mecanismo de caché para:
- Configuraciones que rara vez cambian (plan costs, working days, schedule config)
- Datos de estudiantes que no cambian frecuentemente
- Datos ya cargados en la sesión actual

#### 6. **Operaciones Síncronas en Cadena**

Muchas operaciones que podrían ejecutarse en paralelo se ejecutan secuencialmente:

```typescript
// Estas 3 operaciones son independientes pero se ejecutan en secuencia
const loadedCosts = await loadPlanCosts();
const loadedWorkingDays = await loadWorkingDays();
const loadedScheduleConfig = await loadScheduleConfig();
```

---

## 📊 Impacto Estimado

### Escenario Típico de Carga Inicial

| Operación | Llamadas API | Tiempo Estimado* |
|-----------|--------------|------------------|
| loadDataFromSheet | 3-4 | 2-3s |
| loadPlanCosts | 1 | 0.5s |
| loadWorkingDays | 1 | 0.5s |
| updateMonthlySheet | 3-4 | 2-3s |
| loadScheduleConfig | 1 | 0.5s |
| loadNonWorkingDays | 1 | 0.5s |
| **TOTAL** | **10-12** | **6-9s** |

*Tiempos aproximados con latencia de red normal

### Escenario de Guardado (ej: asignar estudiante)

| Operación | Llamadas API | Tiempo Estimado |
|-----------|--------------|-----------------|
| Cargar todos los datos | 1 | 1s |
| Actualizar celda maestra | 1 | 0.5s |
| Leer hoja mensual | 1 | 0.5s |
| Agregar filas mensuales | 1 | 0.5s |
| **TOTAL** | **4** | **2.5s** |

---

## ✅ Soluciones Propuestas (Sin Migrar a BD)

### 🎯 Prioridad ALTA - Impacto Inmediato

#### 1. **Implementar Batch API Calls**

Usar `batchUpdateValues` para operaciones múltiples:

```typescript
// EN VEZ DE:
await updateSheet(range1, values1);
await updateSheet(range2, values2);
await updateSheet(range3, values3);

// HACER:
await callRpc('batchUpdateValues', {
    data: [
        { range: range1, values: values1 },
        { range: range2, values: values2 },
        { range: range3, values: values3 }
    ]
});
```

**Beneficio:** Reduce 3 llamadas API a 1 sola.

#### 2. **Caché de Configuraciones**

Implementar caché en localStorage para datos que rara vez cambian:

```typescript
// Cachear por 1 hora
const CACHE_DURATION = 60 * 60 * 1000;

const getCachedOrFetch = async (key, fetchFn) => {
    const cached = localStorage.getItem(key);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
    }
    
    const data = await fetchFn();
    localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
    }));
    return data;
};
```

**Beneficio:** Elimina 3-4 llamadas API en cada carga.

#### 3. **Optimizar `updateMonthlySheet()` - Modo Incremental**

En lugar de borrar y reescribir todo, solo actualizar lo necesario:

```typescript
// Solo actualizar filas que cambiaron
// Solo agregar nuevas filas
// Solo eliminar filas específicas
```

**Beneficio:** Reduce tiempo de actualización de 2-3s a 0.3-0.5s.

#### 4. **Debouncing de Actualizaciones Automáticas**

Evitar múltiples actualizaciones en corto tiempo:

```typescript
const debouncedUpdateMonthlySheet = useMemo(
    () => debounce(updateMonthlySheet, 2000),
    []
);
```

**Beneficio:** Reduce actualizaciones innecesarias de 10+ a 1-2 por sesión.

#### 5. **Paralelizar Cargas Independientes**

```typescript
// EN VEZ DE:
const costs = await loadPlanCosts();
const days = await loadWorkingDays();
const config = await loadScheduleConfig();

// HACER:
const [costs, days, config] = await Promise.all([
    loadPlanCosts(),
    loadWorkingDays(),
    loadScheduleConfig()
]);
```

**Beneficio:** Reduce tiempo de carga de 1.5s a 0.5s.

---

### 🎯 Prioridad MEDIA - Optimizaciones Adicionales

#### 6. **Usar Rangos Específicos en Lugar de Columnas Completas**

```typescript
// EN VEZ DE:
const range = `'${sheetName}'!A:Z`;

// HACER (si sabemos que hay max 100 estudiantes):
const range = `'${sheetName}'!A1:Z100`;
```

**Beneficio:** Reduce datos transferidos en 50-80%.

#### 7. **Implementar Paginación para Listas Grandes**

Para la vista de estudiantes y pagos, cargar solo lo visible:

```typescript
// Cargar solo 20 estudiantes a la vez
const pageSize = 20;
const visibleStudents = students.slice(page * pageSize, (page + 1) * pageSize);
```

**Beneficio:** Mejora rendering en listas grandes.

#### 8. **Optimizar Búsqueda de Filas**

Crear un índice en memoria en lugar de buscar linealmente:

```typescript
// Crear índice una vez
const studentRowIndex = new Map();
rows.forEach((row, idx) => {
    studentRowIndex.set(row[idIndex], idx);
});

// Buscar en O(1) en lugar de O(n)
const rowIndex = studentRowIndex.get(studentId);
```

**Beneficio:** Acelera operaciones de búsqueda en 10-100x.

---

### 🎯 Prioridad BAJA - Mejoras Futuras

#### 9. **Service Worker para Caché Offline**

Implementar un service worker que cachee respuestas de API.

#### 10. **Compresión de Datos**

Comprimir datos antes de enviar/recibir de Google Sheets.

---

## 📈 Impacto Esperado de las Optimizaciones

### Con Optimizaciones de Prioridad ALTA

| Escenario | Tiempo Actual | Tiempo Optimizado | Mejora |
|-----------|---------------|-------------------|--------|
| Carga Inicial | 6-9s | 2-3s | **66-70%** |
| Guardar Estudiante | 2.5s | 0.8s | **68%** |
| Asignar a Clase | 2.5s | 0.8s | **68%** |
| Registrar Pago | 2s | 0.5s | **75%** |

### Con TODAS las Optimizaciones

| Escenario | Tiempo Actual | Tiempo Optimizado | Mejora |
|-----------|---------------|-------------------|--------|
| Carga Inicial | 6-9s | 1-2s | **78-89%** |
| Guardar Estudiante | 2.5s | 0.3s | **88%** |
| Asignar a Clase | 2.5s | 0.3s | **88%** |
| Registrar Pago | 2s | 0.2s | **90%** |

---

## 🚀 Plan de Implementación Recomendado

### Fase 1 - Ganancias Rápidas (1-2 días)
1. ✅ Implementar caché de configuraciones
2. ✅ Paralelizar cargas independientes
3. ✅ Debouncing de actualizaciones automáticas

**Impacto esperado:** 50-60% mejora

### Fase 2 - Optimizaciones Core (2-3 días)
4. ✅ Implementar batch API calls
5. ✅ Optimizar updateMonthlySheet (modo incremental)
6. ✅ Usar rangos específicos

**Impacto esperado:** 70-80% mejora total

### Fase 3 - Refinamiento (1-2 días)
7. ✅ Implementar índices en memoria
8. ✅ Paginación de listas
9. ✅ Optimizaciones adicionales

**Impacto esperado:** 85-90% mejora total

---

## 🎓 Conclusión

**¿Es viable seguir usando Google Sheets?**

**SÍ**, con las optimizaciones propuestas, Google Sheets puede seguir siendo una solución viable para:
- Hasta 200-300 estudiantes
- Hasta 50-100 clases por semana
- Operaciones normales de gestión

**Límites de Google Sheets:**
- **Cuota de API:** 100 solicitudes por 100 segundos por usuario
- **Tamaño máximo:** 10 millones de celdas por hoja
- **Latencia:** Siempre habrá 200-500ms de latencia de red

**Cuándo migrar a BD:**
- Más de 300 estudiantes activos
- Necesidad de búsquedas complejas
- Reportes analíticos avanzados
- Múltiples usuarios concurrentes (>5)
- Necesidad de transacciones ACID

---

## 📝 Notas Técnicas

### Limitaciones de Google Sheets API

1. **Rate Limits:**
   - 100 requests per 100 seconds per user
   - 500 requests per 100 seconds per project

2. **Tamaño de Respuesta:**
   - Máximo 10MB por request
   - Recomendado: <1MB para mejor rendimiento

3. **Latencia Base:**
   - Mínimo 200-300ms por request (red + procesamiento)
   - Batch requests: ~500-800ms (múltiples operaciones)

### Herramientas de Monitoreo Recomendadas

1. **Chrome DevTools Network Tab:**
   - Monitorear tiempo de cada request
   - Identificar requests lentos

2. **React DevTools Profiler:**
   - Identificar re-renders innecesarios
   - Optimizar componentes

3. **Console Timing:**
   ```typescript
   console.time('loadData');
   await loadDataFromSheet();
   console.timeEnd('loadData');
   ```

---

**Autor:** Gemini AI Assistant  
**Revisión recomendada:** Mensual o cuando se agreguen >50 estudiantes
