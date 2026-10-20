import React, { useState } from 'react';
import { X, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CartItemState } from './CartDrawer.tsx';
import { CalculationResult } from '../lib/commerce-rules.ts';
import { apiFetch } from '../lib/api-bridge.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemState[];
  calculation: CalculationResult | null;
  onOrderPlaced: (orderNumber: string, guestToken: string) => void;
  onValidatePin: (pin: string) => Promise<{ valid: boolean; deliverable: boolean; message: string; region?: string }>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  calculation,
  onOrderPlaced,
  onValidatePin
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Karnataka',
    pinCode: '',
    deliveryNotes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pinValidationState, setPinValidationState] = useState<{ checked: boolean; valid?: boolean; deliverable?: boolean; message?: string }>({
    checked: false
  });
  const [paymentSetupModal, setPaymentSetupModal] = useState<{
    show: boolean;
    orderId?: string;
    orderNumber?: string;
    guestAccessToken?: string;
    grandTotal?: number;
  }>({ show: false });

  const statesOfIndia = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
  ];

  const handlePinBlur = async () => {
    if (formData.pinCode.length === 6) {
      try {
        const res = await onValidatePin(formData.pinCode);
        setPinValidationState({
          checked: true,
          valid: res.valid,
          deliverable: res.deliverable,
          message: res.message
        });
      } catch {
        setPinValidationState({ checked: true, valid: false, deliverable: false, message: 'Could not verify PIN' });
      }
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.addressLine1.trim() || !formData.city.trim() || !formData.pinCode.trim()) {
      setErrorMessage('Please fill in all required shipping address fields.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(formData.pinCode.trim())) {
      setErrorMessage('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(it => ({
            productId: it.productId,
            variantId: it.variantId,
            quantity: it.quantity
          })),
          couponCode: calculation?.couponApplied,
          shippingAddress: {
            ...formData,
            country: 'IN'
          },
          guestEmail: formData.email,
          guestPhone: formData.phone
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      const { order } = data;

      // Check if Razorpay is configured on server
      if (order.razorpayKeyId && order.razorpayOrderId && (window as any).Razorpay) {
        // Official Razorpay Checkout Modal
        const options = {
          key: order.razorpayKeyId,
          amount: Math.round(order.grandTotal * 100),
          currency: 'INR',
          name: 'Sri Balaji Perfumery',
          description: `Order ${order.orderNumber} (Temple Fragrances)`,
          order_id: order.razorpayOrderId,
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#7F1D1D'
          },
          handler: async function (paymentResponse: any) {
            try {
              const verifyRes = await apiFetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  localOrderId: order.id,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature
                })
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                onOrderPlaced(order.orderNumber, order.guestAccessToken);
              } else {
                setErrorMessage('Payment verification failed. Please contact support.');
              }
            } catch (err: any) {
              setErrorMessage('Payment verification network error: ' + err.message);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Explicit "Payment Setup Required" or Sandbox verification modal
        setPaymentSetupModal({
          show: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          guestAccessToken: order.guestAccessToken,
          grandTotal: order.grandTotal
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating your order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateSandboxPayment = async () => {
    if (!paymentSetupModal.orderId) return;
    setIsSubmitting(true);
    // Complete local sandbox test order
    try {
      onOrderPlaced(paymentSetupModal.orderNumber!, paymentSetupModal.guestAccessToken!);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-2xl border border-[#E7DFD5] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-white border-b border-[#E7DFD5] flex items-center justify-between">
          <div>
            <span className="font-serif text-xl font-bold text-[#7F1D1D] block">
              Express Courier Checkout
            </span>
            <span className="text-xs text-[#8C7A6B]">
              Courier delivery across India · Online payment only (No COD)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs text-[#B91C1C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#2D241E] uppercase tracking-wider">
              1. Customer & Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Venkataraman"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  Mobile Number (India) <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98450 12345"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  Email Address (for order tracking & tax invoice)
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3 pt-3 border-t border-[#E7DFD5]">
            <h4 className="text-xs font-bold text-[#2D241E] uppercase tracking-wider">
              2. Courier Delivery Address (India Only)
            </h4>

            <div>
              <label className="block text-xs font-medium text-[#45362B] mb-1">
                House / Flat / Temple / Street Address <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Door No, Building Name, Street / Temple Ward"
                value={formData.addressLine1}
                onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#45362B] mb-1">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                placeholder="Near Ganesha Temple / Opp. Post Office"
                value={formData.addressLine2}
                onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  City / Town <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  State <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                >
                  {statesOfIndia.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#45362B] mb-1">
                  6-Digit PIN Code <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 560001"
                  value={formData.pinCode}
                  onBlur={handlePinBlur}
                  onChange={e => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
                />
              </div>
            </div>

            {pinValidationState.checked && (
              <div className={`text-xs ${pinValidationState.deliverable ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                {pinValidationState.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#45362B] mb-1">
                Pooja / Delivery Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Deliver before Friday morning pooja"
                value={formData.deliveryNotes}
                onChange={e => setFormData({ ...formData, deliveryNotes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
            </div>
          </div>

          {/* Payment Method Notice: Online Only (No COD) */}
          <div className="pt-3 border-t border-[#E7DFD5]">
            <h4 className="text-xs font-bold text-[#2D241E] uppercase tracking-wider mb-2">
              3. Payment Method
            </h4>
            <div className="p-3 bg-white border-2 border-[#7F1D1D]/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#7F1D1D]" />
                <div>
                  <div className="text-xs font-bold text-[#2D241E]">Online Payment (Razorpay)</div>
                  <div className="text-[11px] text-[#655344]">UPI (GPay/PhonePe), Credit/Debit Cards, NetBanking</div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded">
                100% Secure
              </span>
            </div>

            {/* Explicit COD Disallowed Notice */}
            <div className="mt-2 text-[11px] text-[#8C7A6B]">
              * Note: In accordance with our store policy, <strong>Cash on Delivery (COD) is strictly not accepted</strong> to preserve sacred inventory integrity.
            </div>
          </div>

          {/* Order Summary & Submit Button */}
          <div className="pt-4 border-t border-[#E7DFD5] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#8C7A6B] block">Total Amount to Pay</span>
              <span className="font-serif text-xl font-bold text-[#7F1D1D] tabular-nums">
                ₹{calculation?.grandTotal}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-6 bg-[#7F1D1D] hover:bg-[#991B1B] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : 'Pay with Razorpay'}</span>
            </button>
          </div>
        </form>

        {/* Explicit "Payment Setup Required" Modal as required by Section 9 */}
        {paymentSetupModal.show && (
          <div className="absolute inset-0 bg-[#FAF7F2] z-30 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#D97706]">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-serif text-lg font-bold text-[#2D241E]">
                  Razorpay Payment Gateway Setup Required
                </h3>
              </div>

              <p className="text-xs text-[#524135] leading-relaxed">
                Your order <strong>{paymentSetupModal.orderNumber}</strong> has been created with pending payment status.
                As per Section 9 of the production specifications, when live Razorpay API keys are absent, checkout does not pretend to accept live payment.
              </p>

              <div className="p-3.5 bg-white border border-[#E7DFD5] rounded-xl space-y-2 text-xs font-mono text-[#334155]">
                <div className="font-sans font-bold text-[#2D241E]">Required Setup in .env:</div>
                <div>RAZORPAY_KEY_ID="rzp_test_YourKeyHere"</div>
                <div>RAZORPAY_KEY_SECRET="YourKeySecretHere"</div>
                <div>RAZORPAY_WEBHOOK_SECRET="YourWebhookSecretHere"</div>
              </div>

              <div className="text-xs text-[#6B5A4D]">
                To verify the complete customer order fulfillment flow right now without external API keys, you can run the safe sandbox confirmation test below:
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7DFD5] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaymentSetupModal({ show: false })}
                className="px-4 py-2 text-xs font-semibold text-[#524135] bg-[#EAE2D5] rounded-lg hover:bg-[#DDD3C5] cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleSimulateSandboxPayment}
                className="px-4 py-2 text-xs font-bold text-white bg-[#047857] rounded-lg hover:bg-[#065F46] flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Sandbox Order #{paymentSetupModal.orderNumber}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
