import React from 'react';
import { X } from 'lucide-react';

interface PolicyModalProps {
  policyKey: 'about' | 'shipping' | 'refund' | 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ policyKey, onClose }) => {
  if (!policyKey) return null;

  const contentMap = {
    about: {
      title: 'About Sri Balaji Perfumery',
      subtitle: 'Artisanal Indian Spiritual Fragrances Since 1984',
      body: `
      Sri Balaji Perfumery is dedicated to preserving the sacred traditional art of Indian agarbatti, cup sambrani, and dhoop manufacture. Rooted in traditional temple car streets of Southern India, our formulations combine ethically sourced natural resins, pure sandalwood paste, aromatic botanical barks, and temple flora.
      
      Unlike mass-produced chemical incense, each stick and cup is handcrafted with devotion to elevate your daily prayers, temple sanctification, and deep meditation. We believe that spiritual purity begins with authentic ingredients.
      `
    },
    shipping: {
      title: 'Courier Shipping & Delivery Policy',
      subtitle: 'All-India Insured Courier Transit',
      body: `
      1. Delivery Territory: Sri Balaji Perfumery delivers strictly within the Republic of India. Orders for international delivery are not accepted.
      
      2. PIN Code Serviceability: Delivery serviceability is determined by our integrated courier network (BlueDart, Delhivery, DTDC, India Post). Customers must verify their 6-digit postal PIN code before checkout.
      
      3. Dispatch Timeline: Orders are dispatched within 24 to 48 business hours after online payment confirmation. Transit typically requires 2 to 5 business days depending on destination tier.
      
      4. Shipping Charges: A flat shipping charge of ₹60 is applied to domestic orders. Orders above the free shipping threshold (₹499) qualify for complimentary courier delivery across India.
      
      5. Tracking: Once dispatched, an official AWB tracking number and link are provided in your order confirmation dashboard.
      `
    },
    refund: {
      title: 'Cancellation & Refund Policy',
      subtitle: 'Safe Transit & Sacred Quality Assurance',
      body: `
      1. Online Payment Only: To maintain safe packaging and prevent inventory lockup, Sri Balaji Perfumery accepts online payments exclusively via Razorpay. Cash on Delivery (COD) is neither offered nor accepted.
      
      2. Cancellation Prior to Dispatch: Orders may be cancelled prior to courier dispatch by contacting customer care with your order reference. A full refund will be processed back to the original payment source within 5 to 7 banking days.
      
      3. Transit Damage & Replacement: Because aromatic incense is fragile, if items arrive physically damaged in courier transit, please notify us within 48 hours of delivery with photographic evidence. We will immediately dispatch a complimentary replacement or process an authorized refund.
      
      4. Hygiene & Ritual Purity: Opened incense or pooja items cannot be returned due to sacred ritual hygiene standards once the tamper-evident seal is broken.
      `
    },
    privacy: {
      title: 'Privacy & Data Security Policy',
      subtitle: 'Commitment to Customer Data Minimization',
      body: `
      1. Minimal Data Collection: We collect only the information strictly necessary to process and fulfill your courier delivery: recipient name, mobile contact, delivery address, postal PIN code, and email for tax invoice delivery.
      
      2. Payment Security: Sri Balaji Perfumery never stores, processes, or retains credit/debit card numbers, CVVs, or net banking credentials. All payments are processed through Razorpay's PCI-DSS compliant secure infrastructure.
      
      3. No Marketing Spam: Your telephone and address will only be used for courier tracking and order notifications. We do not sell or rent customer data to third parties.
      `
    },
    terms: {
      title: 'Terms & Conditions of Sale',
      subtitle: 'Sri Balaji Perfumery Domestic Retail Agreement',
      body: `
      1. Contract of Sale: By placing an order, you agree that your purchase is for domestic personal or devotional use within India under applicable Indian commercial laws.
      
      2. Invoicing & GST: All prices displayed are in Indian Rupees (INR ₹) and are inclusive of Goods and Services Tax (GST) at 5% (HSN Code 33074100 for incense sticks and sambrani). Downloadable tax invoices are issued for every verified order.
      
      3. Jurisdiction: Any disputes arising out of purchases from Sri Balaji Perfumery shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
      `
    }
  };

  const current = contentMap[policyKey];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-2xl border border-[#E7DFD5] shadow-2xl overflow-hidden my-8 p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-[#7F1D1D] uppercase tracking-wider block mb-1">
          {current.subtitle}
        </span>

        <h2 className="font-serif text-2xl font-bold text-[#2D241E] mb-4">
          {current.title}
        </h2>

        <div className="text-xs text-[#524135] leading-relaxed space-y-3 whitespace-pre-line border-t border-[#E7DFD5] pt-4">
          {current.body}
        </div>

        <div className="pt-6 mt-4 border-t border-[#E7DFD5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#7F1D1D] text-white text-xs font-bold rounded-lg hover:bg-[#991B1B] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
