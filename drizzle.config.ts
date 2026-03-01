import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "";
const isMySQL = dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysql2://");

// Default to MySQL for Hostinger; falls back to SQLite for local dev.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: isMySQL ? "mysql2" : "sqlite",
  dbCredentials: isMySQL
    ? { url: dbUrl }
    : { url: "./dev.db" },
});
