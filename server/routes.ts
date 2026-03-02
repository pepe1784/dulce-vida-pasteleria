import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import type { InsertOrderItem } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  // ── API pública de configuración del sitio ──
  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getAllSettings();
    res.json(settings);
  });

  // ── Categorías públicas ──
  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  // ── Variantes públicas ──
  app.get("/api/products/:id/variants", async (req, res) => {
    const variants = await storage.getVariants(Number(req.params.id));
    res.json(variants);
  });

  // ── Variantes batch (múltiples productos) ──
  app.post("/api/products/variants-batch", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array required" });
    const result = await storage.getVariantsBatch(ids.map(Number));
    res.json(result);
  });

  // ── Crear pedido público (desde checkout) ──
  app.post("/api/orders", async (req, res) => {
    try {
      const { customerName, customerPhone, orderType, paymentMethod, cashAmount, deliveryAddress, items, notes } = req.body;

      if (!customerName || !customerPhone || !orderType || !paymentMethod || !items?.length) {
        return res.status(400).json({ message: "Datos del pedido incompletos" });
      }

      // Validate and resolve prices from DB (never trust client prices)
      const resolvedItems: Array<InsertOrderItem & { variantId?: number | null }> = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await storage.getProduct(Number(item.productId));
        if (!product) {
          return res.status(400).json({ message: `Producto #${item.productId} no encontrado` });
        }
        const qty = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));

        // Resolve price & stock from variant if provided
        let price: number;
        let variantLabel: string | null = null;
        if (item.variantId) {
          const variant = await storage.getVariant(Number(item.variantId));
          if (!variant || variant.productId !== product.id) {
            return res.status(400).json({ message: `Variante no válida para "${product.name}"` });
          }
          if (variant.stock < qty) {
            return res.status(400).json({
              message: `Stock insuficiente para "${product.name} — ${variant.label}". Disponible: ${variant.stock}.`,
            });
          }
          price = parseFloat(String(variant.price));
          variantLabel = variant.label;
          // Decrement variant stock later
        } else {
          // Stock validation — can't order more than available
          if (product.stock < qty) {
            return res.status(400).json({
              message: `Stock insuficiente para "${product.name}". Disponible: ${product.stock} unidad${product.stock !== 1 ? "es" : ""}.`,
            });
          }
          price = parseFloat(String(product.price));
        }

        subtotal += price * qty;
        resolvedItems.push({
          productId: product.id,
          quantity: qty,
          price: price.toFixed(2),
          productName: product.name,
          variantLabel,
          variantId: item.variantId ? Number(item.variantId) : null,
          itemComment: item.comment ? String(item.comment).slice(0, 300) : null,
        });
      }

      const deliveryCost = orderType === "delivery" ? null : "0.00";
      const total = (subtotal + (deliveryCost ? parseFloat(deliveryCost) : 0)).toFixed(2);

      const order = await storage.createOrder(
        {
          customerName: String(customerName).trim().slice(0, 200),
          customerPhone: String(customerPhone).trim().slice(0, 25),
          orderType: orderType === "delivery" ? "delivery" : "pickup",
          paymentMethod: ["cash", "transfer", "card"].includes(paymentMethod) ? paymentMethod : "cash",
          cashAmount: cashAmount ? String(cashAmount).slice(0, 20) : null,
          deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
          subtotal: subtotal.toFixed(2),
          deliveryCost,
          total,
          notes: notes ? String(notes).slice(0, 500) : null,
          status: "pending",
          customerGoogleId: (req as any).session?.customer?.googleId ?? null,
        },
        resolvedItems
      );

      // Decrement stock for each item
      for (const ri of resolvedItems) {
        if ((ri as any).variantId) {
          // Decrement variant stock
          const v = await storage.getVariant((ri as any).variantId);
          if (v) await storage.updateVariant(v.id, { stock: Math.max(0, v.stock - ri.quantity) });
        } else {
          const current = await storage.getProduct(ri.productId);
          if (current) {
            await storage.updateProduct(ri.productId, { stock: Math.max(0, current.stock - ri.quantity) });
          }
        }
      }

      return res.status(201).json(order);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // ── Cancelar pedido pendiente (cuando el usuario NO confirma en WhatsApp) ──
  app.delete("/api/orders/:id/cancel", async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      if (!orderId) return res.status(400).json({ message: "ID inválido" });
      const order = await storage.getOrderWithItems(orderId);
      if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
      if (order.status !== "pending") return res.status(400).json({ message: "Solo se puede cancelar un pedido pendiente" });
      // Restore stock
      if (order.items) {
        for (const item of order.items) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            await storage.updateProduct(item.productId, { stock: product.stock + item.quantity });
          }
        }
      }
      await storage.updateOrderStatus(orderId, "cancelled");
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  });

  // Seed Data - Menú real de Endulzarte Postrería & Roll
  if ((await storage.getProducts()).length === 0) {
    const seedProducts = [
      // ═══ POSTRES GRANDES ═══
      {
        name: "Rol Gigante Clásico",
        description: "Rol de canela gigante clásico glaseado. Rinde de 6 a 8 porciones.",
        price: "380.00",
        stock: 10,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1509365390695-33aee754301f?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Rol Gigante Especial",
        description: "Rol de canela gigante de especialidad con toppings premium. Rinde de 6 a 8 porciones.",
        price: "430.00",
        stock: 10,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1583338917451-face2751d8d5?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pastel Trufa",
        description: "Delicioso pastel de chocolate trufa. Chico (6-8 porciones) $410 / Grande (10-12 porciones) $590.",
        price: "410.00",
        stock: 8,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pastel Red Velvet",
        description: "Pastel red velvet con betún de queso crema. Chico (6-8 porciones) $410 / Grande (10-12 porciones) $590.",
        price: "410.00",
        stock: 8,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pay de Queso con Mermelada",
        description: "Pay de queso con mermelada de frutos rojos. Rinde de 10 a 12 porciones.",
        price: "499.00",
        stock: 6,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pastel de Zanahoria",
        description: "Pastel de zanahoria con betún de queso crema. Chico (6-8 porciones) $370 / Grande (10-12 porciones) $540.",
        price: "370.00",
        stock: 8,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pastel 3 Leches",
        description: "Pastel tres leches con opción de frutas o cajeta con nuez. Rinde de 8 a 10 porciones.",
        price: "400.00",
        stock: 10,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Tarta Familiar",
        description: "Tarta casera para compartir en familia. Rinde de 6 a 8 porciones.",
        price: "495.00",
        stock: 6,
        category: "Postres Grandes",
        imageUrl: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&q=80&w=800"
      },

      // ═══ POSTRES INDIVIDUALES ═══
      {
        name: "Rebanada Trufa",
        description: "Rebanada o cuchareable de pastel trufa. Con frutos $80 / Sin frutos $75.",
        price: "75.00",
        stock: 20,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Rebanada Red Velvet",
        description: "Rebanada o cuchareable de red velvet. Con frutos $80 / Sin frutos $75.",
        price: "75.00",
        stock: 20,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Rebanada Zanahoria",
        description: "Rebanada de pastel de zanahoria con betún de queso crema.",
        price: "75.00",
        stock: 20,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pastel 3 Leches Individual",
        description: "Porción individual de pastel tres leches. Cajeta con nuez o frutas.",
        price: "75.00",
        stock: 20,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Pay de Queso Individual",
        description: "Rebanada de pay de queso con mermelada de frutos.",
        price: "55.00",
        stock: 20,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1524351199432-d330df18e1cd?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Tarta Vasca",
        description: "Tarta vasca individual, cremosa y horneada al estilo tradicional.",
        price: "80.00",
        stock: 15,
        category: "Postres Individuales",
        imageUrl: "https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&q=80&w=800"
      },

      // ═══ CAJAS DE ROLES ═══
      {
        name: "Caja Clásica",
        description: "6 roles chicos clásicos glaseados.",
        price: "255.00",
        stock: 15,
        category: "Cajas de Roles",
        imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Caja Endulzarte",
        description: "3 roles chicos clásicos + 3 roles chicos especiales.",
        price: "270.00",
        stock: 15,
        category: "Cajas de Roles",
        imageUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Caja Rolberto",
        description: "6 roles chicos de especialidad.",
        price: "285.00",
        stock: 15,
        category: "Cajas de Roles",
        imageUrl: "https://images.unsplash.com/photo-1605466153449-f9b7c3213a03?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Caja de 4 Roles",
        description: "4 roles grandes de especialidad.",
        price: "305.00",
        stock: 15,
        category: "Cajas de Roles",
        imageUrl: "https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Caja de 9 Roles",
        description: "9 roles chicos de especialidad.",
        price: "430.00",
        stock: 15,
        category: "Cajas de Roles",
        imageUrl: "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=800"
      },

      // ═══ BEBIDAS CALIENTES ═══
      {
        name: "Americano",
        description: "Café americano caliente, preparado con granos selectos.",
        price: "45.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Latte",
        description: "Café latte caliente con leche vaporizada.",
        price: "55.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Capuccino",
        description: "Capuccino caliente con espuma de leche cremosa.",
        price: "55.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Matcha Caliente",
        description: "Bebida caliente de matcha premium con leche.",
        price: "55.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Chocolate Caliente",
        description: "Chocolate caliente cremoso, perfecto para acompañar tu postre.",
        price: "55.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Chai",
        description: "Té chai caliente con especias y leche vaporizada.",
        price: "55.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Dirty Chai Caliente",
        description: "Chai con shot de espresso, caliente.",
        price: "70.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1504630083234-14187a9a0f3c?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Dirty Taro Caliente",
        description: "Bebida de taro con shot de espresso, caliente.",
        price: "70.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1625865636422-5cc93f42e5db?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Moka Caliente",
        description: "Café moka caliente con chocolate y leche.",
        price: "60.00",
        stock: 50,
        category: "Bebidas Calientes",
        imageUrl: "https://images.unsplash.com/photo-1485808191679-5f86510681a1?auto=format&fit=crop&q=80&w=800"
      },

      // ═══ LATTE EN LAS ROCAS ═══
      {
        name: "Latte Clásico Frío",
        description: "Latte clásico en las rocas con hielo.",
        price: "60.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Latte Caramel",
        description: "Latte frío con jarabe de caramelo.",
        price: "65.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1553909489-ec2175ef3f55?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Dirty Taro Frío",
        description: "Bebida de taro fría con shot de espresso y hielo.",
        price: "70.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Dirty Chai Frío",
        description: "Chai frío con shot de espresso y hielo.",
        price: "70.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Latte Vainilla",
        description: "Latte frío con jarabe de vainilla y hielo.",
        price: "65.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Nutellate",
        description: "Latte frío de Nutella con hielo, cremoso y dulce.",
        price: "70.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1530373239216-42518e6b4a3f?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Moka Frío",
        description: "Café moka frío con chocolate, leche y hielo.",
        price: "70.00",
        stock: 50,
        category: "Lattes Fríos",
        imageUrl: "https://images.unsplash.com/photo-1592663527359-cf6642f54cff?auto=format&fit=crop&q=80&w=800"
      },

      // ═══ BEBIDAS FRÍAS SIN CAFÉ ═══
      {
        name: "Matcha Fría",
        description: "Matcha fría con leche y hielo. Sin cafeína de café.",
        price: "65.00",
        stock: 50,
        category: "Bebidas Frías",
        imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Chai Frío",
        description: "Té chai frío con especias, leche y hielo. Sin café.",
        price: "65.00",
        stock: 50,
        category: "Bebidas Frías",
        imageUrl: "https://images.unsplash.com/photo-1499961524705-2a4a8af5b2f6?auto=format&fit=crop&q=80&w=800"
      },
      {
        name: "Taro Frío",
        description: "Bebida de taro fría con leche y hielo. Sin cafeína.",
        price: "65.00",
        stock: 50,
        category: "Bebidas Frías",
        imageUrl: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&q=80&w=800"
      },
    ];

    for (const product of seedProducts) {
      await storage.createProduct(product);
    }
  }

  // Seed de configuración del sitio
  const existingSettings = await storage.getAllSettings();
  if (Object.keys(existingSettings).length === 0) {
    const defaultSettings: Record<string, string> = {
      whatsapp: "+5213123011075",
      instagram: "https://www.instagram.com/endulza.arte",
      facebook: "https://www.facebook.com/Endulzartepostrescaseros/",
      google_maps: "https://www.google.com/maps/search/Endulzarte+Postreria+Colima",
      location_text: "Colima, Colima, México",
      contact_email: "endulzarte.colima@gmail.com",
      phone: "312 301 1075",
      hours_weekdays: "Lun - Sáb: 10:00 AM - 8:30 PM",
      hours_sunday: "Dom: 12:30 PM - 7:00 PM",
      hero_title: "Endulzarte",
      hero_subtitle: "Postrería & Roll",
      about_text: "Somos una postrería artesanal en Colima dedicada a crear momentos dulces e inolvidables. Cada uno de nuestros productos está hecho con ingredientes de la más alta calidad y mucho amor.",
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
      await storage.setSetting(key, value);
    }
  }

  // Seed administrador por defecto — SIEMPRE sincroniza contraseña con env var
  const defaultAdminEmail = process.env.ADMIN_EMAIL || "admin@endulzarte.com";
  const defaultAdminPass = process.env.ADMIN_PASSWORD || "admin123";
  console.log(`🔐 Admin seed: email=${defaultAdminEmail}, passLength=${defaultAdminPass.length}`);
  
  const { scryptSync, randomBytes } = await import("crypto");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(defaultAdminPass, salt, 64).toString("hex");
  const passwordHash = `${salt}:${hash}`;
  
  const adminExists = await storage.getAdminByEmail(defaultAdminEmail);
  if (!adminExists) {
    await storage.createAdmin({
      email: defaultAdminEmail,
      passwordHash,
      name: "Administrador",
      role: "admin",
    });
    console.log(`✅ Admin creado: ${defaultAdminEmail}`);
  } else {
    // Siempre actualizar la contraseña para que coincida con el env var
    await storage.updateAdmin(adminExists.id, { passwordHash });
    console.log(`🔄 Admin password actualizado: ${defaultAdminEmail}`);
  }

  // Seed owner account
  const ownerEmail = process.env.OWNER_EMAIL || "faguilar@ucol.mx";
  const ownerName = process.env.OWNER_NAME || "Dueño";
  const ownerPassword = process.env.OWNER_PASSWORD || "owner123";
  const ownerSalt = randomBytes(16).toString("hex");
  const ownerHash = scryptSync(ownerPassword, ownerSalt, 64).toString("hex");
  const ownerPasswordHash = `${ownerSalt}:${ownerHash}`;

  const ownerExists = await storage.getAdminByEmail(ownerEmail);
  if (!ownerExists) {
    await storage.createAdmin({
      email: ownerEmail,
      passwordHash: ownerPasswordHash,
      name: ownerName,
      role: "owner",
    });
    console.log(`✅ Owner creado: ${ownerEmail}`);
  } else {
    // Siempre sincronizar contraseña y role del owner con las variables de entorno
    await storage.updateAdmin(ownerExists.id, { role: "owner", passwordHash: ownerPasswordHash });
    console.log(`🔄 Owner password/role sincronizado: ${ownerEmail}`);
  }

  return httpServer;
}
