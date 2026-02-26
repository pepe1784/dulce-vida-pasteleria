import type { Express, Request, Response, NextFunction } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

// ── Password Utilities ──
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}

// ── Auth Middleware ──
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.adminUserId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.adminUserId;
    if (!userId) return res.status(401).json({ message: "No autorizado" });
    const user = await storage.getAdminById(userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Sin permisos" });
    }
    (req as any).adminUser = user;
    next();
  };
}

// ── Register Admin Routes ──
export function registerAdminRoutes(app: Express) {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // ══════ AUTH ══════
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña requeridos" });
      }
      const user = await storage.getAdminByEmail(email);
      console.log(`🔐 Login attempt: email=${email}, userFound=${!!user}`);
      if (!user) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      const passwordValid = verifyPassword(password, user.passwordHash);
      console.log(`🔐 Password valid: ${passwordValid}`);
      if (!passwordValid) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      (req.session as any).adminUserId = user.id;
      (req.session as any).adminRole = user.role;
      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/me", requireAdmin, async (req: Request, res: Response) => {
    const user = await storage.getAdminById((req.session as any).adminUserId);
    if (!user) return res.status(401).json({ message: "Sesión inválida" });
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    return res.json({ ok: true });
  });

  // ══════ PRODUCTS CRUD ══════
  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    const allProducts = await storage.getProducts();
    return res.json(allProducts);
  });

  app.post("/api/admin/products", requireRole("admin", "editor"), async (req: Request, res: Response) => {
    try {
      const { name, description, price, stock, category, imageUrl } = req.body;
      const product = await storage.createProduct({
        name, description, price, stock: stock || 50, category, imageUrl
      });
      return res.json(product);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const adminUser = await storage.getAdminById((req.session as any).adminUserId);
      if (!adminUser) return res.status(401).json({ message: "No autorizado" });

      const updateData: any = {};

      // Employee: only image + price
      if (adminUser.role === "employee") {
        if (req.body.price !== undefined) updateData.price = req.body.price;
        if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
      }
      // Editor: image + price + text (name, description, category)
      else if (adminUser.role === "editor") {
        if (req.body.price !== undefined) updateData.price = req.body.price;
        if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.category !== undefined) updateData.category = req.body.category;
      }
      // Admin: everything
      else {
        const { name, description, price, stock, category, imageUrl } = req.body;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (stock !== undefined) updateData.stock = stock;
        if (category !== undefined) updateData.category = category;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      }

      const product = await storage.updateProduct(id, updateData);
      if (!product) return res.status(404).json({ message: "Producto no encontrado" });
      return res.json(product);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/products/:id", requireRole("admin"), async (req: Request, res: Response) => {
    const deleted = await storage.deleteProduct(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Producto no encontrado" });
    return res.json({ ok: true });
  });

  // ══════ IMAGE UPLOAD ══════
  app.post("/api/admin/upload", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { data, filename } = req.body;
      if (!data || !filename) {
        return res.status(400).json({ message: "Datos de imagen requeridos" });
      }
      // data is "data:image/...;base64,XXXXX"
      const base64Data = data.includes(",") ? data.split(",")[1] : data;
      const buffer = Buffer.from(base64Data, "base64");

      const ext = path.extname(filename) || ".jpg";
      const newFilename = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
      const filepath = path.join(uploadsDir, newFilename);
      fs.writeFileSync(filepath, buffer);

      return res.json({ url: `/uploads/${newFilename}` });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ══════ SETTINGS ══════
  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    const settings = await storage.getAllSettings();
    return res.json(settings);
  });

  app.put("/api/admin/settings", requireRole("admin", "editor"), async (req: Request, res: Response) => {
    try {
      const adminUser = await storage.getAdminById((req.session as any).adminUserId);
      if (!adminUser) return res.status(401).json({ message: "No autorizado" });

      const updates = req.body as Record<string, string>;

      // Editor can only change hours
      const editorAllowed = ["hours_weekdays", "hours_sunday", "hero_title", "hero_subtitle", "about_text"];
      for (const [key, value] of Object.entries(updates)) {
        if (adminUser.role === "editor" && !editorAllowed.includes(key)) continue;
        await storage.setSetting(key, value);
      }

      const settings = await storage.getAllSettings();
      return res.json(settings);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ══════ USER MANAGEMENT (admin only) ══════
  app.get("/api/admin/users", requireRole("admin"), async (_req, res) => {
    const users = await storage.getAllAdmins();
    return res.json(users.map(u => ({
      id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt
    })));
  });

  app.post("/api/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, contraseña y nombre requeridos" });
      }
      const existing = await storage.getAdminByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "El email ya está registrado" });
      }
      const user = await storage.createAdmin({
        email,
        passwordHash: hashPassword(password),
        name,
        role: role || "employee",
      });
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updateData: any = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.password) updateData.passwordHash = hashPassword(req.body.password);
      const user = await storage.updateAdmin(id, updateData);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    // Can't delete yourself
    if (id === (req.session as any).adminUserId) {
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
    }
    const deleted = await storage.deleteAdmin(id);
    if (!deleted) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.json({ ok: true });
  });
}
