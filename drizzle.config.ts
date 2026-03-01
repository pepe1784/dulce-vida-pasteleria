import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
const isMySQL = dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysql2://");

// Schema is now pg-core; dialect matches DATABASE_URL.
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: isPostgres ? "postgresql" : isMySQL ? "mysql2" : "sqlite",
  dbCredentials: isPostgres
    ? { url: dbUrl }
    : isMySQL
    ? { url: dbUrl }
    : { url: "./dev.db" },
});
