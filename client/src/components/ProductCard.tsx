import { Product } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/hooks/use-settings";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, MessageCircle, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// ── Variant type (mirrors server ProductVariant) ─────────────────────────────
interface Variant {
  id: number;
  productId: number;
  label: string;
  price: string;
  stock: number;
  imageUrl?: string | null;
  sortOrder: number;
}

async function fetchVariants(productId: number): Promise<Variant[]> {
  const res = await fetch(`/api/products/${productId}/variants`);
  if (!res.ok) return [];
  return res.json();
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: settings } = useSettings();
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  // ── Variants ────────────────────────────────────────────────────────────────
  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ["variants", product.id],
    queryFn: () => fetchVariants(product.id),
    staleTime: 1000 * 60 * 5,
  });

  const hasVariants = variants.length > 0;
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const selectedVariant = hasVariants ? variants[selectedVariantIdx] : null;

  useEffect(() => {
    if (variants.length > 0) setSelectedVariantIdx(0);
  }, [variants.length]);

  // ── Quantity ─────────────────────────────────────────────────────────────────
  const maxStock = selectedVariant ? selectedVariant.stock : (product.stock ?? 99);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => { setQuantity(1); }, [selectedVariantIdx]);

  // ── Comment ──────────────────────────────────────────────────────────────────
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  // ── Carousel ──────────────────────────────────────────────────────────────────
  const images: string[] = [];
  if (hasVariants) {
    variants.forEach((v) => { if (v.imageUrl && v.imageUrl.trim()) images.push(v.imageUrl); });
  }
  if (product.imageUrl) images.push(product.imageUrl);
  const uniqueImages = [...new Set(images)];

  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (selectedVariant?.imageUrl?.trim()) {
      const idx = uniqueImages.indexOf(selectedVariant.imageUrl);
      if (idx >= 0) setCarouselIdx(idx);
    } else {
      const baseIdx = uniqueImages.indexOf(product.imageUrl);
      setCarouselIdx(baseIdx >= 0 ? baseIdx : 0);
    }
  }, [selectedVariantIdx]);

  const showCarousel = uniqueImages.length > 1;
  const activeImage = uniqueImages[carouselIdx] || product.imageUrl;
  const effectivePrice = selectedVariant ? selectedVariant.price : product.price;
  const waNumber = settings?.whatsapp?.replace(/[^0-9]/g, "") || "5213123011075";
  const outOfStock = maxStock === 0;

  const handleAddToCart = () => {
    if (outOfStock) return;
    addItem({
      product,
      variantId: selectedVariant?.id,
      variantLabel: selectedVariant?.label,
      variantPrice: selectedVariant?.price,
      variantImageUrl: selectedVariant?.imageUrl ?? undefined,
      quantity,
      comment: comment.trim() || undefined,
    });
    setAdded(true);
    const prevComment = comment;
    setComment("");
    setShowComment(false);
    setQuantity(1);
    setTimeout(() => { openCart(); setAdded(false); }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden card-hover flex flex-col"
    >
      {/* ── Image / Carousel ─────────────────────────────────────────────── */}
      <div className="relative aspect-square sm:aspect-[4/5] overflow-hidden bg-muted">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImage}
            src={activeImage}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=400";
            }}
          />
        </AnimatePresence>

        {showCarousel && (
          <>
            <button onClick={() => setCarouselIdx((c) => (c - 1 + uniqueImages.length) % uniqueImages.length)}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow text-slate-600 hover:bg-white transition-all" aria-label="Anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCarouselIdx((c) => (c + 1) % uniqueImages.length)}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 shadow text-slate-600 hover:bg-white transition-all" aria-label="Siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
              {uniqueImages.map((_, idx) => (
                <button key={idx} onClick={() => setCarouselIdx(idx)}
                  className={`rounded-full transition-all ${carouselIdx === idx ? "bg-white w-2 h-2" : "bg-white/50 w-1.5 h-1.5"}`} />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 sm:p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-white font-display text-base sm:text-lg font-bold">
            ${Number(effectivePrice).toFixed(0)} MXN
          </span>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">Agotado</span>
          </div>
        )}
      </div>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-start gap-1">
          <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-primary/80 line-clamp-1">
            {product.category}
          </span>
          <span className="font-display font-bold text-sm sm:text-lg text-primary whitespace-nowrap">
            ${Number(effectivePrice).toFixed(0)}
          </span>
        </div>
        <h3 className="font-display text-sm sm:text-xl font-bold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <p className="hidden sm:block text-muted-foreground text-xs sm:text-sm line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Variant radio buttons */}
        {hasVariants && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {variants.map((v, idx) => {
              const sel = idx === selectedVariantIdx;
              const isOut = v.stock === 0;
              return (
                <button key={v.id} type="button" disabled={isOut} onClick={() => setSelectedVariantIdx(idx)}
                  className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-full border transition-all font-medium
                    ${sel ? "border-primary bg-primary text-white"
                      : isOut ? "border-slate-200 bg-slate-50 text-slate-300 line-through cursor-not-allowed"
                      : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"}`}>
                  {v.label}
                  {!isOut && <span className="ml-1 opacity-75">${Number(v.price).toFixed(0)}</span>}
                  {isOut && <span className="ml-1">(agotado)</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Quantity selector */}
        {!outOfStock && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">Cantidad:</span>
            <div className="flex items-center gap-1 border border-slate-200 rounded-full overflow-hidden">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-semibold w-5 text-center select-none">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(Math.min(maxStock, 99), q + 1))}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {maxStock > 0 && maxStock <= 5 && (
              <span className="text-[10px] text-amber-500 font-medium">Solo {maxStock} disp.</span>
            )}
          </div>
        )}

        {/* Comment */}
        {!outOfStock && (
          <>
            <button type="button" onClick={() => setShowComment(!showComment)}
              className="text-[11px] text-slate-400 hover:text-primary transition-colors text-left underline underline-offset-2 mt-0.5">
              {showComment ? "Quitar nota" : "+ Agregar nota especial"}
            </button>
            {showComment && (
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Ej: sin azúcar, dedicatoria, sin nueces..."
                rows={2}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 w-full placeholder:text-slate-300" />
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="mt-auto pt-1 flex flex-col gap-1.5">
          <button type="button" onClick={handleAddToCart} disabled={outOfStock}
            className={`inline-flex items-center justify-center w-full rounded-full px-3 py-2 text-xs sm:text-sm font-semibold transition-all duration-300
              ${outOfStock ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : added ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-primary/90"}`}>
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="sm:hidden">{outOfStock ? "Agotado" : added ? "¡Añadido!" : "Al carrito"}</span>
            <span className="hidden sm:inline">{outOfStock ? "Sin stock" : added ? "¡Agregado!" : "Agregar al carrito"}</span>
          </button>
          <a href={`https://wa.me/${waNumber}?text=Hola%20Dulce%20Vida%2C%20me%20interesa%20${encodeURIComponent(product.name + (selectedVariant ? ` (${selectedVariant.label})` : ""))}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-all duration-300">
            <MessageCircle className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="sm:hidden">Consultar</span>
            <span className="hidden sm:inline">Consultar disponibilidad</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
