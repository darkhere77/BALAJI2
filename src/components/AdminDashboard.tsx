import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Package,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Truck,
  Settings,
  History,
  Lock,
  RefreshCw
} from 'lucide-react';
import { CatalogProduct, StoreSettings } from '../lib/commerce-rules.ts';
import { OrderRecord } from '../server/store.ts';
import { apiFetch } from '../lib/api-bridge.ts';

interface AdminDashboardProps {
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStore }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sri_balaji_admin_token'));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Balaji@2026');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'coupons' | 'settings' | 'logs'>('overview');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Product Editor Modal
  const [editingProduct, setEditingProduct] = useState<Partial<CatalogProduct> | null>(null);

  // Order Fulfillment Modal
  const [fulfillmentOrder, setFulfillmentOrder] = useState<OrderRecord | null>(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [targetStatus, setTargetStatus] = useState<string>('shipped');

  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const loadData = async (tok: string) => {
    try {
      const h = { Authorization: `Bearer ${tok}` };
      const [statsRes, prodsRes, ordersRes, settingsRes, logsRes] = await Promise.all([
        apiFetch('/api/admin/stats', { headers: h }),
        apiFetch('/api/admin/products', { headers: h }),
        apiFetch('/api/admin/orders', { headers: h }),
        apiFetch('/api/settings'),
        apiFetch('/api/admin/audit-logs', { headers: h })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  const [actionNotice, setActionNotice] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('sri_balaji_admin_token', data.token);
        loadData(data.token);
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('sri_balaji_admin_token');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) return;

    try {
      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(editingProduct)
      });
      if (res.ok) {
        setEditingProduct(null);
        setActionNotice('Product saved successfully');
        setTimeout(() => setActionNotice(''), 3000);
        if (token) loadData(token);
      }
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE', headers });
      setActionNotice('Product removed');
      setTimeout(() => setActionNotice(''), 3000);
      if (token) loadData(token);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!fulfillmentOrder) return;
    try {
      const res = await apiFetch(`/api/admin/orders/${fulfillmentOrder.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          targetStatus,
          courierName: courierName || 'BlueDart Express',
          trackingNumber: trackingNumber || 'BLU-' + Math.floor(100000 + Math.random() * 900000)
        })
      });
      if (res.ok) {
        setFulfillmentOrder(null);
        setActionNotice('Order status updated successfully');
        setTimeout(() => setActionNotice(''), 3000);
        if (token) loadData(token);
      } else {
        const d = await res.json();
        setActionNotice(d.error || 'Failed to update order status');
        setTimeout(() => setActionNotice(''), 3000);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  // If not authenticated, render login form with documented first-admin instructions
  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E7DFD5] shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[#7F1D1D] mb-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="font-serif text-lg font-bold">Admin Portal</span>
          </div>

          <h2 className="font-serif text-2xl font-bold text-[#2D241E] mb-1">
            Sri Balaji Perfumery
          </h2>

          <p className="text-xs text-[#8C7A6B] mb-6">
            Sign in to manage catalog, inventory, courier fulfillment, and store settings.
          </p>

          {loginError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#45362B] mb-1">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#45362B] mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#DDD3C5] rounded-lg focus:outline-none focus:border-[#7F1D1D]"
              />
            </div>

            <div className="p-3 bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg text-[11px] text-[#92400E] leading-relaxed">
              <strong>Initial Admin Provisioning:</strong><br />
              Username: <code className="font-bold">admin</code> | Password: <code className="font-bold">Balaji@2026</code>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onBackToStore}
                className="text-xs font-semibold text-[#655344] hover:text-[#7F1D1D] cursor-pointer"
              >
                ← Return to Store
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#7F1D1D] hover:bg-[#991B1B] text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F0E8] flex flex-col">
      {/* Top Admin Nav */}
      <div className="bg-[#7F1D1D] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#F59E0B]" />
          <div>
            <span className="font-serif font-bold text-base tracking-wide block">
              SRI BALAJI PERFUMERY — Store Admin
            </span>
            <span className="text-[10px] text-amber-200 uppercase tracking-widest">
              Production Operations Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(token)}
            className="p-1.5 text-amber-100 hover:text-white rounded cursor-pointer"
            title="Refresh Store Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onBackToStore}
            className="px-3 py-1.5 text-xs font-medium text-white bg-black/20 hover:bg-black/30 rounded-lg cursor-pointer"
          >
            View Live Store
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 text-red-200 hover:text-white rounded cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {actionNotice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">×</button>
          </div>
        )}
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#D7CEC3] space-x-6 text-xs font-semibold mb-6 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview', icon: DollarSign },
            { id: 'products', label: 'Products & Inventory', icon: Package },
            { id: 'orders', label: 'Courier Orders', icon: ShoppingBag },
            { id: 'coupons', label: 'Coupons', icon: FileText },
            { id: 'settings', label: 'Store Settings', icon: Settings },
            { id: 'logs', label: 'Audit Log', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#7F1D1D] text-[#7F1D1D] font-bold'
                  : 'text-[#655344] hover:text-[#7F1D1D]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] shadow-xs">
                <span className="text-xs text-[#8C7A6B] font-medium block">Total Revenue</span>
                <span className="text-2xl font-serif font-bold text-[#7F1D1D] tabular-nums mt-1 block">
                  ₹{stats.totalRevenue}
                </span>
                <span className="text-[11px] text-[#047857] mt-1 block">Verified Online Payments</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] shadow-xs">
                <span className="text-xs text-[#8C7A6B] font-medium block">Total Orders</span>
                <span className="text-2xl font-serif font-bold text-[#2D241E] tabular-nums mt-1 block">
                  {stats.totalOrders}
                </span>
                <span className="text-[11px] text-[#8C7A6B] mt-1 block">India Courier Shipments</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] shadow-xs">
                <span className="text-xs text-[#8C7A6B] font-medium block">Awaiting Dispatch</span>
                <span className="text-2xl font-serif font-bold text-[#D97706] tabular-nums mt-1 block">
                  {stats.pendingFulfillment}
                </span>
                <span className="text-[11px] text-[#D97706] mt-1 block">Paid & Processing</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] shadow-xs">
                <span className="text-xs text-[#8C7A6B] font-medium block">Low Stock Alerts</span>
                <span className="text-2xl font-serif font-bold text-[#B91C1C] tabular-nums mt-1 block">
                  {stats.lowStockCount}
                </span>
                <span className="text-[11px] text-[#B91C1C] mt-1 block">&le; 15 units remaining</span>
              </div>
            </div>

            {/* Low stock alerts list */}
            {stats.lowStockProducts?.length > 0 && (
              <div className="p-4 bg-white rounded-xl border border-[#FCA5A5] bg-red-50/20">
                <h4 className="text-xs font-bold text-[#B91C1C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Items Needing Reorder</span>
                </h4>
                <div className="divide-y divide-red-100 text-xs">
                  {stats.lowStockProducts.map((p: any) => (
                    <div key={p.id} className="py-2 flex justify-between items-center">
                      <span className="font-medium text-[#2D241E]">{p.name} ({p.category})</span>
                      <span className="font-bold text-[#B91C1C] tabular-nums">{p.stock} Units Remaining</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#655344]">
                Total {products.length} products in database
              </span>
              <button
                onClick={() =>
                  setEditingProduct({
                    id: '',
                    name: '',
                    category: 'Incense Sticks',
                    price: 150,
                    discountedPrice: 125,
                    stock: 50,
                    isPublished: true,
                    fragrance: '',
                    weight: '250g'
                  })
                }
                className="px-3 py-1.5 text-xs font-bold bg-[#7F1D1D] text-white rounded-lg hover:bg-[#991B1B] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[#E7DFD5] overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E7DFD5] text-[#8C7A6B]">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E8DD]">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-3 font-semibold text-[#2D241E]">{p.name}</td>
                      <td className="p-3 text-[#655344]">{p.category}</td>
                      <td className="p-3 font-bold text-[#7F1D1D] tabular-nums">
                        ₹{p.discountedPrice || p.price}
                      </td>
                      <td className="p-3 tabular-nums">
                        <span className={`font-semibold ${p.stock <= 10 ? 'text-[#B91C1C]' : 'text-[#047857]'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {p.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setEditingProduct({ ...p })}
                          className="p-1 text-[#655344] hover:text-[#7F1D1D] cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 text-[#655344] hover:text-[#B91C1C] cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Orders */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl border border-[#E7DFD5] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E7DFD5] text-[#8C7A6B]">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">PIN / Destination</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Fulfillment</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8DD]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#8C7A6B]">
                      No orders placed yet. Test checkout to create real orders.
                    </td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#FAF7F2]/60">
                      <td className="p-3 font-mono font-bold text-[#7F1D1D]">{o.orderNumber}</td>
                      <td className="p-3">
                        <div className="font-semibold text-[#2D241E]">{o.shippingAddress.fullName}</div>
                        <div className="text-[11px] text-[#8C7A6B]">{o.shippingAddress.phone}</div>
                      </td>
                      <td className="p-3">
                        <div>{o.shippingAddress.city}, {o.shippingAddress.state}</div>
                        <div className="text-[11px] font-mono font-bold text-[#655344]">{o.shippingAddress.pinCode}</div>
                      </td>
                      <td className="p-3 font-bold tabular-nums">₹{o.grandTotal}</td>
                      <td className="p-3">
                        <span className="capitalize font-semibold text-[#047857]">
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="capitalize font-medium text-[#7F1D1D]">
                          {o.orderStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setFulfillmentOrder(o);
                            setCourierName(o.courierDetails?.courierName || 'BlueDart Express');
                            setTrackingNumber(o.courierDetails?.trackingNumber || '');
                            setTargetStatus(o.orderStatus);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-[#FAF7F2] border border-[#DDD3C5] hover:bg-[#EFE3CF] rounded cursor-pointer"
                        >
                          Fulfill
                        </button>
                        <a
                          href={`/api/orders/${o.orderNumber}/invoice?token=${o.guestAccessToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-[11px] font-semibold text-[#7F1D1D] hover:underline cursor-pointer"
                        >
                          Invoice
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Coupons */}
        {activeTab === 'coupons' && (
          <div className="p-4 bg-white rounded-xl border border-[#E7DFD5] space-y-4">
            <h4 className="text-xs font-bold text-[#2D241E] uppercase tracking-wider">
              Active Promo Coupons
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E7DFD5]">
                <div className="font-mono font-bold text-[#7F1D1D] text-sm">BALAJI10</div>
                <div className="text-[#655344] mt-0.5">10% off on orders above ₹299 (Max ₹150)</div>
              </div>
              <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E7DFD5]">
                <div className="font-mono font-bold text-[#7F1D1D] text-sm">POOJA50</div>
                <div className="text-[#655344] mt-0.5">Flat ₹50 off on orders above ₹499</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && settings && (
          <div className="p-6 bg-white rounded-xl border border-[#E7DFD5] space-y-4 max-w-xl text-xs">
            <h4 className="font-serif text-base font-bold text-[#2D241E]">Store Configuration</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-[#8C7A6B] font-semibold mb-1">Business Legal Name</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="block text-[#8C7A6B] font-semibold mb-1">GSTIN Registration</label>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8C7A6B] font-semibold mb-1">Standard Shipping (₹)</label>
                  <input
                    type="number"
                    value={settings.standardShippingFee}
                    onChange={e => setSettings({ ...settings, standardShippingFee: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                  />
                </div>
                <div>
                  <label className="block text-[#8C7A6B] font-semibold mb-1">Free Shipping Above (₹)</label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={e => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await apiFetch('/api/admin/settings', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(settings)
                  });
                  setActionNotice('Store settings updated successfully');
                  setTimeout(() => setActionNotice(''), 3000);
                }}
                className="px-4 py-2 bg-[#7F1D1D] text-white font-bold rounded-lg cursor-pointer hover:bg-[#991B1B]"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl border border-[#E7DFD5] p-4 space-y-2 text-xs">
            <h4 className="font-serif font-bold text-sm text-[#2D241E] mb-2">Audit Logs</h4>
            <div className="divide-y divide-[#F0E8DD]">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="py-2 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="font-semibold text-[#7F1D1D]">{log.action}</span>
                    <span className="text-[#8C7A6B] ml-2 font-mono">[{log.entityType}: {log.entityId}]</span>
                  </div>
                  <span className="text-zinc-400">{new Date(log.timestamp).toLocaleTimeString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7DFD5] p-6 max-w-lg w-full space-y-3 text-xs">
            <h3 className="font-serif font-bold text-base text-[#7F1D1D]">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h3>

            <div>
              <label className="block text-[#45362B] font-semibold mb-1">Product Name</label>
              <input
                type="text"
                value={editingProduct.name || ''}
                onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#45362B] font-semibold mb-1">Regular Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="block text-[#45362B] font-semibold mb-1">Discounted Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.discountedPrice || 0}
                  onChange={e => setEditingProduct({ ...editingProduct, discountedPrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#45362B] font-semibold mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editingProduct.stock || 0}
                  onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                />
              </div>
              <div>
                <label className="block text-[#45362B] font-semibold mb-1">Category</label>
                <select
                  value={editingProduct.category || 'Incense Sticks'}
                  onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
                >
                  <option value="Incense Sticks">Incense Sticks</option>
                  <option value="Cup Sambranis">Cup Sambranis</option>
                  <option value="Dhoop Cones">Dhoop Cones</option>
                  <option value="Dhoop Sticks">Dhoop Sticks</option>
                  <option value="Pooja Essentials">Pooja Essentials</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[#45362B] font-semibold mb-1">Fragrance Notes</label>
              <input
                type="text"
                value={editingProduct.fragrance || ''}
                onChange={e => setEditingProduct({ ...editingProduct, fragrance: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="pub"
                checked={editingProduct.isPublished}
                onChange={e => setEditingProduct({ ...editingProduct, isPublished: e.target.checked })}
              />
              <label htmlFor="pub" className="font-semibold text-[#2D241E]">Published in Storefront</label>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E7DFD5]">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1.5 border rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                className="px-4 py-1.5 bg-[#7F1D1D] text-white rounded font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Modal */}
      {fulfillmentOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E7DFD5] p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="font-serif font-bold text-base text-[#7F1D1D]">
              Fulfill Order #{fulfillmentOrder.orderNumber}
            </h3>

            <div>
              <label className="block text-[#45362B] font-semibold mb-1">Order Fulfillment Status</label>
              <select
                value={targetStatus}
                onChange={e => setTargetStatus(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
              >
                <option value="paid">Paid / Confirmed</option>
                <option value="processing">Processing & Packing</option>
                <option value="shipped">Shipped (In Transit)</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[#45362B] font-semibold mb-1">Courier Partner</label>
              <input
                type="text"
                placeholder="e.g. BlueDart Express, Delhivery, India Post"
                value={courierName}
                onChange={e => setCourierName(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
              />
            </div>

            <div>
              <label className="block text-[#45362B] font-semibold mb-1">AWB Tracking Number</label>
              <input
                type="text"
                placeholder="e.g. BLU-9847123"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#DDD3C5] rounded bg-[#FAF7F2]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E7DFD5]">
              <button
                type="button"
                onClick={() => setFulfillmentOrder(null)}
                className="px-3 py-1.5 border rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateOrderStatus}
                className="px-4 py-1.5 bg-[#7F1D1D] text-white rounded font-bold cursor-pointer"
              >
                Update Fulfillment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
