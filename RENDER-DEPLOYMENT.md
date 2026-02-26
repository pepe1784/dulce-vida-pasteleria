# 🚀 Desplegar en Render - Dulce Vida Pastelería

## ¿Por qué Render?

✅ **Base de datos PostgreSQL incluida** (gratis)  
✅ **Hosting de aplicación Node.js** (gratis)  
✅ **SSL/HTTPS automático**  
✅ **Deploy automático desde GitHub**  
✅ **Fácil configuración**

---

## 📋 Pasos para Desplegar

### **Paso 1: Preparar el Repositorio**

1. **Sube tu código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

2. **Asegúrate de tener `.gitignore`:**
   ```
   node_modules/
   .env
   .env.local
   .env.production
   dist/
   *.db
   *.sqlite
   ```

---

### **Paso 2: Crear Cuenta en Render**

1. Ve a [https://render.com](https://render.com)
2. Haz clic en **"Get Started"**
3. Regístrate con GitHub (recomendado) o email

---

### **Paso 3: Crear Base de Datos PostgreSQL**

1. En el Dashboard de Render, haz clic en **"New +"**
2. Selecciona **"PostgreSQL"**

3. **Configuración:**
   - **Name:** `dulce-vida-db` (o el nombre que prefieras)
   - **Database:** `dulcevida`
   - **User:** `dulcevida` (se genera automáticamente)
   - **Region:** Selecciona la más cercana (ej: Oregon, Frankfurt)
   - **Plan:** **Free** (suficiente para empezar)

4. Haz clic en **"Create Database"**

5. **⚠️ IMPORTANTE:** Guarda estos datos que aparecerán:
   - **Internal Database URL:** `postgresql://...` (usa esta)
   - **External Database URL:** (para conectar desde fuera)

   La **Internal URL** se ve así:
   ```
   postgresql://dulcevida:ABC123xyz@dpg-xxxxx/dulcevida
   ```

---

### **Paso 4: Crear Web Service**

1. En el Dashboard, haz clic en **"New +"**
2. Selecciona **"Web Service"**

3. **Conectar con GitHub:**
   - Haz clic en **"Connect GitHub"**
   - Autoriza a Render
   - Selecciona tu repositorio: `dulce-vida-pasteleria`

4. **Configuración del Servicio:**
   
   **Básico:**
   - **Name:** `dulce-vida-pasteleria`
   - **Region:** Misma que tu base de datos
   - **Branch:** `main`
   - **Root Directory:** (déjalo vacío)
   - **Runtime:** `Node`

   **Build & Deploy:**
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   
   - **Start Command:**
     ```bash
     npm start
     ```

   **Plan:**
   - Selecciona **"Free"** ($0/mes)
   - ⚠️ Nota: El plan gratuito se "duerme" después de 15 minutos sin uso

---

### **Paso 5: Configurar Variables de Entorno**

1. En la configuración del Web Service, busca **"Environment"**
2. Haz clic en **"Add Environment Variable"**

3. **Agrega estas variables:**

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `DATABASE_URL` | *(Pega aquí la Internal Database URL del Paso 3)* |
   | `SESSION_SECRET` | *(Genera uno nuevo - ver abajo)* |

4. **Para generar SESSION_SECRET:**
   ```bash
   # En PowerShell:
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
   ```
   
   Ejemplo resultado: `aB3dK9mP2xQr7vZwT8yC4nM6kJ1hF5gE...`

---

### **Paso 6: Deploy Inicial**

1. Haz clic en **"Create Web Service"**
2. Render comenzará a:
   - ✓ Clonar tu repo
   - ✓ Instalar dependencias
   - ✓ Ejecutar build
   - ✓ Iniciar la aplicación

3. **Espera 3-5 minutos** (primera vez tarda más)

4. Verás los logs en tiempo real. Busca:
   ```
   ✓ Build successful
   ✓ Server running on port 5000
   ```

---

### **Paso 7: Ejecutar Migraciones de Base de Datos**

**Opción A: Desde Render Shell (Recomendado)**

1. En tu Web Service, ve a **"Shell"** (en el menú izquierdo)
2. Ejecuta:
   ```bash
   npm run db:push
   ```

**Opción B: Localmente con DATABASE_URL de Render**

1. Copia la **External Database URL** de tu PostgreSQL
2. En tu computadora:
   ```bash
   # PowerShell
   $env:DATABASE_URL="postgresql://dulcevida:ABC123xyz@dpg-xxxxx-external/dulcevida"
   npm run db:push
   ```

---

### **Paso 8: ¡Verificar que Funciona!**

1. Tu aplicación estará en: `https://dulce-vida-pasteleria.onrender.com`
2. Prueba:
   - ✓ Página carga correctamente
   - ✓ Productos se muestran
   - ✓ Agregar al carrito funciona
   - ✓ Crear orden funciona

---

## 🔄 Deploys Automáticos

Cada vez que hagas `git push` a tu rama `main`, Render:
1. ✅ Detecta el cambio automáticamente
2. ✅ Ejecuta build
3. ✅ Despliega la nueva versión

---

## 🐛 Solución de Problemas Comunes

### ❌ Error: "Build failed"

**Verifica:**
```bash
# Localmente, prueba el build:
npm run build
```

Si funciona local pero falla en Render:
- Revisa que todas las dependencias estén en `dependencies` (no en `devDependencies`)
- Verifica los logs de Render para ver el error exacto

### ❌ Error: "Cannot connect to database"

**Verifica:**
1. Que `DATABASE_URL` esté configurada correctamente
2. Que uses la **Internal Database URL** (no la External)
3. Que la base de datos esté en estado "Available"

### ❌ Error: "Application failed to start"

**Verifica:**
1. Que el **Start Command** sea: `npm start`
2. Que `NODE_ENV=production` esté configurado
3. Revisa los logs en Render para ver el error específico

### ❌ La aplicación se "duerme"

**Planes gratuitos de Render:**
- Se duermen después de 15 minutos sin tráfico
- Primera petición tarda 30-60 segundos en despertar

**Soluciones:**
- Upgrade a plan de pago ($7/mes - siempre activo)
- Usa un servicio de "ping" para mantener viva la app
- Acepta el delay en el plan gratuito

---

## 💰 Costos

| Servicio | Plan | Costo |
|----------|------|-------|
| **PostgreSQL** | Free | $0/mes (500MB almacenamiento) |
| **Web Service** | Free | $0/mes (con sleep) |
| **PostgreSQL** | Starter | $7/mes (10GB) |
| **Web Service** | Starter | $7/mes (sin sleep) |

**Total para empezar:** **$0/mes** ✨

---

## 🔐 Seguridad en Producción

✅ **Render Provee:**
- SSL/HTTPS automático
- Certificados renovados automáticamente
- Firewall incluido
- Backups automáticos de DB (planes de pago)

✅ **Tú Debes:**
- Nunca compartir SESSION_SECRET
- Nunca subir .env a GitHub
- Mantener dependencias actualizadas
- Cambiar SESSION_SECRET si hay compromiso

---

## 📱 Conectar Dominio Propio (Opcional)

1. En tu Web Service, ve a **"Settings"**
2. Busca **"Custom Domain"**
3. Agrega tu dominio: `www.dulcevidapasteleria.com`
4. Configura DNS según las instrucciones de Render
5. Render configurará SSL automáticamente

---

## 🔄 Workflow Completo de Desarrollo

```bash
# 1. Desarrollo local
npm run dev

# 2. Hacer cambios y probar
git add .
git commit -m "Agrega nueva funcionalidad"

# 3. Probar build localmente
npm run build
npm start

# 4. Si todo funciona, subir a GitHub
git push origin main

# 5. Render detecta el push y despliega automáticamente
# 6. Verifica en: https://tu-app.onrender.com
```

---

## 📊 Monitoreo en Render

**Ver logs:**
1. Ve a tu Web Service
2. Click en **"Logs"**
3. Ve logs en tiempo real

**Métricas:**
- CPU usage
- Memory usage
- Request count
- Response times

---

## 🆘 Soporte

- **Documentación:** https://render.com/docs
- **Community Forum:** https://community.render.com
- **Status:** https://status.render.com

---

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Base de datos PostgreSQL creada en Render
- [ ] Web Service creado y conectado a GitHub
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas (`npm run db:push`)
- [ ] Aplicación accesible en `.onrender.com`
- [ ] Productos se cargan correctamente
- [ ] Funcionalidad de carrito probada
- [ ] Creación de órdenes probada

---

## 🎉 ¡Listo!

Tu pastelería está en producción en Render. Ahora puedes:
- Compartir el link: `https://tu-app.onrender.com`
- Seguir desarrollando localmente
- Hacer push para deploy automático
- Monitorear logs y métricas

**¡Felicidades! 🎂🚀**
