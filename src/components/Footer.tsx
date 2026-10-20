import React from 'react';
import { StoreSettings } from '../lib/commerce-rules.ts';

interface FooterProps {
  settings: StoreSettings | null;
  onOpenPolicy: (policyKey: 'about' | 'shipping' | 'refund' | 'privacy' | 'terms') => void;
  onOpenAdvisor: () => void;
  onOpen3D: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenPolicy,
  onOpenAdvisor,
  onOpen3D
}) => {
  return (
    <footer className="bg-[#231A15] text-[#D1C6BA] pt-12 pb-8 border-t border-[#3D2E25]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#3D2E25]">
          {/* Brand & Origin */}
          <div className="space-y-3">
            <span className="font-serif text-lg font-bold text-[#F5EFE6] block">
              SRI BALAJI PERFUMERY
            </span>
            <p className="text-xs text-[#A8988B] leading-relaxed">
              Authentic Indian spiritual fragrances, handcrafted flora agarbatti, pure benzoin cup sambrani, and sacred pooja essentials.
            </p>
            <div className="text-[11px] text-[#C59B27] font-semibold">
              Heritage Artisanal Incense Since 1984
            </div>
          </div>

          {/* Customer Service & Policies */}
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block mb-2">
              Customer Policies
            </span>
            <div>
              <button
                onClick={() => onOpenPolicy('shipping')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Shipping & Delivery Policy (All India)
              </button>
            </div>
            <div>
              <button
                onClick={() => onOpenPolicy('refund')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Cancellation & Refund Policy
              </button>
            </div>
            <div>
              <button
                onClick={() => onOpenPolicy('privacy')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacy & Data Security Policy
              </button>
            </div>
            <div>
              <button
                onClick={() => onOpenPolicy('terms')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Terms & Conditions
              </button>
            </div>
          </div>

          {/* Ritual & AI Services */}
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block mb-2">
              Spiritual Services
            </span>
            <div>
              <button
                onClick={onOpenAdvisor}
                className="hover:text-[#FBBF24] transition-colors cursor-pointer"
              >
                Fragrance Sommelier & Pooja Consultation
              </button>
            </div>
            <div>
              <button
                onClick={onOpen3D}
                className="hover:text-[#FBBF24] transition-colors cursor-pointer"
              >
                Interactive 3D Brass Burner Experience
              </button>
            </div>
            <div>
              <button
                onClick={() => onOpenPolicy('about')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                About Our Traditional Craftsmanship
              </button>
            </div>
          </div>

          {/* Contact & Business Info */}
          <div className="space-y-2 text-xs">
            <span className="font-semibold text-white uppercase tracking-wider text-[11px] block mb-2">
              Contact & Address
            </span>
            <div className="text-[#A8988B] leading-relaxed">
              {settings?.address || '108 Temple Car Street, Bengaluru, Karnataka 560001, India'}
            </div>
            <div className="text-[#F5EFE6]">
              Phone: {settings?.supportPhone || '+91 98400 12345'}
            </div>
            <div className="text-[#F5EFE6]">
              Email: {settings?.supportEmail || 'care@sribalajiperfumery.in'}
            </div>
            {settings?.gstin && (
              <div className="text-[11px] text-[#A8988B]">
                GSTIN: <span className="font-mono">{settings.gstin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Credits & Anti-Slop Cleanliness */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C7A6B] gap-3">
          <div>
            © {new Date().getFullYear()} Sri Balaji Perfumery. All rights reserved. Handcrafted in India.
          </div>
          <div className="text-[11px] text-[#8C7A6B]">
            India Domestic Courier Delivery Only · Secured with Razorpay Online Payment
          </div>
        </div>
      </div>
    </footer>
  );
};
