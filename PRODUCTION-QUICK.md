# 🚀 Guía Rápida: Producción en 5 Pasos

## Paso 1: PostgreSQL (5 min)

Elige UNA opción:

### Opción A: Neon (Recomendado - Gratis)
1. Ve a https://neon.tech
2. Crea cuenta gratis
3. Crea un proyecto
4. Copia la Connection String

### Opción B: Supabase (Gratis)
1. Ve a https://supabase.com
2. Crea proyecto
3. Ve a Settings → Database
4. Copia Connection String

### Opción C: Railway (Gratis + Deploy incluido)
1. Ve a https://railway.app
2. Crea proyecto
3. Agrega PostgreSQL
4. Copia DATABASE_URL

---

## Paso 2: Configurar Variables (2 min)

1. **Copia el template:**
   ```bash
   copy .env.production.example .env.production
   ```

2. **Edita `.env.production`:**
   ```env
   DATABASE_URL=postgresql://tu-url-de-postgres-aqui
   SESSION_SECRET=clave-aleatoria-muy-larga-minimo-32-caracteres
   NODE_ENV=production
   PORT=5000
   ```

3. **Genera SESSION_SECRET seguro:**
   ```bash
   # PowerShell:
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```

---

## Paso 3: Inicializar Base de Datos (1 min)

```bash
# Usa el .env.production para crear las tablas
cross-env NODE_ENV=production npm run db:push
```

---

## Paso 4: Build (2 min)

```bash
npm run build
```

Verifica que se creó la carpeta `dist/` con:
- `dist/index.cjs`
- `dist/public/`

---

## Paso 5: Deploy (5 min)

### Opción A: Railway (Más Fácil)

```bash
# Instalar CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway init
railway up
```

### Opción B: Render

1. Conecta tu repo en https://render.com
2. Crea "Web Service"
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Agrega variables de entorno
6. Deploy

### Opción C: Fly.io

```bash
# Instalar flyctl
# https://fly.io/docs/hands-on/install-flyctl/

fly launch
fly deploy
```

### Opción D: Replit (Sin terminal)

1. Sube código a Replit
2. Conecta PostgreSQL desde panel
3. Variables se configuran auto
4. Click en "Deploy"

---

## ✅ Verificar que Funciona

1. Abre tu URL de producción
2. Verifica que carga la página
3. Revisa que los productos aparecen
4. Prueba agregar al carrito
5. Intenta crear una orden

---

## 🛠️ Scripts Útiles

```bash
# Verificar configuración de producción
npm run prod:check

# Build con verificaciones
npm run prod:build

# Probar localmente en modo producción
npm run prod:test

# Ver base de datos visualmente
npm run db:studio
```

---

## 🆘 Problemas Comunes

### "Cannot connect to database"
- Verifica DATABASE_URL
- Agrega `?sslmode=require` al final
- Verifica que la IP esté en whitelist

### "Session secret required"
- Agrega SESSION_SECRET en .env.production
- Debe tener mínimo 32 caracteres

### "Build failed"
- Ejecuta `npm run check` para ver errores TypeScript
- Ejecuta `npm install` de nuevo

### Frontend no carga
- Verifica que existe `dist/public/`
- Ejecuta `npm run build` de nuevo

---

## 📖 Documentación Completa

Lee [PRODUCTION.md](PRODUCTION.md) para:
- Checklist detallado
- Optimizaciones de performance
- Configuración de seguridad
- Monitoreo y logs
- Best practices

---

## ⚡ Resumen Ultra-Rápido

```bash
# 1. PostgreSQL
# Obtén DATABASE_URL de Neon/Supabase/Railway

# 2. Variables
copy .env.production.example .env.production
# Edita .env.production con tus valores

# 3. Base de datos
cross-env NODE_ENV=production npm run db:push

# 4. Build
npm run build

# 5. Deploy
# Sube a Railway/Render/Fly.io

# ¡Listo! 🎉
```

---

**Tiempo total:** ~15 minutos  
**Costo:** $0 (con tiers gratuitos)  
**Dificultad:** ⭐⭐☆☆☆

¿Necesitas ayuda? Revisa [PRODUCTION.md](PRODUCTION.md) o los logs de error.
