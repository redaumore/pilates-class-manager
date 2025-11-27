# Pilates Class Manager - Instrucciones para Copilot

¡Hola! Soy Rolo, el desarrollador de este proyecto. Gracias por ayudarme.

## Descripción del Proyecto

Este es un proyecto para administrar clases de Pilates. La aplicación permite a los usuarios:

- Ver un calendario de clases.
- Asignar estudiantes a las clases.
- Administrar estudiantes (agregar, eliminar, editar).
- Realizar un seguimiento de los pagos de los estudiantes.

## Tecnologías Utilizadas

- **React**: La biblioteca principal para construir la interfaz de usuario.
- **TypeScript**: Para el tipado estático y un desarrollo más robusto.
- **Vite**: Como herramienta de construcción y servidor de desarrollo.
- **Google Sheets API**: Para almacenar y administrar los datos de la aplicación.

## Estructura del Proyecto

- `App.tsx`: El componente raíz de la aplicación.
- `components/`: Contiene todos los componentes de React.
  - `CalendarPage.tsx`: La página principal con la vista de calendario.
  - `StudentManagementPage.tsx`: La página para administrar a los estudiantes.
  - `PaymentsPage.tsx`: La página para administrar los pagos.
  - `*Modal.tsx`: Varios componentes de modales para interactuar con el usuario.
- `services/`: Contiene los servicios que interactúan con APIs externas.
  - `googleSheetsService.ts`: El servicio para interactuar con la API de Google Sheets.
- `types.ts`: Define los tipos de TypeScript utilizados en toda la aplicación.
- `constants.ts`: Contiene las constantes utilizadas en la aplicación.

## Fuente de datos

Los datos de la aplicación se almacenan en Google Sheets. La hoja de cálculo contiene varias pestañas para diferentes tipos de datos:

- `2025`: Contiene la información de las alumnas para el año 2025, incluyendo id, nombre, apellido, teléfono, estado, nivel, plan, slots para las tres clases máximas posibles por semana (clase 1, clase 2 y clase 3), fecha de ingreso, slots para las tres clases máximas posibles por semana (clase 1, clase 2 y clase 3), fecha de ingreso, slots para pagos mensuales, y un contador de clases a recuperar.

- Slots para pagos mensuales: Se encuentran en la hoja de alumnas. Cada alumna tiene en su registro un slot para cada mes del año (enero a diciembre, con el formato ENE, FEB, MAR, etc.) donde se indica si el pago fue realizado o no. Si el pago no fue realizado, se indica con un valor vacío, y si fue realizado, se indica con la fecha del pago en formato `DD/MM/YYYY`.

- `2025-11`: Contiene la información de las clases de Pilates correspondientes al mes 11 del año 2025. Por cada mes que pase, se crea una nueva pestaña con el formato `YYYY-MM`.

## Reglas de negocio

- Una alumna puede inscribirse en un máximo de tres clases por semana.
- Las clases se identifican por el día de la semana y la hora. Ej: "L09 para Lunes 9:00", "X18 para Miércoles 18:00", etc.
- Las alumnas repiten las clases semanalmente durante todo el mes.
- Cada clase tiene un límite máximo de 5 alumnas.
- El sistema debe permitir asignar y reasignar alumnas a las clases según su disponibilidad y nivel.
- El sistema debe permitir registrar y actualizar los pagos mensuales de las alumnas.
- El sistema debe permitir agregar, editar y eliminar alumnas del sistema. Una alumna puede estar en estado "Suspendida" o "Activa".
- El sistema debe mostrar un calendario mensual con las clases y las alumnas asignadas a cada clase.
- Al inicio de mes se asignan las clases a las alumnas según los días y horarios seleccionados por cada alumna en la columna Clase 1, Clase 2 y Clase 3 de la hoja de alumnas.
- Los planes disponibles son: "Plan 1" (1 clase por semana), "Plan 2" (2 clases por semana) y "Plan 3" (3 clases por semana).
- Recupero de clases: Las alumnas pueden suspender una clase en particular, lo que libera su cupo para que otra alumna pueda ocuparlo. Si la alumna avisa con anticipación, se la puede sacar de la clase y se le suma una clase a su contador de clases a recuperar. Luego, la alumna puede usar esas clases recuperadas para asistir a otras clases dentro del mes. Las clases de recuperación se reinician a 0 al inicio de cada mes.
- Si una alumna no asiste a una clase sin avisar, no se le suma una clase a su contador de clases a recuperar.

## Cómo puedes ayudar

- **Crear nuevos componentes**: Ayúdame a crear nuevos componentes de React siguiendo la estructura existente.
- **Implementar nuevas funcionalidades**: Ayúdame a implementar nuevas funcionalidades según las reglas de negocio y requerimientos que te indique.
- **Refactorizar código**: Sugiere mejoras en el código para hacerlo más limpio, eficiente y legible.
- **Escribir pruebas**: Ayúdame a escribir pruebas unitarias y de integración para los componentes y servicios.
- **Corregir errores**: Ayúdame a identificar y corregir errores en el código.

## Cosas a tener en cuenta

- **Estilo de código**: Intenta seguir el estilo de código existente. Usamos Prettier para formatear el código automáticamente.
- **Nombres de archivos y componentes**: Sigue la convención de nomenclatura existente (por ejemplo, `ComponentName.tsx`).
- **Comentarios**: Agrega comentarios al código cuando sea necesario para explicar la lógica compleja.

¡Gracias por tu ayuda!
