import React from 'react';
import { Plus, Check } from 'lucide-react';
import { CatalogProduct } from '../lib/commerce-rules.ts';
import { getProductImage } from '../data/product-images.ts';

interface ProductCardProps {
  product: CatalogProduct;
  onSelect: (product: CatalogProduct) => void;
  onAddToCart: (product: CatalogProduct, e: React.MouseEvent) => void;
  isAdded?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  isAdded = false
}) => {
  const imageUrl = getProductImage(product.slug);
  const displayPrice = product.discountedPrice ?? product.price;
  const hasDiscount = Boolean(product.discountedPrice && product.discountedPrice < product.price);

  return (
    <div
      onClick={() => onSelect(product)}
      className="group flex flex-col bg-white border border-[#E7DFD5] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
    >
      {/* 4:3 Image Container with Resilient Fallback */}
      <div className="relative aspect-[4/3] w-full bg-[#F5EFE6] overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
        />

        {/* Subtle Text Kicker (No Pill Badges!) */}
        <div className="absolute top-2.5 left-2.5 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 bg-[#FAF7F2]/90 text-[#7F1D1D] rounded backdrop-blur-xs">
          {product.category}
        </div>

        {product.stock <= 10 && product.stock > 0 && (
          <div className="absolute top-2.5 right-2.5 text-[11px] font-medium tracking-wide px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] rounded">
            Only {product.stock} Left
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs text-[#8C7A6B] font-medium mb-1">
            {product.fragrance ? product.fragrance.split(',')[0] : 'Temple Fragrance'}
          </div>

          <h3 className="font-serif text-base font-semibold text-[#2D241E] line-clamp-1 group-hover:text-[#7F1D1D] transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-[#6B5A4D] line-clamp-2 mt-1 leading-relaxed">
            {product.weight ? `${product.weight} · ` : ''}
            Hand-rolled with 100% pure essential oils and natural resins.
          </p>
        </div>

        {/* Price & Add Action */}
        <div className="mt-4 pt-3 border-t border-[#F0E8DD] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#7F1D1D] tabular-nums">
              ₹{displayPrice}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#9E8E81] line-through tabular-nums">
                ₹{product.price}
              </span>
            )}
          </div>

          <button
            onClick={e => onAddToCart(product, e)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isAdded
                ? 'bg-[#047857] text-white'
                : 'bg-[#FAF7F2] text-[#7F1D1D] border border-[#E3D2BA] hover:bg-[#7F1D1D] hover:text-white'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
