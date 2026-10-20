/**
 * Client-Side API Bridge for Sri Balaji Perfumery
 * Never mutates window.fetch (strict browser & iframe safe).
 * Provides zero-latency, 100% offline-ready responses for all `/api/*` routes.
 */

import {
  calculateOrderPricing,
  validateIndiaPinCode
} from './commerce-rules.ts';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_CATEGORIES } from '../data/catalog.ts';

const LOCAL_STORAGE_ORDERS_KEY = 'sri_balaji_orders_db';
const LOCAL_STORAGE_PRODUCTS_KEY = 'sri_balaji_products_db';
const LOCAL_STORAGE_SETTINGS_KEY = 'sri_balaji_settings_db';

function getStoredProducts() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

function saveStoredProducts(prods: any[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(prods));
  } catch (e) {
    console.error(e);
  }
}

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredOrders(orders: any[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error(e);
  }
}

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_SETTINGS;
  } catch {
    return INITIAL_SETTINGS;
  }
}

function saveStoredSettings(settings: any) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Intercept local `/api/*` endpoints
  if (urlString.startsWith('/api/') || urlString.includes('localhost:3000/api/')) {
    const url = new URL(urlString, window.location.origin);
    const pathname = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();

    // 1. Health check
    if (pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', store: 'Sri Balaji Perfumery' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Settings
    if (pathname === '/api/settings') {
      const currentSettings = getStoredSettings();
      return new Response(JSON.stringify(currentSettings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2b. Admin Settings Update
    if (pathname === '/api/admin/settings' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const current = getStoredSettings();
      const updated = { ...current, ...body };
      saveStoredSettings(updated);
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Categories
    if (pathname === '/api/categories') {
      return new Response(JSON.stringify(INITIAL_CATEGORIES), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Products List
    if (pathname === '/api/products' && method === 'GET') {
      const prods = getStoredProducts();
      return new Response(JSON.stringify(prods), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. PIN Code Validation
    if (pathname === '/api/validate-pin' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const result = validateIndiaPinCode(body.pin || '', getStoredSettings());
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Cart Calculation
    if (pathname === '/api/calculate-cart' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const { items, couponCode } = body;
      const catalog = getStoredProducts();

      const coupon =
        couponCode === 'BALAJI10'
          ? { code: 'BALAJI10', discountType: 'percentage' as const, discountValue: 10, minOrderValue: 299, maxDiscount: 150, isActive: true }
          : couponCode === 'POOJA50'
          ? { code: 'POOJA50', discountType: 'flat' as const, discountValue: 50, minOrderValue: 499, isActive: true }
          : null;

      const calc = calculateOrderPricing({
        cartItems: items || [],
        catalog,
        coupon,
        settings: getStoredSettings()
      });

      if (!calc.success) {
        return new Response(JSON.stringify({ error: calc.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(calc.calculation), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Coupon Validation
    if (pathname === '/api/coupons/validate' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const code = (body.code || '').toUpperCase().trim();
      const subtotal = body.subtotal || 0;

      if (code === 'BALAJI10') {
        if (subtotal < 299) {
          return new Response(JSON.stringify({ valid: false, message: 'Requires min order value of ₹299' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ valid: true, code: 'BALAJI10', discountType: 'percentage', discountValue: 10 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (code === 'POOJA50') {
        if (subtotal < 499) {
          return new Response(JSON.stringify({ valid: false, message: 'Requires min order value of ₹499' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ valid: true, code: 'POOJA50', discountType: 'flat', discountValue: 50 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ valid: false, message: 'Invalid coupon code' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 8. Order Creation
    if (pathname === '/api/orders/create' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const { items, couponCode, shippingAddress, guestEmail, guestPhone } = body;

      const catalog = getStoredProducts();
      const coupon =
        couponCode === 'BALAJI10'
          ? { code: 'BALAJI10', discountType: 'percentage' as const, discountValue: 10, minOrderValue: 299, maxDiscount: 150, isActive: true }
          : couponCode === 'POOJA50'
          ? { code: 'POOJA50', discountType: 'flat' as const, discountValue: 50, minOrderValue: 499, isActive: true }
          : null;

      const pricing = calculateOrderPricing({
        cartItems: items || [],
        catalog,
        coupon,
        settings: getStoredSettings()
      });

      if (!pricing.success || !pricing.calculation) {
        return new Response(JSON.stringify({ error: pricing.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const orderNumber = `SBP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const guestAccessToken = 'tok_' + Math.random().toString(36).substring(2);

      const newOrder = {
        id: 'ord-' + Date.now(),
        orderNumber,
        guestEmail,
        guestPhone,
        guestAccessToken,
        orderStatus: 'paid',
        paymentStatus: 'captured',
        items: pricing.calculation.items,
        subtotal: pricing.calculation.subtotal,
        discountAmount: pricing.calculation.discountAmount,
        couponCode: pricing.calculation.couponApplied,
        shippingFee: pricing.calculation.shippingFee,
        taxAmount: pricing.calculation.taxAmount,
        grandTotal: pricing.calculation.grandTotal,
        currency: 'INR',
        shippingAddress: shippingAddress || {},
        courierDetails: {
          courierName: 'BlueDart Express',
          trackingNumber: 'BLU-' + Math.floor(100000 + Math.random() * 900000),
          shippedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const currentOrders = getStoredOrders();
      currentOrders.unshift(newOrder);
      saveStoredOrders(currentOrders);

      return new Response(
        JSON.stringify({
          success: true,
          order: {
            id: newOrder.id,
            orderNumber: newOrder.orderNumber,
            grandTotal: newOrder.grandTotal,
            guestAccessToken: newOrder.guestAccessToken,
            paymentStatus: 'captured'
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8b. Razorpay Verification
    if (pathname === '/api/razorpay/verify-payment' && method === 'POST') {
      return new Response(JSON.stringify({ success: true, verified: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 9. Order Details Lookup
    if (pathname.startsWith('/api/orders/') && !pathname.endsWith('/invoice') && method === 'GET') {
      const orderNumber = pathname.replace('/api/orders/', '').split('?')[0];
      const orders = getStoredOrders();
      const order = orders.find((o: any) => o.orderNumber === orderNumber);
      if (order) {
        return new Response(JSON.stringify(order), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 10. Gemini Fragrance Advisor
    if (pathname === '/api/gemini/advisor' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      return new Response(
        JSON.stringify({
          recommendation: `For ${body.occasion || 'your ritual prayers'} with a preference for ${body.preference || 'natural sacred aromas'}, our traditional Maha Balaji Flora Agarbatti paired with Deva Loban Cup Sambrani creates an authentic sanctified temple atmosphere with divine sandalwood and sacred resins.`,
          suggestedProductSlugs: ['maha-balaji-traditional-flora-agarbatti', 'deva-loban-charcoal-cup-sambrani']
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 11. Admin Login
    if (pathname === '/api/admin/login' && method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.username === 'admin' && body.password === 'Balaji@2026') {
        return new Response(
          JSON.stringify({
            success: true,
            token: 'admin_tok_demo_valid',
            user: { username: 'admin', fullName: 'Sri Balaji Store Administrator', role: 'admin' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: 'Invalid admin credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 12. Admin Stats
    if (pathname === '/api/admin/stats') {
      const orders = getStoredOrders();
      const products = getStoredProducts();
      const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);
      return new Response(
        JSON.stringify({
          totalOrders: orders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          pendingFulfillment: orders.filter((o: any) => o.orderStatus !== 'delivered').length,
          lowStockCount: products.filter((p: any) => p.stock <= 15).length,
          lowStockProducts: products.filter((p: any) => p.stock <= 15)
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 13. Admin Orders List & Status Update
    if (pathname === '/api/admin/orders') {
      return new Response(JSON.stringify(getStoredOrders()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (pathname.includes('/api/admin/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
      const parts = pathname.split('/');
      const orderId = parts[parts.indexOf('orders') + 1];
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const orders = getStoredOrders();
      const idx = orders.findIndex((o: any) => o.id === orderId);
      if (idx >= 0) {
        orders[idx].orderStatus = body.targetStatus || orders[idx].orderStatus;
        if (body.courierName) {
          orders[idx].courierDetails = {
            courierName: body.courierName,
            trackingNumber: body.trackingNumber || 'AWB-' + Math.floor(100000 + Math.random() * 900000),
            shippedAt: new Date().toISOString()
          };
        }
        saveStoredOrders(orders);
        return new Response(JSON.stringify(orders[idx]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 14. Admin Products CRUD
    if (pathname === '/api/admin/products') {
      if (method === 'GET') {
        return new Response(JSON.stringify(getStoredProducts()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (method === 'POST') {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        const prods = getStoredProducts();
        const idx = prods.findIndex((p: any) => p.id === body.id);
        if (idx >= 0) {
          prods[idx] = body;
        } else {
          body.id = 'prod-' + Date.now();
          body.slug = body.name ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'product-' + Date.now();
          prods.push(body);
        }
        saveStoredProducts(prods);
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (pathname.startsWith('/api/admin/products/') && method === 'DELETE') {
      const id = pathname.replace('/api/admin/products/', '');
      const prods = getStoredProducts().filter((p: any) => p.id !== id);
      saveStoredProducts(prods);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 15. Admin Audit Logs
    if (pathname === '/api/admin/audit-logs') {
      return new Response(
        JSON.stringify([
          { id: '1', action: 'SYSTEM_BOOT', entityType: 'SERVER', timestamp: new Date().toISOString() },
          { id: '2', action: 'INIT_CATALOG', entityType: 'PRODUCTS', timestamp: new Date().toISOString() }
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return fetch(input, init);
}
