import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CakeSlice,
  Package,
  Settings,
  Users,
  LogOut,
  Plus,
  Trash2,
  ImagePlus,
  Search,
  Mail,
  Lock,
  Phone,
  MapPin,
  Clock,
  Globe,
  Share2,
  FileText,
  Shield,
  UserPlus,
  ExternalLink,
  Save,
  Loader2,
  Home,
  ChevronRight,
  Tag,
  DollarSign,
  Boxes,
  Menu,
  X,
  FolderPlus,
  LayoutDashboard,
  ShoppingBag,
  Folders,
  Printer,
  Crown,
  type LucideIcon,
} from "lucide-react";

// ── Gravatar Avatar ──────────────────────────────────────────────────────────
function AdminAvatar({ email, name, size = 36, className = "" }: { email: string; name: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const normalized = email.trim().toLowerCase();
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        if (!cancelled) setSrc(`https://www.gravatar.com/avatar/${hex}?s=${size * 2}&d=404&r=pg`);
      } catch { /* no-op */ }
    }
    load();
    return () => { cancelled = true; };
  }, [email, size]);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setSrc(null)}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-rose-600 font-bold" style={{ fontSize: size * 0.33 }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// Types
interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  category: string;
  imageUrl: string;
}

type TabKey = "dashboard" | "products" | "categories" | "orders" | "settings" | "users";

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  weeklyOrders: number;
  averageOrderValue: number;
  topProducts: { name: string; totalSold: number; revenue: number }[];
  recentOrders: any[];
  revenueByCategory: { category: string; revenue: number }[];
}

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  paymentMethod: string;
  status: string;
  total: string;
  createdAt: string;
}

// Evento global para detectar sesión expirada desde cualquier componente
const ADMIN_SESSION_EXPIRED = "admin-session-expired";

// API Helpers
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (res.status === 401 && url !== "/api/admin/login" && url !== "/api/admin/me") {
    // Sesión expirada — notificar al componente raíz para regresar al login
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED));
    throw new Error("Sesión expirada. Inicia sesión nuevamente.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error" }));
    throw new Error(err.message);
  }
  return res.json();
}

const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

const DEFAULT_CATEGORIES = [
  "Postres Grandes",
  "Postres Individuales",
  "Cajas de Roles",
  "Bebidas Calientes",
  "Lattes Fr\u00edos",
  "Bebidas Fr\u00edas",
];

// LOGIN COMPONENT
function AdminLogin({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiFetch("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-amber-50 px-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmNDM2NTYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgyVjRoMzR6TTIgMzRoMnYtMkgydjJ6bTAtMzBoMnYtMkgydjJ6bTM0IDBWMmgydjJoLTJ6bTAgMzB2MmgyVjM0aC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      <div className="relative w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-rose-100/50 border border-white/60 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 via-pink-500 to-amber-400" />
          <div className="p-6 sm:p-8 pt-8 sm:pt-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/60 mb-4">
                <CakeSlice className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Panel de Administracion
              </h1>
              <p className="text-sm text-slate-400 mt-1 tracking-wide">Endulzarte · Postreria & Roll</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-rose-300 focus:ring-rose-200 transition-colors" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contrasena</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-rose-300 focus:ring-rose-200 transition-colors" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-md shadow-rose-200/50 transition-all" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</span>
                ) : "Iniciar Sesion"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// CATEGORY SELECTOR WITH CUSTOM INPUT
function CategorySelector({ value, onChange, allProducts }: { value: string; onChange: (v: string) => void; allProducts: Product[] }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const existingCategories = Array.from(new Set(allProducts.map((p) => p.category)));
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories])).sort();

  const isCurrentCustom = value && !allCategories.includes(value);

  function handleSelectChange(v: string) {
    if (v === "__custom__") {
      setIsCustom(true);
      setCustomValue("");
    } else {
      setIsCustom(false);
      onChange(v);
    }
  }

  function handleCustomConfirm() {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsCustom(false);
    }
  }

  if (isCustom) {
    return (
      <div className="flex gap-2">
        <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Nombre de la nueva categoria" className="flex-1 bg-slate-50/50 border-slate-200" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCustomConfirm(); } }} autoFocus />
        <Button type="button" size="sm" onClick={handleCustomConfirm} className="bg-rose-500 hover:bg-rose-600 text-white h-9 px-3" disabled={!customValue.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setIsCustom(false)} className="h-9 px-3 border-slate-200">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={isCurrentCustom ? "__display_custom__" : value} onValueChange={handleSelectChange}>
      <SelectTrigger className="bg-slate-50/50 border-slate-200">
        <SelectValue placeholder="Seleccionar categoria">{isCurrentCustom ? value : undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allCategories.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
        {isCurrentCustom && !allCategories.includes(value) && (
          <SelectItem value="__display_custom__">{value}</SelectItem>
        )}
        <SelectItem value="__custom__">
          <span className="flex items-center gap-1.5 text-rose-600">
            <FolderPlus className="w-3.5 h-3.5" />
            Nueva categoria...
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// PRODUCTS TAB
function ProductsTab({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({ name: "", description: "", price: "", stock: 50, category: "", imageUrl: "" });
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => apiFetch("/api/admin/products"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; body: any }) =>
      data.id
        ? apiFetch(`/api/admin/products/${data.id}`, { method: "PUT", body: JSON.stringify(data.body) })
        : apiFetch("/api/admin/products", { method: "POST", body: JSON.stringify(data.body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditProduct(null);
      toast({ title: "Producto guardado correctamente" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Producto eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openEdit(product: Product) {
    setIsNew(false);
    setEditProduct(product);
    setForm({ name: product.name, description: product.description, price: product.price, stock: product.stock, category: product.category, imageUrl: product.imageUrl });
    setImagePreview(product.imageUrl);
  }

  function openNew() {
    setIsNew(true);
    setEditProduct({ id: 0 } as Product);
    setForm({ name: "", description: "", price: "", stock: 50, category: "Postres Grandes", imageUrl: "" });
    setImagePreview("");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const data = reader.result as string;
        setImagePreview(data);
        const result = await apiFetch("/api/admin/upload", { method: "POST", body: JSON.stringify({ data, filename: file.name }) });
        setForm((f) => ({ ...f, imageUrl: result.url }));
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
  }

  function handleSave() {
    saveMutation.mutate({ id: isNew ? undefined : editProduct?.id, body: form });
  }

  const canEditText = user.role === "admin" || user.role === "editor";
  const canDelete = user.role === "admin";
  const allProductCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)]));

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <span className="text-slate-400">Cargando productos...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Productos</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{products.length} productos en catalogo</p>
        </div>
        {canEditText && (
          <Button onClick={openNew} size="sm" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-200/40 h-9">
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white border-slate-200 h-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200 h-10">
            <SelectValue placeholder="Todas las categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {allProductCategories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredProducts.map((p) => (
          <div key={p.id} onClick={() => openEdit(p)} className="group bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-200">
            <div className="h-28 sm:h-40 bg-slate-100 relative overflow-hidden">
              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?auto=format&fit=crop&q=80&w=400"; }} />
              {/* Warning badge for ephemeral local uploads */}
              {p.imageUrl.startsWith("/uploads/") && (
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-400 text-white shadow-sm" title="Imagen local — se perderá al reiniciar Render. Re-sube la imagen.">
                  \u26a0 Local
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm">
                  <Tag className="w-3 h-3" />{p.category}
                </span>
              </div>
            </div>
            <div className="p-2.5 sm:p-3.5">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{p.name}</h3>
              <div className="flex items-center justify-between mt-1 sm:mt-2">
                <span className="text-rose-600 font-bold text-sm sm:text-base">${p.price}</span>
                <span className={`text-[10px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded ${
                  p.stock === 0 ? "bg-red-100 text-red-600" :
                  p.stock <= 3 ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-500"
                }`}>{p.stock === 0 ? "Agotado" : `${p.stock} en stock`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <Search className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No se encontraron productos</p>
        </div>
      )}

      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Package className="w-5 h-5 text-rose-500" />
              {isNew ? "Nuevo Producto" : "Editar Producto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-5 pt-2">
            <div>
              <label className={labelClass}>Imagen</label>
              {imagePreview && <img src={imagePreview} alt="Preview" className="w-full h-36 sm:h-48 object-cover rounded-lg mb-3 border border-slate-200" />}
              <div className="flex gap-2">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="border-dashed border-slate-300 text-slate-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50">
                  {uploadingImage ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</span>
                  ) : (
                    <span className="flex items-center gap-2"><ImagePlus className="w-4 h-4" /> Subir Imagen</span>
                  )}
                </Button>
              </div>
              <Input className="mt-2 bg-slate-50/50 border-slate-200" placeholder="O pega una URL de imagen" value={form.imageUrl} onChange={(e) => { setForm(f => ({ ...f, imageUrl: e.target.value })); setImagePreview(e.target.value); }} />
            </div>
            <div>
              <label className={labelClass}>Precio</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" step="0.01" placeholder="0.00" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="pl-10 bg-slate-50/50 border-slate-200" />
              </div>
            </div>
            {canEditText && (
              <>
                <div>
                  <label className={labelClass}>Nombre</label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del producto" className="bg-slate-50/50 border-slate-200" />
                </div>
                <div>
                  <label className={labelClass}>Descripcion</label>
                  <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripcion del producto" rows={3} className="bg-slate-50/50 border-slate-200" />
                </div>
                <div>
                  <label className={labelClass}>Categoria</label>
                  <CategorySelector value={form.category} onChange={(v) => setForm(f => ({ ...f, category: v }))} allProducts={products} />
                </div>
              </>
            )}
            {user.role === "admin" && (
              <div>
                <label className={labelClass}>Stock</label>
                <div className="relative">
                  <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input type="number" value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} className="pl-10 bg-slate-50/50 border-slate-200" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-4 border-t border-slate-100 flex-col-reverse sm:flex-row">
            {canDelete && !isNew && editProduct && (
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 sm:mr-auto w-full sm:w-auto" onClick={() => { if (confirm("Eliminar este producto?")) { deleteMutation.mutate(editProduct.id); setEditProduct(null); } }}>
                <Trash2 className="w-4 h-4 mr-1.5" />Eliminar
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setEditProduct(null)} className="border-slate-200 flex-1 sm:flex-none">Cancelar</Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white flex-1 sm:flex-none" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// SETTINGS TAB
function SettingsTab({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Profile state ──────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ name: user.name, email: user.email, password: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleSaveProfile() {
    if (profile.password && profile.password !== profile.confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    const body: Record<string, string> = {};
    if (profile.name.trim() && profile.name !== user.name) body.name = profile.name.trim();
    if (profile.email.trim() && profile.email !== user.email) body.email = profile.email.trim();
    if (profile.password) body.password = profile.password;
    if (!Object.keys(body).length) {
      toast({ title: "Sin cambios", description: "No hay nada nuevo que guardar." });
      return;
    }
    setSavingProfile(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "PUT", body: JSON.stringify(body) });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      setProfile((p) => ({ ...p, password: "", confirmPassword: "" }));
      toast({ title: "✅ Perfil actualizado", description: "Los cambios se aplicaron correctamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  }

  const { data, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiFetch("/api/admin/settings"),
  });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configuracion guardada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <span className="text-slate-400">Cargando configuracion...</span>
      </div>
    );
  }

  // owner also gets all admin-level settings
  const isAdmin = user.role === "admin" || user.role === "owner";

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Configuracion</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Administra la informacion del sitio web</p>
      </div>

      {/* ─ MI PERFIL ─ */}
      <SectionCard icon={Users} title="Mi Perfil" description="Cambia tu nombre, email o contraseña">
        <div>
          <label className={labelClass}>Nombre</label>
          <Input
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="bg-slate-50/50 border-slate-200"
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="pl-10 bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Nueva contraseña <span className="text-slate-300 font-normal">(dejar vacío para no cambiar)</span></label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="password"
              value={profile.password}
              onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              className="pl-10 bg-slate-50/50 border-slate-200"
            />
          </div>
        </div>
        {profile.password && (
          <div>
            <label className={labelClass}>Confirmar contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="password"
                value={profile.confirmPassword}
                onChange={(e) => setProfile((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                className="pl-10 bg-slate-50/50 border-slate-200"
              />
            </div>
          </div>
        )}
        <Button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-200/40 w-full sm:w-auto"
        >
          {savingProfile ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
          ) : (
            <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Perfil</span>
          )}
        </Button>
      </SectionCard>

      {isAdmin && (
        <SectionCard icon={Share2} title="Redes Sociales" description="Enlaces a tus perfiles sociales">
          <div><label className={labelClass}>WhatsApp (numero completo)</label><Input value={settings.whatsapp || ""} onChange={(e) => updateSetting("whatsapp", e.target.value)} placeholder="+5213123011075" className="bg-slate-50/50 border-slate-200" /></div>
          <div><label className={labelClass}>Instagram URL</label><Input value={settings.instagram || ""} onChange={(e) => updateSetting("instagram", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
          <div><label className={labelClass}>Facebook URL</label><Input value={settings.facebook || ""} onChange={(e) => updateSetting("facebook", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
        </SectionCard>
      )}

      {isAdmin && (
        <SectionCard icon={MapPin} title="Contacto" description="Informacion de contacto y ubicacion">
          <div><label className={labelClass}>Telefono</label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input value={settings.phone || ""} onChange={(e) => updateSetting("phone", e.target.value)} className="pl-10 bg-slate-50/50 border-slate-200" /></div></div>
          <div><label className={labelClass}>Email de contacto</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input value={settings.contact_email || ""} onChange={(e) => updateSetting("contact_email", e.target.value)} className="pl-10 bg-slate-50/50 border-slate-200" /></div></div>
          <div><label className={labelClass}>Ubicacion (texto)</label><Input value={settings.location_text || ""} onChange={(e) => updateSetting("location_text", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
          <div><label className={labelClass}>Google Maps URL</label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input value={settings.google_maps || ""} onChange={(e) => updateSetting("google_maps", e.target.value)} className="pl-10 bg-slate-50/50 border-slate-200" /></div></div>
        </SectionCard>
      )}

      <SectionCard icon={Clock} title="Horarios" description="Horario de atencion de la tienda">
        <div><label className={labelClass}>Lunes a Sabado</label><Input value={settings.hours_weekdays || ""} onChange={(e) => updateSetting("hours_weekdays", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
        <div><label className={labelClass}>Domingo</label><Input value={settings.hours_sunday || ""} onChange={(e) => updateSetting("hours_sunday", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
      </SectionCard>

      <SectionCard icon={FileText} title="Texto de la Pagina" description="Contenido que aparece en la pagina principal">
        <div><label className={labelClass}>Titulo Hero</label><Input value={settings.hero_title || ""} onChange={(e) => updateSetting("hero_title", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
        <div><label className={labelClass}>Subtitulo Hero</label><Input value={settings.hero_subtitle || ""} onChange={(e) => updateSetting("hero_subtitle", e.target.value)} className="bg-slate-50/50 border-slate-200" /></div>
        <div><label className={labelClass}>Texto "Nosotros"</label><Textarea value={settings.about_text || ""} onChange={(e) => updateSetting("about_text", e.target.value)} rows={4} className="bg-slate-50/50 border-slate-200" /></div>
      </SectionCard>

      <div className="flex justify-end pt-2 pb-4">
        <Button onClick={handleSave} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-200/40 px-6 sm:px-8 w-full sm:w-auto" disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
          ) : (
            <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Configuracion</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// Extracted outside SettingsTab so React doesn't remount it on every keystroke
function SectionCard({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm sm:text-[15px]">{title}</h3>
          {description && <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4">{children}</div>
    </div>
  );
}

// USERS TAB
function UsersTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "employee" });

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiFetch("/api/admin/users"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowNew(false);
      setNewUser({ email: "", password: "", name: "", role: "employee" });
      toast({ title: "Usuario creado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => apiFetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Rol actualizado" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Usuario eliminado" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" /><span className="text-slate-400">Cargando usuarios...</span></div>);
  }

  const roleConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    owner: { label: "Owner/Dueño", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Crown },
    admin: { label: "Administrador", color: "bg-rose-50 text-rose-700 border-rose-200", icon: Shield },
    editor: { label: "Editor", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: FileText },
    employee: { label: "Empleado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Package },
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Usuarios</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-200/40 h-9">
          <UserPlus className="w-4 h-4 mr-1.5" />Nuevo Usuario
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((u) => {
          const config = roleConfig[u.role] || { label: u.role, color: "bg-slate-50 text-slate-700 border-slate-200", icon: Users };
          const RoleIcon = config.icon;
          return (
            <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-rose-600 font-semibold text-sm">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                  <p className="text-xs sm:text-sm text-slate-400 truncate">{u.email}</p>
                </div>
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                  <RoleIcon className="w-3 h-3" />{config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 sm:mt-2">
                <span className={`sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.color}`}>
                  <RoleIcon className="w-3 h-3" />{config.label}
                </span>
                <div className="flex-1" />
                <Select value={u.role} onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] bg-slate-50/50 border-slate-200 text-xs sm:text-sm h-8 sm:h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner/Dueño</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="text-red-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 h-8 sm:h-9 w-8 sm:w-9 p-0" onClick={() => { if (confirm(`Eliminar a ${u.name}?`)) deleteMutation.mutate(u.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <UserPlus className="w-5 h-5 text-rose-500" />Nuevo Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><label className={labelClass}>Nombre</label><Input value={newUser.name} onChange={(e) => setNewUser(n => ({ ...n, name: e.target.value }))} className="bg-slate-50/50 border-slate-200" /></div>
            <div><label className={labelClass}>Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input type="email" value={newUser.email} onChange={(e) => setNewUser(n => ({ ...n, email: e.target.value }))} className="pl-10 bg-slate-50/50 border-slate-200" /></div></div>
            <div><label className={labelClass}>Contrasena</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input type="password" value={newUser.password} onChange={(e) => setNewUser(n => ({ ...n, password: e.target.value }))} className="pl-10 bg-slate-50/50 border-slate-200" /></div></div>
            <div>
              <label className={labelClass}>Rol</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser(n => ({ ...n, role: v }))}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner/Dueño</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
              <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-slate-500" /><strong className="text-slate-700">Permisos por Rol</strong></div>
              <ul className="space-y-1.5 text-slate-500">
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 flex-shrink-0" /><span><strong className="text-slate-600">Admin:</strong> Acceso total</span></li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0" /><span><strong className="text-slate-600">Editor:</strong> Productos, horarios</span></li>
                <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0" /><span><strong className="text-slate-600">Empleado:</strong> Solo imagen y precio</span></li>
              </ul>
            </div>
          </div>
          <DialogFooter className="pt-2 flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)} className="border-slate-200 w-full sm:w-auto">Cancelar</Button>
            <Button onClick={() => createMutation.mutate(newUser)} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white w-full sm:w-auto" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creando...</span>
              ) : (
                <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Crear Usuario</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// DASHBOARD TAB
function DashboardTab() {
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
    queryFn: () => apiFetch("/api/admin/dashboard"),
    refetchInterval: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <span className="text-slate-400">Cargando estadisticas...</span>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-slate-500 font-medium">Error cargando el dashboard</p>
        <p className="text-slate-400 text-sm">Verifica que haya pedidos registrados y que la conexión sea estable.</p>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);

  const statCards = [
    { label: "Ingresos Totales", value: fmt(stats.totalRevenue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Ingresos Hoy", value: fmt(stats.todayRevenue), icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
    { label: "Pedidos Totales", value: stats.totalOrders, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    { label: "Pedidos Hoy", value: stats.todayOrders ?? 0, icon: ShoppingBag, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Pendientes", value: stats.pendingOrders, icon: Clock, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
    { label: "Esta Semana", value: stats.weeklyOrders, icon: LayoutDashboard, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dashboard</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Resumen de ventas y pedidos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} p-4 shadow-sm`}>
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-rose-400" /> Productos Mas Vendidos
          </h3>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-2">
              {stats.topProducts.slice(0, 6).map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{p.name}</span>
                  <span className="text-xs text-slate-400">{p.totalSold} venta{p.totalSold !== 1 ? "s" : ""}</span>
                  <span className="text-xs font-medium text-emerald-600">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">Sin datos todavia</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <ShoppingBag className="w-4 h-4 text-rose-400" /> Pedidos Recientes
          </h3>
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-2">
              {stats.recentOrders.slice(0, 6).map((o: any) => (
                <div key={o.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 flex-shrink-0">#{o.orderNumber}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{o.customerName}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    o.status === "delivered" ? "bg-emerald-50 text-emerald-700" :
                    o.status === "cancelled" ? "bg-red-50 text-red-700" :
                    o.status === "ready" ? "bg-sky-50 text-sky-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>{o.status}</span>
                  <span className="text-xs font-medium text-emerald-600">{fmt(Number(o.total))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">Sin pedidos todavia</p>
          )}
        </div>
      </div>
    </div>
  );
}

// CATEGORIES TAB
function CategoriesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: categories = [], isLoading } = useQuery<string[]>({
    queryKey: ["/api/admin/categories"],
    queryFn: () => apiFetch("/api/admin/categories"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      apiFetch("/api/admin/categories/rename", { method: "PUT", body: JSON.stringify({ oldName, newName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setEditingName(null);
      toast({ title: "Categoria actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ name, reassign }: { name: string; reassign?: string }) => {
      const url = `/api/admin/categories/${encodeURIComponent(name)}${reassign ? `?reassignTo=${encodeURIComponent(reassign)}` : ""}`;
      return apiFetch(url, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setDeletingName(null);
      toast({ title: "Categoria eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      setShowNew(false);
      setNewCatName("");
      toast({ title: "Categoria creada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <span className="text-slate-400">Cargando categorias...</span>
      </div>
    );
  }

  const otherCategories = deletingName ? categories.filter((c) => c !== deletingName) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Categorias</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{categories.length} categorias</p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-200/40 h-9">
          <FolderPlus className="w-4 h-4 mr-1.5" />Nueva
        </Button>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:border-slate-300 transition-colors">
            <Folders className="w-4 h-4 text-rose-400 flex-shrink-0" />
            {editingName === cat ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 text-sm bg-slate-50 border-slate-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameMutation.mutate({ oldName: cat, newName: editValue });
                    if (e.key === "Escape") setEditingName(null);
                  }}
                  autoFocus
                />
                <Button size="sm" className="h-8 bg-rose-500 hover:bg-rose-600 text-white px-3" onClick={() => renameMutation.mutate({ oldName: cat, newName: editValue })} disabled={renameMutation.isPending}>
                  {renameMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-3 border-slate-200" onClick={() => setEditingName(null)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-slate-700">{cat}</span>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-50" onClick={() => { setEditingName(cat); setEditValue(cat); }}>
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => { setDeletingName(cat); setReassignTo(""); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* New category dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <FolderPlus className="w-5 h-5 text-rose-500" />Nueva Categoria
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <label className={labelClass}>Nombre de la categoria</label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="bg-slate-50/50 border-slate-200" placeholder="Ej: Cupcakes" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) createMutation.mutate(newCatName.trim()); }} />
          </div>
          <DialogFooter className="pt-2 flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)} className="border-slate-200 w-full sm:w-auto">Cancelar</Button>
            <Button onClick={() => createMutation.mutate(newCatName.trim())} className="bg-gradient-to-r from-rose-500 to-pink-600 text-white w-full sm:w-auto" disabled={!newCatName.trim() || createMutation.isPending}>
              {createMutation.isPending ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Creando...</span> : <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Crear</span>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deletingName} onOpenChange={(open) => { if (!open) setDeletingName(null); }}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria "{deletingName}"</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Esta accion eliminara la categoria. Los productos vinculados quedaran sin categoria.</p>
              {otherCategories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Reasignar productos a (opcional):</p>
                  <Select value={reassignTo} onValueChange={setReassignTo}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Dejar sin categoria" /></SelectTrigger>
                    <SelectContent>
                      {otherCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="border-slate-200 w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto" onClick={() => deletingName && deleteMutation.mutate({ name: deletingName, reassign: reassignTo || undefined })}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ORDERS TAB
function OrdersTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => apiFetch("/api/admin/orders"),
    refetchInterval: 30_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Estado actualizado" });
      // Auto-open printable ticket when order is confirmed
      if (variables.status === "confirmed") {
        window.open(`/api/admin/orders/${variables.id}/ticket`, "_blank");
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusOptions = [
    { value: "pending", label: "Pendiente", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "confirmed", label: "Confirmado", color: "bg-sky-50 text-sky-700 border-sky-200" },
    { value: "preparing", label: "Preparando", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { value: "ready", label: "Listo", color: "bg-lime-50 text-lime-700 border-lime-200" },
    { value: "delivered", label: "Entregado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { value: "cancelled", label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
  ];

  const getStatusColor = (status: string) => statusOptions.find((s) => s.value === status)?.color ?? "bg-slate-50 text-slate-700 border-slate-200";
  const getStatusLabel = (status: string) => statusOptions.find((s) => s.value === status)?.label ?? status;

  const paymentLabels: Record<string, string> = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    tarjeta: "Tarjeta",
  };

  const typeLabels: Record<string, string> = {
    domicilio: "Domicilio",
    recoger: "Recoger",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <span className="text-slate-400">Cargando pedidos...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pedidos</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{orders.length} pedidos registrados</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] })}>
          Actualizar
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No hay pedidos todavia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-600">#{order.orderNumber}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mt-1">{order.customerName}</p>
                  <p className="text-xs text-slate-400">{order.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">${Number(order.total).toLocaleString("es-MX")}</p>
                  <p className="text-[11px] text-slate-400">{typeLabels[order.orderType] ?? order.orderType} · {paymentLabels[order.paymentMethod] ?? order.paymentMethod}</p>
                  <p className="text-[11px] text-slate-400">{new Date(order.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <Select value={order.status} onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}>
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50/50 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                  onClick={() => window.open(`/api/admin/orders/${order.id}/ticket`, "_blank")}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />Ticket
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// MAIN ADMIN PAGE
export default function Admin() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/me")
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setChecking(false));

    // Escuchar sesión expirada desde cualquier sub-componente
    const handleExpired = () => {
      setUser(null);
      setChecking(false);
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED, handleExpired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED, handleExpired);
  }, []);

  async function handleLogout() {
    await apiFetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-amber-50">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400 mr-3" />
        <p className="text-slate-400">Verificando sesion...</p>
      </div>
    );
  }

  if (!user) return <AdminLogin onLogin={setUser} />;

  const roleConfig: Record<string, { label: string; color: string }> = {
    owner: { label: "Owner", color: "bg-purple-50 text-purple-700 border-purple-200" },
    admin: { label: "Admin", color: "bg-rose-50 text-rose-700 border-rose-200" },
    editor: { label: "Editor", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    employee: { label: "Empleado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  };

  const navItems: { key: TabKey; label: string; icon: LucideIcon; roles: string[] }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "owner"] },
    { key: "products", label: "Productos", icon: Package, roles: ["admin", "editor", "employee", "owner"] },
    { key: "orders", label: "Pedidos", icon: ShoppingBag, roles: ["admin", "editor", "employee", "owner"] },
    { key: "categories", label: "Categorias", icon: Folders, roles: ["admin", "editor", "owner"] },
    { key: "settings", label: "Configuracion", icon: Settings, roles: ["admin", "editor", "owner"] },
    { key: "users", label: "Usuarios", icon: Users, roles: ["admin", "owner"] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));
  const userRoleConfig = roleConfig[user.role] || { label: user.role, color: "bg-slate-100 text-slate-700" };

  function handleNavClick(key: TabKey) {
    setActiveTab(key);
    setMobileMenuOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md shadow-rose-200/50">
            <CakeSlice className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-[15px] leading-tight">Endulzarte</h1>
            <p className="text-[11px] text-slate-400 tracking-wide">Panel Admin</p>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Menu</p>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button key={item.key} onClick={() => handleNavClick(item.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? "bg-rose-50 text-rose-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
              <Icon className={`w-[18px] h-[18px] ${isActive ? "text-rose-500" : "text-slate-400"}`} />
              {item.label}
              {isActive && <ChevronRight className="w-4 h-4 ml-auto text-rose-400" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button onClick={() => setLocation("/")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors mb-3">
          <ExternalLink className="w-4 h-4" />Ver sitio web
        </button>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <AdminAvatar email={user.email} name={user.name} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${userRoleConfig.color}`}>{userRoleConfig.label}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-white hover:text-red-500 border border-transparent hover:border-slate-200 transition-all">
            <LogOut className="w-3.5 h-3.5" />Cerrar Sesion
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50/50" style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}>
      {/* MOBILE: Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                <CakeSlice className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Endulzarte</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${userRoleConfig.color}`}>{userRoleConfig.label}</span>
            <AdminAvatar email={user.email} name={user.name} size={32} />
          </div>
        </div>
      </header>

      {/* MOBILE: Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* DESKTOP: Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col min-h-screen fixed left-0 top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        <header className="hidden md:block sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4 text-slate-400" />
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700 font-medium">{activeTab === "dashboard" ? "Dashboard" : activeTab === "products" ? "Productos" : activeTab === "orders" ? "Pedidos" : activeTab === "categories" ? "Categorias" : activeTab === "settings" ? "Configuracion" : "Usuarios"}</span>
            </div>
            <p className="text-xs text-slate-400">Conectado como <strong className="text-slate-600">{user.email}</strong></p>
          </div>
        </header>

        <div className="md:hidden px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => setActiveTab(item.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === item.key ? "bg-rose-50 text-rose-700" : "text-slate-500"}`}>
                  <Icon className="w-3.5 h-3.5" />{item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "products" && <ProductsTab user={user} />}
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "settings" && <SettingsTab user={user} />}
          {activeTab === "users" && <UsersTab />}
        </div>
      </main>
    </div>
  );
}
