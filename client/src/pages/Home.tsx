import { Navigation } from "@/components/Navigation";
import { useProducts } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, Loader2, MapPin, Phone, Mail, Clock, Facebook, Instagram, MessageCircle, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { fuzzySearchProducts } from "@/lib/fuzzy-search";

export default function Home() {
  const { data: products, isLoading, error } = useProducts();
  const { data: settings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = products
    ? Array.from(new Set(products.map((p) => p.category)))
    : [];

  const filteredProducts = useMemo(() => {
    let result = products || [];
    // Apply category filter first
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    // Then apply fuzzy search
    if (searchQuery.trim()) {
      result = fuzzySearchProducts(result, searchQuery);
    }
    return result;
  }, [products, selectedCategory, searchQuery]);

  // Dynamic values from settings with fallbacks
  const whatsapp = settings?.whatsapp?.replace(/[^0-9]/g, "") || "5213123011075";
  const whatsappUrl = `https://wa.me/${whatsapp}?text=Hola%20Endulzarte%2C%20me%20gustar%C3%ADa%20hacer%20un%20pedido`;
  const instagramUrl = settings?.instagram || "https://www.instagram.com/endulza.arte";
  const facebookUrl = settings?.facebook || "https://www.facebook.com/Endulzartepostrescaseros/";
  const googleMapsUrl = settings?.google_maps || "https://www.google.com/maps/search/Endulzarte+Postreria+Colima";
  const locationText = settings?.location_text || "Colima, Colima, México";
  const contactEmail = settings?.contact_email || "endulzarte.colima@gmail.com";
  const phoneText = settings?.phone || "312 301 1075";
  const hoursWeekdays = settings?.hours_weekdays || "Lun - Sáb: 10:00 AM - 8:30 PM";
  const hoursSunday = settings?.hours_sunday || "Dom: 12:30 PM - 7:00 PM";
  const aboutText = settings?.about_text || "Somos una postrería artesanal en Colima dedicada a crear momentos dulces e inolvidables. Cada uno de nuestros productos está hecho con ingredientes de la más alta calidad y mucho amor.";

  // Scroll to catalogo and optionally filter by category
  const scrollToCatalog = useCallback((category?: string) => {
    if (category) setSelectedCategory(category);
    const el = document.getElementById("catalogo");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Extract instagram handle from URL
  const instagramHandle = instagramUrl.includes("instagram.com/")
    ? "@" + instagramUrl.split("instagram.com/")[1].replace(/\/$/, "")
    : "@endulza.arte";

  const facebookHandle = facebookUrl.includes("facebook.com/")
    ? "/" + facebookUrl.split("facebook.com/")[1].replace(/\/$/, "")
    : "/Endulzartepostrescaseros";

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navigation />

      {/* Hero Section */}
      <section id="inicio" className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="container-custom grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm">
                <span className="text-sm font-medium text-primary tracking-wide uppercase">
                    Postrería Artesanal en Colima
                </span>
            </div>
            <h1 className="text-5xl lg:text-7xl xl:text-8xl font-display leading-[1.1]">
              Dulces <span className="text-primary italic font-handwriting">momentos</span>,<br />
              hechos con amor.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Postres caseros elaborados con ingredientes de la más alta calidad. 
              Pasteles, rolls de canela, pays y mucho más para endulzar tu día.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="btn-primary h-14 px-8 text-base" onClick={() => scrollToCatalog()}>
                Ver Catálogo
              </Button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base border-primary/20 hover:bg-primary/5">
                  <MessageCircle className="mr-2 h-5 w-5" /> Pedir por WhatsApp
                </Button>
              </a>
            </div>
          </div>

          <div className="relative hidden lg:block h-[600px] animate-in fade-in zoom-in duration-1000 delay-200">
            <div className="absolute inset-0 rounded-t-[100px] rounded-b-[40px] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
                <img 
                    src="https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=1000" 
                    alt="Postres artesanales Endulzarte"
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl max-w-[220px] animate-bounce duration-[3000ms]">
                <p className="font-handwriting text-2xl text-primary mb-1">Hecho en Casa</p>
                <p className="text-sm text-muted-foreground">Postres frescos todos los días</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block text-muted-foreground/50">
            <ArrowDown className="w-6 h-6" />
        </div>
      </section>

      {/* Nosotros / About Section */}
      <section id="nosotros" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
                <span className="text-sm font-medium text-primary tracking-wide uppercase">Nuestra Historia</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display">
                Endulzando Colima <span className="text-primary font-handwriting italic">desde el corazón</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {aboutText}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Desde nuestros famosos rolls de canela hasta pasteles personalizados para tus 
                celebraciones especiales, cada creación sale de nuestras manos con el mismo amor 
                y dedicación de siempre.
              </p>
              <div className="grid grid-cols-3 gap-6 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-display font-bold text-primary">100%</p>
                  <p className="text-sm text-muted-foreground mt-1">Casero</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-display font-bold text-primary">500+</p>
                  <p className="text-sm text-muted-foreground mt-1">Clientes felices</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-display font-bold text-primary">50+</p>
                  <p className="text-sm text-muted-foreground mt-1">Variedades</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4">
                <img 
                  src="https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=600" 
                  alt="Pastel de chocolate" 
                  className="rounded-2xl shadow-lg object-cover h-64 w-full"
                />
                <img 
                  src="https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?auto=format&fit=crop&q=80&w=600" 
                  alt="Rolls de canela" 
                  className="rounded-2xl shadow-lg object-cover h-48 w-full"
                />
              </div>
              <div className="space-y-4 pt-8">
                <img 
                  src="https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&q=80&w=600" 
                  alt="Cupcakes decorados" 
                  className="rounded-2xl shadow-lg object-cover h-48 w-full"
                />
                <img 
                  src="https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&q=80&w=600" 
                  alt="Postre especial" 
                  className="rounded-2xl shadow-lg object-cover h-64 w-full"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Catálogo de Productos */}
      <section id="catalogo" className="py-24 bg-secondary/30 relative">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm">
              <span className="text-sm font-medium text-primary tracking-wide uppercase">Nuestro Catálogo</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display">Nuestras Creaciones</h2>
            <p className="text-muted-foreground text-lg">
                Descubre nuestra selección de postres artesanales. Cada pieza es elaborada con amor y los mejores ingredientes.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
              <Input
                type="text"
                placeholder="Buscar productos... (ej: pastel, roles, latte)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-full border-primary/20 bg-white shadow-sm text-base focus:border-primary focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                  !selectedCategory
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-primary/20 text-foreground hover:bg-primary hover:text-white"
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-white border-primary"
                      : "bg-white border-primary/20 text-foreground hover:bg-primary hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-10">
                Error al cargar los productos. Por favor, inténtelo de nuevo más tarde.
            </div>
          ) : (
            <>
              {(selectedCategory || searchQuery) && (
                <p className="text-center text-muted-foreground mb-6">
                  Mostrando {filteredProducts?.length || 0} producto{(filteredProducts?.length || 0) !== 1 ? 's' : ''}
                  {selectedCategory ? ` en "${selectedCategory}"` : ''}
                  {searchQuery ? ` para "${searchQuery}"` : ''}
                </p>
              )}
              {filteredProducts?.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No se encontraron productos para "{searchQuery}"</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Intenta con otro término de búsqueda</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts?.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          {/* CTA para pedir */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <p className="text-muted-foreground mb-4">¿Te gustó algo? ¡Haz tu pedido ahora!</p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-primary h-14 px-10 text-base">
                <MessageCircle className="mr-2 h-5 w-5" /> Pedir por WhatsApp
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Sección Contacto */}
      <section id="contacto" className="py-24 bg-white relative">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
              <span className="text-sm font-medium text-primary tracking-wide uppercase">Contáctanos</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display">¿Listo para <span className="text-primary font-handwriting italic">endulzarte</span>?</h2>
            <p className="text-muted-foreground text-lg">
              Haz tu pedido o pregunta por nuestros postres disponibles. ¡Estamos para servirte!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* WhatsApp */}
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-8 rounded-2xl bg-green-50 border border-green-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">WhatsApp</h3>
              <p className="text-muted-foreground text-sm text-center">Escríbenos y haz tu pedido al instante</p>
              <span className="mt-3 text-green-600 font-semibold text-sm">{phoneText}</span>
            </motion.a>

            {/* Teléfono */}
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              href={`tel:+${whatsapp}`}
              className="flex flex-col items-center p-8 rounded-2xl bg-blue-50 border border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Llámanos</h3>
              <p className="text-muted-foreground text-sm text-center">Con gusto te atendemos por teléfono</p>
              <span className="mt-3 text-blue-600 font-semibold text-sm">{phoneText}</span>
            </motion.a>

            {/* Ubicación */}
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-8 rounded-2xl bg-primary/5 border border-primary/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Visítanos</h3>
              <p className="text-muted-foreground text-sm text-center">{locationText}</p>
              <span className="mt-3 text-primary font-semibold text-sm">Ver en Google Maps</span>
            </motion.a>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-foreground text-secondary py-16">
        <div className="container-custom grid md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
                <span className="font-handwriting text-3xl text-primary block mb-2">Endulzarte</span>
                <p className="text-xs text-secondary/40 mb-4">Postrería & Roll</p>
                <p className="text-secondary/60 leading-relaxed text-sm">
                    Endulzando tu vida con postres caseros elaborados con amor y los mejores ingredientes, 
                    directamente desde Colima para ti.
                </p>
                {/* Redes Sociales */}
                <div className="flex gap-3 mt-6">
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" 
                     className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-green-500 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                </div>
            </div>
            <div>
                <h4 className="font-display text-xl mb-6 text-white">Catálogo</h4>
                <ul className="space-y-3 text-secondary/60 text-sm">
                    {["Postres Grandes", "Postres Individuales", "Cajas de Roles", "Bebidas Calientes", "Lattes Fríos", "Bebidas Frías"].map((cat) => (
                      <li key={cat}>
                        <button
                          onClick={() => scrollToCatalog(cat)}
                          className="hover:text-primary transition-colors cursor-pointer text-left"
                        >
                          {cat}
                        </button>
                      </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-display text-xl mb-6 text-white">Contacto</h4>
                <ul className="space-y-3 text-secondary/60 text-sm">
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">{locationText}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={`tel:+${whatsapp}`} className="hover:text-primary transition-colors">{phoneText}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={`mailto:${contactEmail}`} className="hover:text-primary transition-colors">{contactEmail}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {facebookHandle}
                      </a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-primary flex-shrink-0" />
                      <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        {instagramHandle}
                      </a>
                    </li>
                </ul>
            </div>
            <div>
                <h4 className="font-display text-xl mb-6 text-white">Horarios</h4>
                <ul className="space-y-3 text-secondary/60 text-sm">
                    <li>{hoursWeekdays}</li>
                    <li>{hoursSunday}</li>
                </ul>
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-secondary/40 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Pedidos con 24hrs de anticipación
                  </p>
                </div>
            </div>
        </div>
        <div className="container-custom mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-secondary/40 text-sm">
            <span>© {new Date().getFullYear()} Endulzarte - Postrería & Roll. Todos los derechos reservados.</span>
            <span>Hecho con ❤️ en Colima, México</span>
        </div>
      </footer>
    </div>
  );
}
