import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChefHat, Clock, CheckCircle, Truck, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = "confirmed" | "preparing" | "ready" | "delivered";

interface KitchenItem {
  productName: string;
  quantity: number;
  variantLabel?: string | null;
  itemComment?: string | null;
}

interface KitchenOrder {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  orderType: string;
  customerName: string;
  total: string;
  createdAt: any;
  notes?: string | null;
  items: KitchenItem[];
}

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<OrderStatus, string> = {
  confirmed: "Por preparar",
  preparing: "Preparando",
  ready:     "Listo para entregar",
  delivered: "Entregado",
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: "preparing",
  preparing: "ready",
  ready:     "delivered",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "▶ Iniciar preparación",
  preparing: "✓ Marcar como listo",
  ready:     "✓ Entregado",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  confirmed: "border-blue-400 bg-blue-50",
  preparing: "border-orange-400 bg-orange-50",
  ready:     "border-green-400 bg-green-50",
  delivered: "border-gray-300 bg-gray-50",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready:     "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-700",
};

// ── Parse date helper ─────────────────────────────────────────────────────────
function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") return new Date(raw > 1e10 ? raw : raw * 1000);
  const n = Number(raw);
  if (!isNaN(n) && String(raw).length <= 13) return new Date(n > 1e10 ? n : n * 1000);
  return new Date(raw);
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch("/api/kitchen/orders", { credentials: "include" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("Error al cargar pedidos");
  return res.json();
}

async function updateStatus(orderId: number, status: string): Promise<void> {
  const res = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ message: "Error" }));
    throw new Error(d.message);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Kitchen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());

  // Update elapsed time every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: orders = [], isLoading, error, refetch } = useQuery<KitchenOrder[]>({
    queryKey: ["/api/kitchen/orders"],
    queryFn: fetchKitchenOrders,
    refetchInterval: 30_000, // fallback polling every 30s
    retry: (failCount, err: any) => err?.message !== "unauthorized" && failCount < 3,
  });

  // ── SSE real-time refresh ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let es: EventSource;

    function connect() {
      es = new EventSource("/api/kitchen/events", { withCredentials: true });

      es.addEventListener("order_update", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      });
      es.addEventListener("order_remove", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      });
      es.onerror = () => {
        es.close();
        setTimeout(connect, 5000);
      };
    }

    connect();
    return () => es?.close();
  }, [queryClient]);

  // ── Mutation ─────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleAdvance = useCallback((order: KitchenOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    mutation.mutate({ orderId: order.id, status: next });
  }, [mutation]);

  // ── Unauthorized ─────────────────────────────────────────────────────────
  if ((error as any)?.message === "unauthorized") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-100 p-8">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-800">Acceso restringido</h1>
        <p className="text-gray-600">Necesitas iniciar sesión en el panel de administración.</p>
        <a href="/admin">
          <Button>Ir al Panel</Button>
        </a>
      </div>
    );
  }

  // ── Split by status ───────────────────────────────────────────────────────
  const confirmed = orders.filter(o => o.status === "confirmed");
  const preparing = orders.filter(o => o.status === "preparing");
  const ready     = orders.filter(o => o.status === "ready");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-orange-400" />
          <h1 className="text-xl font-bold tracking-tight">Vista Cocina</h1>
          <span className="text-sm text-gray-400 ml-2 hidden sm:inline">
            {format(now, "HH:mm", { locale: es })} · {orders.length} pedido{orders.length !== 1 ? "s" : ""} activo{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refrescar"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
          <a href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">Panel Admin →</a>
        </div>
      </header>

      {/* Content */}
      {orders.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
          <CheckCircle className="w-16 h-16 text-green-600" />
          <p className="text-xl font-medium">Sin pedidos activos</p>
          <p className="text-sm">Los pedidos confirmados aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          {/* Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ── Por preparar ── */}
            <Column title="Por preparar" count={confirmed.length} icon={<Clock className="w-5 h-5 text-blue-400" />} colorClass="text-blue-400">
              {confirmed.map(order => (
                <OrderCard key={order.id} order={order} now={now} onAdvance={handleAdvance} isPending={mutation.isPending} />
              ))}
            </Column>

            {/* ── Preparando ── */}
            <Column title="Preparando" count={preparing.length} icon={<ChefHat className="w-5 h-5 text-orange-400" />} colorClass="text-orange-400">
              {preparing.map(order => (
                <OrderCard key={order.id} order={order} now={now} onAdvance={handleAdvance} isPending={mutation.isPending} />
              ))}
            </Column>

            {/* ── Listo ── */}
            <Column title="Listo para entregar" count={ready.length} icon={<CheckCircle className="w-5 h-5 text-green-400" />} colorClass="text-green-400">
              {ready.map(order => (
                <OrderCard key={order.id} order={order} now={now} onAdvance={handleAdvance} isPending={mutation.isPending} />
              ))}
            </Column>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Column wrapper ────────────────────────────────────────────────────────────
function Column({ title, count, icon, colorClass, children }: {
  title: string; count: number; icon: React.ReactNode; colorClass: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <span className={`font-semibold text-sm uppercase tracking-wider ${colorClass}`}>{title}</span>
        {count > 0 && (
          <span className="ml-auto bg-gray-700 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <div className="space-y-3 min-h-[80px]">
        {children}
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, now, onAdvance, isPending }: {
  order: KitchenOrder; now: Date;
  onAdvance: (o: KitchenOrder) => void;
  isPending: boolean;
}) {
  const nextStatus = NEXT_STATUS[order.status];
  const nextLabel  = NEXT_LABEL[order.status];
  const orderDate  = parseDate(order.createdAt);
  const elapsed    = formatDistanceToNow(orderDate, { locale: es, addSuffix: false });
  const elapsedMs  = now.getTime() - orderDate.getTime();
  const isLate     = elapsedMs > 25 * 60 * 1000; // > 25 min = highlight red

  return (
    <div className={`rounded-xl border-l-4 p-4 space-y-3 bg-gray-900 ${STATUS_COLOR[order.status]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono font-bold text-base">{order.orderNumber}</span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <span className={`text-xs font-medium whitespace-nowrap ${isLate ? "text-red-400" : "text-gray-400"}`}>
          <Clock className="w-3 h-3 inline mr-0.5" />{elapsed}
        </span>
      </div>

      {/* Client + type */}
      <div className="text-sm text-gray-300">
        <span className="font-medium text-white">{order.customerName}</span>
        <span className="mx-1 text-gray-500">·</span>
        <span>{order.orderType === "delivery" ? "🛵 Domicilio" : "🏪 Recoger"}</span>
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {order.items.map((item, i) => (
          <li key={i} className="text-sm">
            <span className="inline-flex items-baseline gap-2">
              <span className="font-bold text-white text-base w-6 text-right shrink-0">{item.quantity}×</span>
              <span className="text-gray-200">{item.productName}</span>
            </span>
            {item.variantLabel && (
              <div className="ml-8 text-xs text-blue-300">{item.variantLabel}</div>
            )}
            {item.itemComment && (
              <div className="ml-8 text-xs text-yellow-300 italic">📝 {item.itemComment}</div>
            )}
          </li>
        ))}
      </ul>

      {/* Notes */}
      {order.notes && (
        <div className="text-xs text-yellow-200 bg-yellow-900/30 rounded px-2 py-1">
          📋 {order.notes}
        </div>
      )}

      {/* Advance button */}
      {nextStatus && nextLabel && (
        <button
          onClick={() => onAdvance(order)}
          disabled={isPending}
          className={`w-full mt-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all
            ${order.status === "confirmed"
              ? "bg-orange-500 hover:bg-orange-400 text-white"
              : order.status === "preparing"
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-gray-600 hover:bg-gray-500 text-white"}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPending && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
          {nextLabel}
        </button>
      )}
      {order.status === "ready" && !nextStatus && (
        <div className="text-center text-xs text-green-400 font-medium py-1">✓ Listo para entregar</div>
      )}
    </div>
  );
}
