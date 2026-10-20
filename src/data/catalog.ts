import { CatalogProduct, StoreSettings } from '../lib/commerce-rules.ts';

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'SRI BALAJI PERFUMERY',
  currency: 'INR',
  taxRatePercent: 5.0,
  taxInclusive: true,
  standardShippingFee: 60,
  freeShippingThreshold: 499,
  gstin: '29ABCDE1234F1Z5',
  supportPhone: '+91 98400 12345',
  supportEmail: 'care@sribalajiperfumery.in',
  address: '108 Sri Balaji Sannidhi Street, Bengaluru, Karnataka 560001, India'
};

export const INITIAL_CATEGORIES = [
  { id: 'cat-incense', name: 'Incense Sticks', slug: 'incense-sticks' },
  { id: 'cat-cup-sambrani', name: 'Cup Sambranis', slug: 'cup-sambranis' },
  { id: 'cat-dhoop-cones', name: 'Dhoop Cones', slug: 'dhoop-cones' },
  { id: 'cat-dhoop-sticks', name: 'Dhoop Sticks', slug: 'dhoop-sticks' },
  { id: 'cat-pooja-essentials', name: 'Pooja Essentials', slug: 'pooja-essentials' }
];

export const INITIAL_PRODUCTS: CatalogProduct[] = [
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
];
