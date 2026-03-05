const fs = require("fs");
const path = require("path");

const content = `import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChefHat, Clock, CheckCircle2, Bike, ShoppingBag, RefreshCw,
  Loader2, AlertCircle, ArrowRight, MessageSquare, StickyNote,
  PlayCircle, PackageCheck, CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Per-status visual config ───────────────────────────────────────────────────
interface StatusDef {
  label: string;
  mobileLabel: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  cardBorderL: string;
  btnBg: string;
  btnHover: string;
  btnLabel: string;
  btnIcon: React.ReactNode;
  icon: React.ReactNode;
}

const STATUS_DEF: Record<OrderStatus, StatusDef> = {
  confirmed: {
    label: "Por preparar",
    mobileLabel: "Preparar",
    headerBg: "bg-blue-50 border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    cardBorderL: "border-l-blue-500",
    btnBg: "bg-blue-600",
    btnHover: "hover:bg-blue-700",
    btnLabel: "Iniciar preparacion",
    btnIcon: <PlayCircle className="w-4 h-4" />,
    icon: <Clock className="w-4 h-4 text-blue-500" />,
  },
  preparing: {
    label: "Preparando",
    mobileLabel: "En proceso",
    headerBg: "bg-amber-50 border-amber-200",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    cardBorderL: "border-l-amber-500",
    btnBg: "bg-amber-600",
    btnHover: "hover:bg-amber-700",
    btnLabel: "Marcar como listo",
    btnIcon: <PackageCheck className="w-4 h-4" />,
    icon: <ChefHat className="w-4 h-4 text-amber-500" />,
  },
  ready: {
    label: "Listo para entregar",
    mobileLabel: "Listo",
    headerBg: "bg-emerald-50 border-emerald-200",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    cardBorderL: "border-l-emerald-500",
    btnBg: "bg-emerald-600",
    btnHover: "hover:bg-emerald-700",
    btnLabel: "Entregar",
    btnIcon: <CheckCheck className="w-4 h-4" />,
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  },
  delivered: {
    label: "Entregado",
    mobileLabel: "Entregado",
    headerBg: "bg-slate-50 border-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    cardBorderL: "border-l-slate-300",
    btnBg: "bg-slate-400",
    btnHover: "hover:bg-slate-500",
    btnLabel: "",
    btnIcon: null,
    icon: <CheckCircle2 className="w-4 h-4 text-slate-400" />,
  },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

// ── Mobile tab accent bar color per status ─────────────────────────────────────
const ACCENT_BAR: Record<string, string> = {
  confirmed: "bg-blue-500",
  preparing: "bg-amber-500",
  ready: "bg-emerald-500",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseDate(raw: any): Date {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") return new Date(raw > 1e10 ? raw : raw * 1000);
  const n = Number(raw);
  if (!isNaN(n) && String(raw).length <= 13) return new Date(n > 1e10 ? n : n * 1000);
  return new Date(raw);
}

async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch("/api/kitchen/orders", { credentials: "include" });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("Error al cargar pedidos");
  return res.json();
}

async function advanceStatus(orderId: number, status: string): Promise<void> {
  const res = await fetch(\`/api/admin/orders/\${orderId}/status\`, {
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

// ── Main Page ──────────────────────────────────────────────────────────────────
type ColKey = "confirmed" | "preparing" | "ready";
const COLUMNS: ColKey[] = ["confirmed", "preparing", "ready"];

export default function Kitchen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [activeCol, setActiveCol] = useState<ColKey>("confirmed");

  // Tick every 30 s to refresh elapsed times
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: orders = [], isLoading, error, refetch } = useQuery<KitchenOrder[]>({
    queryKey: ["/api/kitchen/orders"],
    queryFn: fetchKitchenOrders,
    refetchInterval: 30_000,
    retry: (failCount, err: any) => err?.message !== "unauthorized" && failCount < 3,
  });

  // SSE real-time updates
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let es: EventSource;
    function connect() {
      es = new EventSource("/api/kitchen/events", { withCredentials: true });
      es.addEventListener("order_update", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
      });
      es.onerror = () => { es.close(); setTimeout(connect, 5000); };
    }
    connect();
    return () => es?.close();
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      advanceStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleAdvance = useCallback(
    (order: KitchenOrder) => {
      const next = NEXT_STATUS[order.status];
      if (next) mutation.mutate({ orderId: order.id, status: next });
    },
    [mutation]
  );

  // ── Unauthorized ──────────────────────────────────────────────────────────
  if ((error as any)?.message === "unauthorized") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-8">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Acceso restringido</h1>
        <p className="text-slate-500 text-sm text-center max-w-xs">
          Necesitas iniciar sesion en el panel para ver la vista de cocina.
        </p>
        <a
          href="/admin"
          className="mt-2 px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
        >
          Ir al Panel
        </a>
      </div>
    );
  }

  const grouped: Record<ColKey, KitchenOrder[]> = {
    confirmed: orders.filter((o) => o.status === "confirmed"),
    preparing: orders.filter((o) => o.status === "preparing"),
    ready: orders.filter((o) => o.status === "ready"),
  };

  const totalActive = orders.length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm leading-none block">Vista Cocina</span>
              <span className="text-[11px] text-slate-400 leading-none block mt-0.5">
                {isLoading ? "Cargando..." : \`\${totalActive} pedido\${totalActive !== 1 ? "s" : ""} activo\${totalActive !== 1 ? "s" : ""}\`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
            <button
              onClick={() => refetch()}
              title="Actualizar"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Panel Admin <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* ─── Mobile tab bar ──────────────────────────────────────────── */}
        <div className="md:hidden grid grid-cols-3 border-t border-slate-100">
          {COLUMNS.map((col) => {
            const def = STATUS_DEF[col];
            const count = grouped[col].length;
            const isActive = activeCol === col;
            return (
              <button
                key={col}
                onClick={() => setActiveCol(col)}
                className={\`relative flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors
                  \${isActive ? "text-slate-800" : "text-slate-400 hover:text-slate-600"}\`}
              >
                <span>{def.mobileLabel}</span>
                {count > 0 && (
                  <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    \${isActive ? \`\${def.badgeBg} \${def.badgeText}\` : "bg-slate-100 text-slate-500"}\`}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className={\`absolute bottom-0 left-6 right-6 h-0.5 rounded-t \${ACCENT_BAR[col]}\`} />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────────────── */}
      {orders.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="font-semibold text-slate-700 text-base">Sin pedidos activos</p>
          <p className="text-sm text-slate-400 text-center max-w-xs leading-relaxed">
            Los pedidos confirmados apareceran aqui automaticamente en tiempo real.
          </p>
        </div>
      ) : (
        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-5">
          {/* Desktop: 3-column kanban */}
          <div className="hidden md:grid md:grid-cols-3 gap-5 items-start">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                status={col}
                orders={grouped[col]}
                now={now}
                onAdvance={handleAdvance}
                isPending={mutation.isPending}
              />
            ))}
          </div>
          {/* Mobile: single column view (switched by tab bar) */}
          <div className="md:hidden">
            <KanbanColumn
              status={activeCol}
              orders={grouped[activeCol]}
              now={now}
              onAdvance={handleAdvance}
              isPending={mutation.isPending}
            />
          </div>
        </main>
      )}
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────
function KanbanColumn({
  status, orders, now, onAdvance, isPending,
}: {
  status: ColKey;
  orders: KitchenOrder[];
  now: Date;
  onAdvance: (o: KitchenOrder) => void;
  isPending: boolean;
}) {
  const def = STATUS_DEF[status];
  return (
    <div className="flex flex-col gap-3">
      {/* Column header pill */}
      <div className={\`flex items-center gap-2 px-3 py-2.5 rounded-xl border \${def.headerBg}\`}>
        {def.icon}
        <span className="font-semibold text-slate-700 text-sm">{def.label}</span>
        <span className={\`ml-auto text-xs font-bold px-2 py-0.5 rounded-full \${def.badgeBg} \${def.badgeText}\`}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      {orders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 flex items-center justify-center">
          <span className="text-xs text-slate-400">Sin pedidos en esta etapa</span>
        </div>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            now={now}
            onAdvance={onAdvance}
            isPending={isPending}
          />
        ))
      )}
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order, now, onAdvance, isPending,
}: {
  order: KitchenOrder;
  now: Date;
  onAdvance: (o: KitchenOrder) => void;
  isPending: boolean;
}) {
  const def = STATUS_DEF[order.status as OrderStatus];
  const next = NEXT_STATUS[order.status as OrderStatus];
  const orderDate = parseDate(order.createdAt);
  const elapsedMs = now.getTime() - orderDate.getTime();
  const isLate = elapsedMs > 25 * 60 * 1000;
  const elapsed = formatDistanceToNow(orderDate, { locale: es, addSuffix: false });

  return (
    <div className={\`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 \${def.cardBorderL} overflow-hidden\`}>
      {/* Card top: order number + elapsed */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono font-bold text-slate-800 text-sm">{order.orderNumber}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={\`text-[11px] font-semibold px-1.5 py-0.5 rounded-md \${def.badgeBg} \${def.badgeText}\`}>
              {def.label}
            </span>
            {order.orderType === "delivery" ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
                <Bike className="w-3 h-3" /> Domicilio
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
                <ShoppingBag className="w-3 h-3" /> Recoger
              </span>
            )}
          </div>
        </div>
        {/* Elapsed badge */}
        <span className={\`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0
          \${isLate ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}\`}>
          <Clock className="w-3 h-3" />
          {elapsed}
        </span>
      </div>

      {/* Customer name */}
      <div className="border-t border-slate-100 mx-4 mb-2" />
      <p className="px-4 pb-2 text-sm font-semibold text-slate-800">{order.customerName}</p>

      {/* Items list */}
      <ul className="px-4 pb-3 space-y-2">
        {order.items.map((item, i) => (
          <li key={i}>
            <div className="flex items-baseline gap-2">
              <span className="w-5 text-right font-black text-slate-800 text-base tabular-nums flex-shrink-0">
                {item.quantity}
              </span>
              <span className="text-sm font-medium text-slate-700 leading-snug">{item.productName}</span>
            </div>
            {item.variantLabel && (
              <p className="ml-7 text-xs text-slate-500 mt-0.5">{item.variantLabel}</p>
            )}
            {item.itemComment && (
              <div className="ml-7 flex items-start gap-1 mt-0.5">
                <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700 font-medium">{item.itemComment}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Notes */}
      {order.notes && (
        <div className="mx-4 mb-3 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Advance button */}
      {next && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onAdvance(order)}
            disabled={isPending}
            className={\`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all
              \${def.btnBg} \${def.btnHover} active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed\`}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : def.btnIcon
            }
            {def.btnLabel}
          </button>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join("client/src/pages/Kitchen.tsx"), content, "utf8");
console.log("Written", content.split("\n").length, "lines");
