import { db } from "./db";
import { products, orders, orderItems, type Product, type InsertProduct, type Order, type InsertOrder, type OrderItem, type InsertOrderItem } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createOrder(userId: string, items: { productId: number; quantity: number }[]): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
}

export class DatabaseStorage implements IStorage {
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

  async createOrder(userId: string, items: { productId: number; quantity: number }[]): Promise<Order> {
    // Calculate total and verify stock (simplified for now)
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
      status: "completed", // Auto-complete for demo
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
}

export const storage = new DatabaseStorage();
