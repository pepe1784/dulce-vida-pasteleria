import { Link, useLocation } from "wouter";
import { Menu, Phone, ShoppingCart, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { data: settings } = useSettings();
  const { items, openCart } = useCart();
  const { customer, isAuthenticated, logout, loginUrl } = useAuth();
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const whatsappUrl = settings?.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}?text=Hola%20Endulzarte%2C%20me%20gustar%C3%ADa%20hacer%20un%20pedido`
    : "https://wa.me/5213123011075?text=Hola%20Endulzarte%2C%20me%20gustar%C3%ADa%20hacer%20un%20pedido";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "inicio", label: "Inicio" },
    { href: "catalogo", label: "Catálogo" },
    { href: "nosotros", label: "Nosotros" },
    { href: "contacto", label: "Contacto" },
  ];

  const scrollToSection = (id: string) => {
    if (id === "inicio") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        isScrolled || location !== "/"
          ? "bg-white/95 backdrop-blur-md shadow-sm border-border/40 py-3"
          : "bg-white/40 backdrop-blur-sm py-5"
      )}
    >
      <div className="container-custom flex items-center justify-between">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <nav className="flex flex-col gap-6 mt-10">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-xl font-display cursor-pointer hover:text-primary transition-colors text-left"
                >
                  {link.label}
                </button>
              ))}

              {/* Google login / account — mobile only */}
              {isAuthenticated && customer ? (
                <div className="border-t border-border/40 pt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {customer.picture ? (
                      <img src={customer.picture} alt={customer.name} className="w-8 h-8 rounded-full object-cover border border-primary/20" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{customer.name.split(" ")[0]}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{customer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => logout(undefined)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión
                  </button>
                </div>
              ) : (
                <a
                  href={loginUrl}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-medium w-full justify-center"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Iniciar sesión con Google
                </a>
              )}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-center mt-4"
              >
                <Phone className="mr-2 h-4 w-4 inline" /> Pedir por WhatsApp
              </a>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/">
          <div className="flex flex-col items-center cursor-pointer group">
            <span className={cn(
              "font-handwriting text-2xl sm:text-3xl text-primary transition-all", 
              isScrolled ? "scale-90" : "scale-100"
            )}>
              Postrería & Roll
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold tracking-widest uppercase group-hover:text-primary/80 transition-colors">
              Endulzarte
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-sm font-medium tracking-wide hover:text-primary transition-colors uppercase cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2">
          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            className="relative hover:bg-primary/10"
            aria-label={`Carrito (${cartCount} productos)`}
          >
            <ShoppingCart className="h-5 w-5 text-primary" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Button>

          {/* Google Account / Sign-In */}
          {isAuthenticated && customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-primary/10 transition-colors p-1 pr-3 ml-1">
                  {customer.picture ? (
                    <img
                      src={customer.picture}
                      alt={customer.name}
                      className="w-7 h-7 rounded-full object-cover border border-primary/20"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 hidden sm:inline max-w-[120px] truncate">
                    {customer.name.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">
                  {customer.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mis-pedidos" className="cursor-pointer">
                    Mis pedidos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-600 cursor-pointer"
                  onClick={() => logout(undefined)}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a href={loginUrl} className="hidden sm:flex">
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 hover:border-primary/40 hover:bg-primary/5">
                {/* Google "G" icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Iniciar sesión
              </Button>
            </a>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="btn-primary hidden sm:flex h-10 px-5 text-sm">
              <Phone className="mr-2 h-4 w-4" /> Contáctanos
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden hover:bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
