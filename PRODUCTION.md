# 🚀 Guía de Producción - Dulce Vida Pastelería

## ✅ Checklist de Producción

### 1. Base de Datos PostgreSQL 
- [ ] Crear base de datos PostgreSQL en producción
- [ ] Configurar DATABASE_URL con la URL de producción
- [ ] Ejecutar migraciones: `npm run db:push`
- [ ] Configurar backups automáticos
- [ ] Configurar SSL para conexión segura

### 2. Variables de Entorno
- [ ] Generar SESSION_SECRET fuerte y único
- [ ] Configurar REPL_ID (si usas Replit)
- [ ] Verificar NODE_ENV=production
- [ ] Configurar PORT apropiado
- [ ] Remover valores por defecto de desarrollo

### 3. Seguridad
- [ ] Actualizar SESSION_SECRET con valor seguro
- [ ] Habilitar HTTPS/SSL
- [ ] Configurar CORS apropiadamente
- [ ] Revisar que cookies tengan secure: true
- [ ] Implementar rate limiting en endpoints
- [ ] Sanitizar inputs de usuario
- [ ] Actualizar dependencias con vulnerabilidades

### 4. Build y Deployment
- [ ] Ejecutar `npm run build` exitosamente
- [ ] Probar versión de producción localmente
- [ ] Configurar proceso de CI/CD
- [ ] Configurar monitoreo de logs
- [ ] Configurar alertas de errores

### 5. Performance
- [ ] Configurar CDN para assets estáticos
- [ ] Habilitar compresión gzip
- [ ] Optimizar imágenes de productos
- [ ] Configurar caching apropiado
- [ ] Implementar connection pooling para DB

---

## 🔐 Variables de Entorno de Producción

Crea un archivo `.env.production` (⚠️ NUNCA lo subas a Git):

```env
# Database - PostgreSQL obligatorio en producción
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_base_datos

# Servidor
PORT=5000
NODE_ENV=production

# Seguridad - GENERA UNO NUEVO Y SEGURO
SESSION_SECRET=usa-una-clave-aleatoria-muy-larga-y-segura-aqui-minimo-32-caracteres

# Replit Auth (si aplica)
REPL_ID=tu-repl-id-real
ISSUER_URL=https://replit.com/oidc
```

### Generar SESSION_SECRET Seguro

```bash
# En PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# O en Node.js:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🗄️ Configuración de PostgreSQL en Producción

### Opciones de Hosting PostgreSQL:

1. **Replit Database** (si estás en Replit)
   - Ya integrado automáticamente
   - Solo conecta el database desde el panel

2. **Neon** (Recomendado - Serverless PostgreSQL gratuito)
   - Web: https://neon.tech
   - Tier gratuito generoso
   - Serverless, escala automáticamente
   ```bash
   DATABASE_URL=postgresql://usuario:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

3. **Supabase** (PostgreSQL + Backend as a Service)
   - Web: https://supabase.com
   - Tier gratuito disponible
   - Incluye Auth, Storage, Realtime
   ```bash
   DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
   ```

4. **Railway** (PostgreSQL + Hosting)
   - Web: https://railway.app
   - Fácil deployment
   - PostgreSQL incluido

5. **AWS RDS / Google Cloud SQL / Azure Database**
   - Para apps empresariales
   - Más costoso pero confiable

### Migrar de SQLite a PostgreSQL

```bash
# 1. Asegúrate de tener DATABASE_URL configurado
# 2. Ejecuta las migraciones
npm run db:push

# 3. Si tienes datos en SQLite que quieres migrar:
# Necesitarás crear un script de migración manual
```

---

## 🏗️ Build para Producción

### 1. Instalar Dependencias de Producción

```bash
npm ci --production=false
```

### 2. Compilar el Proyecto

```bash
npm run build
```

Esto genera:
- `dist/index.cjs` - Servidor compilado y optimizado
- `dist/public/` - Frontend compilado (HTML, CSS, JS)

### 3. Probar Build Localmente

```bash
# Asegúrate de tener .env.production configurado
npm start
```

### 4. Verificar que Funciona

- Visita: http://localhost:5000
- Verifica que los productos cargan
- Prueba agregar al carrito
- Prueba crear una orden

---

## 🚢 Opciones de Deployment

### Opción 1: Replit (Más Fácil)

1. Sube el proyecto a Replit
2. Conecta PostgreSQL desde el panel
3. Variables de entorno se configuran automáticamente
4. Haz deploy con un clic

### Opción 2: Vercel (Frontend + Serverless)

⚠️ Nota: Requiere adaptar el servidor a funciones serverless

```bash
npm install -g vercel
vercel
```

### Opción 3: Railway (Recomendado)

1. Crea cuenta en https://railway.app
2. Instala CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   ```
3. Inicializa proyecto:
   ```bash
   railway init
   railway add
   # Selecciona PostgreSQL
   ```
4. Despliega:
   ```bash
   railway up
   ```

### Opción 4: Render

1. Conecta tu repositorio de GitHub
2. Crea Web Service (Node.js)
3. Agrega PostgreSQL database
4. Configura variables de entorno
5. Deploy automático

### Opción 5: Fly.io

```bash
# Instalar flyctl
# Ver: https://fly.io/docs/hands-on/install-flyctl/

fly launch
fly deploy
```

### Opción 6: DigitalOcean App Platform

1. Conecta repositorio
2. Detecta automáticamente Node.js
3. Agrega Managed PostgreSQL
4. Configura variables de entorno
5. Deploy

---

## 🔒 Mejoras de Seguridad para Producción

### 1. Actualizar Configuración de Cookies

En `server/replit_integrations/auth/replitAuth.ts`:

```typescript
cookie: {
  httpOnly: true,
  secure: true, // Siempre true en producción
  sameSite: 'strict',
  maxAge: sessionTtl,
}
```

### 2. Agregar Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
// En server/index.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de requests
});

app.use('/api/', limiter);
```

### 3. Agregar Helmet para Headers de Seguridad

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

### 4. Validar y Sanitizar Inputs

Ya tienes Zod implementado, asegúrate de usarlo en todos los endpoints.

---

## 📊 Monitoreo y Logs

### Servicios Recomendados:

1. **Sentry** - Error tracking
   ```bash
   npm install @sentry/node
   ```

2. **LogRocket** - Session replay + logs

3. **DataDog** - Monitoring completo

4. **Better Stack** - Logs + Uptime monitoring

---

## ⚡ Optimizaciones de Performance

### 1. Agregar Compresión

```bash
npm install compression
```

```typescript
import compression from 'compression';
app.use(compression());
```

### 2. Configurar Connection Pooling

Ya está implementado con `pg.Pool`, verifica límites:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Agregar Cache de Redis (Opcional)

Para caché de sesiones y datos frecuentes:

```bash
npm install redis connect-redis
```

---

## 🧪 Testing Antes de Producción

```bash
# Ejecutar build
npm run build

# Probar en modo producción local
cross-env NODE_ENV=production DATABASE_URL=tu_url npm start

# Verificar:
# ✅ Servidor inicia correctamente
# ✅ Conexión a PostgreSQL exitosa
# ✅ Frontend carga correctamente
# ✅ APIs responden correctamente
# ✅ Autenticación funciona (si aplica)
# ✅ Órdenes se crean correctamente
```

---

## 📝 Pasos Mínimos para Producción

### Rápido (15 minutos):

1. **PostgreSQL:**
   - Registrarse en Neon.tech (gratis)
   - Copiar DATABASE_URL
   - Pegar en `.env.production`

2. **Seguridad:**
   - Generar SESSION_SECRET aleatorio
   - Agregar a `.env.production`

3. **Deploy:**
   - Subir a Railway.app o Render.com
   - Configurar variables de entorno
   - Deploy automático

4. **Verificar:**
   - Abrir URL de producción
   - Probar funcionalidad básica

---

## 🆘 Solución de Problemas Comunes

### Error: "Cannot connect to database"
- Verifica DATABASE_URL correcta
- Verifica SSL requerido: `?sslmode=require`
- Verifica firewall/whitelist IP

### Error: "Session secret required"
- Agrega SESSION_SECRET en variables de entorno

### Frontend no carga
- Verifica que `npm run build` completó exitosamente
- Verifica que `dist/public/` existe

### API devuelve 500
- Revisa logs del servidor
- Verifica conexión a base de datos
- Verifica variables de entorno

---

## 📚 Recursos Adicionales

- [Documentación Express.js](https://expressjs.com/)
- [Documentación Drizzle ORM](https://orm.drizzle.team/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

---

¿Listo para producción? 🚀 Sigue el checklist y estarás en vivo en minutos.
