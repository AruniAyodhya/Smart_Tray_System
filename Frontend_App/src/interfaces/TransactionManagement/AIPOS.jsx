import React, { useEffect, useRef, useState } from 'react';
import { Camera, CreditCard, Banknote, Download, Printer, RefreshCw, ShoppingCart } from 'lucide-react';

const AIPOS = ({ externalOrder, onReset, user, onSwitchToManual }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [step, setStep] = useState('camera');
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [received, setReceived] = useState('');
  const [receivedError, setReceivedError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [txError, setTxError] = useState('');
  const [internalBill, setInternalBill] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [activePromo, setActivePromo] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const billRef = useRef(null);

  useEffect(() => {
    const fetchMenuAndPromos = async () => {
      try {
        const [menuRes, promoRes] = await Promise.all([
          fetch('http://localhost:5000/api/menu-catalog').catch(() => null),
          fetch('http://localhost:5000/api/promotions/seasonal').catch(() => null)
        ]);
        if (menuRes?.ok) {
          const menuData = await menuRes.json();
          setMenuItems(Array.isArray(menuData) ? menuData : []);
        }
        if (promoRes?.ok) {
          const promoData = await promoRes.json();
          if (Array.isArray(promoData)) {
            const found = promoData.find((promo) => promo.status === 'active');
            setActivePromo(found || null);
          }
        }
      } catch (err) {
        console.error("Error fetching menu/promos:", err);
      }
    };
    fetchMenuAndPromos();
  }, []);

  useEffect(() => {
    if (step !== 'camera' || externalOrder) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }
    let isMounted = true;
    const startCamera = async () => {
      try {
        setCameraError('');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isMounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError('Unable to access camera. Please allow camera permissions.');
      }
    };
    startCamera();
    return () => {
      isMounted = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, [step, externalOrder]);

  const bill = externalOrder ? {
    id: externalOrder.id || 'ORD-UNK',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    items: externalOrder.items || [],
    subtotal: externalOrder.subtotal || 0,
    dailyDiscountTotal: externalOrder.dailyDiscountTotal || 0,
    seasonalAmt: externalOrder.seasonalAmt || 0,
    totalDiscount: externalOrder.totalDiscount || 0,
    activePromo: externalOrder.activePromo || null,
    total: externalOrder.total || 0
  } : internalBill;

  const change = paymentMethod === 'cash' && received && Number(received) >= (bill?.total || 0)
    ? (Number(received) - (bill?.total || 0)).toFixed(2)
    : '0.00';

  const buildItemsSummary = () => {
    if (!bill) return '';
    return bill.items.map(item => {
      const ddisc = Number(item.daily_discount) || 0;
      return ddisc > 0
        ? `${item.name} x${item.quantity} (${ddisc}% off)`
        : `${item.name} x${item.quantity}`;
    }).join(', ');
  };

  const handleCompleteTransaction = async () => {
    if (!bill) return;
    setTxError('');
    if (paymentMethod === 'cash') {
      if (!received || Number(received) < bill.total) {
        setReceivedError('Amount received must be ≥ total.');
        return;
      }
    }
    setReceivedError('');
    try {
      if (!externalOrder && internalBill) {
        const orderRes = await fetch(`http://localhost:5000/api/complete-order/${internalBill.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: user?.staff_id || 'S001',
            subtotal: internalBill.subtotal,
            total_discount: internalBill.totalDiscount,
            final_total: internalBill.total,
            items: internalBill.items
          })
        });
        if (!orderRes.ok) throw new Error('Failed to complete order');
      }

      const res = await fetch('http://localhost:5000/api/complete-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: bill.id,
          paymentMethod: paymentMethod,
          discount: bill.totalDiscount,
          total: bill.total,
          items_summary: buildItemsSummary()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTxError(err.detail || 'Failed to record transaction. Please try again.');
        return;
      }
      setIsComplete(true);
      window.dispatchEvent(new Event('smarttray-stock-updated'));
    } catch {
      setTxError('Cannot connect to server. Please check if the backend is running.');
    }
  };

  const handleDownload = () => {
    if (!bill) return;
    const lines = [
      '============================================',
      '              SMART TRAY SYSTEM             ',
      '               Generated Bill               ',
      '============================================',
      `Order ID : ${bill.id}`,
      `Date     : ${bill.date}`,
      `Time     : ${bill.time}`,
      '--------------------------------------------',
      'Items:',
      ...bill.items.map(item => {
        const ddisc = Number(item.daily_discount) || 0;
        const discAmt = (item.price * ddisc / 100) * item.quantity;
        const lineTotal = (item.price * item.quantity) - discAmt;
        return `  ${item.name} x${item.quantity}${ddisc > 0 ? ` [${ddisc}% off]` : ''}  Rs. ${lineTotal.toFixed(2)}`;
      }),
      '--------------------------------------------',
      `Subtotal          : Rs. ${bill.subtotal.toFixed(2)}`,
      bill.dailyDiscountTotal > 0 ? `Daily Discounts   : -Rs. ${bill.dailyDiscountTotal.toFixed(2)}` : null,
      bill.activePromo ? `${bill.activePromo.title} (${bill.activePromo.discount}%) : -Rs. ${bill.seasonalAmt.toFixed(2)}` : null,
      `Total Savings     : -Rs. ${bill.totalDiscount.toFixed(2)}`,
      '============================================',
      `TOTAL             : Rs. ${bill.total.toFixed(2)}`,
      paymentMethod === 'cash' ? `Amount Received   : Rs. ${Number(received).toFixed(2)}` : null,
      paymentMethod === 'cash' ? `Change            : Rs. ${change}` : null,
      `Payment Method    : ${paymentMethod === 'card' ? 'Card' : 'Cash'}`,
      '============================================',
      '         Thank you for your order!          ',
      '============================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${bill.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!billRef.current) return;
    const printContent = billRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`
      <html><head><title>Bill ${bill?.id || ''}</title>
      <style>
        body { font-family: monospace; padding: 32px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 8px; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-red { color: #ef4444; }
        .text-pink { color: #ec4899; }
        .text-blue { color: #2563eb; }
        .text-lg { font-size: 1.1em; }
        hr { border: 1px dashed #cbd5e1; }
      </style></head><body>${printContent}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const reset = () => {
    setStep('camera');
    setIsScanning(false);
    setPaymentMethod(null);
    setReceived('');
    setReceivedError('');
    setIsComplete(false);
    setTxError('');
    setInternalBill(null);
    if (onReset) onReset();
  };

  const handleSwitchToManual = async () => {
    if (internalBill && !externalOrder) {
      try {
        await fetch(`http://localhost:5000/api/update-order-status/${internalBill.id}?status=void`, { method: 'PUT' });
      } catch (err) {
        console.error("Failed to void order before switching", err);
      }
    }
    reset();
    if (onSwitchToManual) onSwitchToManual();
  };

  const handleStartScanning = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);
    setCameraError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      const aiRes = await fetch('http://localhost:5000/api/scan-food', {
        method: 'POST',
        body: formData
      });
      
      if (!aiRes.ok) throw new Error('Failed to scan food');
      const aiData = await aiRes.json();
      const detected = aiData.detected_items || [];

      if (detected.length === 0) {
        setCameraError('No food detected. Please try again.');
        setIsScanning(false);
        return;
      }

      const counts = {};
      detected.forEach(item => {
        counts[item.menuID] = (counts[item.menuID] || 0) + 1;
      });

      let subtotal = 0;
      let dailyDiscountTotal = 0;
      const itemsList = [];

      for (const [menuID, qty] of Object.entries(counts)) {
        const menuItem = menuItems.find(m => m.menuID === menuID);
        const name = menuItem ? menuItem.name : detected.find(d => d.menuID === menuID)?.name;
        
        // --- INVENTORY VALIDATION ---
        const stockQty = menuItem?.stock_qty != null ? Number(menuItem.stock_qty) : Infinity;
        if (qty > stockQty) {
          setCameraError(`Insufficient stock for ${name}. Only ${stockQty} available.`);
          setIsScanning(false);
          return;
        }

        const price = menuItem ? Number(menuItem.price) : Number(detected.find(d => d.menuID === menuID)?.price || 0);
        const discountPercent = menuItem ? Number(menuItem.daily_discount || 0) : 0;
        
        const itemSubtotal = price * qty;
        const itemDiscount = (price * discountPercent / 100) * qty;
        
        subtotal += itemSubtotal;
        dailyDiscountTotal += itemDiscount;
        
        itemsList.push({
          menuID,
          name,
          quantity: qty,
          price,
          daily_discount: discountPercent,
          total: itemSubtotal - itemDiscount
        });
      }

      const totalAfterDaily = subtotal - dailyDiscountTotal;
      const seasonalDiscount = Number(activePromo?.discount) || 0;
      const seasonalAmt = (totalAfterDaily * seasonalDiscount) / 100;
      const totalDiscount = dailyDiscountTotal + seasonalAmt;
      const finalTotal = subtotal - totalDiscount;

      const orderRes = await fetch('http://localhost:5000/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: user?.staff_id || 'S001',
          subtotal: subtotal,
          total_discount: totalDiscount,
          final_total: finalTotal,
          items: itemsList
        })
      });

      if (!orderRes.ok) throw new Error('Failed to create order');
      const orderData = await orderRes.json();

      setInternalBill({
        id: orderData.orderID,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        items: itemsList,
        subtotal: subtotal,
        dailyDiscountTotal: dailyDiscountTotal,
        seasonalAmt: seasonalAmt,
        totalDiscount: totalDiscount,
        activePromo: activePromo,
        total: finalTotal
      });

      setStep('billing');
    } catch (err) {
      console.error(err);
      setCameraError(err.message || 'Error processing scan. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {step === 'camera' && !isComplete && !externalOrder && (
        <div className="h-full bg-slate-900 rounded-3xl flex flex-col justify-between border-4 border-slate-800 p-6">
          <div className="flex-1 relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/95 px-4 text-center">
                <Camera size={44} className="text-slate-600" />
                <p className="text-sm text-slate-300">{cameraError}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleStartScanning}
            disabled={isScanning}
            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition self-center disabled:opacity-50"
          >
            {isScanning ? 'Processing...' : 'Start Scanning'}
          </button>
        </div>
      )}

      {((step === 'billing' || externalOrder) && bill) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
          {/* ── BILL PANEL ── */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div ref={billRef}>
              <div className="flex justify-between mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Generated Bill</h3>
                  <p className="text-xs text-slate-500 mt-1">Order ID: <span className="font-semibold">{bill.id}</span></p>
                  <p className="text-xs text-slate-500">Date: {bill.date}</p>
                  <p className="text-xs text-slate-500">Time: {bill.time}</p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 border-b border-slate-100 pb-4 mb-4">
                {bill.items.map((item, i) => {
                  const ddisc = Number(item.daily_discount) || 0;
                  const discAmt = (item.price * ddisc / 100) * item.quantity;
                  const lineTotal = (item.price * item.quantity) - discAmt;
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{item.name} <span className="text-slate-400">x{item.quantity}</span></p>
                        {ddisc > 0 && <p className="text-xs text-red-500">Daily Discount: {ddisc}% (-Rs. {discAmt.toFixed(2)})</p>}
                      </div>
                      <span className="font-semibold text-slate-800">Rs. {lineTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-2 font-medium text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>Rs. {bill.subtotal.toFixed(2)}</span></div>
                {bill.dailyDiscountTotal > 0 && (
                  <div className="flex justify-between text-red-500"><span>Daily Discounts</span><span>-Rs. {bill.dailyDiscountTotal.toFixed(2)}</span></div>
                )}
                {bill.activePromo && (
                  <div className="flex justify-between text-pink-600"><span>{bill.activePromo.title} ({bill.activePromo.discount}%)</span><span>-Rs. {bill.seasonalAmt.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-blue-600"><span>Total Savings</span><span>-Rs. {bill.totalDiscount.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-900 text-xl font-bold pt-3 border-t border-dashed border-slate-200"><span>Total</span><span>Rs. {bill.total.toFixed(2)}</span></div>
              </div>

              {/* Cash change section on bill */}
              {isComplete && paymentMethod === 'cash' && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1 text-sm font-medium">
                  <div className="flex justify-between text-slate-600"><span>Amount Received</span><span>Rs. {Number(received).toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Change</span><span>Rs. {change}</span></div>
                </div>
              )}
            </div>

            {/* Download / Print */}
            <div className="mt-6 flex gap-3">
              <button onClick={handleDownload} className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 text-sm font-semibold transition">
                <Download size={16}/> Download
              </button>
              <button onClick={handlePrint} className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-200 text-sm font-semibold transition">
                <Printer size={16}/> Print
              </button>
            </div>

            {/* Switch Mode Button */}
            {!isComplete && !externalOrder && (
              <button 
                onClick={handleSwitchToManual}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 border border-orange-200 p-3 rounded-lg hover:bg-orange-100 text-sm font-bold uppercase tracking-widest transition"
              >
                <ShoppingCart size={16} /> Switch to Manual Order
              </button>
            )}

            {isComplete && (
              <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
                <h4 className="text-green-700 font-bold">Transaction Completed</h4>
                <p className="text-green-600 text-sm">The transaction has been recorded. You may start a new one.</p>
                <button onClick={reset} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 text-sm">New Transaction</button>
              </div>
            )}
          </div>

          {/* ── PAYMENT PANEL ── */}
          {!isComplete && (
            <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
              <h3 className="font-bold text-lg">Select Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setPaymentMethod('card'); setReceived(''); setReceivedError(''); }}
                  className={`p-6 rounded-2xl border-2 transition font-bold flex flex-col items-center gap-2 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <CreditCard size={24}/> Card
                </button>
                <button
                  onClick={() => { setPaymentMethod('cash'); setReceivedError(''); }}
                  className={`p-6 rounded-2xl border-2 transition font-bold flex flex-col items-center gap-2 ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                >
                  <Banknote size={24}/> Cash
                </button>
              </div>

              {paymentMethod === 'card' && (
                <div className="bg-slate-800 rounded-2xl p-5 text-center space-y-2">
                  <CreditCard size={32} className="mx-auto text-blue-400" />
                  <p className="text-slate-300 text-sm">Please process the card payment on the terminal.</p>
                  <p className="text-white font-bold text-lg">Rs. {bill.total.toFixed(2)}</p>
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Amount Received"
                    value={received}
                    onChange={e => { setReceived(e.target.value); setReceivedError(''); }}
                    className="w-full p-4 bg-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold"
                  />
                  {receivedError && <p className="text-red-400 text-xs font-semibold">{receivedError}</p>}
                  {received && Number(received) >= bill.total && (
                    <div className="flex justify-between bg-slate-800 rounded-xl px-4 py-3 text-sm font-semibold">
                      <span className="text-slate-400">Change</span>
                      <span className="text-green-400">Rs. {change}</span>
                    </div>
                  )}
                </div>
              )}

              {txError && <p className="text-red-400 text-xs font-semibold">{txError}</p>}

              <button
                onClick={handleCompleteTransaction}
                disabled={!paymentMethod || (paymentMethod === 'cash' && (!received || Number(received) < bill.total))}
                className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 transition"
              >
                Complete Transaction
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIPOS;
