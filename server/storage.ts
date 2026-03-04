import { dbRef, dbType, dbReady } from "./db";
import type {
  Product, InsertProduct, Order, InsertOrder, OrderItem, InsertOrderItem,
  AdminUser, OrderWithItems, ProductVariant, InsertProductVariant,
} from "@shared/schema";

// ── Helpers ────────────────────────────────────────────────────────────────
function isSQLite(): boolean {
  // Check for the actual SQLite instance — avoids false positives when dbType
  // is set to "sqlite" as a placeholder for the PostgreSQL path.
  return !!(dbRef.db?._sqlite);
}

function sqliteDb(): any {
  return dbRef.db?._sqlite;
}

// Run on MySQL/PostgreSQL drizzle instance using raw sql
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Convert MySQL/SQLite ? placeholders to PostgreSQL $1,$2,... style
function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── PostgreSQL alias normalization ─────────────────────────────────────────
// PostgreSQL lowercases all unquoted identifiers/aliases (e.g. "imageUrl" → "imageurl").
// This map restores the expected camelCase keys used throughout the app.
const PG_ALIAS_MAP: Record<string, string> = {
  imageurl: "imageUrl",
  passwordhash: "passwordHash",
  ordernumber: "orderNumber",
  customername: "customerName",
  customerphone: "customerPhone",
  ordertype: "orderType",
  paymentmethod: "paymentMethod",
  cashamount: "cashAmount",
  deliveryaddress: "deliveryAddress",
  deliverycost: "deliveryCost",
  createdat: "createdAt",
  updatedat: "updatedAt",
  orderid: "orderId",
  productid: "productId",
  productname: "productName",
  googleid: "googleId",
  preferredaddress: "preferredAddress",
  customergoogleid: "customerGoogleId",
  totalsold: "totalSold",
  variantlabel: "variantLabel",
  itemcomment: "itemComment",
  sortorder: "sortOrder",
  acceptedby: "acceptedBy",
  adminid: "adminId",
  adminname: "adminName",
  adminrole: "adminRole",
  oldstatus: "oldStatus",
  newstatus: "newStatus",
  ipaddress: "ipAddress",
};

function normalizePgRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[PG_ALIAS_MAP[k] ?? k] = v;
  }
  return out;
}

function isPostgres(): boolean {
  // pg.Pool has .query but NOT .execute (mysql2 has .execute)
  const client = dbRef.db?.$client;
  return (
    !isSQLite() &&
    !!client &&
    typeof client.query === "function" &&
    typeof client.execute !== "function"
  );
}

async function rawQuery(sql: string, params: any[] = []): Promise<any[]> {
  if (isSQLite()) {
    const stmt = sqliteDb().prepare(sql);
    const result = stmt.all(...params);
    return result as any[];
  } else {
    const client = dbRef.db.$client;
    if (client && typeof client.execute === "function") {
      // mysql2 pool
      const [rows] = await client.execute(sql, params);
      return rows as any[];
    } else if (client && typeof client.query === "function") {
      // pg pool — must use $1,$2,... placeholders; normalize camelCase aliases
      const pgSql = toPgSql(sql);
      const res = await client.query(pgSql, params.length ? params : undefined);
      return res.rows.map(normalizePgRow);
    }
    // fallback
    const result = await dbRef.db.execute({ sql, params });
    const rows = Array.isArray(result) ? result : (result as any).rows ?? result;
    return rows as any[];
  }
}

async function rawRun(sql: string, params: any[] = []): Promise<{ lastInsertId?: number; changes?: number }> {
  if (isSQLite()) {
    const stmt = sqliteDb().prepare(sql);
    const info = stmt.run(...params);
    return { lastInsertId: info.lastInsertRowid as number, changes: info.changes };
  } else {
    const client = dbRef.db.$client;
    if (client && typeof client.execute === "function") {
      // mysql2 pool
      const [result] = await client.execute(sql, params);
      return { lastInsertId: (result as any).insertId, changes: (result as any).affectedRows };
    } else if (client && typeof client.query === "function") {
      // pg pool — use $1,$2,... and RETURNING * for INSERTs to capture generated id
      let pgSql = toPgSql(sql);
      const isInsert = /^\s*INSERT/i.test(pgSql);
      if (isInsert && !/RETURNING/i.test(pgSql)) pgSql += " RETURNING *";
      const res = await client.query(pgSql, params.length ? params : undefined);
      const lastInsertId = isInsert ? (res.rows[0]?.id ?? undefined) : undefined;
      return { lastInsertId, changes: res.rowCount ?? 0 };
    }
    const result = await dbRef.db.execute({ sql, params });
    return { lastInsertId: (result as any)?.insertId };
  }
}

// Generate order number: EP-YYMMDD-NNN
async function generateOrderNumber(): Promise<string> {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = `EP-${yy}${mm}${dd}`;
  const rows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE order_number LIKE ?", [`${prefix}%`]);
  const cnt = Number(rows[0]?.cnt ?? rows[0]?.["COUNT(*)"] ?? 0) + 1;
  return `${prefix}-${String(cnt).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalRevenue: string;
  todayRevenue: string;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  topProducts: Array<{ name: string; totalSold: number; revenue: string }>;
  recentOrders: Order[];
  revenueByCategory: Array<{ category: string; revenue: string }>;
  weeklyOrders: number;
  averageOrderValue: string;
}

// ─────────────────────────────────────────────────────────────────────────────
export class DatabaseStorage {
  // ── Products ──────────────────────────────────────────────────────────────
  async getProducts(): Promise<Product[]> {
    return rawQuery("SELECT id, name, description, price, stock, category, image_url AS imageUrl FROM products ORDER BY id ASC");
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const rows = await rawQuery("SELECT id, name, description, price, stock, category, image_url AS imageUrl FROM products WHERE id = ?", [id]);
    return rows[0] as Product | undefined;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const { name, description, price, stock, category, imageUrl } = data;
    const r = await rawRun(
      "INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, String(price), stock ?? 50, category, imageUrl]
    );
    return (await this.getProduct(r.lastInsertId!))!;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
    if (data.description !== undefined) { fields.push("description = ?"); vals.push(data.description); }
    if (data.price !== undefined) { fields.push("price = ?"); vals.push(String(data.price)); }
    if (data.stock !== undefined) { fields.push("stock = ?"); vals.push(data.stock); }
    if (data.category !== undefined) { fields.push("category = ?"); vals.push(data.category); }
    if (data.imageUrl !== undefined) { fields.push("image_url = ?"); vals.push(data.imageUrl); }
    if (!fields.length) return this.getProduct(id);
    vals.push(id);
    await rawRun(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, vals);
    return this.getProduct(id);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const r = await rawRun("DELETE FROM products WHERE id = ?", [id]);
    return (r.changes ?? 0) > 0;
  }

  // ── Product Variants ──────────────────────────────────────────────────────
  async getVariants(productId: number): Promise<ProductVariant[]> {
    const rows = await rawQuery(
      "SELECT id, product_id AS productId, label, price, stock, image_url AS imageUrl, sort_order AS sortOrder FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
      [productId]
    );
    return rows as ProductVariant[];
  }

  async getVariant(id: number): Promise<ProductVariant | undefined> {
    const rows = await rawQuery(
      "SELECT id, product_id AS productId, label, price, stock, image_url AS imageUrl, sort_order AS sortOrder FROM product_variants WHERE id = ?",
      [id]
    );
    return rows[0] as ProductVariant | undefined;
  }

  async createVariant(data: InsertProductVariant): Promise<ProductVariant> {
    const r = await rawRun(
      "INSERT INTO product_variants (product_id, label, price, stock, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [data.productId, data.label, String(data.price), data.stock ?? 50, data.imageUrl ?? null, data.sortOrder ?? 0]
    );
    return (await this.getVariant(r.lastInsertId!))!;
  }

  async updateVariant(id: number, data: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (data.label !== undefined) { fields.push("label = ?"); vals.push(data.label); }
    if (data.price !== undefined) { fields.push("price = ?"); vals.push(String(data.price)); }
    if (data.stock !== undefined) { fields.push("stock = ?"); vals.push(data.stock); }
    if (data.imageUrl !== undefined) { fields.push("image_url = ?"); vals.push(data.imageUrl); }
    if (data.sortOrder !== undefined) { fields.push("sort_order = ?"); vals.push(data.sortOrder); }
    if (!fields.length) return this.getVariant(id);
    vals.push(id);
    await rawRun(`UPDATE product_variants SET ${fields.join(", ")} WHERE id = ?`, vals);
    return this.getVariant(id);
  }

  async deleteVariant(id: number): Promise<boolean> {
    const r = await rawRun("DELETE FROM product_variants WHERE id = ?", [id]);
    return (r.changes ?? 0) > 0;
  }

  async replaceVariants(productId: number, variants: Array<{ label: string; price: string; stock: number; imageUrl?: string | null; sortOrder?: number }>): Promise<ProductVariant[]> {
    await rawRun("DELETE FROM product_variants WHERE product_id = ?", [productId]);
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      await rawRun(
        "INSERT INTO product_variants (product_id, label, price, stock, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [productId, v.label, String(v.price), v.stock ?? 50, v.imageUrl ?? null, v.sortOrder ?? i]
      );
    }
    return this.getVariants(productId);
  }

  // Get all variants for multiple product IDs in one query
  async getVariantsBatch(productIds: number[]): Promise<Record<number, ProductVariant[]>> {
    if (!productIds.length) return {};
    const placeholders = productIds.map(() => "?").join(",");
    const rows = await rawQuery(
      `SELECT id, product_id AS productId, label, price, stock, image_url AS imageUrl, sort_order AS sortOrder FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY product_id, sort_order ASC, id ASC`,
      productIds
    );
    const result: Record<number, ProductVariant[]> = {};
    for (const r of rows as ProductVariant[]) {
      if (!result[r.productId]) result[r.productId] = [];
      result[r.productId].push(r);
    }
    return result;
  }
  async getCategories(): Promise<string[]> {
    // Primary source: categories_list setting
    const settingVal = await this.getSetting("categories_list");
    const fromSettings: string[] = settingVal ? JSON.parse(settingVal) : [];
    // Secondary: any category from actual products not yet in settings
    const rows = await rawQuery("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category ASC");
    const fromProducts = rows.map((r: any) => r.category as string);
    return Array.from(new Set([...fromSettings, ...fromProducts])).sort();
  }

  async addCategory(name: string): Promise<void> {
    const settingVal = await this.getSetting("categories_list");
    const list: string[] = settingVal ? JSON.parse(settingVal) : [];
    if (!list.includes(name)) {
      list.push(name);
      list.sort();
      await this.setSetting("categories_list", JSON.stringify(list));
    }
  }

  async renameCategory(oldName: string, newName: string): Promise<void> {
    await rawRun("UPDATE products SET category = ? WHERE category = ?", [newName, oldName]);
    // Also update settings list
    const settingVal = await this.getSetting("categories_list");
    if (settingVal) {
      const list: string[] = JSON.parse(settingVal).map((c: string) => c === oldName ? newName : c);
      await this.setSetting("categories_list", JSON.stringify(list));
    }
  }

  async deleteCategory(name: string, reassignTo?: string): Promise<void> {
    if (reassignTo) {
      await rawRun("UPDATE products SET category = ? WHERE category = ?", [reassignTo, name]);
    } else {
      // Only delete products if no reassign target; usually better to reassign
      await rawRun("UPDATE products SET category = '' WHERE category = ?", [name]);
    }
    // Remove from settings list
    const settingVal = await this.getSetting("categories_list");
    if (settingVal) {
      const list: string[] = JSON.parse(settingVal).filter((c: string) => c !== name);
      await this.setSetting("categories_list", JSON.stringify(list));
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async createOrder(data: InsertOrder & { customerGoogleId?: string | null }, items: InsertOrderItem[]): Promise<Order> {
    const orderNumber = data.orderNumber || (await generateOrderNumber());
    const r = await rawRun(
      `INSERT INTO orders (order_number, customer_name, customer_phone, order_type, payment_method,
        cash_amount, delivery_address, subtotal, delivery_cost, total, status, notes, customer_google_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        orderNumber, data.customerName, data.customerPhone, data.orderType, data.paymentMethod,
        data.cashAmount ?? null, data.deliveryAddress ?? null,
        data.subtotal, data.deliveryCost ?? null, data.total, data.notes ?? null,
        data.customerGoogleId ?? null,
      ]
    );
    const orderId = r.lastInsertId!;
    for (const item of items) {
      await rawRun(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price, variant_label, item_comment) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [orderId, item.productId, item.productName, item.quantity, String(item.price), item.variantLabel ?? null, item.itemComment ?? null]
      );
    }
    return (await this.getOrder(orderId))!;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const rows = await rawQuery(
      `SELECT id, order_number AS orderNumber, customer_name AS customerName,
        customer_phone AS customerPhone, order_type AS orderType, payment_method AS paymentMethod,
        cash_amount AS cashAmount, delivery_address AS deliveryAddress, subtotal, delivery_cost AS deliveryCost,
        total, status, notes, created_at AS createdAt, customer_google_id AS customerGoogleId
       FROM orders WHERE id = ?`,
      [id]
    );
    return rows[0] as Order | undefined;
  }

  async getOrders(): Promise<Order[]> {
    return rawQuery(
      `SELECT id, order_number AS orderNumber, customer_name AS customerName,
        customer_phone AS customerPhone, order_type AS orderType, payment_method AS paymentMethod,
        cash_amount AS cashAmount, delivery_address AS deliveryAddress, subtotal, delivery_cost AS deliveryCost,
        total, status, notes, created_at AS createdAt FROM orders ORDER BY id DESC`
    );
  }

  async getOrderWithItems(id: number): Promise<OrderWithItems | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    const items = await rawQuery(
      `SELECT id, order_id AS orderId, product_id AS productId, product_name AS productName,
        quantity, price, variant_label AS variantLabel, item_comment AS itemComment FROM order_items WHERE order_id = ?`,
      [id]
    );
    return { ...order, items: items as any[] };
  }

  async getAllOrdersWithItems(): Promise<OrderWithItems[]> {
    const orders = await this.getOrders();
    const result: OrderWithItems[] = [];
    for (const order of orders) {
      const items = await rawQuery(
        `SELECT id, order_id AS orderId, product_id AS productId, product_name AS productName,
          quantity, price, variant_label AS variantLabel, item_comment AS itemComment FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      result.push({ ...order, items: items as any[] });
    }
    return result;
  }

  async updateOrderStatus(id: number, status: string, acceptedBy?: number): Promise<Order | undefined> {
    if (acceptedBy && status === "confirmed") {
      await rawRun("UPDATE orders SET status = ?, accepted_by = ? WHERE id = ?", [status, acceptedBy, id]);
    } else {
      await rawRun("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    }
    return this.getOrder(id);
  }

  // ── Audit Log (IMMUTABLE — no update/delete methods) ──────────────────────
  async createAuditLog(entry: {
    orderId: number;
    adminId: number;
    adminName: string;
    adminRole: string;
    oldStatus: string;
    newStatus: string;
    ipAddress?: string;
  }): Promise<void> {
    const ts = Math.floor(Date.now() / 1000);
    await rawRun(
      `INSERT INTO order_audit_log (order_id, admin_id, admin_name, admin_role, old_status, new_status, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.orderId, entry.adminId, entry.adminName, entry.adminRole,
       entry.oldStatus, entry.newStatus, entry.ipAddress ?? null, ts]
    );
  }

  async getAuditLogs(orderId: number): Promise<any[]> {
    return rawQuery(
      `SELECT id, order_id AS orderId, admin_id AS adminId, admin_name AS adminName,
        admin_role AS adminRole, old_status AS oldStatus, new_status AS newStatus,
        ip_address AS ipAddress, created_at AS createdAt
       FROM order_audit_log WHERE order_id = ? ORDER BY id ASC`,
      [orderId]
    );
  }

  async getAllAuditLogs(limit = 100): Promise<any[]> {
    return rawQuery(
      `SELECT l.id, l.order_id AS orderId, l.admin_id AS adminId, l.admin_name AS adminName,
        l.admin_role AS adminRole, l.old_status AS oldStatus, l.new_status AS newStatus,
        l.ip_address AS ipAddress, l.created_at AS createdAt,
        o.order_number AS orderNumber
       FROM order_audit_log l
       LEFT JOIN orders o ON l.order_id = o.id
       ORDER BY l.id DESC LIMIT ?`,
      [limit]
    );
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | undefined> {    const rows = await rawQuery(
      `SELECT id, order_number AS orderNumber, customer_name AS customerName,
        customer_phone AS customerPhone, order_type AS orderType, payment_method AS paymentMethod,
        cash_amount AS cashAmount, delivery_address AS deliveryAddress, subtotal, delivery_cost AS deliveryCost,
        total, status, notes, created_at AS createdAt FROM orders WHERE order_number = ?`,
      [orderNumber]
    );
    if (!rows[0]) return undefined;
    const order = rows[0] as Order;
    const items = await rawQuery(
      `SELECT id, order_id AS orderId, product_id AS productId, product_name AS productName,
        quantity, price, variant_label AS variantLabel, item_comment AS itemComment FROM order_items WHERE order_id = ?`,
      [order.id]
    );
    return { ...order, items: items as any[] };
  }

  // Orders active in kitchen (confirmed / preparing / ready)
  async getOrdersForKitchen(): Promise<OrderWithItems[]> {
    const orders = await rawQuery(
      `SELECT id, order_number AS orderNumber, customer_name AS customerName,
        customer_phone AS customerPhone, order_type AS orderType, payment_method AS paymentMethod,
        cash_amount AS cashAmount, delivery_address AS deliveryAddress, subtotal, delivery_cost AS deliveryCost,
        total, status, notes, created_at AS createdAt
       FROM orders
       WHERE status IN ('confirmed','preparing','ready')
       ORDER BY id ASC`
    );
    const result: OrderWithItems[] = [];
    for (const o of orders) {
      const items = await rawQuery(
        `SELECT id, order_id AS orderId, product_id AS productId, product_name AS productName,
          quantity, price, variant_label AS variantLabel, item_comment AS itemComment
         FROM order_items WHERE order_id = ?`,
        [o.id]
      );
      result.push({ ...(o as Order), items: items as any[] });
    }
    return result;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    // Today date string
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;

    let totalRevenueRows: any[], todayRevenueRows: any[], totalOrdersRows: any[],
      todayOrdersRows: any[], pendingRows: any[], topProductsRows: any[],
      revByCatRows: any[], recentRows: any[], weekOrdersRows: any[];

    if (isSQLite()) {
      totalRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as val FROM orders WHERE status != 'cancelled'");
      todayRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as val FROM orders WHERE date(created_at, 'unixepoch') = ? AND status != 'cancelled'", [todayStr]);
      totalOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status != 'cancelled'");
      todayOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at, 'unixepoch') = ?", [todayStr]);
      pendingRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'");
      weekOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE date(created_at, 'unixepoch') >= ?", [weekAgoStr]);
      topProductsRows = await rawQuery(`SELECT oi.product_name as name, SUM(oi.quantity) as totalSold,
        SUM(CAST(oi.price AS REAL) * oi.quantity) as revenue
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY oi.product_name ORDER BY totalSold DESC LIMIT 5`);
      revByCatRows = await rawQuery(`SELECT p.category, SUM(CAST(oi.price AS REAL) * oi.quantity) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY p.category ORDER BY revenue DESC`);
      recentRows = await rawQuery(`SELECT id, order_number AS orderNumber, customer_name AS customerName,
        total, status, created_at AS createdAt FROM orders ORDER BY id DESC LIMIT 10`);
    } else if (isPostgres()) {
      // PostgreSQL — uses CURRENT_DATE and INTERVAL syntax
      totalRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as val FROM orders WHERE status != 'cancelled'");
      todayRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as val FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status != 'cancelled'");
      totalOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status != 'cancelled'");
      todayOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURRENT_DATE");
      pendingRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'");
      weekOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= NOW() - INTERVAL '7 days'");
      topProductsRows = await rawQuery(`SELECT oi.product_name as name, SUM(oi.quantity) as totalSold,
        SUM(CAST(oi.price AS NUMERIC) * oi.quantity) as revenue
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY oi.product_name ORDER BY totalSold DESC LIMIT 5`);
      revByCatRows = await rawQuery(`SELECT p.category, SUM(CAST(oi.price AS NUMERIC) * oi.quantity) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY p.category ORDER BY revenue DESC`);
      recentRows = await rawQuery(`SELECT id, order_number AS orderNumber, customer_name AS customerName,
        total, status, created_at AS createdAt FROM orders ORDER BY id DESC LIMIT 10`);
    } else {
      // MySQL — uses CURDATE() and DATE_SUB/INTERVAL syntax
      totalRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as val FROM orders WHERE status != 'cancelled'");
      todayRevenueRows = await rawQuery("SELECT COALESCE(SUM(CAST(total AS DECIMAL(10,2))), 0) as val FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'");
      totalOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status != 'cancelled'");
      todayOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURDATE()");
      pendingRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'");
      weekOrdersRows = await rawQuery("SELECT COUNT(*) as cnt FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
      topProductsRows = await rawQuery(`SELECT oi.product_name as name, SUM(oi.quantity) as totalSold,
        SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity) as revenue
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY oi.product_name ORDER BY totalSold DESC LIMIT 5`);
      revByCatRows = await rawQuery(`SELECT p.category, SUM(CAST(oi.price AS DECIMAL(10,2)) * oi.quantity) as revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.id JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' GROUP BY p.category ORDER BY revenue DESC`);
      recentRows = await rawQuery(`SELECT id, order_number AS orderNumber, customer_name AS customerName,
        total, status, created_at AS createdAt FROM orders ORDER BY id DESC LIMIT 10`);
    }

    const totalRevenue = Number(totalRevenueRows[0]?.val ?? 0).toFixed(2);
    const todayRevenue = Number(todayRevenueRows[0]?.val ?? 0).toFixed(2);
    const totalOrders = Number(totalOrdersRows[0]?.cnt ?? totalOrdersRows[0]?.["COUNT(*)"] ?? 0);
    const todayOrders = Number(todayOrdersRows[0]?.cnt ?? todayOrdersRows[0]?.["COUNT(*)"] ?? 0);
    const pendingOrders = Number(pendingRows[0]?.cnt ?? pendingRows[0]?.["COUNT(*)"] ?? 0);
    const weeklyOrders = Number(weekOrdersRows[0]?.cnt ?? weekOrdersRows[0]?.["COUNT(*)"] ?? 0);
    const avgVal = totalOrders > 0 ? (Number(totalRevenue) / totalOrders).toFixed(2) : "0.00";

    return {
      totalRevenue,
      todayRevenue,
      totalOrders,
      todayOrders,
      pendingOrders,
      weeklyOrders,
      averageOrderValue: avgVal,
      topProducts: topProductsRows.map((r: any) => ({
        name: r.name,
        totalSold: Number(r.totalSold ?? 0),
        revenue: Number(r.revenue ?? 0).toFixed(2),
      })),
      recentOrders: recentRows as Order[],
      revenueByCategory: revByCatRows.map((r: any) => ({
        category: r.category,
        revenue: Number(r.revenue ?? 0).toFixed(2),
      })),
    };
  }

  // ── Site Settings ─────────────────────────────────────────────────────────
  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await rawQuery("SELECT key, value FROM site_settings");
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const rows = await rawQuery("SELECT value FROM site_settings WHERE key = ?", [key]);
    return rows[0]?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (isSQLite()) {
      await rawRun("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)", [key, value]);
    } else {
      // PostgreSQL upsert
      await rawRun(
        "INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [key, value]
      );
    }
  }

  // ── Admin Users ───────────────────────────────────────────────────────────
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const rows = await rawQuery(
      "SELECT id, email, password_hash AS passwordHash, name, role, created_at AS createdAt FROM admin_users WHERE email = ?",
      [email]
    );
    return rows[0] as AdminUser | undefined;
  }

  async getAdminById(id: number): Promise<AdminUser | undefined> {
    const rows = await rawQuery(
      "SELECT id, email, password_hash AS passwordHash, name, role, created_at AS createdAt FROM admin_users WHERE id = ?",
      [id]
    );
    return rows[0] as AdminUser | undefined;
  }

  async createAdmin(data: { email: string; passwordHash: string; name: string; role: string }): Promise<AdminUser> {
    const ts = Math.floor(Date.now() / 1000);
    const r = await rawRun(
      "INSERT INTO admin_users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
      [data.email, data.passwordHash, data.name, data.role, ts]
    );
    return (await this.getAdminById(r.lastInsertId!))!;
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return rawQuery(
      "SELECT id, email, password_hash AS passwordHash, name, role, created_at AS createdAt FROM admin_users ORDER BY id ASC"
    );
  }

  async updateAdmin(id: number, data: Partial<{ email: string; passwordHash: string; name: string; role: string }>): Promise<AdminUser | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (data.email !== undefined) { fields.push("email = ?"); vals.push(data.email); }
    if (data.passwordHash !== undefined) { fields.push("password_hash = ?"); vals.push(data.passwordHash); }
    if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
    if (data.role !== undefined) { fields.push("role = ?"); vals.push(data.role); }
    if (!fields.length) return this.getAdminById(id);
    vals.push(id);
    await rawRun(`UPDATE admin_users SET ${fields.join(", ")} WHERE id = ?`, vals);
    return this.getAdminById(id);
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const r = await rawRun("DELETE FROM admin_users WHERE id = ?", [id]);
    return (r.changes ?? 0) > 0;
  }

  // ── Customer Profiles (Google OAuth) ──────────────────────────────────────

  async upsertCustomerProfile(data: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<CustomerProfile> {
    const now = Math.floor(Date.now() / 1000);
    const existing = await this.getCustomerByGoogleId(data.googleId);
    if (existing) {
      // Update name/picture/email from Google on every login
      await rawRun(
        "UPDATE customer_profiles SET email = ?, name = ?, picture = ?, updated_at = ? WHERE google_id = ?",
        [data.email, data.name, data.picture ?? existing.picture ?? null, now, data.googleId]
      );
      return (await this.getCustomerByGoogleId(data.googleId))!;
    }
    await rawRun(
      "INSERT INTO customer_profiles (google_id, email, name, picture, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [data.googleId, data.email, data.name, data.picture ?? null, now, now]
    );
    return (await this.getCustomerByGoogleId(data.googleId))!;
  }

  async getCustomerByGoogleId(googleId: string): Promise<CustomerProfile | undefined> {
    const rows = await rawQuery(
      `SELECT id, google_id AS googleId, email, name, picture, phone,
              preferred_address AS preferredAddress,
              created_at AS createdAt, updated_at AS updatedAt
       FROM customer_profiles WHERE google_id = ?`,
      [googleId]
    );
    return rows[0] as CustomerProfile | undefined;
  }

  async updateCustomerProfile(googleId: string, data: {
    phone?: string;
    preferredAddress?: object | null;
    name?: string;
  }): Promise<CustomerProfile | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (data.phone !== undefined) { fields.push("phone = ?"); vals.push(data.phone); }
    if (data.preferredAddress !== undefined) {
      fields.push("preferred_address = ?");
      vals.push(data.preferredAddress ? JSON.stringify(data.preferredAddress) : null);
    }
    if (data.name !== undefined) { fields.push("name = ?"); vals.push(data.name); }
    if (!fields.length) return this.getCustomerByGoogleId(googleId);
    fields.push("updated_at = ?");
    vals.push(Math.floor(Date.now() / 1000));
    vals.push(googleId);
    await rawRun(`UPDATE customer_profiles SET ${fields.join(", ")} WHERE google_id = ?`, vals);
    return this.getCustomerByGoogleId(googleId);
  }

  async getOrdersByGoogleId(googleId: string): Promise<Order[]> {
    return rawQuery(
      `SELECT id, order_number AS orderNumber, customer_name AS customerName,
              customer_phone AS customerPhone, order_type AS orderType,
              payment_method AS paymentMethod, cash_amount AS cashAmount,
              delivery_address AS deliveryAddress, subtotal, delivery_cost AS deliveryCost,
              total, status, notes, created_at AS createdAt
       FROM orders WHERE customer_google_id = ? ORDER BY id DESC`,
      [googleId]
    );
  }
}

export const storage = new DatabaseStorage();

// ── Customer Profile type ────────────────────────────────────────────────────
export interface CustomerProfile {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
  phone?: string | null;
  preferredAddress?: string | null;
  createdAt?: number;
  updatedAt?: number;
}
