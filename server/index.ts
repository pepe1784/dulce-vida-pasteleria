import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import MemoryStore from "memorystore";
import path from "path";
import { registerRoutes } from "./routes";
import { registerAdminRoutes } from "./admin";
import { setupGoogleAuth } from "./google-auth";
import { serveStatic } from "./static";
import { createServer } from "http";
import { dbReady, dbRef } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ── Security: Helmet ─────────────────────────────────────────────────
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"],
      formAction: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// Permissions-Policy (Helmet v8 doesn't expose it yet via typed API)
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

// ── Security: Rate Limiting ─────────────────────────────────────────
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: "Demasiadas solicitudes, intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Demasiados intentos, intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos de inicio de sesión. Intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api/admin/login", loginLimiter);

// ── Session + Passport se inicializan dentro del IIFE (después de dbReady)
// para poder usar connect-pg-simple con el pool de PostgreSQL.
const MStore = MemoryStore(session as any);

// ── Body Parsers (10mb limit for base64 image uploads) ──
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ── Serve uploaded images ──
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  dotfiles: "deny",
  index: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    await dbReady;
  } catch (e: any) {
    console.error("❌ Error fatal inicializando la base de datos:", e.message);
    process.exit(1);
  }

  // ── Configurar sesión con store persistente según el motor de BD ──
  const sessionSecret = process.env.SESSION_SECRET || "change-this-secret-in-production-!!!";
  if (!process.env.SESSION_SECRET) {
    console.warn("⚠️  SESSION_SECRET no configurado — usa una clave segura en producción!");
  }
  const cookieConfig = {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  const pgPool = (dbRef.db as any)?.$client;
  const isPgPool = pgPool && typeof pgPool.query === "function" && typeof pgPool.execute !== "function";

  if (isPgPool) {
    // Sesiones persistentes en PostgreSQL — sobreviven reinicios de Render
    const { default: connectPgSimple } = await import("connect-pg-simple");
    const PgStore = connectPgSimple(session);
    app.use(session({
      store: new (PgStore as any)({ pool: pgPool, createTableIfMissing: true }) as any,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: cookieConfig,
    }));
    console.log("✅ Sesiones configuradas con PostgreSQL (persistentes)");
  } else {
    // Sesiones en memoria para desarrollo local (SQLite)
    app.use(session({
      store: new MStore({ checkPeriod: 86400000 }) as any,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: cookieConfig,
    }));
    console.log("⚠️  Sesiones en memoria (desarrollo local)");
  }

  // ── Passport (después de session) ──
  app.use(passport.initialize());

  registerAdminRoutes(app);
  setupGoogleAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const isWindows = process.platform === "win32";
  const listenOptions: any = { port, host: "0.0.0.0" };
  if (!isWindows) listenOptions.reusePort = true;

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();

