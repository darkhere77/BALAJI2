import React from 'react';
import { ShoppingBag, Search, Sparkles, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdvisor: () => void;
  onOpen3D: () => void;
  onSelectCategory: (categorySlug: string) => void;
  currentCategory: string;
  onNavigateAdmin: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenAdvisor,
  onOpen3D,
  onSelectCategory,
  currentCategory,
  onNavigateAdmin,
  searchQuery,
  onSearchChange
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E7DFD5]">
      {/* Promotion Bar: Dismissible & <= 40px as per guidelines */}
      <div className="bg-[#7F1D1D] text-[#FAF7F2] text-xs font-medium py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <span>Handcrafted Spiritual Fragrances · Free Courier Delivery Across India On Orders Above ₹499</span>
        <button
          onClick={onOpenAdvisor}
          className="underline hover:text-[#FBBF24] transition-colors font-semibold ml-2 inline-flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-[#FBBF24]" />
          <span>Ask Fragrance Sommelier</span>
        </button>
      </div>

      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (4-5 single-line nav links) — Zone 3 (Action) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectCategory('all')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#7F1D1D] group-hover:text-[#991B1B] transition-colors whitespace-nowrap block">
              SRI BALAJI PERFUMERY
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#B45309] block font-semibold">
              Artisanal Agarbatti & Sambrani
            </span>
          </button>
        </div>

        {/* Zone 2: 4-5 Concise Single-line Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#45362B]">
          <button
            onClick={() => onSelectCategory('all')}
            className={`whitespace-nowrap transition-colors cursor-pointer pb-0.5 ${
              currentCategory === 'all'
                ? 'text-[#7F1D1D] font-bold border-b-2 border-[#7F1D1D]'
                : 'hover:text-[#7F1D1D]'
            }`}
          >
            Shop All
          </button>
          <button
            onClick={() => onSelectCategory('incense-sticks')}
            className={`whitespace-nowrap transition-colors cursor-pointer pb-0.5 ${
              currentCategory === 'incense-sticks'
                ? 'text-[#7F1D1D] font-bold border-b-2 border-[#7F1D1D]'
                : 'hover:text-[#7F1D1D]'
            }`}
          >
            Incense Sticks
          </button>
          <button
            onClick={() => onSelectCategory('cup-sambranis')}
            className={`whitespace-nowrap transition-colors cursor-pointer pb-0.5 ${
              currentCategory === 'cup-sambranis'
                ? 'text-[#7F1D1D] font-bold border-b-2 border-[#7F1D1D]'
                : 'hover:text-[#7F1D1D]'
            }`}
          >
            Cup Sambranis
          </button>
          <button
            onClick={() => onSelectCategory('dhoop-cones')}
            className={`whitespace-nowrap transition-colors cursor-pointer pb-0.5 ${
              currentCategory === 'dhoop-cones'
                ? 'text-[#7F1D1D] font-bold border-b-2 border-[#7F1D1D]'
                : 'hover:text-[#7F1D1D]'
            }`}
          >
            Dhoop Cones
          </button>
          <button
            onClick={() => onSelectCategory('pooja-essentials')}
            className={`whitespace-nowrap transition-colors cursor-pointer pb-0.5 ${
              currentCategory === 'pooja-essentials'
                ? 'text-[#7F1D1D] font-bold border-b-2 border-[#7F1D1D]'
                : 'hover:text-[#7F1D1D]'
            }`}
          >
            Pooja Essentials
          </button>
        </nav>

        {/* Zone 3: Search, 3D Ritual Viewer, Admin, and Cart Action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Search */}
          <div className="relative hidden sm:block w-48 xl:w-56">
            <input
              type="text"
              placeholder="Search fragrances..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F2EDE4] border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D] text-[#2D241E] placeholder:text-[#8C7A6B]"
            />
            <Search className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* 3D Ritual Viewer Action */}
          <button
            onClick={onOpen3D}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7F1D1D] bg-[#F7EFE2] border border-[#E3D2BA] rounded-lg hover:bg-[#EFE3CF] transition-colors cursor-pointer whitespace-nowrap"
            title="Open Interactive 3D Dhoop Dani Experience"
          >
            <span className="w-2 h-2 rounded-full bg-[#B45309]" />
            <span>3D Ritual</span>
          </button>

          {/* Admin Dashboard Link */}
          <button
            onClick={onNavigateAdmin}
            className="p-2 text-[#655344] hover:text-[#7F1D1D] hover:bg-[#F0E8DD] rounded-lg transition-colors cursor-pointer"
            title="Merchant Admin Dashboard"
            aria-label="Merchant Admin Dashboard"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#7F1D1D] hover:bg-[#991B1B] rounded-lg transition-colors cursor-pointer shadow-sm whitespace-nowrap"
            aria-label={`Shopping Cart with ${cartCount} items`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            <span className="bg-[#F59E0B] text-[#7F1D1D] font-bold px-1.5 py-0.5 rounded-full text-[11px] tabular-nums">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
