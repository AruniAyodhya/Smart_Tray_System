import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import StaffManagement from './StaffManagement';
import MyProfile from '../MyProfile';
import { LayoutDashboard, Users, UserCircle, LogOut } from 'lucide-react';

const AdminSecurity = ({ user, setUser }) => {
  const [activePage, setActivePage] = useState('dashboard');
  const [staff, setStaff] = useState([]);

  // Wrapped in useCallback to prevent unnecessary re-renders when passed to children
  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      } else {
        console.error("Failed to load staff list");
      }
    } catch (err) {
      console.error("Server connection error:", err);
    }
  }, []);

  // Load initial data on mount without directly triggering setState in the effect body.
  useEffect(() => {
    let isMounted = true;

    const loadInitialStaff = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/staff');
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setStaff(data);
        } else {
          console.error("Failed to load staff list");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Server connection error:", err);
        }
      }
    };

    loadInitialStaff();

    return () => {
      isMounted = false;
    };
  }, []);

  // Function to refresh the global user state if the admin updates their own profile
  const handleProfileUpdate = (updatedData) => {
    setUser(updatedData);
    fetchStaff(); // Refresh the list to reflect changes in the dashboard
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <div className="mb-10 text-center">
          <div className="inline-block p-3 bg-blue-600 rounded-xl mb-3 shadow-lg shadow-blue-900/20">
             <span className="text-white text-xl font-black tracking-tighter">ST</span>
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight uppercase">Smart Tray</h1>
          <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest font-bold">Admin Security</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActivePage('dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activePage === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold text-sm">Dashboard Overview</span>
          </button>
          
          <button 
            onClick={() => setActivePage('staff')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activePage === 'staff' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} />
            <span className="font-bold text-sm">Staff Management</span>
          </button>
          
          <button 
            onClick={() => setActivePage('profile')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activePage === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <UserCircle size={20} />
            <span className="font-bold text-sm">My Security Profile</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">
              {user?.staff_id}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.staff_name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">System Admin</p>
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
      <main
        className="flex-1 overflow-y-auto p-8 custom-scrollbar"
        style={{
          backgroundColor: '#f8fafc',
          backgroundImage:
            'radial-gradient(circle at 14% 18%, rgba(59, 130, 246, 0.14) 0, rgba(59, 130, 246, 0) 28%), radial-gradient(circle at 86% 10%, rgba(15, 23, 42, 0.1) 0, rgba(15, 23, 42, 0) 30%), linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.95))',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {activePage === 'dashboard' && (
            <Dashboard 
              staff={staff} 
              onRefresh={fetchStaff} 
            />
          )}
          
          {activePage === 'staff' && (
            <StaffManagement 
              staff={staff} 
              onRefresh={fetchStaff} 
            />
          )}
          
          {activePage === 'profile' && (
            <MyProfile 
              user={user} 
              onRefresh={handleProfileUpdate} 
            />
          )}
        </div>
      </main>

      {/* Adding basic CSS for scrollbar inside the component for convenience */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
};

export default AdminSecurity;