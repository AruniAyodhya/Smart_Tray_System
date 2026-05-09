import React, { useState } from 'react';
import ManualOrder from './ManualOrder';
import AIPOS from './AIPOS';
import TransactionDashboard from './TransactionDashboard';
import Transactions from './Transactions';
import KitchenDisplay from './KitchenDisplay';
import MyProfile from '../MyProfile';
import { ShoppingCart, CreditCard, BarChart3, List, ChefHat, UserCircle, LogOut } from 'lucide-react';

const TransactionManagement = ({ user, setUser }) => {
  // Determine default page based on user role
  const userRole = user.role ? user.role.toLowerCase() : "";
  const defaultPage = userRole === 'order manager' ? 'manual' : 'aipos';
  
  const [activePage, setActivePage] = useState(defaultPage);

  const [externalOrder, setExternalOrder] = useState(null);

  const getInterfaceLabel = () => {
    return userRole === 'order manager' ? 'Order Management' : 'Finance Management';
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl overflow-y-auto">
        <div className="mb-10 text-center">
          <div className="inline-block p-3 bg-blue-600 rounded-xl mb-3 shadow-lg shadow-blue-900/20">
             <span className="text-white text-xl font-black tracking-tighter">ST</span>
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight uppercase">Smart Tray</h1>
          <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest font-bold">{getInterfaceLabel()}</p>
        </div>

        <nav className="flex-1 space-y-2">
          {/* Transaction Dashboard - For Both */}
          <button 
            onClick={() => setActivePage('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={20} />
            <span className="font-bold text-sm">Dashboard</span>
          </button>

          {/* Transactions - For Both */}
          <button 
            onClick={() => setActivePage('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'transactions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <List size={20} />
            <span className="font-bold text-sm">Transactions</span>
          </button>

          {/* AI POS - For Both */}
          <button 
            onClick={() => setActivePage('aipos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'aipos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <CreditCard size={20} />
            <span className="font-bold text-sm">AI POS System</span>
          </button>

          {/* Manual Order - For Both */}
          <button 
            onClick={() => setActivePage('manual')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'manual' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ShoppingCart size={20} />
            <span className="font-bold text-sm">Manual Order</span>
          </button>

          {/* Kitchen Display - For Both */}
          <button 
            onClick={() => setActivePage('kitchen')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'kitchen' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ChefHat size={20} />
            <span className="font-bold text-sm">Kitchen Display</span>
          </button>

          {/* My Profile - For Both */}
          <button 
            onClick={() => setActivePage('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activePage === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <UserCircle size={20} />
            <span className="font-bold text-sm">My Profile</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">
              {user?.staff_id}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.staff_name || user?.username}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{userRole === 'order manager' ? 'Order Manager' : 'Finance Officer'}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)} 
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 p-3.5 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-black text-xs uppercase tracking-widest"
          >
            <LogOut size={16} /> Logout System
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* ManualOrder is always mounted so cart/summary state survives navigation */}
        <div className={`h-full ${activePage !== 'manual' ? 'hidden' : ''}`}>
          <ManualOrder
            isActive={activePage === 'manual'}
            onProceed={(bill) => { setExternalOrder(bill); setActivePage('aipos'); }}
          />
        </div>
        {/* Keep AIPOS mounted so payment/bill state survives tab switches */}
        <div className={`h-full ${activePage !== 'aipos' ? 'hidden' : ''}`}>
          <AIPOS 
            externalOrder={externalOrder} 
            onReset={() => { setExternalOrder(null); }} 
            user={user} 
            onSwitchToManual={() => setActivePage('manual')} 
          />
        </div>
        {activePage === 'dashboard' && <TransactionDashboard />}
        {activePage === 'transactions' && <Transactions />}
        {activePage === 'kitchen' && <KitchenDisplay />}
        {activePage === 'profile' && (
          <MyProfile user={user} onRefresh={setUser} />
        )}
      </main>
    </div>
  );
};

export default TransactionManagement;
