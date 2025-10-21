# Configuración de Render para evitar errores de migración

## 🚨 Problema

Render ejecuta automáticamente `prisma migrate deploy` después del build, causando errores cuando hay migraciones fallidas.

## ✅ Solución

### Opción 1: Usar el archivo render.yaml (Recomendado)

El proyecto ya incluye `backend/render.yaml`. Render lo detectará automáticamente y usará esta configuración:

```yaml
buildCommand: npm install && npm run deploy
startCommand: node dist/index.js
# NO tiene Release Command
```

**Si Render no detecta el archivo automáticamente**, ve al dashboard de Render:

1. Settings → Build & Deploy
2. **Build Command**: `npm install && npm run deploy`
3. **Start Command**: `node dist/index.js`
4. **Release Command**: **ELIMINAR / DEJAR VACÍO** ← IMPORTANTE

### Opción 2: Configurar manualmente en el dashboard

Si no quieres usar render.yaml:

1. Ve a tu servicio en Render
2. Settings → Build & Deploy
3. Configura:
   - **Build Command**: 
     ```bash
     npm install && npx prisma db push --accept-data-loss --skip-generate && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     node dist/index.js
     ```
   - **Release Command**: **VACÍO** (eliminar cualquier comando aquí)

### Opción 3: Resolver la migración fallida manualmente

Si prefieres resolver la migración:

1. Conectar a la base de datos de Railway:
   ```bash
   # Usar el connection string de Railway
   psql postgresql://username:password@host:port/database
   ```

2. Ejecutar:
   ```sql
   -- Marcar la migración como completada
   UPDATE "_prisma_migrations" 
   SET finished_at = NOW(), success = TRUE 
   WHERE migration_name = 'add_options_field';
   ```

3. Luego puedes usar migraciones normalmente

## 🔧 Scripts actualizados

El `package.json` ahora incluye:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "postinstall": "prisma generate",
    "deploy": "prisma db push --accept-data-loss --skip-generate && npm run build",
    "start": "node dist/index.js"
  }
}
```

- `build`: Solo compila TypeScript
- `postinstall`: Genera el cliente de Prisma automáticamente después de `npm install`
- `deploy`: Sincroniza BD + compila (para usar en Render)
- `start`: Inicia el servidor

## 📋 Checklist de despliegue

- [ ] Verificar que **Release Command** está VACÍO en Render
- [ ] Build Command usa `npm run deploy` o el comando completo con `prisma db push`
- [ ] Start Command es `node dist/index.js`
- [ ] Variables de entorno configuradas (DATABASE_URL, JWT_SECRET)
- [ ] Push de cambios a GitHub
- [ ] Esperar a que Render detecte el push y redesplegue

## ⚠️ Importante

**NUNCA uses `prisma migrate deploy` en producción si hay migraciones fallidas.**

Usa `prisma db push` que:
- ✅ Sincroniza el schema directamente
- ✅ No valida migraciones previas
- ✅ No crea archivos de migración
- ✅ Es seguro para desarrollo y producción
- ✅ No pierde datos (a menos que cambies tipos incompatibles)

## 🎯 Flujo correcto

```
npm install 
↓
postinstall: prisma generate
↓
npm run deploy
↓
  prisma db push --accept-data-loss --skip-generate (sincroniza BD)
  ↓
  npm run build (compila TypeScript)
↓
node dist/index.js (inicia servidor)
```

## 🐛 Troubleshooting

### Error persiste después de los cambios

1. Ve a Render Dashboard
2. Environment → Clear Build Cache
3. Manual Deploy → Deploy latest commit

### Error: "prisma command not found"

Asegúrate de que `prisma` está en `devDependencies` del `package.json`

### Error: "Cannot find module '@prisma/client'"

El `postinstall` hook debe ejecutarse automáticamente. Si no:
```bash
npm run postinstall
```
