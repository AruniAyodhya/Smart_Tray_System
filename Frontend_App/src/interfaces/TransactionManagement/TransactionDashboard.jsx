import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';

const TransactionDashboard = () => {
  const [data, setData] = useState({ count: 0, revenue: 0, average: 0, trends: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/transaction-stats');
      if (!res.ok) {
        throw new Error('Failed to load transaction stats');
      }
      const d = await res.json();

      // Supports both new and legacy response keys.
      setData({
        count: Number(d.count ?? d.total_transactions ?? 0),
        revenue: Number(d.revenue ?? d.total_revenue ?? 0),
        average: Number(d.average ?? d.average_order ?? 0),
        trends: Array.isArray(d.trends) ? d.trends : []
      });
    } catch {
      setError('Unable to load dashboard data. Please check backend server.');
      setData({ count: 0, revenue: 0, average: 0, trends: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const stats = [
    { label: 'Total Transactions', value: data.count, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Revenue', value: `Rs. ${(data.revenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Average Order', value: `Rs. ${Math.round(data.average || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Build SVG bar graph from trends
  const trends = data.trends || [];
  const W = 700, H = 260, PAD_L = 56, PAD_B = 40, PAD_T = 16, PAD_R = 16;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;
  const maxVal = Math.max(...trends.flatMap(t => [t.card_rev, t.cash_rev]), 1);
  const barGroupW = trends.length > 0 ? chartW / trends.length : 80;
  const barW = Math.min(barGroupW * 0.35, 28);
  const gap = barGroupW * 0.08;

  const yTicks = 4;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`p-5 ${stat.bg} ${stat.color} rounded-2xl`}><stat.icon size={28}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm">
        <h4 className="font-black uppercase italic text-slate-800 mb-4">Revenue Trend</h4>
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div> Card
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-3 h-3 rounded-full bg-green-500"></div> Cash
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-300 text-sm uppercase tracking-widest font-bold">
            Loading...
          </div>
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-red-400 text-sm uppercase tracking-widest font-bold text-center px-4">
            {error}
          </div>
        ) : trends.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-300 text-sm uppercase tracking-widest font-bold">
            No transaction data yet
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }}>
              {/* Y-axis grid lines + labels */}
              {Array.from({ length: yTicks + 1 }).map((_, i) => {
                const val = (maxVal / yTicks) * i;
                const y = PAD_T + chartH - (val / maxVal) * chartH;
                return (
                  <g key={i}>
                    <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                      {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {trends.map((t, i) => {
                const x = PAD_L + i * barGroupW + gap;
                const cardH = (t.card_rev / maxVal) * chartH;
                const cashH = (t.cash_rev / maxVal) * chartH;
                return (
                  <g key={i}>
                    {/* Card bar (blue) */}
                    <rect x={x} y={PAD_T + chartH - cardH} width={barW} height={cardH} rx="4" fill="#2563eb" />
                    {/* Cash bar (green) */}
                    <rect x={x + barW + 4} y={PAD_T + chartH - cashH} width={barW} height={cashH} rx="4" fill="#22c55e" />
                    {/* X-axis label */}
                    <text
                      x={x + barW + 2}
                      y={PAD_T + chartH + 18}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#94a3b8"
                    >
                      {t.day.slice(5)}
                    </text>
                  </g>
                );
              })}

              {/* X axis line */}
              <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="#e2e8f0" strokeWidth="1" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDashboard;
