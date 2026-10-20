import React, { useState } from 'react';
import { X, Check, Shield, Truck, Sparkles, MapPin } from 'lucide-react';
import { CatalogProduct } from '../lib/commerce-rules.ts';
import { getProductImage } from '../data/product-images.ts';

interface ProductDetailModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
  onAddToCart: (product: CatalogProduct, variantId?: string, quantity?: number) => void;
  onValidatePin: (pin: string) => Promise<{ valid: boolean; deliverable: boolean; message: string; region?: string }>;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onValidatePin
}) => {
  if (!product) return null;

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [pinCode, setPinCode] = useState('');
  const [pinStatus, setPinStatus] = useState<{ checked: boolean; deliverable?: boolean; message?: string } | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const selectedVariant = product.variants?.find(v => v.id === selectedVariantId);
  const currentPrice = selectedVariant ? selectedVariant.price : (product.discountedPrice ?? product.price);
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

  const handleCheckPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;
    setIsCheckingPin(true);
    try {
      const res = await onValidatePin(pinCode.trim());
      setPinStatus({ checked: true, deliverable: res.deliverable, message: res.message });
    } catch {
      setPinStatus({ checked: true, deliverable: false, message: 'Could not verify PIN code' });
    } finally {
      setIsCheckingPin(false);
    }
  };

  const handleAdd = () => {
    onAddToCart(product, selectedVariantId, quantity);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#FAF7F2] rounded-2xl border border-[#E7DFD5] shadow-2xl overflow-hidden my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-[#7F1D1D] bg-white/80 hover:bg-white rounded-full border border-[#E7DFD5] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Image */}
          <div className="relative bg-[#F5EFE6] flex items-center justify-center p-6 md:p-8">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden shadow-sm">
              <img
                src={getProductImage(product.slug)}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-4 left-6 text-xs text-[#8C7A6B] font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Temple Grade Aromatic Formulation</span>
            </div>
          </div>

          {/* Right: Contiguous Purchase Module */}
          <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
            <div>
              {/* Category & Status */}
              <div className="flex items-center gap-2 text-xs text-[#8C7A6B] font-medium uppercase tracking-wider mb-2">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span className={currentStock > 0 ? 'text-[#047857]' : 'text-[#B91C1C]'}>
                  {currentStock > 0 ? `In Stock (${currentStock} available)` : 'Out of Stock'}
                </span>
              </div>

              <h2 className="font-serif text-2xl font-bold text-[#2D241E] leading-snug">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-[#7F1D1D] tabular-nums">
                  ₹{currentPrice}
                </span>
                {product.discountedPrice && !selectedVariant && (
                  <span className="text-sm text-[#9E8E81] line-through tabular-nums">
                    ₹{product.price}
                  </span>
                )}
                <span className="text-xs text-[#8C7A6B]">
                  (Inclusive of 5% GST)
                </span>
              </div>

              {/* Fragrance & Specs */}
              <div className="mt-4 p-3.5 bg-white border border-[#E7DFD5] rounded-xl space-y-2 text-xs text-[#524135]">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#2D241E]">Fragrance Notes:</span>
                  <span className="text-right text-[#7F1D1D] font-medium">{product.fragrance || 'Sacred Herbal Resins'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#2D241E]">Pack Size:</span>
                  <span>{product.weight || 'Standard Pack'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#2D241E]">Dispatch:</span>
                  <span>Dispatched in 24 hours via Express Courier</span>
                </div>
              </div>

              {/* Variants Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-[#2D241E] mb-2">
                    Select Pack Size / Variant:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.variants.map(variant => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-2.5 text-xs text-left rounded-lg border transition-all cursor-pointer ${
                          selectedVariantId === variant.id
                            ? 'border-[#7F1D1D] bg-[#FDF2F2] text-[#7F1D1D] font-bold shadow-xs'
                            : 'border-[#DDD3C5] bg-white text-[#45362B] hover:border-[#7F1D1D]/50'
                        }`}
                      >
                        <div className="font-medium truncate">{variant.name}</div>
                        <div className="text-[11px] font-bold mt-0.5 tabular-nums">₹{variant.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PIN Code Delivery Checker */}
              <div className="mt-4 pt-4 border-t border-[#E7DFD5]">
                <span className="text-xs font-semibold text-[#2D241E] flex items-center gap-1.5 mb-2">
                  <Truck className="w-3.5 h-3.5 text-[#7F1D1D]" />
                  <span>Check Courier Serviceability (India Only)</span>
                </span>
                <form onSubmit={handleCheckPin} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN (e.g. 560001)"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                  />
                  <button
                    type="submit"
                    disabled={isCheckingPin || pinCode.length !== 6}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#2D241E] text-white rounded-lg hover:bg-[#45362B] disabled:opacity-50 cursor-pointer"
                  >
                    {isCheckingPin ? 'Checking...' : 'Check'}
                  </button>
                </form>

                {pinStatus?.checked && (
                  <div className={`mt-2 text-xs flex items-center gap-1.5 ${pinStatus.deliverable ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinStatus.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Stepper & Add To Cart Button */}
            <div className="pt-4 border-t border-[#E7DFD5] flex items-center gap-3">
              <div className="flex items-center border border-[#DDD3C5] rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-sm text-[#45362B] hover:bg-[#F2EDE4] cursor-pointer"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="px-3 py-2 text-xs font-bold text-[#2D241E] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="px-3 py-2 text-sm text-[#45362B] hover:bg-[#F2EDE4] cursor-pointer"
                  disabled={quantity >= currentStock}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={currentStock <= 0}
                className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                  isAddedFeedback
                    ? 'bg-[#047857]'
                    : currentStock <= 0
                    ? 'bg-[#A8A29E] cursor-not-allowed'
                    : 'bg-[#7F1D1D] hover:bg-[#991B1B]'
                }`}
              >
                {isAddedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Sacred Cart</span>
                  </>
                ) : currentStock <= 0 ? (
                  <span>Sold Out</span>
                ) : (
                  <span>Add to Cart · ₹{currentPrice * quantity}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
