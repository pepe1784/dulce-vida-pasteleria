// Production = PostgreSQL (Render). Local dev = SQLite via init-sqlite.ts.
// Schema uses pg-core so the bundle doesn't break when running on PostgreSQL.
import { pgTable, text, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Products ─────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: varchar("price", { length: 20 }).notNull(),
  stock: integer("stock").notNull().default(50),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
});

// ── Orders ────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull().default(""),
  customerName: text("customer_name").notNull().default(""),
  customerPhone: varchar("customer_phone", { length: 25 }).notNull().default(""),
  orderType: varchar("order_type", { length: 15 }).notNull().default("pickup"),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("cash"),
  cashAmount: varchar("cash_amount", { length: 20 }),
  deliveryAddress: text("delivery_address"),
  subtotal: varchar("subtotal", { length: 20 }).notNull().default("0"),
  deliveryCost: varchar("delivery_cost", { length: 20 }),
  total: varchar("total", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  customerGoogleId: text("customer_google_id"),
});

// ── Order Items ───────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull().default(""),
  quantity: integer("quantity").notNull(),
  price: varchar("price", { length: 20 }).notNull(),
});

// ── Admin Users ───────────────────────────────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("employee"),
  createdAt: integer("created_at"),
});

// ── Site Settings ─────────────────────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at"),
});

// ── Zod Schemas ───────────────────────────────────────────────────────
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });

// ── TypeScript Types ──────────────────────────────────────────────────
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type InsertOrder = {
  orderNumber?: string;
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
  status?: string | null;
};

export type InsertOrderItem = {
  orderId?: number;
  productId: number;
  productName: string;
  quantity: number;
  price: string;
  variantId?: number | null;
  variantLabel?: string | null;
  itemComment?: string | null;
};

export type OrderWithItems = Order & {
  items: (OrderItem & { variantLabel?: string | null; itemComment?: string | null })[];
};

// ── Product Variant ───────────────────────────────────────────────────────
export type ProductVariant = {
  id: number;
  productId: number;
  label: string;
  price: string;
  stock: number;
  imageUrl?: string | null;
  sortOrder: number;
};

export type InsertProductVariant = Omit<ProductVariant, "id">;
