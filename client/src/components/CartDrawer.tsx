import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export function CartDrawer() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, total } = useCart();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    toggleCart();
    setLocation("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-white/95 backdrop-blur-sm">
        <SheetHeader className="p-6 border-b border-border/40">
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Tu Carrito
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Tu carrito está vacío</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Parece que aún no has añadido ningún dulce regalo.
                </p>
              </div>
              <Button variant="outline" onClick={toggleCart}>
                Empezar a comprar
              </Button>
            </div>
          ) : (
            <div className="py-6 space-y-6">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-4"
                  >
                    <div className="h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-display font-medium text-lg leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          ${Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border rounded-full">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-muted rounded-full transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-muted rounded-full transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border/40 bg-secondary/30">
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between text-lg font-display font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full btn-primary h-12 text-base" 
                onClick={handleCheckout}
              >
                Continuar al Pago
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
