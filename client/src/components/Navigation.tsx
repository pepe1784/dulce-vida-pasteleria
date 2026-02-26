import { Link, useLocation } from "wouter";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const { data: settings } = useSettings();

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

        {/* CTA WhatsApp */}
        <div className="flex items-center gap-2">
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
