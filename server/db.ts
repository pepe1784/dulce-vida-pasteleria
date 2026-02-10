import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import * as schema from "@shared/schema";
import { initializeSqlite } from "./init-sqlite";

const { Pool } = pg;

const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql');

let pool: pg.Pool | null = null;
let db: any;

if (!isPostgres) {
  console.log("⚠️  DATABASE_URL no configurado o no es PostgreSQL. Usando SQLite para desarrollo local.");
  console.log("📝 Para producción, configura DATABASE_URL en el archivo .env");
  
  // Inicializar y usar SQLite para desarrollo local
  const sqlite = initializeSqlite('./dev.db');
  db = drizzleSqlite(sqlite, { schema });
  pool = null;
} else {
  // Usar PostgreSQL
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { db, pool };
