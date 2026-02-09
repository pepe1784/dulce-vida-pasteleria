import { Navigation } from "@/components/Navigation";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Package, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect } from "react";

export default function Orders() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-secondary/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navigation />
      
      <div className="container-custom pt-32">
        <h1 className="text-4xl font-display mb-2">My Orders</h1>
        <p className="text-muted-foreground mb-10">Track and manage your past purchases.</p>

        {ordersLoading ? (
           <div className="flex justify-center py-20">
             <Loader2 className="w-10 h-10 animate-spin text-primary" />
           </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-border shadow-sm">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-display mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't indulged in any sweets yet.
            </p>
            <Link href="/">
                <Button className="btn-primary">Browse Menu</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white rounded-xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-lg">Order #{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {order.status}
                        </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {order.createdAt ? format(new Date(order.createdAt), "MMMM d, yyyy") : "N/A"}
                        </span>
                        <span>•</span>
                        <span>${Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
                
                <Button variant="outline" className="group">
                    View Details <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
