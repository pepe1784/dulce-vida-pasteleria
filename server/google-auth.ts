/**
 * Google OAuth 2.0 authentication for customers.
 *
 * Requires .env:
 *   GOOGLE_CLIENT_ID=...
 *   GOOGLE_CLIENT_SECRET=...
 *
 * Callback URL (add to Google Cloud Console → OAuth 2.0 Credentials):
 *   Development:  http://localhost:5000/api/auth/google/callback
 *   Production:   https://yourdomain.com/api/auth/google/callback
 */

import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile as GoogleProfile,
} from "passport-google-oauth20";
import type { Express } from "express";
import { storage, type CustomerProfile } from "./storage.js";

declare module "express-session" {
  interface SessionData {
    customer?: {
      googleId: string;
      email: string;
      name: string;
      picture?: string | null;
      phone?: string | null;
      preferredAddress?: string | null;
    };
  }
}

function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function setupGoogleAuth(app: Express) {
  if (!isGoogleConfigured()) {
    console.log("ℹ️  Google OAuth no configurado (sin GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Saltando.");

    // Provide stub endpoints so the client doesn't get 404s
    app.get("/api/auth/google", (_req, res) => {
      res.status(503).json({ message: "Google OAuth no configurado en el servidor." });
    });

    app.get("/api/auth/user", (req: any, res) => {
      if (req.session?.customer) return res.json(req.session.customer);
      return res.status(401).json({ message: "No autenticado" });
    });

    app.put("/api/auth/profile", async (req: any, res) => {
      if (!req.session?.customer) return res.status(401).json({ message: "No autenticado" });
      const { phone, preferredAddress, name } = req.body;
      const updated = await storage.updateCustomerProfile(req.session.customer.googleId, {
        phone: phone ?? undefined,
        preferredAddress: preferredAddress ?? undefined,
        name: name ?? undefined,
      });
      if (updated) {
        req.session.customer = {
          ...req.session.customer,
          phone: updated.phone ?? null,
          preferredAddress: updated.preferredAddress ?? null,
          name: updated.name,
        };
      }
      return res.json(req.session.customer);
    });

    app.get("/api/auth/orders", async (req: any, res) => {
      if (!req.session?.customer) return res.status(401).json({ message: "No autenticado" });
      const orders = await storage.getOrdersByGoogleId(req.session.customer.googleId);
      return res.json(orders);
    });

    app.post("/api/logout", (req: any, res) => {
      req.session.customer = undefined;
      res.json({ ok: true });
    });

    return;
  }

  // ── Configure Passport Google Strategy ──────────────────────────────────
  // Priority: BASE_URL env → RENDER_EXTERNAL_URL (set automatically by Render) → localhost
  const baseUrl =
    process.env.BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");

  const callbackURL = `${baseUrl}/api/auth/google/callback`;
  console.log(`🔑 Google OAuth callbackURL: ${callbackURL}`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL,
        scope: ["profile", "email"],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: GoogleProfile,
        done: (err: any, user?: CustomerProfile | false) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value ?? "";
          const name =
            profile.displayName ||
            `${profile.name?.givenName ?? ""} ${profile.name?.familyName ?? ""}`.trim() ||
            email;
          const picture = profile.photos?.[0]?.value ?? undefined;

          const customer = await storage.upsertCustomerProfile({
            googleId: profile.id,
            email,
            name,
            picture,
          });
          done(null, customer);
        } catch (err) {
          done(err, false);
        }
      }
    )
  );

  // Passport serialization (for passport session — we also use req.session.customer)
  passport.serializeUser((user: any, done) => done(null, user.googleId));
  passport.deserializeUser(async (googleId: string, done) => {
    try {
      const customer = await storage.getCustomerByGoogleId(googleId);
      done(null, customer ?? false);
    } catch (err) {
      done(err, false);
    }
  });

  // ── OAuth Routes ─────────────────────────────────────────────────────────

  /** Redirect to Google consent screen */
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    })
  );

  /** Google redirects here after consent */
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/?auth=error" }),
    async (req: any, res) => {
      const customer: CustomerProfile = req.user;
      // Store in session (simple, no passport session needed)
      req.session.customer = {
        googleId: customer.googleId,
        email: customer.email,
        name: customer.name,
        picture: customer.picture ?? null,
        phone: customer.phone ?? null,
        preferredAddress: customer.preferredAddress ?? null,
      };
      // Redirect to wherever they came from (stored in query before auth)
      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      res.redirect(returnTo);
    }
  );

  // ── API Endpoints ─────────────────────────────────────────────────────────

  /** Returns current customer or 401 */
  app.get("/api/auth/user", (req: any, res) => {
    if (req.session?.customer) return res.json(req.session.customer);
    return res.status(401).json({ message: "No autenticado" });
  });

  /** Update saved customer profile (phone, preferredAddress) */
  app.put("/api/auth/profile", async (req: any, res) => {
    if (!req.session?.customer) return res.status(401).json({ message: "No autenticado" });
    const { phone, preferredAddress, name } = req.body;
    const updated = await storage.updateCustomerProfile(req.session.customer.googleId, {
      phone: phone ?? undefined,
      preferredAddress: preferredAddress ?? undefined,
      name: name ?? undefined,
    });
    if (updated) {
      req.session.customer = {
        ...req.session.customer,
        phone: updated.phone ?? null,
        preferredAddress: updated.preferredAddress ?? null,
        name: updated.name,
      };
    }
    return res.json(req.session.customer);
  });

  /** Orders for the logged-in customer */
  app.get("/api/auth/orders", async (req: any, res) => {
    if (!req.session?.customer) return res.status(401).json({ message: "No autenticado" });
    const orders = await storage.getOrdersByGoogleId(req.session.customer.googleId);
    return res.json(orders);
  });

  /** Customer logout (also clears admin session if present) */
  app.post("/api/logout", (req: any, res) => {
    req.session.customer = undefined;
    res.json({ ok: true });
  });
}

/** Returns true if the request has an active customer session */
export function isCustomerAuthenticated(req: any): boolean {
  return !!req.session?.customer;
}
