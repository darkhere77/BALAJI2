import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Truck,
  ShieldCheck,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer, CartItemState } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { FragranceAdvisorModal } from './components/FragranceAdvisorModal.tsx';
import { PolicyModal } from './components/PolicyModal.tsx';

// Lazy load heavy Three.js 3D and Admin Dashboard for sub-100ms instant initial paint
const FragranceScene3D = lazy(() => import('./components/FragranceScene3D.tsx').then(m => ({ default: m.FragranceScene3D })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx').then(m => ({ default: m.AdminDashboard })));
import { apiFetch } from './lib/api-bridge.ts';
import {
  CatalogProduct,
  CalculationResult,
  StoreSettings,
  calculateOrderPricing,
  validateIndiaPinCode
} from './lib/commerce-rules.ts';
import { ASSET_IMAGES } from './data/product-images.ts';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_CATEGORIES } from './data/catalog.ts';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(() => window.location.pathname.startsWith('/admin'));
  const [products, setProducts] = useState<CatalogProduct[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Cart & Pricing
  const [cartItems, setCartItems] = useState<CartItemState[]>(() => {
    try {
      const saved = localStorage.getItem('sri_balaji_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [couponCode, setCouponCode] = useState('BALAJI10');
  const [couponError, setCouponError] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Modals & 3D
  const [is3DOpen, setIs3DOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNumber: string; guestToken: string } | null>(null);
  const [activePolicy, setActivePolicy] = useState<'about' | 'shipping' | 'refund' | 'privacy' | 'terms' | null>(null);

  // Hero PIN checker
  const [heroPin, setHeroPin] = useState('');
  const [heroPinResult, setHeroPinResult] = useState<{ checked: boolean; deliverable?: boolean; message?: string } | null>(null);
  const [isCheckingHeroPin, setIsCheckingHeroPin] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  // Sync with API if running
  useEffect(() => {
    apiFetch('/api/products')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && Array.isArray(data)) setProducts(data); })
      .catch(() => {});

    apiFetch('/api/categories')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && Array.isArray(data)) setCategories(data); })
      .catch(() => {});

    apiFetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.storeName) setSettings(data); })
      .catch(() => {});
  }, []);

  // Save Cart to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('sri_balaji_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Recalculate Cart (Server with resilient local fallback)
  useEffect(() => {
    if (cartItems.length === 0) {
      setCalculation(null);
      return;
    }

    apiFetch('/api/calculate-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems.map(it => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity
        })),
        couponCode
      })
    })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setCalculation(data);
          setCouponError('');
        } else {
          // Fallback to local pure logic calculation
          const localCoupon = couponCode === 'BALAJI10'
            ? { code: 'BALAJI10', discountType: 'percentage' as const, discountValue: 10, minOrderValue: 299, maxDiscount: 150, isActive: true }
            : couponCode === 'POOJA50'
            ? { code: 'POOJA50', discountType: 'flat' as const, discountValue: 50, minOrderValue: 499, isActive: true }
            : null;

          const calc = calculateOrderPricing({
            cartItems,
            catalog: products,
            coupon: localCoupon,
            settings
          });
          if (calc.success && calc.calculation) {
            setCalculation(calc.calculation);
          }
        }
      })
      .catch(() => {
        const localCoupon = couponCode === 'BALAJI10'
          ? { code: 'BALAJI10', discountType: 'percentage' as const, discountValue: 10, minOrderValue: 299, maxDiscount: 150, isActive: true }
          : null;
        const calc = calculateOrderPricing({
          cartItems,
          catalog: products,
          coupon: localCoupon,
          settings
        });
        if (calc.success && calc.calculation) {
          setCalculation(calc.calculation);
        }
      });
  }, [cartItems, couponCode, products, settings]);

  const handleAddToCart = (product: CatalogProduct, variantId?: string, qty = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const selectedVariant = product.variants?.find(v => v.id === variantId);
    const unitPrice = selectedVariant ? selectedVariant.price : (product.discountedPrice ?? product.price);
    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        it => it.productId === product.id && it.variantId === variantId
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = Math.min(availableStock, updated[existingIdx].quantity + qty);
        updated[existingIdx] = { ...updated[existingIdx], quantity: newQty };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            variantId,
            name: product.name + (selectedVariant ? ` (${selectedVariant.name})` : ''),
            slug: product.slug,
            unitPrice,
            quantity: Math.min(availableStock, qty),
            stock: availableStock
          }
        ];
      }
    });

    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  const handleUpdateQuantity = (productId: string, variantId: string | undefined, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId, variantId);
      return;
    }
    setCartItems(prev =>
      prev.map(it => {
        if (it.productId === productId && it.variantId === variantId) {
          return { ...it, quantity: Math.min(it.stock, newQty) };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (productId: string, variantId: string | undefined) => {
    setCartItems(prev => prev.filter(it => !(it.productId === productId && it.variantId === variantId)));
  };

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    const clean = code.toUpperCase().trim();
    if (clean === 'BALAJI10' || clean === 'POOJA50') {
      setCouponCode(clean);
      setCouponError('');
      return true;
    }
    setCouponError('Invalid coupon code. Try BALAJI10 or POOJA50');
    return false;
  };

  const validatePinApi = async (pin: string) => {
    try {
      const res = await apiFetch('/api/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) return await res.json();
    } catch {}
    return validateIndiaPinCode(pin, settings);
  };

  const handleHeroPinCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (heroPin.length !== 6) return;
    setIsCheckingHeroPin(true);
    try {
      const res = await validatePinApi(heroPin);
      setHeroPinResult({ checked: true, deliverable: res.deliverable, message: res.message });
    } catch {
      setHeroPinResult({ checked: true, deliverable: false, message: 'Unable to check PIN code' });
    } finally {
      setIsCheckingHeroPin(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all') {
      const matchedCat = categories.find(c => c.slug === selectedCategory);
      if (matchedCat && p.category.toLowerCase() !== matchedCat.name.toLowerCase()) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.fragrance && p.fragrance.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const cartTotalCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  if (isAdminView) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-[#7F1D1D] font-serif text-lg font-bold">Loading Admin Portal...</div>}>
        <AdminDashboard onBackToStore={() => setIsAdminView(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D241E]">
      {/* Top Navbar adhering to Top Bar Contract */}
      <Navbar
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onOpen3D={() => setIs3DOpen(true)}
        onSelectCategory={cat => setSelectedCategory(cat)}
        currentCategory={selectedCategory}
        onNavigateAdmin={() => setIsAdminView(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1">
        {/* 1. Hero Campaign Section */}
        <section className="relative bg-[#20140D] text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Brand Story & Campaign Copy */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
                  <span>Authentic Temple Heritage</span>
                  <span aria-hidden="true">·</span>
                  <span>Artisanal Southern India</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-[#FAF7F2]">
                  Sacred Fragrances for Daily Pooja, Dhyana & Inner Sanctity
                </h1>

                <p className="text-sm sm:text-base text-[#D6C7B8] leading-relaxed max-w-xl">
                  Hand-rolled flora agarbatti, pure benzoin cup sambrani, and sacred dhoop sticks made with natural temple herbs, pure sandalwood paste, and natural essential oils.
                </p>

                {/* Instant India Courier PIN Code Checker */}
                <div className="p-4 bg-[#2C1D13] border border-[#D4AF37]/30 rounded-xl max-w-lg space-y-2">
                  <span className="text-xs font-semibold text-[#E8C547] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#F59E0B]" />
                    <span>Check Express Courier Delivery to Your PIN Code:</span>
                  </span>
                  <form onSubmit={handleHeroPinCheck} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit India PIN (e.g. 560001, 110001)"
                      value={heroPin}
                      onChange={e => setHeroPin(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 px-3 py-2 text-xs bg-[#1C120C] border border-[#6B5A4D] rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="submit"
                      disabled={isCheckingHeroPin || heroPin.length !== 6}
                      className="px-4 py-2 bg-[#7F1D1D] hover:bg-[#991B1B] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isCheckingHeroPin ? 'Checking...' : 'Verify'}
                    </button>
                  </form>

                  {heroPinResult?.checked && (
                    <div className={`text-xs mt-1 font-medium ${heroPinResult.deliverable ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                      {heroPinResult.message}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('catalog-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 bg-[#7F1D1D] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>Shop Temple Collection</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIs3DOpen(true)}
                    className="px-5 py-3 bg-[#322117] hover:bg-[#452E20] text-[#E8C547] border border-[#D4AF37]/40 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-[#F59E0B]" />
                    <span>Explore 3D Brass Burner</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Hero High-Resolution Photography */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 shadow-2xl bg-[#140D09]">
                  <img
                    src={ASSET_IMAGES.hero}
                    alt="Authentic Sri Balaji Agarbatti and Pooja Aarti setup"
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[16/9] lg:aspect-[4/3] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4 text-xs text-[#FAF7F2] font-medium flex items-center justify-between">
                    <span>Hand-rolled Flora Bathi & Diya</span>
                    <span className="text-[#FBBF24] font-semibold">100% Pure Sandalwood Base</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Three.js Interactive 3D Dhoop Dani Experience Modal / Embed */}
        {is3DOpen && (
          <section className="bg-[#140D09] py-8 border-b border-[#3D2E25]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#FAF7F2]">
                    Interactive 3D Brass Sambrani Burner & Dhoop Dani
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Procedural 3D model with real-time aromatic smoke flow and authentic PBR studio brass finishes.
                  </p>
                </div>
                <button
                  onClick={() => setIs3DOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#2A1B13] rounded-lg border border-zinc-700 cursor-pointer"
                >
                  Close 3D View
                </button>
              </div>

              <Suspense fallback={<div className="h-[520px] bg-[#140D09] rounded-2xl border border-[#D4AF37]/30 flex items-center justify-center text-amber-200 text-xs">Loading 3D Ritual Scene...</div>}>
                <FragranceScene3D onClose={() => setIs3DOpen(false)} />
              </Suspense>
            </div>
          </section>
        )}

        {/* 3. Three Sacred Pillars of Trust */}
        <section className="bg-white border-b border-[#E7DFD5] py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FAF7F2] border border-[#E7DFD5]">
                <div className="w-10 h-10 rounded-lg bg-[#7F1D1D]/10 text-[#7F1D1D] flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-[#7F1D1D]" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#2D241E]">100% Natural Resins</h4>
                  <p className="text-xs text-[#6B5A4D] mt-0.5 leading-relaxed">
                    Zero synthetic DEP or toxic burning agents. Formulated strictly with pure benzoin loban, guggal, and natural woods.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FAF7F2] border border-[#E7DFD5]">
                <div className="w-10 h-10 rounded-lg bg-[#7F1D1D]/10 text-[#7F1D1D] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-[#7F1D1D]" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#2D241E]">All-India Express Courier</h4>
                  <p className="text-xs text-[#6B5A4D] mt-0.5 leading-relaxed">
                    Insured courier delivery directly to your door across India. Free delivery on sacred orders above ₹499.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#FAF7F2] border border-[#E7DFD5]">
                <div className="w-10 h-10 rounded-lg bg-[#7F1D1D]/10 text-[#7F1D1D] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#7F1D1D]" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#2D241E]">Secure Razorpay Payments</h4>
                  <p className="text-xs text-[#6B5A4D] mt-0.5 leading-relaxed">
                    100% secure online transactions via UPI (GPay/PhonePe), RuPay, Credit/Debit Cards, and NetBanking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Product Catalog & Filter Grid */}
        <section id="catalog-section" className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E7DFD5] pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#7F1D1D] block mb-1">
                  Artisanal Collection
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D241E]">
                  Handcrafted Pooja & Fragrance Products
                </h2>
                <p className="text-xs text-[#6B5A4D] mt-1">
                  Each product is batch-tested for sacred burn duration and authentic temple fragrance.
                </p>
              </div>

              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#EAE2D5] rounded-xl overflow-x-auto max-w-full">
                {[
                  { slug: 'all', label: 'All Products' },
                  { slug: 'incense-sticks', label: 'Incense Sticks' },
                  { slug: 'cup-sambranis', label: 'Cup Sambrani' },
                  { slug: 'dhoop-cones', label: 'Dhoop Cones' },
                  { slug: 'pooja-essentials', label: 'Pooja Essentials' }
                ].map(cat => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat.slug
                        ? 'bg-[#7F1D1D] text-white shadow-xs'
                        : 'text-[#524135] hover:text-[#2D241E]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-[#8C7A6B]">
                <p className="text-base font-serif font-semibold">No products found matching your search</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-4 py-2 text-xs font-bold bg-[#7F1D1D] text-white rounded-lg cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelect={p => setSelectedProduct(p)}
                    onAddToCart={(p, e) => handleAddToCart(p, undefined, 1, e)}
                    isAdded={addedProductId === prod.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onOpenPolicy={k => setActivePolicy(k)}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onOpen3D={() => setIs3DOpen(true)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        calculation={calculation}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        couponCode={couponCode}
        onApplyCoupon={handleApplyCoupon}
        couponError={couponError}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, varId, qty) => handleAddToCart(prod, varId, qty)}
        onValidatePin={validatePinApi}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        calculation={calculation}
        onOrderPlaced={(num, tok) => {
          setIsCheckoutOpen(false);
          setCartItems([]);
          setConfirmedOrder({ orderNumber: num, guestToken: tok });
        }}
        onValidatePin={validatePinApi}
      />

      {/* Order Confirmed Modal */}
      {confirmedOrder && (
        <OrderSuccessModal
          orderNumber={confirmedOrder.orderNumber}
          guestToken={confirmedOrder.guestToken}
          onClose={() => setConfirmedOrder(null)}
        />
      )}

      {/* Fragrance Sommelier Advisor Modal */}
      <FragranceAdvisorModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        products={products}
        onSelectProduct={p => setSelectedProduct(p)}
      />

      {/* Policy Modals */}
      <PolicyModal
        policyKey={activePolicy}
        onClose={() => setActivePolicy(null)}
      />
    </div>
  );
}
