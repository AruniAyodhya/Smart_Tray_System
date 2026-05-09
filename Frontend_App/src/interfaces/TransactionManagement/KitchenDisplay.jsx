import React, { useState, useEffect } from 'react';
import { ChefHat, RefreshCw, Clock } from 'lucide-react';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const getStatusClasses = (status) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'void') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-600';
  };

  const fetchOrders = () => {
    fetch('http://localhost:5000/api/kitchen-display')
      .then(res => res.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("KDS Fetch error:", err);
        setOrders([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000); // Fast refresh to reflect status updates quickly
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic flex items-center gap-3">
            <ChefHat size={32} className="text-blue-600" />
            Kitchen Display System
          </h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Live Orders From Database</p>
        </div>
        <button onClick={fetchOrders} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-blue-600 transition">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm font-bold uppercase text-slate-900 tracking-widest">
            <tr>
              <th className="px-8 py-5 text-center">Order ID</th>
              <th className="px-8 py-5 text-center">Order Items</th>
              <th className="px-8 py-5 text-center">Total</th>
              <th className="px-8 py-5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-base font-normal text-black">
            {orders.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-20 text-center">
                  <div className="flex flex-col items-center opacity-20">
                    <ChefHat size={64} className="mb-4" />
                    <p className="font-bold uppercase tracking-widest">No orders available</p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.orderID} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-5 font-bold text-black text-center">{order.orderID}</td>
                  <td className="px-8 py-5">
                    <p className="text-black leading-relaxed max-w-md">{order.items_list}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 font-bold uppercase tracking-tighter">
                      <Clock size={11} /> Received {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="text-sm text-slate-400 line-through">Rs.{order.subtotal}</div>
                    <div className="font-bold text-black">Rs.{order.final_total}</div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-sm uppercase tracking-wider font-bold ${getStatusClasses(order.order_status)}`}>
                      {order.order_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KitchenDisplay;