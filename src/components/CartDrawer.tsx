import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Tag, Truck } from 'lucide-react';
import { CalculationResult } from '../lib/commerce-rules.ts';
import { getProductImage } from '../data/product-images.ts';

export interface CartItemState {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemState[];
  calculation: CalculationResult | null;
  onUpdateQuantity: (productId: string, variantId: string | undefined, newQty: number) => void;
  onRemoveItem: (productId: string, variantId: string | undefined) => void;
  couponCode: string;
  onApplyCoupon: (code: string) => Promise<boolean>;
  couponError?: string;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  calculation,
  onUpdateQuantity,
  onRemoveItem,
  couponCode,
  onApplyCoupon,
  couponError,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const [inputCoupon, setInputCoupon] = useState(couponCode);
  const [isApplying, setIsApplying] = useState(false);

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    setIsApplying(true);
    await onApplyCoupon(inputCoupon.trim());
    setIsApplying(false);
  };

  const freeThreshold = 499;
  const currentSubtotal = calculation?.subtotal || items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const remainingForFreeShipping = Math.max(0, freeThreshold - currentSubtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#FAF7F2] h-full shadow-2xl flex flex-col border-l border-[#E7DFD5]">
        {/* Header */}
        <div className="p-4 border-b border-[#E7DFD5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-lg text-[#7F1D1D]">Your Sacred Cart</span>
            <span className="text-xs bg-[#F2EDE4] text-[#7F1D1D] font-bold px-2 py-0.5 rounded-full tabular-nums">
              {items.reduce((sum, it) => sum + it.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg cursor-pointer"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="bg-[#FFFBEB] border-b border-[#FEF3C7] p-3 text-xs text-[#92400E]">
          {remainingForFreeShipping > 0 ? (
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span>
                Add <strong className="tabular-nums">₹{remainingForFreeShipping}</strong> more to unlock <strong>Free Express Courier Delivery</strong> across India!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#047857]">
              <Truck className="w-4 h-4 shrink-0" />
              <span><strong>Congratulations!</strong> You have unlocked Free Courier Delivery across India.</span>
            </div>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8C7A6B]">
              <div className="w-16 h-16 rounded-full bg-[#F5EFE6] flex items-center justify-center mb-3">
                <Tag className="w-6 h-6 text-[#A8988B]" />
              </div>
              <h3 className="font-serif text-base font-semibold text-[#2D241E]">Your Cart is Empty</h3>
              <p className="text-xs mt-1 max-w-xs">
                Explore our authentic traditional flora agarbatti, pure cup sambrani, and sacred dhoop cones.
              </p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={`${item.productId}-${item.variantId || 'base'}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-xs"
              >
                <img
                  src={getProductImage(item.slug)}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-lg bg-[#F5EFE6] shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-xs font-semibold text-[#2D241E] truncate">
                    {item.name}
                  </h4>
                  <div className="text-[11px] text-[#7F1D1D] font-bold mt-0.5 tabular-nums">
                    ₹{item.unitPrice}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center border border-[#DDD3C5] rounded-md bg-[#FAF7F2]">
                      <button
                        onClick={() => onUpdateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        className="px-2 py-0.5 text-xs text-[#524135] hover:bg-[#EFE3CF] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold text-[#2D241E] tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        className="px-2 py-0.5 text-xs text-[#524135] hover:bg-[#EFE3CF] cursor-pointer"
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.productId, item.variantId)}
                      className="p-1 text-[#9E8E81] hover:text-[#B91C1C] transition-colors cursor-pointer"
                      title="Remove item"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-bold text-[#2D241E] tabular-nums">
                  ₹{item.unitPrice * item.quantity}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Calculations */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-[#E7DFD5] space-y-3">
            {/* Coupon Box */}
            <form onSubmit={handleCouponSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon (e.g. BALAJI10)"
                value={inputCoupon}
                onChange={e => setInputCoupon(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-1.5 text-xs uppercase tracking-wider bg-[#FAF7F2] border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
              <button
                type="submit"
                disabled={isApplying || !inputCoupon.trim()}
                className="px-3 py-1.5 text-xs font-semibold bg-[#2D241E] text-white rounded-lg hover:bg-[#45362B] disabled:opacity-50 cursor-pointer"
              >
                {isApplying ? 'Applying...' : 'Apply'}
              </button>
            </form>

            {couponError && <div className="text-[11px] text-[#B91C1C]">{couponError}</div>}
            {calculation?.couponApplied && (
              <div className="text-[11px] text-[#047857] font-medium flex items-center justify-between">
                <span>Coupon Applied: {calculation.couponApplied}</span>
                <span className="tabular-nums">-₹{calculation.discountAmount}</span>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-[#F0E8DD] space-y-1.5 text-xs text-[#524135]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="tabular-nums font-semibold">₹{calculation?.subtotal ?? currentSubtotal}</span>
              </div>
              {calculation && calculation.discountAmount > 0 && (
                <div className="flex justify-between text-[#047857]">
                  <span>Discount</span>
                  <span className="tabular-nums font-semibold">-₹{calculation.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Courier Delivery (India)</span>
                <span className="tabular-nums font-semibold">
                  {calculation?.shippingFee === 0 ? 'FREE' : `₹${calculation?.shippingFee ?? 60}`}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[#8C7A6B]">
                <span>Estimated GST (5% Included)</span>
                <span className="tabular-nums">₹{calculation?.taxAmount ?? Math.round((currentSubtotal * 0.05 / 1.05) * 100) / 100}</span>
              </div>
              <div className="pt-2 border-t border-[#E7DFD5] flex justify-between text-base font-bold text-[#7F1D1D]">
                <span>Grand Total</span>
                <span className="tabular-nums">
                  ₹{calculation?.grandTotal ?? (currentSubtotal + (currentSubtotal >= freeThreshold ? 0 : 60))}
                </span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={onProceedToCheckout}
              className="w-full py-3 px-4 bg-[#7F1D1D] hover:bg-[#991B1B] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Proceed to Courier Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
