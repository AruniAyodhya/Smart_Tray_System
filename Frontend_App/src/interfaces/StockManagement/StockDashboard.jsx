import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, DollarSign, AlertTriangle, X, Search } from 'lucide-react';

const STOCK_UPDATED_EVENT = 'smarttray-stock-updated';

const StockDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [menuList, setMenuList] = useState([]); // For Item Name Dropdown
  const [formData, setFormData] = useState({ itemName: "", current: "", min_qty: "", max_qty: "", unitPrice: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormError("");
    setFormData({ itemName: "", current: "", min_qty: "", max_qty: "", unitPrice: "" });
  };

  const fetchStock = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/inventory');
      if (!res.ok) {
        setStockItems([]);
        return;
      }
      const data = await res.json();
      setStockItems(Array.isArray(data) ? data : []);
    } catch {
      setStockItems([]);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/menu');
      if (!res.ok) {
        setMenuList([]);
        return;
      }
      const data = await res.json();
      setMenuList(Array.isArray(data) ? data : []);
    } catch {
      setMenuList([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await Promise.all([fetchStock(), fetchMenuItems()]);
    };

    if (isMounted) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const payload = {
      itemName: (formData.itemName || "").trim(),
      current: Number(formData.current),
      min_qty: Number(formData.min_qty),
      max_qty: Number(formData.max_qty),
      unitPrice: Number(formData.unitPrice),
    };

    if (!payload.itemName) {
      setFormError("Please select an item name.");
      return;
    }
    if ([payload.current, payload.min_qty, payload.max_qty, payload.unitPrice].some((v) => Number.isNaN(v))) {
      setFormError("Please enter valid numeric values.");
      return;
    }
    if (payload.unitPrice <= 0) {
      setFormError("Unit price must be greater than zero.");
      return;
    }
    if (payload.min_qty > payload.max_qty) {
      setFormError("Min quantity cannot be greater than max quantity.");
      return;
    }

    const url = editingItem 
      ? `http://localhost:5000/api/inventory/update/${editingItem.inventoryID}`
      : 'http://localhost:5000/api/inventory/add';

    try {
      setSubmitting(true);
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchStock();
        window.dispatchEvent(new Event(STOCK_UPDATED_EVENT));
        closeModal();
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.detail || "Failed to save stock item.");
      }
    } catch {
      setFormError("Cannot connect to backend. Please ensure API server is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this stock record?")) {
      const res = await fetch(`http://localhost:5000/api/inventory/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStock();
        window.dispatchEvent(new Event(STOCK_UPDATED_EVENT));
      }
    }
  };

  // Card Calculations
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const totalValue = safeStockItems.reduce((acc, item) => acc + (Number(item.current || 0) * Number(item.unitPrice || 0)), 0);
  const lowStockCount = safeStockItems.filter(item => item.status === 'low stock').length;

  return (
    <div className="space-y-8">
      {/* Top Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Package size={28}/></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Items</p><h3 className="text-2xl font-black">{safeStockItems.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><DollarSign size={28}/></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Value</p><h3 className="text-2xl font-black">Rs. {totalValue.toLocaleString()}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center"><AlertTriangle size={28}/></div>
          <div><p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Low Stock Alerts</p><h3 className="text-2xl font-black">{lowStockCount}</h3></div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Stock Summary</h2>
        <button onClick={() => { setEditingItem(null); setFormData({itemName:"", current:"", min_qty:"", max_qty:"", unitPrice:""}); setFormError(""); setShowModal(true); }} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-600 transition shadow-lg text-xs uppercase tracking-widest">
          <Plus size={18}/> Add Stock Item
        </button>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm font-bold uppercase text-slate-900 tracking-widest">
            <tr>
              <th className="px-8 py-5 w-30 text-center">ID</th>
              <th className="w-47.5 text-center">Item Name</th>
              <th className="w-35 text-center">Stock</th>
              <th className="w-37.5 text-center">Status</th>
              <th className="w-47.5 text-center">Unit Price</th>
              <th className="text-right px-8 w-35">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-base font-normal text-black">
            {safeStockItems.map(item => (
              <tr key={item.inventoryID} className="hover:bg-slate-50/50 transition">
                <td className="px-8 py-5 font-bold text-black text-center">#{item.inventoryID}</td>
                <td className="text-black text-lg font-normal max-w-47.5 overflow-hidden overflow-ellipsis whitespace-nowrap">{item.itemName}</td>
                <td className="text-black text-center font-semibold">{item.current} <span className="text-[10px] text-slate-400">(Min: {item.min_qty})</span></td>
                <td className="text-center">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    item.status === 'low stock' ? 'bg-red-50 text-red-500' : 
                    item.status === 'over stock' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                  }`}>{item.status}</span>
                </td>
                <td className="text-black text-center font-semibold">Rs. {item.unitPrice}</td>
                <td className="px-8 text-center space-x-2">
                  <button onClick={() => { setEditingItem(item); setFormData(item); setFormError(""); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(item.inventoryID)} className="p-2 text-red-600 hover:text-red-700 bg-slate-50 rounded-xl transition"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Simplified like Menu form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white w-full max-w-lg rounded-4xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-slate-900 uppercase">{editingItem ? "Edit Stock Item" : "Add Stock Item"}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-50 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{formError}</p>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Item Name</label>
                <select 
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100 disabled:opacity-50" 
                  value={formData.itemName} 
                  onChange={e => setFormData({...formData, itemName: e.target.value})} 
                  required 
                  disabled={editingItem}
                >
                  <option value="">Select Menu Item</option>
                  {menuList.map(m => <option key={m.menuID} value={m.name}>{m.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Current Quantity</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.current} onChange={e => setFormData({...formData, current: e.target.value})} required/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Unit Price (Rs)</label>
                  <input type="number" min="0.01" step="0.01" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} required/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Min Quantity</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.min_qty} onChange={e => setFormData({...formData, min_qty: e.target.value})} required/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Max Quantity</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.max_qty} onChange={e => setFormData({...formData, max_qty: e.target.value})} required/>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition disabled:opacity-50">
                  {submitting ? "Saving..." : (editingItem ? "Update Stock" : "Add Item")}
                </button>
                <button type="button" onClick={closeModal} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDashboard;