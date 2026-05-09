import React, { useState } from 'react';
import Login from './Login';
import AdminSecurity from "./interfaces/AdminSecurity/AdminSecurity";
import FoodMaster from "./interfaces/FoodMaster/FoodMaster";
import InventoryController from "./interfaces/StockManagement/InventoryController";
import PromotionManager from "./interfaces/PromotionManagement/PromotionManager";
import TransactionManagement from "./interfaces/TransactionManagement/TransactionManagement";

function App() {
  const [user, setUser] = useState(null); 

  if (!user) {
    return <Login onLogin={(userData) => setUser(userData)} />;
  }

  // Convert role to lowercase so "System Admin" and "system admin" both work
  const userRole = user.role ? user.role.toLowerCase() : "";

  // ADMIN VIEW
  if (userRole === 'system admin') {
    return <AdminSecurity user={user} setUser={setUser} />;
  }

  // FOOD MASTER VIEW
  if (userRole === 'food master') {
    return <FoodMaster user={user} setUser={setUser} />;
  }

  // Stock Management VIEW
  if (userRole === 'inventory controller') {
    return <InventoryController user={user} setUser={setUser} />;
  }

  // Promotion Management VIEW
  if (userRole === 'promotion manager') {
    return <PromotionManager user={user} setUser={setUser} />;
  }

  // Transaction Management VIEW - For Order Manager and Finance Officer
  if (userRole === 'order manager' || userRole === 'finance officer') {
    return <TransactionManagement user={user} setUser={setUser} />;
  }

  // FALLBACK
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        <p className="text-slate-600 font-bold text-lg">Unauthorized Access</p>
        <p className="text-sm text-slate-400 mt-2">The role <span className="text-red-500 font-mono">"{user.role}"</span> is not recognized.</p>
        <button 
          onClick={() => setUser(null)} 
          className="mt-6 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

export default App;