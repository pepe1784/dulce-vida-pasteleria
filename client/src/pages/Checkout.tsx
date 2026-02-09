import { Navigation } from "@/components/Navigation";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useCreateOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [authLoading, user]);

  const handlePlaceOrder = () => {
    if (items.length === 0) return;

    createOrder(
      {
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: () => {
          clearCart();
          toast({
            title: "¡Pedido Realizado!",
            description: "Gracias por su compra. ¡Sus dulces están en camino!",
          });
          setLocation("/orders");
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-secondary/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null; // Redirect handled in useEffect

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <Navigation />
      
      <div className="container-custom pt-32">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la Tienda
        </Link>
        
        <h1 className="text-4xl font-display mb-10">Pago</h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column: Form */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50">
              <h2 className="text-xl font-display mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Información de Contacto
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={user.firstName || ""} disabled className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                        <Label>Apellidos</Label>
                        <Input value={user.lastName || ""} disabled className="bg-muted/50" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user.email || ""} disabled className="bg-muted/50" />
                </div>
                <p className="text-xs text-muted-foreground">
                    Sesión iniciada como {user.email}. ¿No eres tú? <a href="/api/logout" className="underline text-primary">Cerrar sesión</a>
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50 opacity-75 grayscale">
                <h2 className="text-xl font-display mb-4">Pago</h2>
                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center border border-dashed border-border">
                    Esta es una tienda de demostración. No se requiere pago.
                </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:sticky lg:top-32 h-fit">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-primary/10">
              <h2 className="text-xl font-display mb-6">Resumen del Pedido</h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-16 w-16 rounded-md bg-muted overflow-hidden">
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between font-medium">
                        <span className="font-display">{item.name}</span>
                        <span>${(Number(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Cant: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impuestos (Estimado)</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-4 border-t mt-4">
                  <span>Total</span>
                  <span className="text-primary">${(total * 1.08).toFixed(2)}</span>
                </div>
              </div>

              <Button 
                className="w-full mt-8 btn-primary h-12 text-base"
                onClick={handlePlaceOrder}
                disabled={isCreatingOrder || items.length === 0}
              >
                {isCreatingOrder ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                    </>
                ) : (
                    "Realizar Pedido"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
