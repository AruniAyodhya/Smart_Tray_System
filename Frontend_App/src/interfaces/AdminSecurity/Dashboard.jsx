import React, { useState } from "react";
import { Users, Shield, ChefHat, Boxes, DollarSign, Plus, X, ChevronDown, Package, UserCog } from "lucide-react";

const Dashboard = ({ staff = [], onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ staff_name: "", nic: "", email: "", phone: "", address: "", dob: "", role: "" });

  const roleStats = [
    { label: "System Admins", value: staff.filter(s => s.role === "system admin").length, icon: <Shield />, color: "bg-purple-600" },
    { label: "Food Masters", value: staff.filter(s => s.role === "food master").length, icon: <ChefHat />, color: "bg-orange-500" },
    { label: "Inventory Controllers", value: staff.filter(s => s.role === "inventory controller").length, icon: <Boxes />, color: "bg-amber-500" },
    { label: "Promotion Managers", value: staff.filter(s => s.role === "promotion manager").length, icon: <Package />, color: "bg-blue-600" },
    { label: "Order Managers", value: staff.filter(s => s.role === "order manager").length, icon: <UserCog />, color: "bg-pink-600" },
    { label: "Finance Officers", value: staff.filter(s => s.role === "finance officer").length, icon: <DollarSign />, color: "bg-green-600" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/staff/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Staff member created.\nUsername: ${data.username}\nPassword: ${data.generated_password}`);
      setShowModal(false);
      onRefresh();
      setFormData({ staff_name: "", nic: "", email: "", phone: "", address: "", dob: "", role: "" });
      setError("");
    } else {
      setError(data.detail);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl text-slate-900 uppercase tracking-tight font-bold">Dashboard Overview</h2>
          <p className="text-slate-400 text-sm uppercase tracking-widest mt-1 font-bold">System Statistics</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-3">
          <Plus size={20} /> Add New Staff Member
        </button>
      </div>

      <div className="space-y-6">
        {/* Row 1: Total Staff - Simplified Font */}
        <div className="bg-slate-900 p-10 rounded-4xl text-white shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-sm uppercase tracking-[0.2em] mb-2">Total Managed Staff</p>
            <h3 className="text-6xl font-light">{staff.length.toString().padStart(2, '0')} Members</h3>
          </div>
          <Users size={100} className="absolute -right-4 text-white/5" />
        </div>

        {/* Row 2: Roles Grid - Simplified Font */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roleStats.map((role, idx) => (
            <div key={idx} className="bg-white p-10 rounded-4xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className={`w-12 h-12 ${role.color} text-white rounded-xl flex items-center justify-center mb-6 shadow-sm`}>
                {React.cloneElement(role.icon, { size: 24 })}
              </div>
              <p className="text-black text-lg font-semibold uppercase tracking-widest mb-2">{role.label}</p>
              <h3 className="text-4xl font-light text-slate-800">{role.value.toString().padStart(2, '0')}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Registration Modal - Compact Version */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl text-slate-900 uppercase font-bold">Registration Form</h3>
                <p className="text-slate-400 text-xs mt-1">Please enter the member details below.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-red-500 transition"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs text-center border border-red-100">{error}</div>}
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="col-span-2">
                  <label className="text-lg text-black block mb-1">Staff Member Name</label>
                  <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" placeholder="Enter full name" onChange={e => setFormData({...formData, staff_name: e.target.value})} required />
                </div>
                
                <div>
                  <label className="text-lg text-black block mb-1">NIC Number</label>
                  <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" placeholder="99xxxxxxxV" onChange={e => setFormData({...formData, nic: e.target.value})} required />
                </div>

                <div>
                  <label className="text-lg text-black block mb-1">Phone Number</label>
                  <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" placeholder="07xxxxxxxx" onChange={e => setFormData({...formData, phone: e.target.value})} required />
                </div>

                <div className="col-span-2">
                  <label className="text-lg text-black block mb-1">Email Address</label>
                  <input type="email" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" placeholder="example@mail.com" onChange={e => setFormData({...formData, email: e.target.value})} required />
                </div>

                <div className="col-span-2">
                  <label className="text-lg text-black block mb-1">Residential Address</label>
                  <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" placeholder="House no, Street, City" onChange={e => setFormData({...formData, address: e.target.value})} required />
                </div>

                <div>
                  <label className="text-lg text-black block mb-1">Date of Birth</label>
                  <input type="date" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700" onChange={e => setFormData({...formData, dob: e.target.value})} required />
                </div>

                <div className="relative">
                  <label className="text-lg text-black block mb-1">System Role</label>
                  <select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 appearance-none" onChange={e => setFormData({...formData, role: e.target.value})} required>
                    <option value="">Select Role</option>
                    <option value="system admin">System Admin</option>
                    <option value="food master">Food Master</option>
                    <option value="inventory controller">Inventory Controller</option>
                    <option value="promotion manager">Promotion Manager</option>
                    <option value="order manager">Order Manager</option>
                    <option value="finance officer">Finance Officer</option>
                  </select>
                  <ChevronDown className="absolute right-3 bottom-4 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-xl text-sm uppercase tracking-widest transition-all shadow-lg">
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;