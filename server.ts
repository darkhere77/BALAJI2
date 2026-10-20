import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  calculateOrderPricing,
  validateIndiaPinCode,
  verifyRazorpaySignature,
  isValidOrderStatusTransition,
  OrderStatus,
  PaymentStatus
} from './src/lib/commerce-rules.ts';
import { store, OrderRecord } from './src/server/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Raw body parser for Razorpay webhook HMAC verification
app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Initialize Gemini on server-side
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Admin Token Cache
const validAdminTokens = new Set<string>();

// Middleware: Admin Authentication
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }
  const token = authHeader.split(' ')[1];
  if (!validAdminTokens.has(token)) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired admin session token' });
  }
  next();
}

// ============================================================================
// 1. PUBLIC STOREFRONT ENDPOINTS
// ============================================================================

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    store: 'Sri Balaji Perfumery',
    timestamp: new Date().toISOString(),
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

// Store Settings
app.get('/api/settings', (_req, res) => {
  const settings = store.getSettings();
  res.json(settings);
});

// Categories
app.get('/api/categories', (_req, res) => {
  const categories = store.getCategories();
  res.json(categories);
});

// Published Products
app.get('/api/products', (req, res) => {
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const products = store.getPublishedProducts(category, search);
  res.json(products);
});

// Single Product by Slug
app.get('/api/products/:slug', (req, res) => {
  const product = store.getProductBySlug(req.params.slug);
  if (!product || !product.isPublished) {
    return res.status(404).json({ error: 'Product not found or currently unavailable' });
  }
  res.json(product);
});

// PIN Code Serviceability Check (India Only)
app.post('/api/validate-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ valid: false, deliverable: false, message: 'PIN code is required' });
  }
  const settings = store.getSettings();
  const result = validateIndiaPinCode(pin, settings);
  res.json(result);
});

// Server-Side Cart Pricing Revalidation
app.post('/api/calculate-cart', (req, res) => {
  const { items, couponCode } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid cart items format' });
  }

  const catalog = store.getAllProducts();
  const settings = store.getSettings();
  const coupon = couponCode ? store.getCouponByCode(couponCode) : null;

  const result = calculateOrderPricing({
    cartItems: items,
    catalog,
    coupon,
    settings
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result.calculation);
});

// Validate Coupon
app.post('/api/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, message: 'Coupon code required' });
  }

  const coupon = store.getCouponByCode(code);
  if (!coupon) {
    return res.status(404).json({ valid: false, message: 'Invalid or expired coupon code' });
  }

  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return res.status(400).json({
      valid: false,
      message: `Coupon "${coupon.code}" requires a minimum order subtotal of ₹${coupon.minOrderValue}`
    });
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscount: coupon.maxDiscount,
    minOrderValue: coupon.minOrderValue
  });
});

// Create Order (Enforces trusted pricing and stock validation)
app.post('/api/orders/create', async (req, res) => {
  try {
    const { items, couponCode, shippingAddress, guestEmail, guestPhone } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shopping cart is empty' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1 || !shippingAddress.pinCode) {
      return res.status(400).json({ error: 'Complete delivery address and contact information are required' });
    }

    // Verify PIN code
    const settings = store.getSettings();
    const pinCheck = validateIndiaPinCode(shippingAddress.pinCode, settings);
    if (!pinCheck.valid || !pinCheck.deliverable) {
      return res.status(400).json({ error: pinCheck.message });
    }

    // Server-side calculation
    const catalog = store.getAllProducts();
    const coupon = couponCode ? store.getCouponByCode(couponCode) : null;

    const pricing = calculateOrderPricing({
      cartItems: items,
      catalog,
      coupon,
      settings
    });

    if (!pricing.success || !pricing.calculation) {
      return res.status(400).json({ error: pricing.error || 'Pricing calculation failed' });
    }

    const calc = pricing.calculation;

    // Check stock for all items
    for (const item of items) {
      const prod = catalog.find(p => p.id === item.productId);
      if (!prod) continue;

      if (item.variantId) {
        const variant = prod.variants?.find(v => v.id === item.variantId);
        if (!variant || variant.stock < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for variant "${variant?.name || item.variantId}". Available: ${variant?.stock || 0}` });
        }
      } else {
        if (prod.stock < item.quantity) {
          return res.status(400).json({ error: `Not enough stock for "${prod.name}". Available: ${prod.stock}` });
        }
      }
    }

    // Deduct stock (atomic reserve)
    for (const item of items) {
      const prod = catalog.find(p => p.id === item.productId);
      if (!prod) continue;
      if (item.variantId) {
        const variant = prod.variants?.find(v => v.id === item.variantId);
        if (variant) variant.stock -= item.quantity;
      } else {
        prod.stock -= item.quantity;
      }
      store.saveProduct(prod, 'system-checkout');
    }

    const orderNumber = `SBP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const guestAccessToken = crypto.randomBytes(24).toString('hex');

    const newOrder: OrderRecord = {
      id: crypto.randomUUID(),
      orderNumber,
      guestEmail: guestEmail || shippingAddress.email,
      guestPhone: guestPhone || shippingAddress.phone,
      guestAccessToken,
      orderStatus: 'pending_payment',
      paymentStatus: 'pending',
      items: calc.items.map(it => ({
        productId: it.productId,
        variantId: it.variantId,
        productName: it.name,
        sku: 'SKU-' + it.productId.slice(0, 8),
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        lineTotal: it.lineTotal
      })),
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      couponCode: calc.couponApplied,
      shippingFee: calc.shippingFee,
      taxAmount: calc.taxAmount,
      grandTotal: calc.grandTotal,
      currency: 'INR',
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pinCode: shippingAddress.pinCode,
        country: 'IN',
        deliveryNotes: shippingAddress.deliveryNotes || ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.createOrder(newOrder);

    // Razorpay Integration:
    // If Razorpay API keys are configured, attempt to create official Razorpay Order
    let razorpayOrderId: string | null = null;
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (rzpKeyId && rzpSecret) {
      try {
        const amountPaise = Math.round(calc.grandTotal * 100);
        const authHeader = 'Basic ' + Buffer.from(`${rzpKeyId}:${rzpSecret}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: orderNumber,
            notes: {
              localOrderId: newOrder.id,
              orderNumber
            }
          })
        });

        if (rzpResponse.ok) {
          const rzpData = (await rzpResponse.json()) as { id: string };
          razorpayOrderId = rzpData.id;
          newOrder.paymentDetails = {
            razorpayOrderId
          };
          store.updateOrder(newOrder, 'razorpay-init');
        }
      } catch (err) {
        console.error('Failed to create Razorpay remote order:', err);
      }
    }

    res.json({
      success: true,
      order: {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        grandTotal: newOrder.grandTotal,
        currency: 'INR',
        guestAccessToken: newOrder.guestAccessToken,
        razorpayOrderId,
        razorpayKeyId: rzpKeyId || null,
        paymentStatus: newOrder.paymentStatus,
        paymentSetupRequired: !Boolean(rzpKeyId && rzpSecret)
      }
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Server error creating order' });
  }
});

// Secure Order Lookup by Order Number & Token
app.get('/api/orders/:orderNumber', (req, res) => {
  const { orderNumber } = req.params;
  const token = req.query.token as string | undefined;

  const order = store.getOrderByNumber(orderNumber);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Check guest token or admin auth
  const authHeader = req.headers.authorization;
  const isAdmin = authHeader && validAdminTokens.has(authHeader.replace('Bearer ', ''));

  if (!isAdmin && order.guestAccessToken !== token) {
    return res.status(403).json({ error: 'Access denied: Valid order access token required' });
  }

  res.json(order);
});

// Razorpay Public Config Check
app.get('/api/razorpay/config', (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  res.json({
    configured: Boolean(keyId && hasSecret),
    keyId: keyId || null,
    mode: keyId?.startsWith('rzp_test_') ? 'test' : keyId?.startsWith('rzp_live_') ? 'live' : 'unconfigured',
    message: Boolean(keyId && hasSecret)
      ? 'Razorpay credentials active'
      : 'Razorpay setup required. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
  });
});

// Razorpay Verify Payment (HMAC-SHA256 signature verification)
app.post('/api/razorpay/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, localOrderId } = req.body;

  if (!localOrderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment signature verification parameters' });
  }

  const order = store.getOrderById(localOrderId);
  if (!order) {
    return res.status(404).json({ error: 'Local order not found' });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: 'Server payment verification secret is not configured'
    });
  }

  const isValid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    keySecret: secret
  });

  if (!isValid) {
    store.addAuditLog('razorpay', 'SIGNATURE_VERIFICATION_FAILED', 'ORDER', order.orderNumber, {
      razorpay_order_id,
      razorpay_payment_id
    });
    return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
  }

  // Update order state
  order.paymentStatus = 'captured';
  order.orderStatus = 'paid';
  order.paymentDetails = {
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    verifiedAt: new Date().toISOString()
  };

  store.updateOrder(order, 'razorpay-verification');

  res.json({
    success: true,
    message: 'Payment verified successfully and order confirmed.',
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus
  });
});

// Razorpay Webhook Handler
app.post('/api/razorpay/webhook', (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured on server' });
  }

  if (!signature) {
    return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
  }

  // Verify signature against raw body
  const rawBody = req.body;
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  const bufExpected = Buffer.from(expectedSignature, 'utf8');
  const bufSig = Buffer.from(signature, 'utf8');

  if (bufExpected.length !== bufSig.length || !crypto.timingSafeEqual(bufExpected, bufSig)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    const event = JSON.parse(rawBody.toString('utf8'));
    const eventId = event.event_id || req.headers['x-razorpay-event-id'] || crypto.randomUUID();

    // Idempotency check
    if (store.isWebhookEventProcessed(eventId)) {
      return res.status(200).json({ status: 'already_processed' });
    }

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        const order = store.getOrders().find(o => o.paymentDetails?.razorpayOrderId === rzpOrderId);
        if (order && order.paymentStatus !== 'captured') {
          order.paymentStatus = 'captured';
          order.orderStatus = 'paid';
          order.paymentDetails = {
            ...order.paymentDetails,
            razorpayPaymentId: paymentEntity.id,
            verifiedAt: new Date().toISOString()
          };
          store.updateOrder(order, 'razorpay-webhook');
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        const order = store.getOrders().find(o => o.paymentDetails?.razorpayOrderId === rzpOrderId);
        if (order && order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed';
          store.updateOrder(order, 'razorpay-webhook-failed');
        }
      }
    }

    store.recordWebhookEvent({
      id: crypto.randomUUID(),
      eventId,
      eventName: event.event,
      payload: event,
      processedAt: new Date().toISOString(),
      status: 'processed'
    });

    res.status(200).json({ status: 'success' });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Error processing webhook event' });
  }
});

// Gemini Fragrance & Pooja Advisor
app.post('/api/gemini/advisor', async (req, res) => {
  const { query, occasion, preference } = req.body;

  if (!query && !occasion && !preference) {
    return res.status(400).json({ error: 'Please share your fragrance preference or pooja occasion' });
  }

  const catalog = store.getPublishedProducts();
  const catalogSummary = catalog
    .map(p => `- ${p.name} (Category: ${p.category}, Fragrance: ${p.fragrance || 'Natural'}, Price: ₹${p.discountedPrice || p.price})`)
    .join('\n');

  if (!aiClient) {
    // Elegant fallback when GEMINI_API_KEY is not set
    return res.json({
      recommendation:
        'For peaceful morning pooja rituals, our traditional Maha Balaji Flora Agarbatti paired with Deva Loban Cup Sambrani creates an authentic sanctified temple atmosphere with divine sandalwood and natural resins.',
      suggestedProductSlugs: ['maha-balaji-traditional-flora-agarbatti', 'deva-loban-charcoal-cup-sambrani']
    });
  }

  try {
    const prompt = `You are the master fragrance sommelier for "Sri Balaji Perfumery", an esteemed Indian artisanal perfumery specializing in sacred agarbatti, cup sambrani, dhoop sticks, and pooja essentials.
A customer asks: "${query || ''}". Occasion: "${occasion || 'Daily Pooja'}". Preference: "${preference || 'Natural resins & floral'}".

Available Catalog:
${catalogSummary}

Provide a warm, spiritually reverent, concise recommendation (2-3 sentences max) explaining which specific fragrance best suits their ritual or meditation, its spiritual significance (e.g. Loban for purifying negative energy, Sandalwood for focus, Champa for auspiciousness), and return JSON with:
{
  "recommendation": "your recommendation text",
  "suggestedProductSlugs": ["matching-slug-1", "matching-slug-2"]
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini advisor error:', err);
    res.json({
      recommendation:
        'We recommend starting with our Maha Balaji Flora Agarbatti and Deva Loban Cup Sambrani for auspicious temple purity.',
      suggestedProductSlugs: ['maha-balaji-traditional-flora-agarbatti', 'deva-loban-charcoal-cup-sambrani']
    });
  }
});

// ============================================================================
// 2. PROTECTED ADMIN DASHBOARD ENDPOINTS (`/api/admin/*`)
// ============================================================================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const authResult = store.authenticateAdmin(username, password);
  if (!authResult.success || !authResult.user) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = 'admin_tok_' + crypto.randomBytes(32).toString('hex');
  validAdminTokens.add(token);

  res.json({
    success: true,
    token,
    user: {
      id: authResult.user.id,
      username: authResult.user.username,
      fullName: authResult.user.fullName,
      role: authResult.user.role
    }
  });
});

// Admin Stats
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const orders = store.getOrders();
  const products = store.getAllProducts();

  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.paymentStatus === 'captured' || o.orderStatus === 'paid' || o.orderStatus === 'shipped' || o.orderStatus === 'delivered');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const pendingFulfillment = orders.filter(o => o.orderStatus === 'paid' || o.orderStatus === 'processing').length;
  const lowStockProducts = products.filter(p => p.stock <= 15);

  res.json({
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    pendingFulfillment,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.map(p => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      category: p.category
    }))
  });
});

// Admin Products CRUD
app.get('/api/admin/products', requireAdmin, (_req, res) => {
  res.json(store.getAllProducts());
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const productData = req.body;
  if (!productData.name || !productData.price) {
    return res.status(400).json({ error: 'Product name and price are required' });
  }

  if (!productData.id) {
    productData.id = 'prod-' + crypto.randomUUID().slice(0, 8);
  }
  if (!productData.slug) {
    productData.slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  const saved = store.saveProduct(productData, 'admin');
  res.json(saved);
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  store.deleteProduct(req.params.id, 'admin');
  res.json({ success: true });
});

// Admin Orders
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  res.json(store.getOrders());
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { targetStatus, courierName, trackingNumber, trackingUrl } = req.body;

  const order = store.getOrderById(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (targetStatus && targetStatus !== order.orderStatus) {
    const valid = isValidOrderStatusTransition(order.orderStatus, targetStatus as OrderStatus);
    if (!valid) {
      return res.status(400).json({
        error: `Invalid transition from "${order.orderStatus}" to "${targetStatus}". Enforcing strict order lifecycle.`
      });
    }
    order.orderStatus = targetStatus;
  }

  if (courierName || trackingNumber || trackingUrl) {
    order.courierDetails = {
      ...order.courierDetails,
      courierName: courierName || order.courierDetails?.courierName,
      trackingNumber: trackingNumber || order.courierDetails?.trackingNumber,
      trackingUrl: trackingUrl || order.courierDetails?.trackingUrl,
      shippedAt: targetStatus === 'shipped' ? new Date().toISOString() : order.courierDetails?.shippedAt
    };
  }

  store.updateOrder(order, 'admin');
  res.json(order);
});

// Admin Categories
app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  res.json(store.getAllCategories());
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const cat = req.body;
  if (!cat.name) return res.status(400).json({ error: 'Category name required' });
  if (!cat.id) cat.id = 'cat-' + crypto.randomUUID().slice(0, 8);
  if (!cat.slug) cat.slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const saved = store.saveCategory(cat, 'admin');
  res.json(saved);
});

// Admin Coupons
app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  res.json(store.getCoupons());
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const coupon = req.body;
  if (!coupon.code || !coupon.discountValue) {
    return res.status(400).json({ error: 'Code and discount value required' });
  }
  const saved = store.saveCoupon(coupon, 'admin');
  res.json(saved);
});

// Admin Settings
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const updated = store.updateSettings(req.body, 'admin');
  res.json(updated);
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (_req, res) => {
  res.json(store.getAuditLogs());
});

// Printable Tax Invoice
app.get('/api/orders/:orderNumber/invoice', (req, res) => {
  const { orderNumber } = req.params;
  const token = req.query.token as string | undefined;

  const order = store.getOrderByNumber(orderNumber);
  if (!order) {
    return res.status(404).send('Order not found');
  }

  const authHeader = req.headers.authorization;
  const isAdmin = authHeader && validAdminTokens.has(authHeader.replace('Bearer ', ''));

  if (!isAdmin && order.guestAccessToken !== token) {
    return res.status(403).send('Forbidden: Token invalid');
  }

  const settings = store.getSettings();

  const invoiceHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Tax Invoice — ${order.orderNumber}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #b91c1c; padding-bottom: 20px; }
      .brand { font-size: 24px; font-weight: bold; color: #7f1d1d; }
      .invoice-title { font-size: 20px; font-weight: 600; text-align: right; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
      .totals { margin-left: auto; width: 300px; margin-top: 20px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
      .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 10px; color: #7f1d1d; }
      .footer { margin-top: 50px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">${settings.storeName}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${settings.address}</div>
        <div style="font-size: 13px; color: #64748b;">GSTIN: ${settings.gstin || 'Unregistered'}</div>
        <div style="font-size: 13px; color: #64748b;">Phone: ${settings.supportPhone}</div>
      </div>
      <div>
        <div class="invoice-title">TAX INVOICE</div>
        <div style="font-size: 13px; color: #64748b;">Invoice No: INV-${order.orderNumber}</div>
        <div style="font-size: 13px; color: #64748b;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
        <div style="font-size: 13px; color: #047857; font-weight: 600; margin-top: 4px;">Status: ${order.paymentStatus.toUpperCase()}</div>
      </div>
    </div>

    <div class="meta">
      <div>
        <strong>Billed & Shipped To:</strong><br>
        ${order.shippingAddress.fullName}<br>
        ${order.shippingAddress.addressLine1}<br>
        ${order.shippingAddress.addressLine2 ? order.shippingAddress.addressLine2 + '<br>' : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pinCode}<br>
        India<br>
        Phone: ${order.shippingAddress.phone}
      </div>
      <div>
        <strong>Courier & Fulfillment:</strong><br>
        Courier: ${order.courierDetails?.courierName || 'Standard Express Courier'}<br>
        AWB / Tracking: ${order.courierDetails?.trackingNumber || 'Awaiting Dispatch'}<br>
        Order Status: ${order.orderStatus.toUpperCase()}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th>HSN Code</th>
          <th style="text-align: right;">Rate (₹)</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${order.items
          .map(
            item => `
          <tr>
            <td>${item.productName}</td>
            <td>33074100</td>
            <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">₹${item.lineTotal.toFixed(2)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Item Subtotal:</span><span>₹${order.subtotal.toFixed(2)}</span></div>
      ${order.discountAmount > 0 ? `<div class="row" style="color: #047857;"><span>Coupon Discount (${order.couponCode || 'PROMO'}):</span><span>-₹${order.discountAmount.toFixed(2)}</span></div>` : ''}
      <div class="row"><span>Shipping Charges:</span><span>${order.shippingFee === 0 ? 'FREE' : '₹' + order.shippingFee.toFixed(2)}</span></div>
      <div class="row"><span>GST (${settings.taxRatePercent}% ${settings.taxInclusive ? 'Included' : 'Added'}):</span><span>₹${order.taxAmount.toFixed(2)}</span></div>
      <div class="row grand-total"><span>Total Payable:</span><span>₹${order.grandTotal.toFixed(2)}</span></div>
    </div>

    <div class="footer">
      This is a computer-generated tax invoice for sacred pooja products by ${settings.storeName}. Thank you for choosing our authentic Indian temple fragrances!
    </div>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(invoiceHtml);
});

// ============================================================================
// 3. FRONTEND SERVING & VITE MIDDLEWARE
// ============================================================================

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sri Balaji Perfumery] Full-stack server running on http://localhost:${PORT}`);
  });
}

setupServer();
