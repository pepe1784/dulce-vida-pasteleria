import { db } from "./db";
import {
  products, orders, orderItems, adminUsers, siteSettings,
  type Product, type InsertProduct, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type AdminUser, type SiteSetting
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  // Orders
  createOrder(userId: string, items: { productId: number; quantity: number }[]): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
  // Settings
  getAllSettings(): Promise<Record<string, string>>;
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  // Admin Users
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminById(id: number): Promise<AdminUser | undefined>;
  createAdmin(data: { email: string; passwordHash: string; name: string; role: string }): Promise<AdminUser>;
  getAllAdmins(): Promise<AdminUser[]>;
  updateAdmin(id: number, data: Partial<{ email: string; passwordHash: string; name: string; role: string }>): Promise<AdminUser | undefined>;
  deleteAdmin(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ── Products ──
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // ── Orders ──
  async createOrder(userId: string, items: { productId: number; quantity: number }[]): Promise<Order> {
    let total = 0;
    const productList = await this.getProducts();
    const productMap = new Map(productList.map(p => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (product) {
        total += Number(product.price) * item.quantity;
      }
    }

    const [order] = await db.insert(orders).values({
      userId,
      total: total.toString(),
      status: "completed",
    }).returning();

    for (const item of items) {
       const product = productMap.get(item.productId);
       if(product) {
           await db.insert(orderItems).values({
               orderId: order.id,
               productId: item.productId,
               quantity: item.quantity,
               price: product.price
           });
       }
    }

    return order;
  }

  async getOrders(userId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  // ── Site Settings ──
  async getAllSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(siteSettings);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    // Upsert: try update first, insert if not found
    const existing = await this.getSetting(key);
    if (existing !== undefined) {
      await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ key, value });
    }
  }

  // ── Admin Users ──
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user;
  }

  async getAdminById(id: number): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user;
  }

  async createAdmin(data: { email: string; passwordHash: string; name: string; role: string }): Promise<AdminUser> {
    const [user] = await db.insert(adminUsers).values(data).returning();
    return user;
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers);
  }

  async updateAdmin(id: number, data: Partial<{ email: string; passwordHash: string; name: string; role: string }>): Promise<AdminUser | undefined> {
    const [updated] = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning();
    return updated;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const result = await db.delete(adminUsers).where(eq(adminUsers.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
