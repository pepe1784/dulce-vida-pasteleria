import { Navigation } from "@/components/Navigation";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, Check, MapPin, MessageCircle, Truck, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// ── BBVA bank details ────────────────────────────────────────────────────────
const BANK = {
  titular: "Oswaldo Cobian Montero",
  banco: "BBVA",
  clabe: "012180 015714 395153",
  tarjeta: "4152 3141 2263 8516",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value.replace(/\s/g, "")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono font-medium">{value}</p>
      </div>
      <button onClick={copy} className="ml-3 p-1.5 rounded hover:bg-border transition-colors">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}

export default function Checkout() {
  const { items, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { customer, preferredAddress, updateProfile } = useAuth();

  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [address, setAddress] = useState({ colonia: "", calle: "", numero: "", entre: "", referencias: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from Google profile (runs once when customer loads)
  useEffect(() => {
    if (customer) {
      if (customer.name && !name) setName(customer.name);
      if (customer.phone && !phone) setPhone(customer.phone.replace(/\D/g, "").slice(-10));
    }
  }, [customer]);

  // Pre-fill address from saved preferredAddress (runs once)
  useEffect(() => {
    if (preferredAddress && !address.colonia) {
      setAddress({
        colonia: preferredAddress.colonia || "",
        calle: preferredAddress.calle || "",
        numero: preferredAddress.numero || "",
        entre: preferredAddress.entre || "",
        referencias: preferredAddress.referencias || "",
      });
    }
  }, [preferredAddress]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const deliveryNote = orderType === "delivery" ? "Por cotizar" : "Gratis";
  const total = orderType === "pickup" ? subtotal : subtotal; // delivery cost TBD

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        setAddress((prev) => ({ ...prev, referencias: (prev.referencias + " " + mapsUrl).trim() }));
        toast({ title: "Ubicación compartida", description: "URL de maps añadida a referencias." });
      }, () => {
        window.open("https://maps.google.com", "_blank");
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return toast({ title: "Carrito vacío", description: "Agrega productos al carrito primero.", variant: "destructive" });
    if (!name.trim()) return toast({ title: "Nombre requerido", description: "Por favor ingresa tu nombre.", variant: "destructive" });
    if (!phone.trim() || phone.length < 8) return toast({ title: "Teléfono requerido", description: "Por favor ingresa tu número de teléfono.", variant: "destructive" });
    if (orderType === "delivery" && !address.colonia.trim()) return toast({ title: "Dirección requerida", description: "Por favor ingresa tu colonia.", variant: "destructive" });
    if (paymentMethod === "cash" && !cashAmount.trim()) return toast({ title: "Monto requerido", description: "Ingresa la cantidad con la que pagarás.", variant: "destructive" });

    setIsSubmitting(true);

    try {
      // Save order to DB (prices validated server-side)
      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: `+52${phone.replace(/\D/g, "")}`,
          orderType,
          paymentMethod,
          cashAmount: paymentMethod === "cash" ? cashAmount : null,
          deliveryAddress: orderType === "delivery" ? address : null,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          notes: "",
        }),
      });

      let orderNumber = "EP-000000-000";
      if (resp.ok) {
        const data = await resp.json();
        orderNumber = data.orderNumber || orderNumber;
      }

      // Build WhatsApp message
      const paymentLabels: Record<string, string> = {
        cash: `Efectivo (paga con $${cashAmount})`,
        transfer: "Transferencia BBVA",
        card: "Tarjeta (en sucursal)",
      };
      const itemsText = items
        .map((i) => `  • ${i.quantity}x ${i.name}  $${(Number(i.price) * i.quantity).toFixed(2)}`)
        .join("\n");
      const addrLines = orderType === "delivery"
        ? [
            `  🏠 Colonia: ${address.colonia}`,
            `  🚦 Calle: ${address.calle} ${address.numero}`.trim(),
            address.entre ? `  🔀 Entre: ${address.entre}` : null,
            address.referencias ? `  📌 Ref: ${address.referencias}` : null,
          ].filter(Boolean).join("\n")
        : null;

      const lines = [
        `🍰 *PEDIDO ${orderNumber}*`,
        `────────────────────`,
        `👤 *Cliente:* ${name}`,
        `📱 *Tel:* +52${phone.replace(/\D/g, "")}`,
        `🔖 *Tipo:* ${orderType === "delivery" ? "🚚 A domicilio" : "🏪 Para recoger"}`,
        addrLines ? `📍 *Dirección:*\n${addrLines}` : null,
        `💳 *Pago:* ${paymentLabels[paymentMethod]}`,
        `────────────────────`,
        `🛒 *Productos:*`,
        itemsText,
        `────────────────────`,
        `📦 Subtotal: $${subtotal.toFixed(2)}`,
        orderType === "delivery" ? `🚚 Envío: Por cotizar` : null,
        `💰 *TOTAL: $${subtotal.toFixed(2)}${orderType === "delivery" ? " + envío" : ""}*`,
        `────────────────────`,
        `_endulzarte.com_`,
      ];
      const msg = lines.filter(Boolean).join("\n");

      const waUrl = `https://wa.me/5213123011075?text=${encodeURIComponent(msg)}`;
      clearCart();

      // If logged in via Google, save phone + delivery address for next time
      if (customer) {
        updateProfile({
          phone: phone.replace(/\D/g, ""),
          ...(orderType === "delivery" ? { preferredAddress: address } : {}),
        });
      }

      window.open(waUrl, "_blank");
      setLocation("/");
      toast({ title: "¡Pedido enviado!", description: "Tu pedido fue procesado. Complétalo en WhatsApp." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Ocurrió un error. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navigation />
        <div className="container-custom pt-40 flex flex-col items-center gap-6 text-center">
          <div className="text-6xl">🛒</div>
          <h2 className="text-2xl font-display font-bold">Tu carrito está vacío</h2>
          <p className="text-muted-foreground">Agrega productos desde el catálogo para continuar.</p>
          <Link href="/">
            <Button className="btn-primary">Ver Catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <Navigation />

      <div className="container-custom pt-32 max-w-3xl">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Regresar
        </Link>

        <h1 className="text-4xl font-display font-bold mb-2">Finalizar Pedido</h1>
        <p className="text-muted-foreground mb-8">Endulzarte Postrería & Roll · Sucursal Centro de Comala</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Order Type Toggle ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold mb-4">¿Cómo quieres recibir tu pedido?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "pickup", label: "Para recoger", icon: <Store className="h-5 w-5" />, desc: "Recoge en sucursal" },
                { value: "delivery", label: "A domicilio", icon: <Truck className="h-5 w-5" />, desc: "Envío a domicilio" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOrderType(opt.value as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    orderType === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.icon}
                  <span className="font-semibold text-sm">{opt.label}</span>
                  <span className="text-xs">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Customer Info ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Tus datos</h2>
              {customer ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {customer.picture && <img src={customer.picture} className="w-5 h-5 rounded-full" alt="" />}
                  <span className="truncate max-w-[130px]">{customer.email}</span>
                </div>
              ) : (
                <a href="/api/auth/google" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Iniciar sesión para recordar tus datos
                </a>
              )}
            </div>
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono celular</Label>
              <div className="flex mt-1">
                <div className="flex items-center bg-secondary/60 px-3 rounded-l-md border border-r-0 border-input text-sm font-mono text-muted-foreground">
                  🇲🇽 +52
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="3121234567"
                  className="rounded-l-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* ── Delivery Address ── */}
          {orderType === "delivery" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Dirección de entrega</h2>
                <Button type="button" variant="outline" size="sm" onClick={handleShareLocation} className="text-xs gap-1">
                  <MapPin className="h-3 w-3" /> Compartir ubicación
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Colonia *</Label>
                  <Input value={address.colonia} onChange={(e) => setAddress((p) => ({ ...p, colonia: e.target.value }))} placeholder="Ej. Col. Centro" className="mt-1" required />
                </div>
                <div>
                  <Label>Calle *</Label>
                  <Input value={address.calle} onChange={(e) => setAddress((p) => ({ ...p, calle: e.target.value }))} placeholder="Ej. Av. Juárez" className="mt-1" required />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={address.numero} onChange={(e) => setAddress((p) => ({ ...p, numero: e.target.value }))} placeholder="Ej. 123" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Entre calles</Label>
                  <Input value={address.entre} onChange={(e) => setAddress((p) => ({ ...p, entre: e.target.value }))} placeholder="Ej. entre 5 de Febrero y Allende" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Referencias</Label>
                  <Input value={address.referencias} onChange={(e) => setAddress((p) => ({ ...p, referencias: e.target.value }))} placeholder="Ej. Casa azul con portón negro" className="mt-1" />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                ⚠️ El costo de envío será cotizado por WhatsApp según tu zona.
              </p>
            </div>
          )}

          {/* ── Payment ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-display text-lg font-semibold">Método de pago</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "cash", label: "Efectivo" },
                { value: "transfer", label: "Transferencia" },
                { value: "card", label: "Tarjeta" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value as any)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="mt-3">
                <Label htmlFor="cashAmount">¿Con cuánto vas a pagar?</Label>
                <div className="flex mt-1">
                  <span className="flex items-center bg-secondary/60 px-3 rounded-l-md border border-r-0 border-input text-sm">$</span>
                  <Input
                    id="cashAmount"
                    type="number"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Ej. 500"
                    className="rounded-l-none"
                    required
                  />
                </div>
              </div>
            )}

            {paymentMethod === "transfer" && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground mb-3">Realiza la transferencia a la siguiente cuenta y guarda tu comprobante:</p>
                <CopyField label="Titular" value={BANK.titular} />
                <CopyField label="Banco" value={BANK.banco} />
                <CopyField label="CLABE" value={BANK.clabe} />
                <CopyField label="Número de tarjeta" value={BANK.tarjeta} />
                <p className="text-xs text-muted-foreground mt-2">Envía tu comprobante por WhatsApp junto con tu pedido.</p>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="mt-3 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                💳 El pago con tarjeta se confirma directamente en sucursal o mediante terminal virtual. Lo coordinaremos por WhatsApp.
              </div>
            )}
          </div>

          {/* ── Order Summary ── */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold mb-4">Resumen de tu pedido</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <span>
                      <span className="font-medium">{item.quantity}x</span> {item.name}
                    </span>
                  </div>
                  <span className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr className="my-2 border-border/50" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envío</span>
                <span className={orderType === "delivery" ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>{deliveryNote}</span>
              </div>
              <div className="flex justify-between font-display font-bold text-lg pt-1">
                <span>Total</span>
                <span className="text-primary">${subtotal.toFixed(2)}{orderType === "delivery" ? " + envío" : ""}</span>
              </div>
            </div>
          </div>

          {/* ── Submit ── */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-base font-bold rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-3 shadow-lg shadow-green-200"
          >
            {isSubmitting ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <>
                <MessageCircle className="h-5 w-5" />
                Enviar pedido por WhatsApp
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground px-4">
            Al enviar confirmas que aceptas los{" "}
            <a href="#" className="underline hover:text-primary">términos y condiciones</a>.
            Tu pedido será confirmado a través de WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
}