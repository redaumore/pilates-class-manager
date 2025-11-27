# Implementación de Persistencia de Alta, Baja y Modificación de Alumnas

## Resumen

Se implementó la persistencia completa de las operaciones de gestión de alumnas (crear, editar, eliminar) en la hoja de Google Sheets.

## Cambios Realizados

### 1. Nuevas Funciones en `googleSheetsService.ts`

Se agregaron tres nuevas funciones exportadas:

#### `createStudent(student: Student): Promise<Student>`

**Funcionalidad:**
- Valida que no exista una alumna con el mismo NOMBRE y APELLIDO (case-insensitive)
- Genera un nuevo ID automáticamente (máximo ID existente + 1)
- Establece el ESTADO como 'OK'
- Establece la FECHA DE INGRESO como la proporcionada o la fecha actual
- Inserta un nuevo registro en la hoja del año (ej: 2025)
- Retorna el objeto Student con el ID generado

**Validaciones:**
- Verifica duplicados solo en alumnas con ESTADO = 'OK'
- Convierte el nivel a código de letra (B, M, A)
- Formatea el teléfono removiendo el prefijo 54911 para almacenamiento
- Formatea la fecha de ingreso a DD/MM/YYYY

#### `updateStudent(student: Student): Promise<void>`

**Funcionalidad:**
- Busca la alumna por ID en la hoja
- Actualiza los siguientes campos:
  - NOMBRE
  - APELLIDO
  - TELEFONO
  - NIVEL
  - PLAN
  - RECUPERAR (clases de recuperación)
- Utiliza batch update para optimizar las llamadas a la API

**Nota:** No modifica las clases asignadas (CLASE 1, CLASE 2, CLASE 3) ni los pagos mensuales.

#### `deleteStudent(studentId: string): Promise<void>`

**Funcionalidad:**
- Busca la alumna por ID en la hoja
- Marca el ESTADO como 'BORRADA' (no elimina físicamente el registro)
- Esto permite mantener un historial de alumnas eliminadas

### 2. Modificaciones en `App.tsx`

#### Imports Actualizados
Se agregaron las nuevas funciones a los imports:
```typescript
import { ..., createStudent, updateStudent, deleteStudent } from './services/googleSheetsService';
```

#### `handleSaveStudent` - Ahora es async
**Antes:** Solo actualizaba el estado local
**Ahora:**
- Detecta si es una creación o edición
- Para ediciones: llama a `updateStudent()` y actualiza el estado local
- Para creaciones: llama a `createStudent()`, obtiene el ID generado y actualiza el estado local
- Maneja errores y muestra alertas al usuario

#### `handleDeleteStudent` - Ahora es async
**Antes:** Solo actualizaba el estado local
**Ahora:**
- Llama a `deleteStudent()` para marcar como BORRADA en la hoja
- Actualiza el estado local (students, schedule, payments)
- Maneja errores y muestra alertas al usuario

## Flujo de Operaciones

### Crear Alumna
1. Usuario completa el formulario de nueva alumna
2. Se valida que no exista duplicado (nombre + apellido)
3. Se genera nuevo ID (max + 1)
4. Se inserta registro en hoja 2025 con ESTADO='OK'
5. Se actualiza el estado local con el nuevo ID
6. Se cierra el modal

### Editar Alumna
1. Usuario edita los datos de una alumna existente
2. Se busca el registro por ID en la hoja
3. Se actualizan los campos modificables
4. Se actualiza el estado local
5. Se cierra el modal

### Eliminar Alumna
1. Usuario confirma la eliminación
2. Se marca ESTADO='BORRADA' en la hoja
3. Se elimina del estado local (students, schedule, payments)
4. La alumna ya no aparece en la aplicación

## Consideraciones Técnicas

### Manejo de Errores
- Todas las operaciones incluyen try-catch
- Los errores se muestran al usuario mediante alerts
- Los errores se registran en la consola para debugging

### Validación de Duplicados
- Solo se valida contra alumnas con ESTADO='OK'
- La comparación es case-insensitive
- Se compara NOMBRE + APELLIDO completo

### Formato de Datos
- **Teléfono:** Se almacena sin el prefijo 54911 en la hoja
- **Fecha:** Se convierte de YYYY-MM-DD a DD/MM/YYYY para la hoja
- **Nivel:** Se convierte de texto (Basico/Medio/Avanzado) a código (B/M/A)

### Preservación de Datos
- Al editar, no se modifican las clases asignadas
- Al editar, no se modifican los pagos registrados
- Al eliminar, se marca como BORRADA pero no se elimina físicamente

## Pruebas Recomendadas

1. **Crear alumna nueva:**
   - Verificar que se genera ID correcto
   - Verificar que aparece en la hoja 2025
   - Verificar que aparece en la lista de alumnas

2. **Crear alumna duplicada:**
   - Intentar crear alumna con mismo nombre y apellido
   - Verificar que muestra error de duplicado

3. **Editar alumna:**
   - Modificar datos de alumna existente
   - Verificar que se actualizan en la hoja
   - Verificar que se reflejan en la aplicación

4. **Eliminar alumna:**
   - Eliminar una alumna
   - Verificar que ESTADO cambia a BORRADA en la hoja
   - Verificar que desaparece de la aplicación
   - Verificar que sus clases se liberan

## Archivos Modificados

- `/services/googleSheetsService.ts` - Agregadas 3 nuevas funciones (343 líneas)
- `/App.tsx` - Modificadas funciones handleSaveStudent y handleDeleteStudent

## Compilación

El proyecto compila exitosamente sin errores:
```
✓ 47 modules transformed.
dist/index.html                  1.15 kB │ gzip:  0.56 kB
dist/assets/index-hOprq4aU.js  261.71 kB │ gzip: 78.26 kB
✓ built in 591ms
```
