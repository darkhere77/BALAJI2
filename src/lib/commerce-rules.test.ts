import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  validateIndiaPinCode,
  calculateOrderPricing,
  isValidOrderStatusTransition,
  verifyRazorpaySignature,
  checkAndReserveStock,
  CatalogProduct,
  CouponRule,
  StoreSettings
} from './commerce-rules.ts';

const mockCatalog: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'Maha Balaji Flora Agarbatti',
    slug: 'maha-balaji-flora-agarbatti',
    category: 'Incense Sticks',
    price: 180,
    discountedPrice: 150,
    stock: 50,
    isPublished: true,
    variants: [
      { id: 'var-1', name: 'Pack of 3', sku: 'MB-FLORA-3', price: 420, stock: 20 },
      { id: 'var-2', name: 'Economy Box (500g)', sku: 'MB-FLORA-500G', price: 650, stock: 15 }
    ]
  },
  {
    id: 'prod-2',
    name: 'Deva Loban Cup Sambrani',
    slug: 'deva-loban-cup-sambrani',
    category: 'Cup Sambranis',
    price: 120,
    stock: 30,
    isPublished: true
  },
  {
    id: 'prod-3',
    name: 'Archived Rose Dhoop',
    slug: 'archived-rose-dhoop',
    category: 'Dhoop Cones',
    price: 90,
    stock: 0,
    isPublished: false
  }
];

const mockSettings: StoreSettings = {
  storeName: 'Sri Balaji Perfumery',
  currency: 'INR',
  taxRatePercent: 5,
  taxInclusive: true,
  standardShippingFee: 60,
  freeShippingThreshold: 500
};

test('validateIndiaPinCode rejects invalid or non-numeric PINs', () => {
  assert.equal(validateIndiaPinCode('12345').valid, false);
  assert.equal(validateIndiaPinCode('012345').valid, false); // First digit cannot be 0 in India
  assert.equal(validateIndiaPinCode('ABCDEF').valid, false);
  assert.equal(validateIndiaPinCode('560001 ').valid, true); // Trimmed valid PIN
  assert.equal(validateIndiaPinCode('600001').deliverable, true);
});

test('validateIndiaPinCode enforces serviceability whitelist and blocklist', () => {
  const settingsWithBlocklist = {
    unserviceablePins: ['560099']
  };
  const res = validateIndiaPinCode('560099', settingsWithBlocklist);
  assert.equal(res.valid, true);
  assert.equal(res.deliverable, false);

  const settingsWithWhitelist = {
    serviceablePinPrefixes: ['56', '60']
  };
  assert.equal(validateIndiaPinCode('560001', settingsWithWhitelist).deliverable, true);
  assert.equal(validateIndiaPinCode('110001', settingsWithWhitelist).deliverable, false);
});

test('calculateOrderPricing calculates base item prices, tax inclusive, and shipping', () => {
  const result = calculateOrderPricing({
    cartItems: [{ productId: 'prod-1', quantity: 2 }], // 150 * 2 = 300 (< 500 free shipping)
    catalog: mockCatalog,
    settings: mockSettings
  });

  assert.equal(result.success, true);
  const calc = result.calculation!;
  assert.equal(calc.subtotal, 300);
  assert.equal(calc.shippingFee, 60);
  assert.equal(calc.isFreeShipping, false);
  assert.equal(calc.grandTotal, 360);
  assert.ok(calc.taxAmount > 0); // 5% GST component extracted
});

test('calculateOrderPricing applies free shipping above threshold', () => {
  const result = calculateOrderPricing({
    cartItems: [{ productId: 'prod-1', quantity: 4 }], // 150 * 4 = 600 (>= 500 threshold)
    catalog: mockCatalog,
    settings: mockSettings
  });

  assert.equal(result.success, true);
  const calc = result.calculation!;
  assert.equal(calc.subtotal, 600);
  assert.equal(calc.shippingFee, 0);
  assert.equal(calc.isFreeShipping, true);
  assert.equal(calc.grandTotal, 600);
});

test('calculateOrderPricing calculates variant pricing correctly', () => {
  const result = calculateOrderPricing({
    cartItems: [{ productId: 'prod-1', variantId: 'var-1', quantity: 1 }], // 420
    catalog: mockCatalog,
    settings: mockSettings
  });

  assert.equal(result.success, true);
  assert.equal(result.calculation!.subtotal, 420);
});

test('calculateOrderPricing rejects unpublished products or invalid quantities', () => {
  const unpub = calculateOrderPricing({
    cartItems: [{ productId: 'prod-3', quantity: 1 }],
    catalog: mockCatalog,
    settings: mockSettings
  });
  assert.equal(unpub.success, false);

  const zeroQty = calculateOrderPricing({
    cartItems: [{ productId: 'prod-1', quantity: 0 }],
    catalog: mockCatalog,
    settings: mockSettings
  });
  assert.equal(zeroQty.success, false);
});

test('calculateOrderPricing applies percentage and flat coupons with minOrderValue', () => {
  const pctCoupon: CouponRule = {
    code: 'POOJA10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 200,
    maxDiscount: 100,
    isActive: true
  };

  const res = calculateOrderPricing({
    cartItems: [{ productId: 'prod-1', quantity: 2 }], // 300
    catalog: mockCatalog,
    coupon: pctCoupon,
    settings: mockSettings
  });

  assert.equal(res.success, true);
  const calc = res.calculation!;
  assert.equal(calc.discountAmount, 30); // 10% of 300
  assert.equal(calc.grandTotal, 270 + 60); // 330
  assert.equal(calc.couponApplied, 'POOJA10');
});

test('isValidOrderStatusTransition enforces strict order lifecycle state machine', () => {
  assert.equal(isValidOrderStatusTransition('pending_payment', 'paid'), true);
  assert.equal(isValidOrderStatusTransition('pending_payment', 'cancelled'), true);
  assert.equal(isValidOrderStatusTransition('pending_payment', 'delivered'), false); // Cannot jump to delivered!
  assert.equal(isValidOrderStatusTransition('paid', 'processing'), true);
  assert.equal(isValidOrderStatusTransition('processing', 'shipped'), true);
  assert.equal(isValidOrderStatusTransition('shipped', 'delivered'), true);
  assert.equal(isValidOrderStatusTransition('cancelled', 'paid'), false); // Cancelled is terminal
});

test('verifyRazorpaySignature verifies valid signature and rejects forged ones', () => {
  const orderId = 'order_test_987654';
  const paymentId = 'pay_test_123456';
  const secret = 'rzp_sec_mock_super_secret_key';

  const validSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(
    verifyRazorpaySignature({
      orderId,
      paymentId,
      signature: validSig,
      keySecret: secret
    }),
    true
  );

  assert.equal(
    verifyRazorpaySignature({
      orderId,
      paymentId,
      signature: 'wrong_forged_signature_hex_value',
      keySecret: secret
    }),
    false
  );
});

test('checkAndReserveStock prevents overselling', () => {
  const ok = checkAndReserveStock(10, 3);
  assert.equal(ok.success, true);
  assert.equal(ok.remainingStock, 7);

  const fail = checkAndReserveStock(2, 5);
  assert.equal(fail.success, false);
  assert.equal(fail.remainingStock, 2);
});
