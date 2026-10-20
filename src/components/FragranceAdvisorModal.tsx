import React, { useState } from 'react';
import { X, Sparkles, Send, ArrowRight } from 'lucide-react';
import { CatalogProduct } from '../lib/commerce-rules.ts';
import { apiFetch } from '../lib/api-bridge.ts';

interface FragranceAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  onSelectProduct: (product: CatalogProduct) => void;
}

export const FragranceAdvisorModal: React.FC<FragranceAdvisorModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  if (!isOpen) return null;

  const [occasion, setOccasion] = useState('Daily Morning Puja');
  const [preference, setPreference] = useState('Natural Sandalwood & Floral');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    recommendation: string;
    suggestedProductSlugs?: string[];
  } | null>(null);

  const occasions = [
    'Daily Morning Puja',
    'Deep Meditation & Yoga',
    'Festival & Aarti (Navaratri/Diwali)',
    'Housewarming & Sacred Sanctification',
    'Evening Stress Relief'
  ];

  const preferences = [
    'Natural Sandalwood & Floral',
    'Pure Benzoin Loban & Resins',
    'Desi Rose & Sacred Musk',
    'Bhimseni Camphor & Woods'
  ];

  const handleAskAdvisor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await apiFetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion,
          preference,
          query: query.trim()
        })
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Advisor request error:', err);
      setResponse({
        recommendation:
          'For your spiritual rituals, our handcrafted Maha Balaji Flora Agarbatti and Deva Loban Cup Sambrani provide pure temple sanctification and divine peaceful atmosphere.',
        suggestedProductSlugs: ['maha-balaji-traditional-flora-agarbatti', 'deva-loban-charcoal-cup-sambrani']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const matchedProducts = products.filter(
    p => response?.suggestedProductSlugs?.includes(p.slug)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-[#FAF7F2] rounded-2xl border border-[#E7DFD5] shadow-2xl overflow-hidden my-8 p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
          aria-label="Close fragrance advisor"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#7F1D1D] mb-1">
          <Sparkles className="w-5 h-5 text-[#D97706]" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Gemini Scent Sommelier
          </span>
        </div>

        <h2 className="font-serif text-2xl font-bold text-[#2D241E] mb-2">
          Discover Your Sacred Fragrance
        </h2>

        <p className="text-xs text-[#6B5A4D] mb-6 leading-relaxed">
          Select your ritual occasion and fragrance notes to receive personalized sacred incense recommendations grounded in authentic Indian temple heritage.
        </p>

        {/* Form Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2D241E] mb-1.5">
              Select Ritual Occasion:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {occasions.map(occ => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setOccasion(occ)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    occasion === occ
                      ? 'bg-[#7F1D1D] text-white font-medium shadow-xs'
                      : 'bg-white text-[#524135] border border-[#DDD3C5] hover:bg-[#F2EDE4]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D241E] mb-1.5">
              Preferred Fragrance Profile:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {preferences.map(pref => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setPreference(pref)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    preference === pref
                      ? 'bg-[#B45309] text-white font-medium shadow-xs'
                      : 'bg-white text-[#524135] border border-[#DDD3C5] hover:bg-[#F2EDE4]'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2D241E] mb-1.5">
              Specific Query or Ritual Detail (Optional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Which agarbatti helps focus during Gayatri mantra chanting?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
              <button
                type="button"
                onClick={() => handleAskAdvisor()}
                disabled={isLoading}
                className="px-4 py-2 bg-[#7F1D1D] hover:bg-[#991B1B] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <span>Consulting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Recommend</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Advisor Response */}
        {response && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-[#D4AF37]/50 shadow-sm space-y-4">
            <div className="text-xs text-[#2D241E] leading-relaxed">
              <strong className="text-[#7F1D1D] block mb-1">Sri Balaji Recommendation:</strong>
              {response.recommendation}
            </div>

            {matchedProducts.length > 0 && (
              <div className="pt-3 border-t border-[#F0E8DD]">
                <span className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider block mb-2">
                  Matching Temple Fragrances:
                </span>
                <div className="space-y-2">
                  {matchedProducts.map(prod => (
                    <div
                      key={prod.id}
                      className="p-2.5 bg-[#FAF7F2] rounded-lg border border-[#E7DFD5] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#2D241E]">{prod.name}</div>
                        <div className="text-[11px] text-[#7F1D1D] font-bold tabular-nums">
                          ₹{prod.discountedPrice || prod.price}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          onSelectProduct(prod);
                        }}
                        className="px-3 py-1 bg-[#7F1D1D] text-white text-xs font-semibold rounded-md hover:bg-[#991B1B] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Product</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
