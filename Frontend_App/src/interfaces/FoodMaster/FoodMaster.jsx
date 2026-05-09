import React, { useEffect, useState } from 'react';
import MenuCatalog from './MenuCatalog';
import MyProfile from '../MyProfile';
import { UtensilsCrossed, UserCircle, LogOut } from 'lucide-react';

const FoodMaster = ({ user, setUser }) => {
  const [activePage, setActivePage] = useState('menu');
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleProfileRefresh = (updatedUser) => {
    setCurrentUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white p-6 flex flex-col shadow-2xl">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
            <UtensilsCrossed size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Food Master</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActivePage('menu')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${activePage === 'menu' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <UtensilsCrossed size={20} />
            <span className="text-sm uppercase tracking-widest">Menu Catalog</span>
          </button>

          <button 
            onClick={() => setActivePage('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${activePage === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <UserCircle size={20} />
            <span className="text-sm uppercase tracking-widest">My Profile</span>
          </button>
        </nav>

        {/* User Status Bar */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              {currentUser?.staff_id}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-100">{currentUser?.staff_name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Online Now</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)} 
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 font-black text-xs uppercase tracking-widest"
          >
            <LogOut size={16} /> Logout System
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-10 bg-[#f8fafc]">
        {activePage === 'menu' && (
          <MenuCatalog />
        )}
        
        {activePage === 'profile' && (
          <MyProfile user={currentUser} onRefresh={handleProfileRefresh} />
        )}
      </main>
    </div>
  );
};

export default FoodMaster;