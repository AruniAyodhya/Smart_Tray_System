import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Minus, ShoppingCart, ArrowLeft, Trash2, XCircle, Tag } from 'lucide-react';

const STOCK_UPDATED_EVENT = 'smarttray-stock-updated';

const ManualOrder = ({ user, onProceed, isActive = false }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const location = useLocation();
  const [cart, setCart] = useState({});
  const [viewSummary, setViewSummary] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [activePromo, setActivePromo] = useState(null);
  const [requestError, setRequestError] = useState('');

  const fetchMenuItems = useCallback(async () => {
    try {
      const catalogRes = await fetch('http://localhost:5000/api/menu-catalog');
      const catalogData = await catalogRes.json();
      if (catalogRes.ok && Array.isArray(catalogData)) {
        setMenuItems(catalogData);
        return;
      }

      // Fallback to base menu endpoint so cards still render if catalog join fails.
      const menuRes = await fetch('http://localhost:5000/api/menu');
      const menuData = await menuRes.json();
      setMenuItems(Array.isArray(menuData) ? menuData : []);
    } catch (err) {
      console.error("Error fetching menu:", err);
      setMenuItems([]);
    }
  }, []);

  // 1. Fetch Menu and promotions from Database
  useEffect(() => {
    setImageVersion(Date.now()); // force cache-busting on navigation
    const fetchActiveSeasonalDiscount = async () => {
      try {
        const promoRes = await fetch('http://localhost:5000/api/promotions/seasonal');
        const promoData = await promoRes.json();

        if (!promoRes.ok || !Array.isArray(promoData)) {
          setActivePromo(null);
          return;
        }

        const found = promoData.find((promo) => promo.status === 'active');
        setActivePromo(found || null);
      } catch (err) {
        console.error('Error fetching seasonal promotions:', err);
        setActivePromo(null);
      }
    };

    fetchMenuItems();
    fetchActiveSeasonalDiscount();
  }, [fetchMenuItems]);

  // Refresh when user switches back to Manual Order tab.
  useEffect(() => {
    if (isActive) {
      fetchMenuItems();
    }
  }, [isActive, fetchMenuItems]);

  // Listen for stock updates from other pages (refund, stock page edits, completed orders).
  useEffect(() => {
    const handleStockUpdate = () => {
      fetchMenuItems();
    };

    window.addEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
    return () => window.removeEventListener(STOCK_UPDATED_EVENT, handleStockUpdate);
  }, [fetchMenuItems]);

  // Lightweight polling while page is active to keep badges fresh.
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(fetchMenuItems, 2000);
    return () => clearInterval(timer);
  }, [isActive, fetchMenuItems]);

  const updateQty = (id, delta) => {
    setCart(prev => {
      const item = menuItems.find(m => m.menuID === id);
      const maxQty = item?.stock_qty != null ? Number(item.stock_qty) : Infinity;
      const newQty = Math.min(maxQty, Math.max(0, (prev[id] || 0) + delta));
      return { ...prev, [id]: newQty };
    });
  };

  const calculateOrder = (cartSnapshot = cart) => {
    const seasonalDiscount = Number(activePromo?.discount) || 0;
    let subtotal = 0;
    let dailyDiscountTotal = 0;

    const items = menuItems.filter(item => cartSnapshot[item.menuID] > 0).map(item => {
      const qty = cartSnapshot[item.menuID];
      const price = Number(item.price) || 0;
      const itemSubtotal = price * qty;
      const discountPercent = Number(item.daily_discount) || 0;
      const itemDiscount = (price * discountPercent / 100) * qty;
      
      subtotal += itemSubtotal;
      dailyDiscountTotal += itemDiscount;

      return {
        menuID: item.menuID,
        name: item.name,
        quantity: qty,
        price,
        daily_discount: item.daily_discount || 0,
        total: itemSubtotal - itemDiscount
      };
    });

    // Apply seasonal discount at bill level after item-level daily discounts.
    const totalAfterDaily = subtotal - dailyDiscountTotal;
    const seasonalAmt = (totalAfterDaily * seasonalDiscount) / 100;
    const totalDiscount = dailyDiscountTotal + seasonalAmt;

    return {
      items,
      subtotal,
      dailyDiscountTotal,
      seasonalAmt,
      totalDiscount,
      total: subtotal - totalDiscount
    };
  };

  const orderData = calculateOrder();

  // Sync updated order totals + items_list to DB immediately (used from summary +/- buttons).
  const syncOrderToDb = async (cartSnapshot) => {
    if (!currentOrderId) return;
    const data = calculateOrder(cartSnapshot);
    if (data.items.length === 0) return;
    await fetch('http://localhost:5000/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: currentOrderId,
        staff_id: user?.staff_id || 'S001',
        subtotal: data.subtotal,
        total_discount: data.totalDiscount,
        final_total: data.total,
        items: data.items
      })
    });
  };

  // Used by summary page +/- buttons: update local state AND sync DB in one step.
  const handleSummaryQtyChange = (id, delta) => {
    setCart(prev => {
      const item = menuItems.find(m => m.menuID === id);
      const maxQty = item?.stock_qty != null ? Number(item.stock_qty) : Infinity;
      const newQty = Math.min(maxQty, Math.max(0, (prev[id] || 0) + delta));
      const newCart = { ...prev, [id]: newQty };
      syncOrderToDb(newCart);
      return newCart;
    });
  };

  // 2. View Order creates or updates a pending order only in the orders table.
  const handleViewOrder = async () => {
    if (orderData.items.length === 0) return;

    setRequestError('');

    const response = await fetch('http://localhost:5000/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: currentOrderId,
        staff_id: user?.staff_id || 'S001',
        subtotal: orderData.subtotal,
        total_discount: orderData.totalDiscount,
        final_total: orderData.total,
        items: orderData.items
      })
    });

    if (!response.ok) {
      setRequestError('Unable to create pending order. Please try again.');
      return;
    }

    const data = await response.json();
    setCurrentOrderId(data.orderID || null);
    setViewSummary(true);
  };

  // 3. Database Action: Cancel Order (Set to Void)
  const handleCancelOrder = async () => {
    if (currentOrderId) {
      await fetch(`http://localhost:5000/api/update-order-status/${currentOrderId}?status=void`, { method: 'PUT' });
    }
    setCart({});
    setViewSummary(false);
    setCurrentOrderId(null);
  };

  // 4. Proceed Payment inserts order_items and completes the existing order.
  const handleProceed = async () => {
    if (!currentOrderId) return;

    setRequestError('');

    const response = await fetch(`http://localhost:5000/api/complete-order/${currentOrderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: user?.staff_id || 'S001',
        subtotal: orderData.subtotal,
        total_discount: orderData.totalDiscount,
        final_total: orderData.total,
        items: orderData.items
      })
    });

    if (!response.ok) {
      setRequestError('Unable to complete order. Please try again.');
      return;
    }

    const data = await response.json();
    const completedOrderId = data.orderID || currentOrderId;
    const billPayload = { ...orderData, id: completedOrderId, activePromo };

    // Notify other screens and immediately refresh badges.
    window.dispatchEvent(new Event(STOCK_UPDATED_EVENT));
    await fetchMenuItems();

    // Reset Manual Order to initial home view before navigating to AI POS.
    setCart({});
    setViewSummary(false);
    setCurrentOrderId(null);
    setRequestError('');

    onProceed(billPayload);
  };

  if (viewSummary) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="p-8 flex justify-between items-start border-b border-slate-100">
          <div>
            <h3 className="text-xl text-slate-900 uppercase font-bold">Order Summary</h3>
            <p className="text-slate-400 text-xs mt-1">ID: {currentOrderId || 'Generated on Proceed Payment'}</p>
          </div>
          <button onClick={handleCancelOrder} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={24}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            {orderData.items.map((item) => {
              const mi = menuItems.find(m => m.menuID === item.menuID);
              const maxQty = mi?.stock_qty != null ? Number(mi.stock_qty) : Infinity;
              const atMax = item.quantity >= maxQty;
              return (
                <div key={item.menuID} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <div className="flex-1">
                    <h4 className="text-lg text-black">{item.name}</h4>
                    {item.daily_discount > 0 && <p className="text-xs text-blue-600 uppercase tracking-wider">Daily Discount Applied</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-xl border border-slate-200">
                      <button onClick={() => handleSummaryQtyChange(item.menuID, -1)} className="text-slate-400 hover:text-blue-600"><Minus size={14}/></button>
                      <span className="font-bold text-sm min-w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => !atMax && handleSummaryQtyChange(item.menuID, 1)}
                        disabled={atMax}
                        className={`transition ${atMax ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                      ><Plus size={14}/></button>
                    </div>
                    <span className="text-lg text-black w-24 text-right">Rs. {item.total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t-2 border-dashed border-slate-200 pt-6 space-y-3">
            <div className="flex justify-between text-slate-500 text-sm uppercase tracking-widest">
              <span>Subtotal</span><span>Rs. {orderData.subtotal.toFixed(2)}</span>
            </div>
            {activePromo && (
              <div className="flex justify-between text-pink-600 text-sm uppercase tracking-widest">
                <span>{activePromo.title} ({activePromo.discount}%)</span><span>-Rs. {orderData.seasonalAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-600 text-sm uppercase tracking-widest">
              <span>Total Savings</span><span>-Rs. {orderData.totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-4">
              <span className="text-lg text-slate-900 uppercase self-center tracking-widest">Amount to Pay</span>
              <span className="text-3xl font-light text-slate-900">Rs. {orderData.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={() => setViewSummary(false)} className="flex-1 py-4 rounded-xl text-sm uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
              <ArrowLeft size={18}/> Back to Menu
            </button>
            <button onClick={handleProceed} className="flex-1 bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95">
              Proceed Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {activePromo && (
        <div className="mb-6 flex items-center gap-4 bg-pink-50 border border-pink-200 rounded-2xl px-6 py-4">
          <div className="shrink-0 w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center text-white">
            <Tag size={18} />
          </div>
          <div>
            <p className="text-[10px] text-pink-400 uppercase tracking-widest font-bold">Active Seasonal Promotion</p>
            <p className="text-slate-800 font-semibold text-sm">
              {activePromo.title} &mdash; <span className="text-pink-600 font-black">{activePromo.discount}% off</span> on your entire order
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
        {menuItems.map((food) => {
          const stockQty = food.stock_qty != null ? Number(food.stock_qty) : null;
          const isOutOfStock = stockQty !== null && stockQty === 0;
          const inCart = cart[food.menuID] || 0;
          const atStockLimit = stockQty !== null && inCart >= stockQty;

          // Image cache-busting and extension support
          let imageUrl = null;
          for (const ext of possibleExtensions) {
            if (food.image_path && food.image_path.endsWith(ext)) {
              imageUrl = `http://localhost:5000/${food.image_path}?v=${imageVersion}`;
              break;
            }
          }
          if (!imageUrl && food.image_path) {
            imageUrl = `http://localhost:5000/${food.image_path}?v=${imageVersion}`;
          }

          return (
            <div key={food.menuID} className={`bg-white rounded-4xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group ${isOutOfStock ? 'opacity-60' : ''}`}>
              <div className="h-48 overflow-hidden relative">
                <img src={imageUrl} alt={food.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                {food.daily_discount > 0 && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    {`${Number(food.daily_discount)}% OFF`}
                  </div>
                )}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                    <span className="bg-white text-slate-700 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-black text-slate-800 uppercase text-sm mb-1 truncate">{food.name}</h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-black text-blue-600">Rs. {(Number(food.price) || 0).toFixed(2)}</p>
                  {stockQty !== null && (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
                      isOutOfStock ? 'bg-red-50 text-red-500' : stockQty <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : `Qty: ${stockQty}`}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <button onClick={() => updateQty(food.menuID, -1)} disabled={isOutOfStock} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"><Minus size={18}/></button>
                  <span className="font-black text-slate-800">{inCart}</span>
                  <button onClick={() => updateQty(food.menuID, 1)} disabled={isOutOfStock || atStockLimit} className={`p-2 rounded-xl transition ${isOutOfStock || atStockLimit ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-white text-slate-400 hover:text-blue-600'}`}><Plus size={18}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating View Order Bar */}
      {Object.values(cart).some(q => q > 0) && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 animate-in slide-in-from-bottom-10">
          {requestError && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {requestError}
            </div>
          )}
          <button 
            onClick={handleViewOrder}
            className="w-full bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} />
              <span>View Order Details</span>
            </div>
            <span className="bg-white/10 px-3 py-1 rounded-full text-sm">
              {Object.values(cart).reduce((a, b) => a + b, 0)} Items
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ManualOrder;