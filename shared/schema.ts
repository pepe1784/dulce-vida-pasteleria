// NOTE: Production = MySQL (Hostinger). Local dev = SQLite via init-sqlite.ts.
// For production migrations use: npm run db:push (with MySQL DATABASE_URL).
import { mysqlTable, text, int, decimal, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Products ─────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 20 }).notNull(),
  stock: int("stock").notNull().default(50),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
});

// ── Orders ────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: varchar("customer_phone", { length: 25 }).notNull(),
  orderType: varchar("order_type", { length: 15 }).notNull().default("pickup"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cash"),
  cashAmount: varchar("cash_amount", { length: 20 }),
  deliveryAddress: text("delivery_address"),
  subtotal: varchar("subtotal", { length: 20 }).notNull(),
  deliveryCost: varchar("delivery_cost", { length: 20 }),
  total: varchar("total", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Order Items ───────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  productId: int("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: int("quantity").notNull(),
  price: varchar("price", { length: 20 }).notNull(),
});

// ── Admin Users ───────────────────────────────────────────────────────
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("employee"),
  createdAt: int("created_at"),
});

// ── Site Settings ─────────────────────────────────────────────────────
export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: int("updated_at"),
});

// ── Zod Schemas ───────────────────────────────────────────────────────
export const insertProductSchema = createInsertSchema(products).omit({ id: true });

// ── TypeScript Types ──────────────────────────────────────────────────
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type InsertOrder = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  paymentMethod: string;
  cashAmount?: string | null;
  deliveryAddress?: string | null;
  subtotal: string;
  deliveryCost?: string | null;
  total: string;
  notes?: string | null;
};

export type InsertOrderItem = {
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: string;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
};
