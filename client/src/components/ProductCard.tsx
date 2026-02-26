import { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp?.replace(/[^0-9]/g, "") || "5213123011075";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-2xl overflow-hidden card-hover"
    >
      <div className="aspect-[4/5] overflow-hidden bg-muted relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=400"; }}
        />
        {/* Overlay con precio */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-white font-display text-lg font-bold">
            ${Number(product.price).toFixed(2)} MXN
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold tracking-widest uppercase text-primary/80">
                {product.category}
            </span>
            <span className="font-display font-bold text-lg text-primary">
                ${Number(product.price).toFixed(2)}
            </span>
        </div>
        <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <a
          href={`https://wa.me/${waNumber}?text=Hola%20Endulzarte%2C%20me%20interesa%20${encodeURIComponent(product.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center w-full rounded-full bg-primary/10 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary hover:text-white transition-all duration-300"
        >
          Consultar disponibilidad
        </a>
      </div>
    </motion.div>
  );
}
