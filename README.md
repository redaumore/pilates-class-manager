# 🧘‍♀️ Pilates Class Manager

[![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646cff?logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistema de gestión de clases de Pilates con integración a Google Sheets para administrar alumnas, horarios, asistencias y pagos.

## 📋 Descripción

Pilates Class Manager es una aplicación web moderna diseñada para estudios de Pilates que permite:

- 📅 **Gestión de Horarios**: Visualización semanal y mensual de clases.
- 👥 **Administración de Alumnas**: Alta, baja y modificación de estudiantes.
- 📊 **Control de Asistencias**: Registro de presencias, ausencias y recuperaciones.
- 💰 **Seguimiento de Pagos**: Control mensual de pagos por plan.
- 🔄 **Sincronización en Tiempo Real**: Los datos se almacenan en Google Sheets a través de una API segura.
- 🔒 **Autenticación**: Acceso protegido mediante Clerk.

## ✨ Características Principales

### Gestión de Alumnas
- ✅ Creación de nuevas alumnas con validación de duplicados.
- ✅ Edición de información (nombre, apellido, teléfono, nivel, plan).
- ✅ Eliminación lógica (marca como BORRADA sin perder historial).
- ✅ Conversión automática a mayúsculas de nombres y apellidos.
- ✅ Asignación de clases de recuperación.

### Gestión de Clases
- ✅ Vista semanal y calendario mensual.
- ✅ Asignación de alumnas a clases (fija o por día).
- ✅ Capacidad máxima de 5 alumnas por clase.
- ✅ Registro de ausencias con o sin aviso.
- ✅ Cancelación de clases específicas.

### Gestión de Pagos
- ✅ Registro de pagos mensuales por alumna.
- ✅ Visualización del estado de pagos.
- ✅ Cálculo automático según plan (1, 2 o 3 clases semanales).
- ✅ Configuración de costos por plan.

## 🚀 Tecnologías Utilizadas

- **Frontend**: React 19.2 + TypeScript
- **Build Tool**: Vite 6.2
- **Backend / API**: Vercel Serverless Functions (Node.js) + Google Sheets API
- **Autenticación**: [Clerk](https://clerk.com/)
- **Infraestructura**: Vercel
- **Testing**: Vitest + React Testing Library

## 📦 Instalación Local

### Prerrequisitos

- Node.js 18+ y npm.
- Cuenta de Google Cloud con una **Service Account**.
- Proyecto en [Clerk](https://clerk.com/).

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

3. **Configurar Variables de Envorno**
   Crea un archivo `.env.local` en la raíz con las siguientes variables:
   ```env
   # Clerk (Frontend)
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

   # Google Sheets (Backend / Serverless) - Necesario para que funcione la API local
   GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-cuenta@proyecto.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SPREADSHEET_ID=ID_DE_TU_HOJA_DE_CALCULO
   ```

4. **Iniciar en Desarrollo**
   ```bash
   npm run dev
   ```

## 🌐 Despliegue en Vercel

Este proyecto está optimizado para ser desplegado en Vercel utilizando **Serverless Functions** para interactuar de forma segura con la API de Google.

### Pasos para el Despliegue

1. **Conectar el repositorio a Vercel**: Crea un nuevo proyecto en Vercel e impórtalo desde GitHub.
2. **Configurar Variables de Entorno en el Dashboard de Vercel**:
   - `VITE_CLERK_PUBLISHABLE_KEY`: Tu clave pública de Clerk.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: El email de tu Service Account (extraído del JSON de la key).
   - `GOOGLE_PRIVATE_KEY`: La clave privada completa. **Importante**: Asegúrate de que las nuevas líneas se manejen correctamente (Vercel las acepta pegándolas tal cual del JSON).
   - `GOOGLE_SPREADSHEET_ID`: El ID de tu hoja de Google Sheets (el código largo en la URL).
3. **Configurar Spreadsheet ID**: El sistema intentará usar `GOOGLE_SPREADSHEET_ID` como predeterminado si el email del usuario no tiene uno específico mapeado en `api/rpc.ts`.
4. **Build & Deploy**: Vercel detectará la configuración de Vite automáticamente.

### Configuración del Spreadsheet
Asegúrate de compartir tu hoja de cálculo de Google con el email de la **Service Account** otorgándole permisos de **Editor**.

## 🎯 Uso

### Comandos Disponibles
- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Genera el bundle de producción.
- `npm test`: Ejecuta los tests unitarios.

## 📖 Estructura del Proyecto

```
pilates-class-manager/
├── api/                # Funciones Serverless (Vercel)
│   └── rpc.ts          # Proxy para Google Sheets API
├── components/         # Componentes React
├── services/           # Lógica de negocio y llamadas a la API
│   └── googleSheetsService.ts
├── test/               # Tests unitarios
├── App.tsx             # Componente raíz
├── index.tsx           # Punto de entrada de React
├── vercel.json         # Configuración de redirecciones Vercel
└── vite.config.ts      # Configuración de Vite
```

## 📝 Reglas de Negocio

- Una alumna puede inscribirse en un **máximo de 3 clases por semana**.
- Cada clase tiene un **límite de 5 alumnas**.
- El sistema permite asignaciones **fijas** (recurrentes) o **por día** (recuperaciones).
- Los pagos se registran mensualmente según el plan de la alumna.

## 👤 Autor

**Rolando Daumas**
- GitHub: [@redaumore](https://github.com/redaumore)
- Email: redaumore@gmail.com

---
⭐ Si este proyecto te resulta útil, considera darle una estrella en GitHub!
