# Sistema de Versionado Automático

Este proyecto utiliza un sistema de versionado automático basado en el número de commits de Git.

## Formato de Versión

La versión sigue el formato: `1.X` donde `X` es el número total de commits en la rama actual.

Por ejemplo:
- Commit #24 → Versión `1.24`
- Commit #25 → Versión `1.25`

## Sincronización Automática

### Pre-commit Hook

El proyecto incluye un hook de pre-commit que automáticamente:
1. Calcula el número de commits actual
2. Actualiza la versión en `package.json`
3. Incluye el archivo actualizado en el commit

El hook se encuentra en `.git/hooks/pre-commit` y se ejecuta automáticamente antes de cada commit.

### Script Manual

Si necesitas sincronizar la versión manualmente, puedes ejecutar:

```bash
npm run version:sync
```

Este comando:
- Lee el número actual de commits
- Actualiza `package.json` con la versión correcta
- Muestra la nueva versión en la consola

## Visualización de la Versión

La versión se muestra en:
- **Header de la aplicación**: Al lado del título "Pilates Manager"
- **package.json**: Campo `version`

Ambos valores se sincronizan automáticamente gracias al sistema de versionado.

## Configuración Técnica

### vite.config.ts

La versión se inyecta en tiempo de compilación usando Vite:

```typescript
const commitCount = execSync('git rev-list --count HEAD').toString().trim();
const version = `1.${commitCount}`;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  // ...
});
```

### Header.tsx

El componente Header usa la variable global `__APP_VERSION__`:

```tsx
<span className="text-xs text-slate-400 font-mono">v{__APP_VERSION__}</span>
```

## Notas Importantes

- La versión se calcula en base al número de commits, por lo que **no debe editarse manualmente** en `package.json`
- Si haces `git rebase` o modificas el historial de commits, la versión puede cambiar
- El hook de pre-commit requiere que Git esté instalado y disponible en el PATH
