import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Render usa postgres:// y pg library acepta ambos formatos
const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

console.log(`🔍 DATABASE_URL prefix: ${dbUrl.substring(0, 15)}...`);
console.log(`🔍 isPostgres: ${isPostgres}`);

let pool: pg.Pool | null = null;
let db: any;
let dbReady: Promise<void>;

async function initPostgresTables(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC NOT NULL,
        stock INTEGER NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        total NUMERIC NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price NUMERIC NOT NULL
      );
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER
      );
    `);
    console.log("✅ Tablas PostgreSQL inicializadas correctamente");
  } finally {
    client.release();
  }
}

if (isPostgres) {
  // Producción: usar PostgreSQL
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  dbReady = initPostgresTables(pool).then(() => {
    console.log("✅ Conectado a PostgreSQL");
  });
} else {
  // Desarrollo: cargar SQLite dinámicamente para evitar crash en producción
  console.log("⚠️  DATABASE_URL no configurado o no es PostgreSQL. Usando SQLite para desarrollo local.");
  console.log("📝 Para producción, configura DATABASE_URL en el archivo .env");
  
  dbReady = (async () => {
    const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
    const { initializeSqlite } = await import("./init-sqlite");
    const sqlite = initializeSqlite('./dev.db');
    db = drizzleSqlite(sqlite, { schema });
  })();
}

export { db, pool, dbReady };
