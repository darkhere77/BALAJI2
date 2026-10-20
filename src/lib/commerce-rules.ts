import crypto from 'crypto';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface CartItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  discountedPrice?: number;
  stock: number;
  isPublished: boolean;
  fragrance?: string;
  weight?: string;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  }>;
}

export interface CouponRule {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  taxRatePercent: number; // e.g. 5% GST for incense/agarbatti in India (HSN 33074100)
  taxInclusive: boolean;
  standardShippingFee: number;
  freeShippingThreshold: number;
  serviceablePinPrefixes?: string[]; // Empty means all valid India PINs serviceable
  unserviceablePins?: string[];
  gstin?: string;
  supportPhone?: string;
  supportEmail?: string;
  address?: string;
}

export interface CalculationResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingFee: number;
  grandTotal: number;
  isFreeShipping: boolean;
  couponApplied?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}

/**
 * Validates 6-digit Indian PIN codes and checks serviceability rules.
 */
export function validateIndiaPinCode(
  pin: string,
  settings?: Pick<StoreSettings, 'serviceablePinPrefixes' | 'unserviceablePins'>
): { valid: boolean; deliverable: boolean; message: string; region?: string } {
  const cleanPin = pin.trim();
  const pinRegex = /^[1-9][0-9]{5}$/;

  if (!pinRegex.test(cleanPin)) {
    return {
      valid: false,
      deliverable: false,
      message: 'Please enter a valid 6-digit Indian Postal PIN code (e.g., 560001, 600001).'
    };
  }

  // Check unserviceable list
  if (settings?.unserviceablePins && settings.unserviceablePins.includes(cleanPin)) {
    return {
      valid: true,
      deliverable: false,
      message: 'Courier delivery is temporarily unavailable to PIN code ' + cleanPin + '.'
    };
  }

  // Check prefix whitelist if configured
  if (settings?.serviceablePinPrefixes && settings.serviceablePinPrefixes.length > 0) {
    const isServiceable = settings.serviceablePinPrefixes.some(prefix => cleanPin.startsWith(prefix));
    if (!isServiceable) {
      return {
        valid: true,
        deliverable: false,
        message: 'Currently delivery is available only to select serviceable regions in India.'
      };
    }
  }

  // Derive broad postal circle in India
  const firstDigit = cleanPin[0];
  const regionMap: Record<string, string> = {
    '1': 'Delhi / Haryana / Punjab / HP / J&K',
    '2': 'Uttar Pradesh / Uttarakhand',
    '3': 'Rajasthan / Gujarat',
    '4': 'Maharashtra / Goa / MP / Chhattisgarh',
    '5': 'Andhra Pradesh / Telangana / Karnataka',
    '6': 'Tamil Nadu / Kerala / Puducherry',
    '7': 'West Bengal / Odisha / North East',
    '8': 'Bihar / Jharkhand',
    '9': 'Army Postal Service'
  };

  return {
    valid: true,
    deliverable: true,
    region: regionMap[firstDigit] || 'India Post Circle',
    message: 'Delivery available via insured express courier.'
  };
}

/**
 * Trusted server-side price, coupon, tax, and shipping calculation.
 * Never trust client prices or client totals!
 */
export function calculateOrderPricing(params: {
  cartItems: CartItemInput[];
  catalog: CatalogProduct[];
  coupon?: CouponRule | null;
  settings: StoreSettings;
}): { success: boolean; error?: string; calculation?: CalculationResult } {
  const { cartItems, catalog, coupon, settings } = params;

  if (!cartItems || cartItems.length === 0) {
    return { success: false, error: 'Shopping cart is empty.' };
  }

  const catalogMap = new Map<string, CatalogProduct>();
  for (const item of catalog) {
    catalogMap.set(item.id, item);
  }

  const calculatedItems: CalculationResult['items'] = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    if (cartItem.quantity <= 0) {
      return { success: false, error: 'Invalid item quantity: must be at least 1.' };
    }

    const product = catalogMap.get(cartItem.productId);
    if (!product) {
      return { success: false, error: `Product ID "${cartItem.productId}" was not found in catalog.` };
    }

    if (!product.isPublished) {
      return { success: false, error: `Product "${product.name}" is currently unavailable.` };
    }

    let unitPrice = product.discountedPrice ?? product.price;
    let variantName = '';

    if (cartItem.variantId) {
      const variant = product.variants?.find(v => v.id === cartItem.variantId);
      if (!variant) {
        return { success: false, error: `Variant "${cartItem.variantId}" not found for "${product.name}".` };
      }
      unitPrice = variant.price;
      variantName = ` (${variant.name})`;
    }

    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;

    calculatedItems.push({
      productId: product.id,
      variantId: cartItem.variantId,
      name: product.name + variantName,
      unitPrice,
      quantity: cartItem.quantity,
      lineTotal
    });
  }

  // Coupon evaluation
  let discountAmount = 0;
  let couponApplied: string | undefined = undefined;

  if (coupon && coupon.isActive) {
    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
    const meetsMinOrder = !coupon.minOrderValue || subtotal >= coupon.minOrderValue;

    if (!isExpired && meetsMinOrder) {
      if (coupon.discountType === 'percentage') {
        const rawDiscount = (subtotal * coupon.discountValue) / 100;
        discountAmount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount;
      } else if (coupon.discountType === 'flat') {
        discountAmount = Math.min(coupon.discountValue, subtotal);
      }
      couponApplied = coupon.code;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Shipping calculation
  const isFreeShipping = discountedSubtotal >= settings.freeShippingThreshold;
  const shippingFee = isFreeShipping ? 0 : settings.standardShippingFee;

  // Tax calculation (GST)
  let taxAmount = 0;
  let grandTotal = 0;

  if (settings.taxInclusive) {
    // Tax is included in the item prices; calculate GST portion: Price - Price / (1 + rate/100)
    taxAmount = Math.round((discountedSubtotal - discountedSubtotal / (1 + settings.taxRatePercent / 100)) * 100) / 100;
    grandTotal = Math.round((discountedSubtotal + shippingFee) * 100) / 100;
  } else {
    // Tax is added on top
    taxAmount = Math.round((discountedSubtotal * settings.taxRatePercent / 100) * 100) / 100;
    grandTotal = Math.round((discountedSubtotal + taxAmount + shippingFee) * 100) / 100;
  }

  return {
    success: true,
    calculation: {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount,
      shippingFee,
      grandTotal,
      isFreeShipping,
      couponApplied,
      items: calculatedItems
    }
  };
}

/**
 * Validates order lifecycle status transitions.
 */
export function isValidOrderStatusTransition(current: OrderStatus, target: OrderStatus): boolean {
  const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending_payment: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled', 'refunded'],
    processing: ['shipped', 'cancelled', 'refunded'],
    shipped: ['delivered', 'refunded'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  };

  const allowed = allowedTransitions[current] || [];
  return allowed.includes(target);
}

/**
 * Official Razorpay HMAC-SHA256 signature verification.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  if (!params.orderId || !params.paymentId || !params.signature || !params.keySecret) {
    return false;
  }
  const payload = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', params.keySecret)
    .update(payload)
    .digest('hex');

  const bufExpected = Buffer.from(expectedSignature, 'utf8');
  const bufSignature = Buffer.from(params.signature, 'utf8');

  if (bufExpected.length !== bufSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufExpected, bufSignature);
}

/**
 * Validates and reserves stock atomically.
 */
export function checkAndReserveStock(
  currentStock: number,
  quantityRequested: number
): { success: boolean; remainingStock: number; error?: string } {
  if (quantityRequested <= 0) {
    return { success: false, remainingStock: currentStock, error: 'Requested quantity must be greater than zero.' };
  }
  if (currentStock < quantityRequested) {
    return {
      success: false,
      remainingStock: currentStock,
      error: `Insufficient stock: only ${currentStock} units available.`
    };
  }
  return {
    success: true,
    remainingStock: currentStock - quantityRequested
  };
}
