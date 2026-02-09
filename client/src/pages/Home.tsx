import { Navigation } from "@/components/Navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowDown, Loader2 } from "lucide-react";

export default function Home() {
  const { data: products, isLoading, error } = useProducts();

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navigation />
      <CartDrawer />

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        {/* Abstract shapes/background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-60" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="container-custom grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm">
                <span className="text-sm font-medium text-primary tracking-wide uppercase">
                    Artisanal Pastry Shop
                </span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-display leading-[1.1]">
              Sweet <span className="text-primary italic font-handwriting">moments</span>,<br />
              baked with love.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Experience the perfect blend of tradition and innovation. 
              Our handcrafted pastries are designed to delight your senses 
              and elevate your everyday moments.
            </p>
            <div className="flex gap-4 pt-4">
              <Button size="lg" className="btn-primary h-14 px-8 text-base" onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Order Now
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-primary/20 hover:bg-primary/5">
                Our Story
              </Button>
            </div>
          </div>

          <div className="relative hidden lg:block h-[600px] animate-in fade-in zoom-in duration-1000 delay-200">
            {/* Hero Image */}
            {/* Unsplash: close-up of delicious croissant and coffee */}
            <div className="absolute inset-0 rounded-t-[100px] rounded-b-[40px] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
                <img 
                    src="https://images.unsplash.com/photo-1555507036-ab1f40388085?auto=format&fit=crop&q=80&w=1000" 
                    alt="Artisanal Pastries"
                    className="w-full h-full object-cover"
                />
            </div>
            {/* Floating Card */}
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl max-w-[200px] animate-bounce duration-[3000ms]">
                <p className="font-handwriting text-2xl text-primary mb-1">Freshly Baked</p>
                <p className="text-sm text-muted-foreground">Every morning at 6 AM</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block text-muted-foreground/50">
            <ArrowDown className="w-6 h-6" />
        </div>
      </section>

      {/* Featured Products */}
      <section id="products" className="py-24 bg-white relative">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-display">Our Creations</h2>
            <p className="text-muted-foreground">
                Handpicked favorites from our master bakers. Each piece is a unique work of art.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-10">
                Failed to load products. Please try again later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-foreground text-secondary py-16">
        <div className="container-custom grid md:grid-cols-3 gap-12">
            <div>
                <span className="font-handwriting text-3xl text-primary block mb-4">Endulzarte</span>
                <p className="text-secondary/60 leading-relaxed">
                    Bringing sweetness to your life, one pastry at a time. 
                    Visit us for a taste of happiness.
                </p>
            </div>
            <div>
                <h4 className="font-display text-xl mb-6 text-white">Contact</h4>
                <ul className="space-y-3 text-secondary/60">
                    <li>123 Baker Street, Sweet City</li>
                    <li>hello@endulzarte.com</li>
                    <li>+1 (555) 123-4567</li>
                </ul>
            </div>
            <div>
                <h4 className="font-display text-xl mb-6 text-white">Hours</h4>
                <ul className="space-y-3 text-secondary/60">
                    <li className="flex justify-between"><span>Mon - Fri</span> <span>7:00 AM - 8:00 PM</span></li>
                    <li className="flex justify-between"><span>Sat</span> <span>8:00 AM - 9:00 PM</span></li>
                    <li className="flex justify-between"><span>Sun</span> <span>8:00 AM - 6:00 PM</span></li>
                </ul>
            </div>
        </div>
        <div className="container-custom mt-16 pt-8 border-t border-white/10 text-center text-secondary/40 text-sm">
            © 2024 Pastelería Endulzarte. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
