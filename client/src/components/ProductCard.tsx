import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addItem(product);
    toast({
      title: "Added to cart",
      description: `${product.name} is now in your cart.`,
      duration: 2000,
    });
  };

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
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button 
                onClick={handleAddToCart}
                className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 bg-white text-foreground hover:bg-white/90 rounded-full font-bold px-6 shadow-lg"
            >
                <Plus className="mr-2 h-4 w-4" /> Add to Cart
            </Button>
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold tracking-widest uppercase text-primary/80">
                {product.category}
            </span>
            <span className="font-display font-bold text-lg">
                ${Number(product.price).toFixed(2)}
            </span>
        </div>
        <h3 className="font-display text-xl font-bold mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
          {product.description}
        </p>
      </div>
    </motion.div>
  );
}
