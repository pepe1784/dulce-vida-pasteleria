import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Loader2, Clock, CheckCircle, ChefHat, Package, Truck, XCircle, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Status pipeline ───────────────────────────────────────────────────────────
const PIPELINE = [
  { status: "pending",   label: "Recibido",    icon: Clock,        color: "text-yellow-600",  bg: "bg-yellow-100" },
  { status: "confirmed", label: "Confirmado",  icon: CheckCircle,  color: "text-blue-600",    bg: "bg-blue-100" },
  { status: "preparing", label: "Preparando",  icon: ChefHat,      color: "text-orange-600",  bg: "bg-orange-100" },
  { status: "ready",     label: "Listo",       icon: Package,      color: "text-green-600",   bg: "bg-green-100" },
  { status: "delivered", label: "Entregado",   icon: Truck,        color: "text-purple-600",  bg: "bg-purple-100" },
];

const STATUS_MESSAGES: Record<string, string> = {
  pending:   "Tu pedido fue recibido y está esperando confirmación.",
  confirmed: "¡Tu pedido fue confirmado! Pronto comenzará su preparación.",
  preparing: "¡Tu pedido está siendo preparado con mucho amor! 🎂",
  ready:     "¡Tu pedido está listo! Puedes pasar a recogerlo.",
  delivered: "¡Tu pedido fue entregado! Esperamos que lo disfrutes.",
  cancelled: "Este pedido fue cancelado.",
};

// ── Parse date ────────────────────────────────────────────────────────────────
function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (typeof raw === "number") return new Date(raw > 1e10 ? raw : raw * 1000);
  const n = Number(raw);
  if (!isNaN(n) && String(raw).length <= 13) return new Date(n > 1e10 ? n : n * 1000);
  return new Date(raw);
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchOrderStatus(ref: string) {
  const res = await fetch(`/api/orders/status/${encodeURIComponent(ref.trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Error al consultar el pedido");
  return res.json();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function OrderStatus() {
  const { orderRef } = useParams<{ orderRef?: string }>();
  const [searchInput, setSearchInput] = useState(orderRef ?? "");
  const [activeRef, setActiveRef] = useState(orderRef ?? "");

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/orders/status", activeRef],
    queryFn: () => fetchOrderStatus(activeRef),
    enabled: !!activeRef,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) setActiveRef(searchInput.trim());
  };

  const currentStepIdx = order
    ? PIPELINE.findIndex(s => s.status === order.status)
    : -1;

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navigation />

      <div className="container-custom pt-32 max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display mb-2">Estado de tu Pedido</h1>
          <p className="text-muted-foreground">Introduce tu número de pedido para ver el estado actual.</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-10">
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Ej: EP-260301-001"
            className="h-12 text-base font-mono"
          />
          <Button type="submit" className="btn-primary h-12 px-6" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {/* Not found */}
        {!isLoading && activeRef && order === null && (
          <div className="bg-white rounded-2xl p-10 text-center border shadow-sm">
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display mb-2">Pedido no encontrado</h2>
            <p className="text-muted-foreground text-sm">El número <span className="font-mono font-bold">{activeRef}</span> no existe en nuestro sistema.</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-200">
            <p className="text-red-700">{(error as Error).message}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>Reintentar</Button>
          </div>
        )}

        {/* Order found */}
        {order && !isLoading && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Order header */}
            <div className="px-6 py-5 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Número de pedido</p>
                <p className="font-mono font-bold text-xl">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-bold text-lg">${Number(order.total).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="text-sm">{format(parseDate(order.createdAt), "d MMM yyyy, HH:mm", { locale: es })}</p>
              </div>
            </div>

            {/* Status message */}
            <div className="px-6 py-5 bg-primary/5 border-b">
              <p className="font-semibold text-center text-lg text-foreground">
                {STATUS_MESSAGES[order.status] ?? `Estado: ${order.status}`}
              </p>
            </div>

            {/* Pipeline — only show if not cancelled */}
            {order.status !== "cancelled" && (
              <div className="px-6 py-6">
                <div className="flex items-center justify-between relative">
                  {/* Connecting line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted-foreground/20 z-0" />
                  <div
                    className="absolute top-5 left-5 h-0.5 bg-primary z-0 transition-all duration-700"
                    style={{ width: currentStepIdx >= 0 ? `${(currentStepIdx / (PIPELINE.length - 1)) * 100}%` : "0%" }}
                  />
                  {PIPELINE.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={step.status} className="flex flex-col items-center gap-1 z-10 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                          ${done ? `${step.bg} border-primary ${active ? "ring-2 ring-primary/30 ring-offset-2 scale-110" : ""}` : "bg-white border-muted-foreground/30"}`}>
                          <Icon className={`w-5 h-5 ${done ? step.color : "text-muted-foreground/40"}`} />
                        </div>
                        <span className={`text-xs text-center font-medium leading-tight max-w-[60px] ${done ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled state */}
            {order.status === "cancelled" && (
              <div className="px-6 py-8 flex flex-col items-center gap-3">
                <XCircle className="w-14 h-14 text-red-400" />
                <p className="text-red-600 font-medium">Este pedido fue cancelado.</p>
              </div>
            )}

            {/* Items summary */}
            <div className="px-6 pb-6 border-t pt-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumen del pedido</p>
              <ul className="space-y-2">
                {order.items.map((item: any, i: number) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="font-bold text-primary w-6 text-right shrink-0">{item.quantity}×</span>
                    <span>{item.productName}</span>
                    {item.variantLabel && <span className="text-muted-foreground text-xs">({item.variantLabel})</span>}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Se actualiza automáticamente cada 30 segundos</span>
              <button onClick={() => refetch()} className="flex items-center gap-1 hover:text-foreground transition-colors">
                <RefreshCw className="w-3 h-3" /> Actualizar ahora
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground">← Volver al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
