# 🚀 Instrucciones para Desplegar en GitHub Pages

## ⚠️ IMPORTANTE: Actualizar Credenciales de Google Cloud

Antes de desplegar, debes actualizar las credenciales de Google Cloud para permitir el acceso desde GitHub Pages.

### 1. Actualizar Orígenes Autorizados en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs y servicios** → **Credenciales**
4. Haz clic en tu **Client ID OAuth 2.0**
5. En **Orígenes de JavaScript autorizados**, agrega:
   ```
   https://redaumore.github.io
   ```
6. En **URIs de redirección autorizadas**, agrega:
   ```
   https://redaumore.github.io/pilates-class-manager/
   ```
7. Haz clic en **Guardar**

### 2. Desplegar la Aplicación

Una vez actualizadas las credenciales, ejecuta:

```bash
npm run deploy
```

Este comando:
- ✅ Construye la aplicación optimizada para producción
- ✅ Crea una rama `gh-pages` en tu repositorio
- ✅ Sube los archivos compilados a GitHub Pages

### 3. Configurar GitHub Pages

1. Ve a tu repositorio: https://github.com/redaumore/pilates-class-manager
2. Ve a **Settings** → **Pages**
3. En **Source**, selecciona:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. Haz clic en **Save**

### 4. Acceder a tu Aplicación

Después de unos minutos, tu aplicación estará disponible en:

```
https://redaumore.github.io/pilates-class-manager/
```

## 📱 Acceso desde Móvil

Una vez desplegada, podrás acceder desde cualquier dispositivo móvil usando la URL:

```
https://redaumore.github.io/pilates-class-manager/
```

### Agregar a la Pantalla de Inicio (PWA-like)

En dispositivos móviles:

**iOS (Safari):**
1. Abre la URL en Safari
2. Toca el botón de compartir
3. Selecciona "Agregar a pantalla de inicio"

**Android (Chrome):**
1. Abre la URL en Chrome
2. Toca el menú (3 puntos)
3. Selecciona "Agregar a pantalla de inicio"

## 🔄 Actualizar la Aplicación

Cada vez que hagas cambios y quieras actualizar la versión en GitHub Pages:

```bash
git add .
git commit -m "tu mensaje de commit"
git push origin master
npm run deploy
```

## ⚙️ Configuración Realizada

Los siguientes archivos fueron modificados para soportar GitHub Pages:

- ✅ `vite.config.ts` - Agregado `base: '/pilates-class-manager/'`
- ✅ `package.json` - Agregados scripts `predeploy` y `deploy`
- ✅ Instalado `gh-pages` como dependencia de desarrollo

## 🐛 Solución de Problemas

### Error: "Permission denied (publickey)"
Si obtienes este error al hacer deploy, usa HTTPS en lugar de SSH:
```bash
git remote set-url origin https://github.com/redaumore/pilates-class-manager.git
```

### Error de autenticación de Google
Asegúrate de haber agregado la URL de GitHub Pages en las credenciales de Google Cloud.

### La página muestra en blanco
Verifica que el `base` en `vite.config.ts` coincida con el nombre de tu repositorio.

## 📞 Soporte

Si tienes problemas, revisa:
- La consola del navegador (F12) para errores
- Los logs de GitHub Actions en tu repositorio
- La configuración de GitHub Pages en Settings

---

**Nota:** El primer despliegue puede tardar 5-10 minutos en estar disponible.
