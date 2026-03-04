import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import Kitchen from "@/pages/Kitchen";
import OrderStatus from "@/pages/OrderStatus";
import { CartDrawer } from "@/components/CartDrawer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/mis-pedidos" component={Orders} />
      <Route path="/pedido/:orderRef" component={OrderStatus} />
      <Route path="/pedido" component={OrderStatus} />
      <Route path="/admin" component={Admin} />
      <Route path="/cocina" component={Kitchen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <CartDrawer />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

