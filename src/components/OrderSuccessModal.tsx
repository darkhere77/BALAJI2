import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Truck, ArrowLeft } from 'lucide-react';
import { OrderRecord } from '../server/store.ts';
import { apiFetch } from '../lib/api-bridge.ts';

interface OrderSuccessModalProps {
  orderNumber: string;
  guestToken: string;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  orderNumber,
  guestToken,
  onClose
}) => {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoicePrint, setShowInvoicePrint] = useState(false);

  useEffect(() => {
    apiFetch(`/api/orders/${orderNumber}?token=${guestToken}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load order:', err);
        setLoading(false);
      });
  }, [orderNumber, guestToken]);

  const handleDownloadInvoice = () => {
    setShowInvoicePrint(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-[#FAF7F2] rounded-2xl border border-[#E7DFD5] shadow-2xl overflow-hidden my-8 p-6 md:p-8 text-center">
        <div className="w-16 h-16 bg-[#ECFDF5] text-[#047857] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#A7F3D0]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold text-[#047857] uppercase tracking-wider">
          Order Confirmed & Placed
        </span>

        <h2 className="font-serif text-2xl font-bold text-[#2D241E] mt-1 mb-2">
          Thank You for Shopping with Sri Balaji Perfumery
        </h2>

        <p className="text-xs text-[#6B5A4D] max-w-md mx-auto leading-relaxed">
          Your sacred fragrance order <strong>#{orderNumber}</strong> has been received and registered for dispatch.
          Our team is preparing your handcrafted items with the utmost spiritual care.
        </p>

        {loading ? (
          <div className="my-6 text-xs text-[#8C7A6B]">Loading order details...</div>
        ) : order ? (
          <div className="my-6 p-4 bg-white rounded-xl border border-[#E7DFD5] text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#F0E8DD] pb-2">
              <span className="text-[#8C7A6B]">Order Reference:</span>
              <span className="font-bold text-[#7F1D1D] font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0E8DD] pb-2">
              <span className="text-[#8C7A6B]">Payment Status:</span>
              <span className="font-semibold text-[#047857] capitalize">{order.paymentStatus}</span>
            </div>
            <div className="flex justify-between border-b border-[#F0E8DD] pb-2">
              <span className="text-[#8C7A6B]">Courier Delivery Destination:</span>
              <span className="font-medium text-[#2D241E]">
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pinCode}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-bold text-[#7F1D1D]">
              <span>Grand Total Paid:</span>
              <span className="tabular-nums">₹{order.grandTotal}</span>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleDownloadInvoice}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-[#7F1D1D] bg-[#F7EFE2] border border-[#E3D2BA] rounded-xl hover:bg-[#EFE3CF] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Download GST Tax Invoice</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-[#7F1D1D] hover:bg-[#991B1B] rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>
    </div>
  );
};
