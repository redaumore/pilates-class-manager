# Guía de Contribución

¡Gracias por tu interés en contribuir a Pilates Class Manager! 🎉

## 📋 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas un ambiente respetuoso y colaborativo.

## 🚀 Cómo Contribuir

### Reportar Bugs

Si encuentras un bug, por favor crea un issue con:

- **Título descriptivo**
- **Pasos para reproducir** el problema
- **Comportamiento esperado** vs **comportamiento actual**
- **Screenshots** si es aplicable
- **Versión del navegador** y sistema operativo

### Sugerir Mejoras

Las sugerencias de nuevas características son bienvenidas. Por favor:

1. Verifica que no exista un issue similar
2. Describe claramente la funcionalidad propuesta
3. Explica por qué sería útil para el proyecto
4. Si es posible, sugiere una implementación

### Pull Requests

1. **Fork** el repositorio
2. **Crea una rama** desde `master`:
   ```bash
   git checkout -b feature/mi-nueva-funcionalidad
   ```
3. **Realiza tus cambios** siguiendo las guías de estilo
4. **Escribe tests** para tu código
5. **Asegúrate que los tests pasen**:
   ```bash
   npm test
   ```
6. **Commit** tus cambios con mensajes descriptivos:
   ```bash
   git commit -m "feat: agregar funcionalidad X"
   ```
7. **Push** a tu fork:
   ```bash
   git push origin feature/mi-nueva-funcionalidad
   ```
8. **Abre un Pull Request** con una descripción clara

## 📝 Guías de Estilo

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma faltantes, etc.
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

Ejemplos:
```
feat: agregar filtro por nivel en lista de alumnas
fix: corregir cálculo de pagos mensuales
docs: actualizar instrucciones de instalación
```

### Código TypeScript

- Usa **TypeScript** para todo el código
- Sigue las reglas de **ESLint** configuradas
- Usa **nombres descriptivos** para variables y funciones
- Agrega **comentarios** para lógica compleja
- Mantén las **funciones pequeñas** y enfocadas

### Componentes React

- Un componente por archivo
- Usa **functional components** con hooks
- Props tipadas con TypeScript
- Nombres de componentes en **PascalCase**
- Nombres de archivos igual al componente

### Estructura de Archivos

```
components/
  ├── MiComponente.tsx        # Componente
  └── MiComponente.test.tsx   # Tests del componente
```

## 🧪 Testing

- Escribe tests para nuevas funcionalidades
- Mantén la cobertura de tests alta
- Usa nombres descriptivos para los tests
- Ejecuta `npm test` antes de hacer commit

## 📚 Documentación

- Actualiza el README.md si es necesario
- Documenta funciones complejas con JSDoc
- Agrega comentarios explicativos cuando sea útil

## ❓ Preguntas

Si tienes preguntas, puedes:

- Abrir un issue con la etiqueta `question`
- Contactar al mantenedor: redaumore@gmail.com

## 🙏 Agradecimientos

¡Gracias por contribuir a hacer este proyecto mejor!
