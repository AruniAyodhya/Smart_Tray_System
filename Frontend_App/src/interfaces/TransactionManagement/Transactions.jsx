import React, { useState, useEffect, useCallback } from 'react';
import { FilterX, RotateCcw, Trash2 } from 'lucide-react';

const STOCK_UPDATED_EVENT = 'smarttray-stock-updated';

const Transactions = () => {
  const [records, setRecords] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (start = '', end = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      const res = await fetch(`http://localhost:5000/api/transactions?${params.toString()}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilter = () => fetchTransactions(startDate, endDate);

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    fetchTransactions();
  };

  const handleRefund = async (orderID) => {
    const res = await fetch(`http://localhost:5000/api/refund-transaction/${orderID}`, { method: 'PUT' });
    if (res.ok) {
      window.dispatchEvent(new Event(STOCK_UPDATED_EVENT));
    }
    fetchTransactions(startDate, endDate);
  };

  const handleDelete = async (orderID) => {
    await fetch(`http://localhost:5000/api/delete-transaction/${orderID}`, { method: 'DELETE' });
    fetchTransactions(startDate, endDate);
  };

  const statusStyle = (s) => {
    if (s === 'complete') return 'bg-green-100 text-green-700';
    if (s === 'refund') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-600';
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block w-full mt-1 p-2 bg-slate-50 border rounded-lg text-sm"/>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="block w-full mt-1 p-2 bg-slate-50 border rounded-lg text-sm"/>
        </div>
        <button onClick={handleFilter} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">Filter</button>
        <button onClick={handleClear} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition"><FilterX size={16}/> Clear</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm uppercase font-bold tracking-widest">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-300 text-sm uppercase font-bold tracking-widest">No transactions found</div>
        ) : (
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-22.5" />
              <col className="w-[28%]" />
              <col className="w-35" />
              <col className="w-32.5" />
              <col className="w-27.5" />
              <col className="w-27.5" />
              <col className="w-27.5" />
              <col className="w-36" />
            </colgroup>
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-900 tracking-widest">
              <tr>
                <th className="px-4 py-5 text-center">Order ID</th>
                <th className="px-6 py-5 text-center">Items &amp; Discount</th>
                <th className="px-6 py-5 text-center">Discount</th>
                <th className="px-6 py-5 text-center">Amount</th>
                <th className="px-4 py-5 text-center">Payment</th>
                <th className="px-4 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Date</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-normal text-black">
              {records.map((r) => (
                <tr key={r.paymentID} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-5 font-bold text-black text-center">{r.orderID}</td>
                  <td className="px-6 py-5">
                    {r.items_summary ? (
                      <p className="text-xs text-black leading-relaxed wrap-break-word">{r.items_summary}</p>
                    ) : (
                      <p className="text-slate-300 italic">—</p>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center text-red-600 font-bold whitespace-nowrap">
                    {Number(r.discount) > 0 ? `-Rs. ${Number(r.discount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-black">Rs. {Number(r.total).toFixed(2)}</td>
                  <td className="px-4 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider font-bold ${r.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {r.payment_method?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider font-bold ${statusStyle(r.payment_status)}`}>
                      {r.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-slate-500 text-xs">{String(r.created_at).slice(0, 10)}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleRefund(r.orderID)}
                      disabled={r.payment_status === 'refund'}
                      title="Refund"
                      aria-label="Refund transaction"
                      className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition disabled:opacity-40"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.orderID)}
                      title="Delete"
                      aria-label="Delete transaction"
                      className="p-2 text-red-600 hover:text-red-700 bg-slate-50 rounded-xl transition"
                    >
                      <Trash2 size={16} />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Transactions;
