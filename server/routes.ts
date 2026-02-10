import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  });

  app.post(api.orders.create.path, async (req, res) => {
    // En desarrollo sin autenticación, usar un ID de usuario por defecto
    const userId = req.isAuthenticated() 
      ? (req.user as any).claims.sub 
      : 'dev-user-' + Date.now();

    try {
        const input = api.orders.create.input.parse(req.body);
        const order = await storage.createOrder(userId, input.items);
        res.status(201).json(order);
    } catch (err) {
        if (err instanceof z.ZodError) {
             return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.orders.list.path, async (req, res) => {
      // En desarrollo sin autenticación, no mostrar órdenes
      if (!req.isAuthenticated()) {
          return res.json([]);
      }
      const userId = (req.user as any).claims.sub;
      const orders = await storage.getOrders(userId);
      res.json(orders);
  });

  // Seed Data
  if ((await storage.getProducts()).length === 0) {
      await storage.createProduct({
          name: "Red Velvet Delight",
          description: "Classic red velvet cake with cream cheese frosting.",
          price: "45.00",
          stock: 10,
          category: "Cakes",
          imageUrl: "https://images.unsplash.com/photo-1586788680434-30d3244363c3?w=800&q=80"
      });
      await storage.createProduct({
          name: "Chocolate Truffle",
          description: "Rich chocolate cake with dark chocolate ganache.",
          price: "50.00",
          stock: 15,
          category: "Cakes",
          imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80"
      });
      await storage.createProduct({
          name: "Lemon Tart",
          description: "Zesty lemon curd in a buttery pastry shell.",
          price: "25.00",
          stock: 20,
          category: "Tarts",
          imageUrl: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800&q=80"
      });
      await storage.createProduct({
          name: "Macaron Box",
          description: "Assorted box of 12 premium macarons.",
          price: "30.00",
          stock: 30,
          category: "Pastries",
          imageUrl: "https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=800&q=80"
      });
  }

  return httpServer;
}
