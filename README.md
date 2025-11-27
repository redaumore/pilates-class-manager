# 🧘‍♀️ Pilates Class Manager

[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646cff?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistema de gestión de clases de Pilates con integración a Google Sheets para administrar alumnas, horarios, asistencias y pagos.

## 📋 Descripción

Pilates Class Manager es una aplicación web moderna diseñada para estudios de Pilates que permite:

- 📅 **Gestión de Horarios**: Visualización semanal y mensual de clases
- 👥 **Administración de Alumnas**: Alta, baja y modificación de estudiantes
- 📊 **Control de Asistencias**: Registro de presencias, ausencias y recuperaciones
- 💰 **Seguimiento de Pagos**: Control mensual de pagos por plan
- 🔄 **Sincronización en Tiempo Real**: Todos los datos se almacenan en Google Sheets

## ✨ Características Principales

### Gestión de Alumnas
- ✅ Creación de nuevas alumnas con validación de duplicados
- ✅ Edición de información (nombre, apellido, teléfono, nivel, plan)
- ✅ Eliminación lógica (marca como BORRADA sin perder historial)
- ✅ Conversión automática a mayúsculas de nombres y apellidos
- ✅ Asignación de clases de recuperación

### Gestión de Clases
- ✅ Vista semanal y calendario mensual
- ✅ Asignación de alumnas a clases (fija o por día)
- ✅ Capacidad máxima de 5 alumnas por clase
- ✅ Registro de ausencias con o sin aviso
- ✅ Cancelación de clases específicas

### Gestión de Pagos
- ✅ Registro de pagos mensuales por alumna
- ✅ Visualización del estado de pagos
- ✅ Cálculo automático según plan (1, 2 o 3 clases semanales)
- ✅ Configuración de costos por plan

### Niveles y Planes
- **Niveles**: Básico, Medio, Avanzado
- **Planes**: 1, 2 o 3 clases por semana
- **Horarios**: Lunes a Viernes, 9:00 a 20:00

## 🚀 Tecnologías Utilizadas

- **Frontend**: React 19.2 + TypeScript
- **Build Tool**: Vite 6.2
- **Estilos**: CSS vanilla con Tailwind-like utilities
- **Backend**: Google Sheets API (almacenamiento de datos)
- **Autenticación**: Google Identity Services
- **Testing**: Vitest + React Testing Library

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta de Google con acceso a Google Sheets
- Credenciales de Google Cloud Platform

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/redaumore/pilates-class-manager.git
cd pilates-class-manager
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar Google Sheets API**

   a. Ve a [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Crea un nuevo proyecto o selecciona uno existente
   
   c. Habilita la Google Sheets API
   
   d. Crea credenciales OAuth 2.0:
      - Tipo: Aplicación web
      - Orígenes autorizados: `http://localhost:5173`
      - URIs de redirección: `http://localhost:5173`
   
   e. Copia el Client ID

4. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
```

5. **Configurar Google Sheet**

   a. Crea una nueva hoja de cálculo en Google Sheets
   
   b. Copia el ID de la hoja (está en la URL)
   
   c. Actualiza el `SPREADSHEET_ID` en `services/googleSheetsService.ts`:
   ```typescript
   const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
   ```
   
   d. Crea las siguientes pestañas con sus respectivas columnas:

   **Pestaña "2025"** (Alumnas):
   ```
   ID | NOMBRE | APELLIDO | TELEFONO | ESTADO | NIVEL | PLAN | CLASE 1 | CLASE 2 | CLASE 3 | INGRESO | ENE | FEB | MAR | ABR | MAY | JUN | JUL | AGO | SEP | OCT | NOV | DIC | RECUPERAR
   ```

   **Pestaña "2025-11"** (Clases del mes):
   ```
   FECHA | CLASE_ID | ALUMNA_ID | TIPO_ASIGNACION | ESTADO | TIMESTAMP | NOTAS
   ```

   **Pestaña "2025-config"** (Configuración):
   ```
   Plan | Cuota | Estado | Modificado
   ```

## 🎯 Uso

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Producción

```bash
npm run build
npm run preview
```

### Testing

```bash
npm test
```

## 📖 Estructura del Proyecto

```
pilates-class-manager/
├── src/
│   ├── components/          # Componentes React
│   │   ├── CalendarPage.tsx
│   │   ├── ScheduleView.tsx
│   │   ├── StudentManagementPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── ...
│   ├── services/            # Servicios de integración
│   │   └── googleSheetsService.ts
│   ├── types.ts             # Definiciones de TypeScript
│   ├── constants.ts         # Constantes de la aplicación
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Punto de entrada
├── test/                    # Tests unitarios
├── public/                  # Archivos estáticos
├── .env.local              # Variables de entorno (no versionado)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🔐 Seguridad

- ⚠️ **NUNCA** subas el archivo `.env.local` al repositorio
- ⚠️ Las credenciales de Google deben mantenerse privadas
- ⚠️ Configura correctamente los orígenes autorizados en Google Cloud Console
- ✅ El archivo `.gitignore` está configurado para proteger archivos sensibles

## 📝 Reglas de Negocio

- Una alumna puede inscribirse en un **máximo de 3 clases por semana**
- Cada clase tiene un **límite de 5 alumnas**
- Las clases se identifican por día y hora (ej: "L09" = Lunes 9:00)
- Las alumnas repiten las clases semanalmente durante todo el mes
- El sistema permite asignaciones **fijas** (recurrentes) o **por día** (recuperaciones)
- Los pagos se registran mensualmente según el plan de la alumna

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👤 Autor

**Rolando Daumas**
- GitHub: [@redaumore](https://github.com/redaumore)
- Email: redaumore@gmail.com

## 🙏 Agradecimientos

- React Team por la excelente biblioteca
- Google por la Sheets API
- Comunidad de código abierto

---

⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub!
