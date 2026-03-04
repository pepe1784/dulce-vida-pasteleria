import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Package, Calendar, ArrowRight, ShoppingBag, Clock, CheckCircle, ChefHat, Truck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

/** Parse a createdAt value that can be a PG Date object, ISO string, or Unix ts (SQLite integer) */
function parseOrderDate(raw: any): Date {
  if (!raw) return new Date();
  // Already a Date
  if (raw instanceof Date) return raw;
  // Number: if > 1e10 it's already milliseconds, otherwise Unix seconds
  if (typeof raw === "number") return new Date(raw > 1e10 ? raw : raw * 1000);
  // String: ISO datetime or numeric string
  const n = Number(raw);
  if (!isNaN(n) && String(raw).length <= 13) return new Date(n > 1e10 ? n : n * 1000);
  return new Date(raw);
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:   { label: "Pendiente",   icon: <Clock className="w-3 h-3" />,        cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  confirmed: { label: "Confirmado",  icon: <CheckCircle className="w-3 h-3" />,  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  preparing: { label: "Preparando",  icon: <ChefHat className="w-3 h-3" />,      cls: "bg-orange-100 text-orange-700 border-orange-200" },
  ready:     { label: "Listo",       icon: <CheckCircle className="w-3 h-3" />,  cls: "bg-green-100 text-green-700 border-green-200" },
  delivered: { label: "Entregado",   icon: <Truck className="w-3 h-3" />,        cls: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelado",   icon: <XCircle className="w-3 h-3" />,      cls: "bg-red-100 text-red-700 border-red-200" },
};

async function fetchMyOrders() {
  const res = await fetch("/api/auth/orders", { credentials: "include" });
  if (!res.ok) return [];
  return res.json();
}

export default function Orders() {
  const { customer, isLoading: authLoading, loginUrl } = useAuth();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/auth/orders"],
    queryFn: fetchMyOrders,
    enabled: !!customer,
  });

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-secondary/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — show sign-in prompt
  if (!customer) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navigation />
        <div className="container-custom pt-32 pb-20 flex flex-col items-center justify-center text-center max-w-md mx-auto gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-display">Mis Pedidos</h1>
          <p className="text-muted-foreground">
            Inicia sesión con tu cuenta de Google para ver el historial de tus pedidos y guardar tus datos de entrega.
          </p>
          <a href={loginUrl}>
            <Button className="btn-primary gap-3 h-12 px-8 text-base">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" opacity=".87" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" opacity=".87" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" opacity=".87" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" opacity=".87" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </Button>
          </a>
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navigation />

      <div className="container-custom pt-32">
        <div className="flex items-center gap-3 mb-2">
          {customer.picture && (
            <img src={customer.picture} alt={customer.name} className="w-10 h-10 rounded-full" />
          )}
          <div>
            <h1 className="text-4xl font-display leading-tight">Mis Pedidos</h1>
            <p className="text-muted-foreground text-sm">{customer.email}</p>
          </div>
        </div>
        <p className="text-muted-foreground mb-10">Historial de tus compras en Endulzarte.</p>

        {ordersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-border shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-display mb-2">Sin pedidos aún</h2>
            <p className="text-muted-foreground mb-8">
              Parece que aún no te has dado ningún capricho dulce.
            </p>
            <Link href="/">
              <Button className="btn-primary">Ver Menú</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => {
              const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, icon: null, cls: "bg-gray-100 text-gray-700 border-gray-200" };
              return (
              <div
                key={order.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-display font-bold text-lg">{order.orderNumber || `#${order.id}`}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${statusCfg.cls}`}>
                      {statusCfg.icon}{statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(parseOrderDate(order.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">${Number(order.total).toFixed(2)}</span>
                    <span>•</span>
                    <span className="capitalize">{order.orderType === "delivery" ? "A domicilio" : "Recoger en tienda"}</span>
                  </div>
                </div>
                <Link href={`/pedido/${order.orderNumber || order.id}`}>
                  <Button variant="outline" className="group shrink-0">
                    Ver Estado <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

