import type { Express, Request, Response, NextFunction } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

// â”€â”€ Password Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const hashBuffer = Buffer.from(hash, "hex");
    const suppliedBuffer = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, suppliedBuffer);
  } catch {
    return false;
  }
}

// â”€â”€ Auth Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any)?.adminUserId) {
    return res.status(401).json({ message: "No autorizado" });
  }
  next();
}

// Roles hierarchy: owner > admin > editor > employee
const ROLE_LEVEL: Record<string, number> = {
  owner: 100,
  admin: 80,
  editor: 50,
  employee: 10,
};

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.adminUserId;
    if (!userId) return res.status(401).json({ message: "No autorizado" });
    const user = await storage.getAdminById(userId);
    if (!user) return res.status(401).json({ message: "SesiÃ³n invÃ¡lida" });
    const userLevel = ROLE_LEVEL[user.role] ?? 0;
    const requiredLevel = Math.min(...roles.map((r) => ROLE_LEVEL[r] ?? 999));
    if (userLevel < requiredLevel) {
      return res.status(403).json({ message: `Requiere rol: ${roles.join(" o ")}` });
    }
    (req as any).adminUser = user;
    next();
  };
}

// â”€â”€ Cloudinary / Local Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function uploadImage(base64Data: string, filename: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    try {
      // Use Cloudinary REST API directly (no SDK needed)
      const timestamp = Math.round(Date.now() / 1000);
      const crypto = await import("crypto");
      const sigString = `timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(sigString).digest("hex");

      const formData = new URLSearchParams();
      formData.append("file", base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);
      formData.append("signature", signature);
      formData.append("folder", "endulzarte");

      const fetch = (await import("node:http")).request; // use native http
      // Use the global fetch if available (Node 18+)
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const resp = await globalThis.fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });
      if (resp.ok) {
        const data = await resp.json() as any;
        return data.secure_url;
      }
    } catch (e) {
      console.warn("Cloudinary upload failed, falling back to local:", e);
    }
  }

  // Local fallback
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  const buffer = Buffer.from(base64, "base64");
  const ext = path.extname(filename) || ".jpg";
  const newFilename = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const filepath = path.join(uploadsDir, newFilename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${newFilename}`;
}

// â”€â”€ Sanitize string â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function sanitize(val: any): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, 1000);
}

// â”€â”€ Register Admin Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function registerAdminRoutes(app: Express) {

  // â•â•â•â•â•â• AUTH â•â•â•â•â•â•
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseÃ±a requeridos" });
      }
      const user = await storage.getAdminByEmail(sanitize(email));
      if (!user || !verifyPassword(String(password), user.passwordHash)) {
        // Generic message to prevent user enumeration
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      (req.session as any).adminUserId = user.id;
      (req.session as any).adminRole = user.role;
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/me", requireAdmin, async (req: Request, res: Response) => {
    const user = await storage.getAdminById((req.session as any).adminUserId);
    if (!user) return res.status(401).json({ message: "SesiÃ³n invÃ¡lida" });
    return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {});
    return res.json({ ok: true });
  });

  // â•â•â•â•â•â• PRODUCTS CRUD â•â•â•â•â•â•
  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    return res.json(await storage.getProducts());
  });

  app.post("/api/admin/products", requireRole("admin", "editor"), async (req: Request, res: Response) => {
    try {
      const { name, description, price, stock, category, imageUrl } = req.body;
      if (!name || !price || !category) {
        return res.status(400).json({ message: "Nombre, precio y categorÃ­a son requeridos" });
      }
      // Server-side price validation
      const numPrice = parseFloat(String(price));
      if (isNaN(numPrice) || numPrice < 0 || numPrice > 99999) {
        return res.status(400).json({ message: "Precio invÃ¡lido" });
      }
      const product = await storage.createProduct({
        name: sanitize(name),
        description: sanitize(description || ""),
        price: numPrice.toFixed(2),
        stock: Math.max(0, Math.min(9999, parseInt(stock) || 50)),
        category: sanitize(category),
        imageUrl: sanitize(imageUrl || ""),
      });
      return res.json(product);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const adminUser = (req as any).adminUser || await storage.getAdminById((req.session as any).adminUserId);
      if (!adminUser) return res.status(401).json({ message: "No autorizado" });

      const updateData: any = {};
      const body = req.body;

      // Server-side price validation for ALL roles
      if (body.price !== undefined) {
        const numPrice = parseFloat(String(body.price));
        if (isNaN(numPrice) || numPrice < 0 || numPrice > 99999) {
          return res.status(400).json({ message: "Precio invÃ¡lido" });
        }
        updateData.price = numPrice.toFixed(2);
      }

      const level = ROLE_LEVEL[adminUser.role] ?? 0;

      if (level >= ROLE_LEVEL.editor) {
        // editor+: can update text fields
        if (body.name !== undefined) updateData.name = sanitize(body.name);
        if (body.description !== undefined) updateData.description = sanitize(body.description);
        if (body.category !== undefined) updateData.category = sanitize(body.category);
        if (body.imageUrl !== undefined) updateData.imageUrl = sanitize(body.imageUrl);
      } else {
        // employee: only image + price
        if (body.imageUrl !== undefined) updateData.imageUrl = sanitize(body.imageUrl);
      }

      if (level >= ROLE_LEVEL.admin) {
        if (body.stock !== undefined) {
          updateData.stock = Math.max(0, Math.min(9999, parseInt(body.stock) || 0));
        }
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

  // â•â•â•â•â•â• CATEGORIES â•â•â•â•â•â•
  app.get("/api/admin/categories", requireAdmin, async (_req, res) => {
    return res.json(await storage.getCategories());
  });

  app.put("/api/admin/categories/rename", requireRole("admin", "editor"), async (req: Request, res: Response) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) return res.status(400).json({ message: "oldName y newName requeridos" });
      await storage.renameCategory(sanitize(oldName), sanitize(newName));
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/categories/:name", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const name = decodeURIComponent(String(req.params.name));
      const { reassignTo } = req.body;
      await storage.deleteCategory(name, reassignTo ? sanitize(reassignTo) : undefined);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• IMAGE UPLOAD â•â•â•â•â•â•
  app.post("/api/admin/upload", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { data, filename } = req.body;
      if (!data || !filename) {
        return res.status(400).json({ message: "Datos de imagen requeridos" });
      }
      // Security: only allow image MIME types
      if (!String(data).startsWith("data:image/")) {
        return res.status(400).json({ message: "Solo se permiten imágenes (JPEG, PNG, WebP, GIF)" });
      }
      // Security: limit file size (~5 MB as base64 ≈ 6.8 MB string)
      if (String(data).length > 7_000_000) {
        return res.status(413).json({ message: "Imagen demasiado grande (máximo 5 MB)" });
      }
      const url = await uploadImage(data, String(filename));
      return res.json({ url });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• SETTINGS â•â•â•â•â•â•
  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    return res.json(await storage.getAllSettings());
  });

  app.put("/api/admin/settings", requireRole("admin", "editor"), async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser || await storage.getAdminById((req.session as any).adminUserId);
      if (!adminUser) return res.status(401).json({ message: "No autorizado" });

      const updates = req.body as Record<string, string>;
      const editorAllowed = ["hours_weekdays", "hours_sunday", "hero_title", "hero_subtitle", "about_text"];
      const level = ROLE_LEVEL[adminUser.role] ?? 0;

      for (const [key, value] of Object.entries(updates)) {
        if (level < ROLE_LEVEL.admin && !editorAllowed.includes(key)) continue;
        await storage.setSetting(sanitize(key), sanitize(String(value)));
      }

      return res.json(await storage.getAllSettings());
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• ORDERS â•â•â•â•â•â•
  app.get("/api/admin/orders", requireAdmin, async (_req, res) => {
    return res.json(await storage.getOrders());
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req: Request, res: Response) => {
    const order = await storage.getOrderWithItems(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
    return res.json(order);
  });

  app.put("/api/admin/orders/:id/status", requireRole("admin", "editor", "employee"), async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Estado invÃ¡lido" });
      }
      const order = await storage.updateOrderStatus(Number(req.params.id), status);
      if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
      return res.json(order);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• TICKET â•â•â•â•â•â•
  app.get("/api/admin/orders/:id/ticket", requireAdmin, async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrderWithItems(Number(req.params.id));
      if (!order) return res.status(404).json({ message: "Pedido no encontrado" });

      const settings = await storage.getAllSettings();
      const location = settings.location_text || "Colima, Colima, M\u00e9xico";
      const phone = settings.phone || "312 301 1075";

      const createdAt = order.createdAt
        ? new Date(order.createdAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
        : new Date().toLocaleString("es-MX");

      const itemsHtml = (order.items || []).map((item: any) => `
        <tr>
          <td>${item.productName || "Producto"}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">$${Number(item.price).toFixed(2)}</td>
          <td style="text-align:right">$${(Number(item.price) * item.quantity).toFixed(2)}</td>
        </tr>
      `).join("");

      const deliveryAddr = order.deliveryAddress
        ? (() => { try { const a = JSON.parse(order.deliveryAddress!); return [a.colonia, a.calle, a.numero, a.referencias].filter(Boolean).join(", "); } catch { return order.deliveryAddress!; } })()
        : "";

      const paymentLabel: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia bancaria", card: "Tarjeta" };

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket ${order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 13px; color: #1a1a1a; background: #f5f5f5; }
    .page { display: flex; align-items: flex-start; justify-content: center; min-height: 100vh; padding: 24px 12px; }
    .ticket { background: #fff; max-width: 360px; width: 100%; padding: 24px 20px; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
    .header { text-align: center; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 2px dashed #ddd; }
    .header h1 { font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #111; }
    .header .sub { font-size: 11px; color: #888; margin-top: 3px; line-height: 1.5; }
    .divider { border: none; border-top: 1px dashed #ddd; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; gap: 8px; }
    .row .lbl { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    .row .val { font-size: 12px; text-align: right; }
    .badge { display: inline-block; padding: 1px 8px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-confirmed { background: #d1fae5; color: #065f46; }
    .badge-cancelled { background: #fee2e2; color: #991b1b; }
    .badge-ready { background: #dbeafe; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; border-bottom: 1px solid #eee; padding: 4px 2px; }
    tbody td { padding: 5px 2px; font-size: 12px; vertical-align: top; border-bottom: 1px dotted #eee; }
    tbody tr:last-child td { border-bottom: none; }
    .totals { margin-top: 10px; }
    .totals .row { margin-bottom: 4px; }
    .totals .row .lbl { color: #555; font-size: 12px; text-transform: none; }
    .totals .grand { font-size: 16px; font-weight: 900; border-top: 2px solid #111; padding-top: 6px; margin-top: 4px; }
    .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 16px; line-height: 1.7; }
    .footer strong { color: #666; }
    .print-btn { text-align: center; margin-top: 20px; }
    .print-btn button {
      padding: 11px 28px; background: #e11d48; color: white; border: none;
      border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;
      letter-spacing: 0.5px;
    }
    .print-btn button:hover { background: #be123c; }
    @media print {
      body { background: white; }
      .page { padding: 0; }
      .ticket { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">
<div class="ticket">

  <div class="header">
    <h1>ENDULZARTE</h1>
    <div class="sub">
      Poster&iacute;a &amp; Roll &middot; ${location}<br>
      Tel: ${phone}
    </div>
  </div>

  <div class="row">
    <span class="lbl">Pedido #</span>
    <strong class="val">${order.orderNumber}</strong>
  </div>
  <div class="row">
    <span class="lbl">Fecha</span>
    <span class="val">${createdAt}</span>
  </div>
  <div class="row">
    <span class="lbl">Estado</span>
    <span class="badge badge-${order.status}">${
      order.status === "pending" ? "Pendiente" :
      order.status === "confirmed" ? "Confirmado" :
      order.status === "ready" ? "Listo" :
      order.status === "cancelled" ? "Cancelado" :
      order.status.toUpperCase()
    }</span>
  </div>
  <div class="row">
    <span class="lbl">Tipo</span>
    <span class="val">${order.orderType === "delivery" ? "A domicilio" : "Para recoger"}</span>
  </div>
  <div class="row">
    <span class="lbl">Pago</span>
    <span class="val">${paymentLabel[order.paymentMethod] || order.paymentMethod}</span>
  </div>

  <hr class="divider">

  <div class="row">
    <span class="lbl">Cliente</span>
    <span class="val" style="font-weight:bold">${order.customerName}</span>
  </div>
  <div class="row">
    <span class="lbl">Tel&eacute;fono</span>
    <span class="val">${order.customerPhone}</span>
  </div>
  ${deliveryAddr ? `<div class="row"><span class="lbl">Direcci&oacute;n</span><span class="val" style="max-width:200px">${deliveryAddr}</span></div>` : ""}
  ${order.cashAmount ? `<div class="row"><span class="lbl">Paga con</span><span class="val">$${order.cashAmount}</span></div>` : ""}

  <hr class="divider">

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th style="text-align:center">Cant</th>
        <th style="text-align:right">P/U</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span class="lbl">Subtotal</span>
      <span>$${Number(order.subtotal || order.total).toFixed(2)}</span>
    </div>
    ${order.deliveryCost && Number(order.deliveryCost) > 0
      ? `<div class="row"><span class="lbl">Env&iacute;o</span><span>$${Number(order.deliveryCost).toFixed(2)}</span></div>`
      : `<div class="row"><span class="lbl">Env&iacute;o</span><span>$0.00</span></div>`}
    <div class="row grand">
      <span>TOTAL</span>
      <span>$${Number(order.total).toFixed(2)}</span>
    </div>
  </div>

  ${order.notes ? `<hr class="divider"><div style="font-size:11px;color:#666"><strong>Nota:</strong> ${order.notes}</div>` : ""}

  <div class="footer">
    <strong>&iexcl;Gracias por tu pedido!</strong><br>
    Endulzarte &middot; Poster&iacute;a &amp; Roll
  </div>

  <div class="print-btn no-print">
    <button id="printBtn">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:6px"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimir Ticket
    </button>
  </div>

</div>
</div>
<script>document.getElementById('printBtn').addEventListener('click',function(){window.print();});</script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• DASHBOARD â•â•â•â•â•â•
  app.get("/api/admin/dashboard", requireRole("owner", "admin"), async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      return res.json(stats);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // â•â•â•â•â•â• USER MANAGEMENT â•â•â•â•â•â•
  app.get("/api/admin/users", requireRole("owner", "admin"), async (_req, res) => {
    const users = await storage.getAllAdmins();
    return res.json(users.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })));
  });

  app.post("/api/admin/users", requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const requestingUser = (req as any).adminUser || await storage.getAdminById((req.session as any).adminUserId);
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, contraseÃ±a y nombre requeridos" });
      }
      // Only owner can create admin+ roles
      const requestingLevel = ROLE_LEVEL[requestingUser?.role ?? ""] ?? 0;
      const targetLevel = ROLE_LEVEL[role ?? "employee"] ?? 0;
      if (targetLevel >= requestingLevel && requestingUser?.role !== "owner") {
        return res.status(403).json({ message: "No puedes crear un usuario con rol igual o superior al tuyo" });
      }
      const existing = await storage.getAdminByEmail(sanitize(email));
      if (existing) return res.status(409).json({ message: "El email ya estÃ¡ registrado" });
      const user = await storage.createAdmin({
        email: sanitize(email),
        passwordHash: hashPassword(String(password)),
        name: sanitize(name),
        role: sanitize(role) || "employee",
      });
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/users/:id", requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const requestingUser = (req as any).adminUser || await storage.getAdminById((req.session as any).adminUserId);
      const targetUser = await storage.getAdminById(id);
      if (!targetUser) return res.status(404).json({ message: "Usuario no encontrado" });

      // Owner can do everything; admin can only manage editors/employees
      const requestingLevel = ROLE_LEVEL[requestingUser?.role ?? ""] ?? 0;
      const targetLevel = ROLE_LEVEL[targetUser.role] ?? 0;
      if (targetLevel >= requestingLevel && requestingUser?.role !== "owner") {
        return res.status(403).json({ message: "No puedes modificar un usuario con rol igual o superior" });
      }

      const updateData: any = {};
      if (req.body.name) updateData.name = sanitize(req.body.name);
      if (req.body.email) updateData.email = sanitize(req.body.email);
      if (req.body.role) {
        const newLevel = ROLE_LEVEL[req.body.role] ?? 0;
        if (newLevel >= requestingLevel && requestingUser?.role !== "owner") {
          return res.status(403).json({ message: "No puedes asignar un rol igual o superior al tuyo" });
        }
        updateData.role = sanitize(req.body.role);
      }
      if (req.body.password) updateData.passwordHash = hashPassword(String(req.body.password));

      const user = await storage.updateAdmin(id, updateData);
      if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/users/:id", requireRole("owner", "admin"), async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const requestingUser = (req as any).adminUser || await storage.getAdminById((req.session as any).adminUserId);
      if (id === (req.session as any).adminUserId) {
        return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
      }
      const targetUser = await storage.getAdminById(id);
      if (!targetUser) return res.status(404).json({ message: "Usuario no encontrado" });

      const requestingLevel = ROLE_LEVEL[requestingUser?.role ?? ""] ?? 0;
      const targetLevel = ROLE_LEVEL[targetUser.role] ?? 0;
      if (targetLevel >= requestingLevel && requestingUser?.role !== "owner") {
        return res.status(403).json({ message: "No puedes eliminar un usuario con rol igual o superior" });
      }

      const deleted = await storage.deleteAdmin(id);
      if (!deleted) return res.status(404).json({ message: "Usuario no encontrado" });
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });
}
