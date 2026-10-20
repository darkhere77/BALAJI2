import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CatalogProduct, CouponRule, StoreSettings, OrderStatus, PaymentStatus } from '../lib/commerce-rules.ts';

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAccessToken: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    deliveryNotes?: string;
  };
  courierDetails?: {
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    shippedAt?: string;
    deliveredAt?: string;
    estimatedDelivery?: string;
  };
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    paymentMethod?: string;
    verifiedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  eventId: string;
  eventName: string;
  payload: any;
  processedAt: string;
  status: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  role: 'admin' | 'staff';
}

export interface StoreData {
  products: CatalogProduct[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>;
  coupons: CouponRule[];
  orders: OrderRecord[];
  webhookEvents: WebhookEventRecord[];
  settings: StoreSettings;
  admins: AdminUser[];
  auditLogs: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
  }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

const INITIAL_DATA: StoreData = {
  settings: {
    storeName: 'SRI BALAJI PERFUMERY',
    currency: 'INR',
    taxRatePercent: 5.0, // 5% GST on Agarbatti / Incense
    taxInclusive: true,
    standardShippingFee: 60,
    freeShippingThreshold: 499,
    gstin: '29ABCDE1234F1Z5',
    supportPhone: '+91 98400 12345',
    supportEmail: 'care@sribalajiperfumery.in',
    address: '108 Sri Balaji Sannidhi Street, Bengaluru, Karnataka 560001, India'
  },
  categories: [
    {
      id: 'cat-incense',
      name: 'Incense Sticks',
      slug: 'incense-sticks',
      description: 'Hand-rolled traditional flora and masala agarbatti made with organic natural resins, essential oils and temple wood.',
      displayOrder: 1,
      isActive: true
    },
    {
      id: 'cat-cup-sambrani',
      name: 'Cup Sambranis',
      slug: 'cup-sambranis',
      description: 'Traditional charcoal cups packed with pure benzoin Loban and Guggal for auspicious pooja sanctification.',
      displayOrder: 2,
      isActive: true
    },
    {
      id: 'cat-dhoop-cones',
      name: 'Dhoop Cones',
      slug: 'dhoop-cones',
      description: 'Concentrated bamboo-less fragrance cones creating dense, purifying spiritual aromas.',
      displayOrder: 3,
      isActive: true
    },
    {
      id: 'cat-dhoop-sticks',
      name: 'Dhoop Sticks',
      slug: 'dhoop-sticks',
      description: 'Thick organic herbal dhoop battis with slow-burn formulas for temples, meditation, and daily prayers.',
      displayOrder: 4,
      isActive: true
    },
    {
      id: 'cat-pooja-essentials',
      name: 'Pooja Essentials',
      slug: 'pooja-essentials',
      description: 'Virgin Bhimseni Camphor, pure brass burners, natural kumkum, and sacred ritual offerings.',
      displayOrder: 5,
      isActive: true
    }
  ],
  products: [
    {
      id: 'prod-maha-flora',
      name: 'Maha Balaji Traditional Flora Agarbatti',
      slug: 'maha-balaji-traditional-flora-agarbatti',
      category: 'Incense Sticks',
      price: 199,
      discountedPrice: 169,
      stock: 85,
      isPublished: true,
      fragrance: 'Nag Champa, Sandalwood & Golden Champaca',
      weight: '250g (Approx. 130 Sticks)',
      variants: [
        { id: 'var-flora-standard', name: 'Standard Pack (250g)', sku: 'SBP-FLORA-250', price: 169, stock: 50 },
        { id: 'var-flora-bulk', name: 'Family Value Pack (500g)', sku: 'SBP-FLORA-500', price: 299, stock: 35 }
      ]
    },
    {
      id: 'prod-deva-loban-cup',
      name: 'Deva Loban Charcoal Cup Sambrani',
      slug: 'deva-loban-charcoal-cup-sambrani',
      category: 'Cup Sambranis',
      price: 249,
      discountedPrice: 199,
      stock: 60,
      isPublished: true,
      fragrance: 'Pure Benzoin Gum (Loban) & Natural Resins',
      weight: 'Pack of 12 Cups with Metal Burner Plate',
      variants: [
        { id: 'var-sambrani-12', name: 'Box of 12 Cups', sku: 'SBP-SAM-12', price: 199, stock: 40 },
        { id: 'var-sambrani-24', name: 'Grand Puja Box (24 Cups)', sku: 'SBP-SAM-24', price: 360, stock: 20 }
      ]
    },
    {
      id: 'prod-kasturi-rose-cones',
      name: 'Kasturi & Desi Rose Dhoop Cones',
      slug: 'kasturi-desi-rose-dhoop-cones',
      category: 'Dhoop Cones',
      price: 160,
      discountedPrice: 135,
      stock: 45,
      isPublished: true,
      fragrance: 'Kannauj Desi Gulab & Sacred Musk (Kasturi)',
      weight: 'Pack of 30 Cones with Ceramic Holder',
      variants: [
        { id: 'var-cone-30', name: 'Standard (30 Cones)', sku: 'SBP-CONE-30', price: 135, stock: 30 },
        { id: 'var-cone-60', name: 'Double Pack (60 Cones)', sku: 'SBP-CONE-60', price: 240, stock: 15 }
      ]
    },
    {
      id: 'prod-bhimseni-camphor',
      name: 'Virgin Bhimseni Camphor (Karpur) Flakes',
      slug: 'virgin-bhimseni-camphor-flakes',
      category: 'Pooja Essentials',
      price: 299,
      discountedPrice: 249,
      stock: 40,
      isPublished: true,
      fragrance: 'Crisp Purifying Natural Camphor',
      weight: '100g Airtight Jar',
      variants: [
        { id: 'var-camphor-100', name: '100g Airtight Jar', sku: 'SBP-KRP-100', price: 249, stock: 25 },
        { id: 'var-camphor-250', name: '250g Value Jar', sku: 'SBP-KRP-250', price: 549, stock: 15 }
      ]
    },
    {
      id: 'prod-mysore-sandal-sticks',
      name: 'Mysore Sandalwood Herbal Dhoop Sticks',
      slug: 'mysore-sandalwood-herbal-dhoop-sticks',
      category: 'Dhoop Sticks',
      price: 180,
      discountedPrice: 149,
      stock: 70,
      isPublished: true,
      fragrance: 'Pure Mysore Chandan (Zero Charcoal)',
      weight: 'Pack of 20 Thick Sticks (45 min burn)',
      variants: [
        { id: 'var-sandal-20', name: 'Pack of 20 Sticks', sku: 'SBP-DSTK-20', price: 149, stock: 45 },
        { id: 'var-sandal-50', name: 'Pack of 50 Sticks', sku: 'SBP-DSTK-50', price: 320, stock: 25 }
      ]
    },
    {
      id: 'prod-sambrani-burner-thali',
      name: 'Handcrafted Brass Dhoop Dani & Sambrani Stand',
      slug: 'handcrafted-brass-dhoop-dani-sambrani-stand',
      category: 'Pooja Essentials',
      price: 799,
      discountedPrice: 599,
      stock: 25,
      isPublished: true,
      fragrance: 'Solid Engraved Brass Burner with Wooden Handle',
      weight: '450g Solid Brass'
    }
  ],
  coupons: [
    {
      code: 'BALAJI10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 299,
      maxDiscount: 150,
      isActive: true
    },
    {
      code: 'POOJA50',
      discountType: 'flat',
      discountValue: 50,
      minOrderValue: 499,
      isActive: true
    }
  ],
  orders: [],
  webhookEvents: [],
  admins: [],
  auditLogs: []
};

// Initialize Admin Credentials: username 'admin', password 'Balaji@2026'
const defaultSalt = crypto.randomBytes(16).toString('hex');
INITIAL_DATA.admins.push({
  id: 'admin-1',
  username: 'admin',
  salt: defaultSalt,
  passwordHash: hashPassword('Balaji@2026', defaultSalt),
  fullName: 'Sri Balaji Store Administrator',
  role: 'admin'
});

export class DataStore {
  private data: StoreData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.error('Error reading data file, resetting to initial data:', err);
    }
    this.saveData(INITIAL_DATA);
    return INITIAL_DATA;
  }

  private saveData(data: StoreData) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
      this.data = data;
    } catch (err) {
      console.error('Error saving data to disk:', err);
    }
  }

  public getSettings(): StoreSettings {
    return { ...this.data.settings };
  }

  public updateSettings(newSettings: Partial<StoreSettings>, actor = 'admin'): StoreSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.addAuditLog(actor, 'UPDATE_SETTINGS', 'STORE_SETTINGS', 'default', newSettings);
    this.saveData(this.data);
    return this.data.settings;
  }

  public getCategories() {
    return this.data.categories.filter(c => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public getAllCategories() {
    return this.data.categories;
  }

  public saveCategory(category: StoreData['categories'][0], actor = 'admin') {
    const idx = this.data.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.data.categories[idx] = category;
      this.addAuditLog(actor, 'UPDATE_CATEGORY', 'CATEGORY', category.id);
    } else {
      this.data.categories.push(category);
      this.addAuditLog(actor, 'CREATE_CATEGORY', 'CATEGORY', category.id);
    }
    this.saveData(this.data);
    return category;
  }

  public getPublishedProducts(categorySlug?: string, search?: string) {
    let prods = this.data.products.filter(p => p.isPublished);

    if (categorySlug && categorySlug !== 'all') {
      const cat = this.data.categories.find(c => c.slug === categorySlug);
      if (cat) {
        prods = prods.filter(p => p.category.toLowerCase() === cat.name.toLowerCase());
      }
    }

    if (search) {
      const q = search.toLowerCase().trim();
      prods = prods.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.fragrance && p.fragrance.toLowerCase().includes(q)) ||
          p.slug.toLowerCase().includes(q)
      );
    }

    return prods;
  }

  public getAllProducts() {
    return this.data.products;
  }

  public getProductBySlug(slug: string) {
    return this.data.products.find(p => p.slug === slug);
  }

  public getProductById(id: string) {
    return this.data.products.find(p => p.id === id);
  }

  public saveProduct(product: CatalogProduct, actor = 'admin') {
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      this.data.products[idx] = product;
      this.addAuditLog(actor, 'UPDATE_PRODUCT', 'PRODUCT', product.id);
    } else {
      this.data.products.push(product);
      this.addAuditLog(actor, 'CREATE_PRODUCT', 'PRODUCT', product.id);
    }
    this.saveData(this.data);
    return product;
  }

  public deleteProduct(id: string, actor = 'admin') {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.addAuditLog(actor, 'DELETE_PRODUCT', 'PRODUCT', id);
    this.saveData(this.data);
    return true;
  }

  public getCoupons() {
    return this.data.coupons;
  }

  public getCouponByCode(code: string) {
    const clean = code.trim().toUpperCase();
    return this.data.coupons.find(c => c.code.toUpperCase() === clean && c.isActive);
  }

  public saveCoupon(coupon: CouponRule, actor = 'admin') {
    const idx = this.data.coupons.findIndex(c => c.code.toUpperCase() === coupon.code.toUpperCase());
    if (idx >= 0) {
      this.data.coupons[idx] = coupon;
      this.addAuditLog(actor, 'UPDATE_COUPON', 'COUPON', coupon.code);
    } else {
      this.data.coupons.push(coupon);
      this.addAuditLog(actor, 'CREATE_COUPON', 'COUPON', coupon.code);
    }
    this.saveData(this.data);
    return coupon;
  }

  public createOrder(order: OrderRecord, actor = 'customer'): OrderRecord {
    this.data.orders.unshift(order);
    this.addAuditLog(actor, 'CREATE_ORDER', 'ORDER', order.orderNumber, {
      grandTotal: order.grandTotal,
      itemCount: order.items.length
    });
    this.saveData(this.data);
    return order;
  }

  public getOrders() {
    return this.data.orders;
  }

  public getOrderByNumber(orderNumber: string) {
    return this.data.orders.find(o => o.orderNumber === orderNumber);
  }

  public getOrderById(id: string) {
    return this.data.orders.find(o => o.id === id);
  }

  public updateOrder(order: OrderRecord, actor = 'system'): OrderRecord {
    const idx = this.data.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      order.updatedAt = new Date().toISOString();
      this.data.orders[idx] = order;
      this.addAuditLog(actor, 'UPDATE_ORDER', 'ORDER', order.orderNumber, {
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
      this.saveData(this.data);
    }
    return order;
  }

  public recordWebhookEvent(event: WebhookEventRecord) {
    this.data.webhookEvents.unshift(event);
    this.saveData(this.data);
  }

  public isWebhookEventProcessed(eventId: string): boolean {
    return this.data.webhookEvents.some(e => e.eventId === eventId);
  }

  public authenticateAdmin(username: string, pass: string): { success: boolean; user?: AdminUser } {
    const admin = this.data.admins.find(a => a.username.toLowerCase() === username.toLowerCase());
    if (!admin) return { success: false };

    const expectedHash = hashPassword(pass, admin.salt);
    if (expectedHash === admin.passwordHash) {
      return { success: true, user: admin };
    }
    return { success: false };
  }

  public addAuditLog(actor: string, action: string, entityType: string, entityId?: string, details?: any) {
    this.data.auditLogs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor,
      action,
      entityType,
      entityId,
      details
    });
    // Keep last 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500;
    }
  }

  public getAuditLogs() {
    return this.data.auditLogs;
  }
}

export const store = new DataStore();
