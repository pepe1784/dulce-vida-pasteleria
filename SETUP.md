# Instrucciones de Configuración - Dulce Vida Pastelería

## ✅ Completado

1. ✅ Dependencias instaladas (npm install)
2. ✅ Archivo .env creado

## 📋 Pasos Siguientes

### 1. Configurar PostgreSQL

Este proyecto requiere PostgreSQL. Tienes dos opciones:

#### Opción A: PostgreSQL Local (Recomendado para desarrollo)
1. Instala PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Durante la instalación, anota la contraseña que estableces para el usuario `postgres`
3. Crea una base de datos llamada `dulcevida`:
   ```bash
   # En PowerShell, ejecuta:
   cmd /c "psql -U postgres -c ""CREATE DATABASE dulcevida;"""
   ```

#### Opción B: PostgreSQL en Docker
```bash
docker run --name dulcevida-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=dulcevida -p 5432:5432 -d postgres:16
```

### 2. Configurar Variables de Entorno

Edita el archivo `.env` y actualiza estos valores:

```env
# Reemplaza con tu configuración real de PostgreSQL
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/dulcevida
SESSION_SECRET=genera-una-clave-secreta-aleatoria-aquí
```

### 3. Inicializar la Base de Datos

Ejecuta este comando para crear las tablas:

```bash
npm run db:push
```

Este comando crea automáticamente todas las tablas necesarias:
- `users` - Usuarios autenticados
- `sessions` - Sesiones de usuario
- `products` - Productos de la pastelería
- `orders` - Pedidos
- `order_items` - Items de los pedidos

### 4. Ejecutar el Proyecto

Para desarrollo:
```bash
npm run dev
```

Para producción:
```bash
npm run build
npm start
```

El servidor estará disponible en: http://localhost:5000

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm run build` - Compila el proyecto para producción
- `npm start` - Ejecuta la versión compilada
- `npm run check` - Verifica tipos de TypeScript
- `npm run db:push` - Sincroniza el esquema de la base de datos

## ⚠️ Notas Importantes

1. **Origen**: Este es un proyecto de Replit, por lo que algunas configuraciones están adaptadas para ese entorno
2. **Base de Datos**: Asegúrate de tener PostgreSQL funcionando antes de ejecutar el proyecto
3. **Variables de Entorno**: Nunca compartas tu archivo `.env` - contiene información sensible
4. **Puerto**: El servidor usa el puerto 5000 por defecto

## 🐛 Solución de Problemas

### Error: "DATABASE_URL must be set"
- Verifica que el archivo `.env` existe y contiene `DATABASE_URL`
- Asegúrate de que PostgreSQL está ejecutándose

### Error: "Cannot run scripts" en PowerShell
- Usa `cmd /c` antes de los comandos npm:
  ```bash
  cmd /c npm run dev
  ```

### Error de conexión a la base de datos
- Verifica que PostgreSQL está ejecutándose
- Confirma que la URL de conexión es correcta
- Verifica usuario y contraseña

## 📦 Tecnologías Incluidas

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Express, Node.js
- **Base de Datos**: PostgreSQL, Drizzle ORM
- **Auth**: Replit Auth Integration
- **UI**: Radix UI, Framer Motion, Lucide Icons
- **Estado**: Zustand, TanStack Query

¿Necesitas ayuda? Revisa los logs de error y asegúrate de haber completado todos los pasos anteriores.
