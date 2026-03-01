import { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: settings } = useSettings();
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const waNumber = settings?.whatsapp?.replace(/[^0-9]/g, "") || "5213123011075";

  const handleAddToCart = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden card-hover"
    >
      <div className="aspect-square sm:aspect-[4/5] overflow-hidden bg-muted relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=400"; }}
        />
        {/* Overlay con precio (desktop hover) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-white font-display text-base sm:text-lg font-bold">
            ${Number(product.price).toFixed(0)} MXN
          </span>
        </div>
      </div>
      
      <div className="p-3 sm:p-5">
        <div className="flex justify-between items-start mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-primary/80 line-clamp-1 mr-1">
                {product.category}
            </span>
            <span className="font-display font-bold text-sm sm:text-lg text-primary whitespace-nowrap">
                ${Number(product.price).toFixed(0)}
            </span>
        </div>
        <h3 className="font-display text-sm sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="hidden sm:block text-muted-foreground text-sm line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <div className="mt-2 sm:mt-4 flex flex-col gap-1.5 sm:gap-2">
          <button
            onClick={handleAddToCart}
            className={`inline-flex items-center justify-center w-full rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 ${
              added
                ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            <ShoppingCart className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="sm:hidden">{added ? "¡Añadido!" : "Al carrito"}</span>
            <span className="hidden sm:inline">{added ? "¡Agregado!" : "Agregar al carrito"}</span>
          </button>
          <a
            href={`https://wa.me/${waNumber}?text=Hola%20Endulzarte%2C%20me%20interesa%20${encodeURIComponent(product.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center w-full rounded-full bg-primary/10 text-primary px-4 py-2 text-xs font-medium hover:bg-primary/20 transition-all duration-300"
          >
            Consultar disponibilidad
          </a>
        </div>
      </div>
    </motion.div>
  );
}
