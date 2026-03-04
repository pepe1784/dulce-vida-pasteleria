/**
 * Server-Sent Events (SSE) broadcast module.
 *
 * Two channels:
 *  - admin:   all admin users (new orders, status updates)
 *  - kitchen: employees/cooks (confirmed/preparing/ready orders only)
 *
 * Usage:
 *   import { addAdminClient, addKitchenClient, broadcast } from "./sse";
 */

import type { Response } from "express";

// ── Client registries ─────────────────────────────────────────────────────
const adminClients = new Set<Response>();
const kitchenClients = new Set<Response>();

function _send(clients: Set<Response>, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of [...clients]) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// ── Register a client ─────────────────────────────────────────────────────
export function addAdminClient(res: Response) {
  adminClients.add(res);
  res.on("close", () => adminClients.delete(res));
}

export function addKitchenClient(res: Response) {
  kitchenClients.add(res);
  res.on("close", () => kitchenClients.delete(res));
}

// ── Broadcast helpers ─────────────────────────────────────────────────────

/** Broadcast a new order to admin channel */
export function broadcastNewOrder(order: unknown) {
  _send(adminClients, "new_order", order);
}

/** Broadcast an order status change to admin + kitchen (if relevant status) */
export function broadcastOrderUpdate(orderId: number, status: string, orderData: unknown) {
  _send(adminClients, "order_update", { orderId, status, order: orderData });
  // Kitchen only cares about active statuses
  if (["confirmed", "preparing", "ready"].includes(status)) {
    _send(kitchenClients, "order_update", { orderId, status, order: orderData });
  }
  // When delivered/cancelled, send removal signal to kitchen
  if (["delivered", "cancelled"].includes(status)) {
    _send(kitchenClients, "order_remove", { orderId, status });
  }
}

/** Heartbeat — call periodically to keep connections alive through proxies */
export function heartbeat() {
  const ping = `event: ping\ndata: ${Date.now()}\n\n`;
  for (const res of [...adminClients]) {
    try { res.write(ping); } catch { adminClients.delete(res); }
  }
  for (const res of [...kitchenClients]) {
    try { res.write(ping); } catch { kitchenClients.delete(res); }
  }
}

// Auto-heartbeat every 25 seconds
setInterval(heartbeat, 25_000);
