import Database from "better-sqlite3";

export function initializeSqlite(dbPath: string = "./dev.db") {
  const db = new Database(dbPath);

  console.log("🔧 Inicializando tablas SQLite (dev)...");

  db.exec(`PRAGMA journal_mode = WAL;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 50,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_phone TEXT NOT NULL DEFAULT '',
      order_type TEXT NOT NULL DEFAULT 'pickup',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      cash_amount TEXT,
      delivery_address TEXT,
      subtotal TEXT NOT NULL DEFAULT '0',
      delivery_cost TEXT,
      total TEXT NOT NULL DEFAULT '0',
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL DEFAULT '',
      quantity INTEGER NOT NULL,
      price TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Migrate existing orders table if columns missing (graceful upgrade)
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN order_number TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN customer_phone TEXT NOT NULL DEFAULT '';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'pickup';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN cash_amount TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN delivery_address TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN subtotal TEXT NOT NULL DEFAULT '0';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN delivery_cost TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN notes TEXT;`);
  } catch {}

  // Customer profiles (Google OAuth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      picture TEXT,
      phone TEXT,
      preferred_address TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Migrate order_items if product_name missing
  try {
    db.exec(`ALTER TABLE order_items ADD COLUMN product_name TEXT NOT NULL DEFAULT '';`);
  } catch {}

  // Migrate orders to link to customer google id
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN customer_google_id TEXT;`);
  } catch {}

  // Variant info on order_items
  try { db.exec(`ALTER TABLE order_items ADD COLUMN variant_label TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN item_comment TEXT;`); } catch {}

  // Accepted_by on orders (tracks which admin confirmed the order)
  try { db.exec(`ALTER TABLE orders ADD COLUMN accepted_by INTEGER;`); } catch {}

  // Audit log — IMMUTABLE (no delete/update should ever be called on this table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      admin_role TEXT NOT NULL,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      ip_address TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_order_id ON order_audit_log(order_id);
  `);

  // Product variants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      price TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 50,
      image_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Seed default categories if not yet set
  const existingCatSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'categories_list'").get();
  if (!existingCatSetting) {
    const defaultCats = JSON.stringify([
      "Bebidas Calientes", "Bebidas Frías", "Cuchareables", "Frappes",
      "Fresas con Crema", "Pasteles Grandes", "Pasteles Individuales",
      "Pay de Queso", "Roles",
    ]);
    db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('categories_list', ?)").run(defaultCats);
  }

  console.log("✅ Tablas SQLite inicializadas correctamente");
  return db;
}
