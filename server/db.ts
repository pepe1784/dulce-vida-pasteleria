// NOTE: schema is only needed for MySQL/Drizzle path. Import lazily to avoid
// loading drizzle-orm/mysql-core in PostgreSQL/SQLite environments.

const dbUrl = process.env.DATABASE_URL || "";
const isMySQL = dbUrl.startsWith("mysql://") || dbUrl.startsWith("mysql2://");
const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");

console.log(`🔍 DATABASE_URL prefix: ${dbUrl ? dbUrl.substring(0, 20) + "..." : "(none)"}`);
console.log(`🔍 isPostgres: ${isPostgres}`);

// dbRef is a shared container — avoids ESM live-binding issues with tsx
export const dbRef: { db: any } = { db: undefined };
let dbType: "mysql" | "sqlite" = "sqlite";
let dbReady: Promise<void>;

if (isMySQL) {
  // ── Production: MySQL (Hostinger / PlanetScale / Railway) ──
  dbType = "mysql";
  dbReady = (async () => {
    const schema = await import("@shared/schema");
    const mysql = await import("mysql2/promise");
    const { drizzle } = await import("drizzle-orm/mysql2");

    const connection = await mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
    });

    dbRef.db = drizzle(connection, { schema: schema as any, mode: "default" });

    // Create tables if they don't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price VARCHAR(20) NOT NULL,
        stock INT NOT NULL DEFAULT 50,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(30) NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone VARCHAR(25) NOT NULL,
        order_type VARCHAR(15) NOT NULL DEFAULT 'pickup',
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
        cash_amount VARCHAR(20),
        delivery_address TEXT,
        subtotal VARCHAR(20) NOT NULL,
        delivery_cost VARCHAR(20),
        total VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INT NOT NULL,
        price VARCHAR(20) NOT NULL
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'employee',
        created_at INT
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS site_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INT
      );
    `);

    console.log("✅ Conectado a MySQL");
  })();
} else if (isPostgres) {
  // ── Production PostgreSQL (Render) ──
  dbType = "sqlite"; // storage.ts uses raw SQL — same interface
  dbReady = (async () => {
    const pg = await import("pg");
    const pool = new pg.default.Pool({ connectionString: dbUrl });
    // Expose the pool directly — storage.ts uses dbRef.db.$client.query()
    dbRef.db = { $client: pool };

    // Create tables for PostgreSQL (legacy)
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
          price VARCHAR(20) NOT NULL, stock INT NOT NULL DEFAULT 50,
          category TEXT NOT NULL, image_url TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY, order_number VARCHAR(30) NOT NULL DEFAULT '',
          customer_name TEXT NOT NULL DEFAULT '', customer_phone VARCHAR(25) NOT NULL DEFAULT '',
          order_type VARCHAR(15) NOT NULL DEFAULT 'pickup', payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
          cash_amount VARCHAR(20), delivery_address TEXT, subtotal VARCHAR(20) NOT NULL DEFAULT '0',
          delivery_cost VARCHAR(20), total VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
          notes TEXT, created_at TIMESTAMP DEFAULT NOW(), customer_google_id TEXT
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY, order_id INT NOT NULL, product_id INT NOT NULL,
          product_name TEXT NOT NULL DEFAULT '', quantity INT NOT NULL, price VARCHAR(20) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL,
          name TEXT NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'employee', created_at INT
        );
        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INT
        );
        CREATE TABLE IF NOT EXISTS customer_profiles (
          id SERIAL PRIMARY KEY, google_id TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL, name TEXT NOT NULL, picture TEXT,
          phone TEXT, preferred_address TEXT,
          created_at INT, updated_at INT
        );
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);
      // Safely add columns that may not exist in older deployments
      // Run all in a single DO block for efficiency
      await client.query(`
        DO $$ BEGIN
          -- orders: columns added over time
          BEGIN ALTER TABLE orders ADD COLUMN order_number VARCHAR(30) NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(25) NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN order_type VARCHAR(15) NOT NULL DEFAULT 'pickup'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN cash_amount VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN delivery_address TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN subtotal VARCHAR(20) NOT NULL DEFAULT '0'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN delivery_cost VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN total VARCHAR(20) NOT NULL DEFAULT '0'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN notes TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN customer_google_id TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE orders ADD COLUMN created_at TIMESTAMP DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
          -- order_items: columns added over time
          BEGIN ALTER TABLE order_items ADD COLUMN order_id INT NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE order_items ADD COLUMN product_id INT NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE order_items ADD COLUMN product_name TEXT NOT NULL DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE order_items ADD COLUMN quantity INT NOT NULL DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE order_items ADD COLUMN price VARCHAR(20) NOT NULL DEFAULT '0'; EXCEPTION WHEN duplicate_column THEN NULL; END;
          -- Drop NOT NULL on legacy columns that the current app doesn't supply
          BEGIN ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL; EXCEPTION WHEN undefined_column THEN NULL; END;
          BEGIN ALTER TABLE orders ALTER COLUMN user_id SET DEFAULT NULL; EXCEPTION WHEN undefined_column THEN NULL; END;
          -- order_items: variant info columns
          BEGIN ALTER TABLE order_items ADD COLUMN variant_label TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
          BEGIN ALTER TABLE order_items ADD COLUMN item_comment TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        END $$;
      `);
      // Product variants table
      await client.query(`
        CREATE TABLE IF NOT EXISTS product_variants (
          id SERIAL PRIMARY KEY,
          product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          price VARCHAR(20) NOT NULL,
          stock INT NOT NULL DEFAULT 50,
          image_url TEXT,
          sort_order INT NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
      `);
      console.log("✅ Tablas PostgreSQL inicializadas correctamente");
      console.log("✅ Conectado a PostgreSQL");
    } finally {
      client.release();
    }
  })();
} else {
  // ── Development: SQLite ──
  dbType = "sqlite";
  dbReady = (async () => {
    try {
      const { initializeSqlite } = await import("./init-sqlite");
      const sqlite = initializeSqlite("./dev.db");
      dbRef.db = { _sqlite: sqlite };
      console.log("⚠️  Usando SQLite para desarrollo local. Para producción configura DATABASE_URL.");
    } catch (e: any) {
      console.error("❌ Error inicializando SQLite:", e.message);
      throw e;
    }
  })();
}

export { dbType, dbReady };
