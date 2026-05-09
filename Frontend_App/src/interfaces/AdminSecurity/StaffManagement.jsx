import React, { useState } from 'react';
import { Edit2, Trash2, X, ChevronDown, Search, Filter } from 'lucide-react';

const StaffManagement = ({ staff = [], onRefresh }) => {
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const handleDelete = async (sid) => {
    if (window.confirm(`Are you sure you want to delete staff member ${sid}?`)) {
      await fetch(`http://localhost:5000/api/staff/delete/${sid}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:5000/api/staff/update/${editingStaff.staff_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setEditingStaff(null);
      onRefresh();
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.staff_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl text-slate-900 uppercase tracking-tight font-bold">Staff Management</h2>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search staff..." className="pl-12 w-full p-3 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select className="pl-12 w-full p-3 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none appearance-none font-bold text-sm text-slate-600" onChange={(e) => setRoleFilter(e.target.value)}>
               <option value="all">All Roles</option>
               <option value="system admin">System Admin</option>
               <option value="food master">Food Master</option>
               <option value="inventory controller">Inventory Controller</option>
               <option value="promotion manager">Promotion Manager</option>
               <option value="order manager">Order Manager</option>
               <option value="finance officer">Finance Officer</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[30px] border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm font-bold uppercase text-slate-900 tracking-widest">
            <tr>
              <th className="px-8 py-5 w-30 text-center">ID</th>
              <th className="w-55 text-center">Name</th>
              <th className="w-35 text-center">NIC</th>
              <th className="w-62.5 text-center">Email</th>
              <th className="w-37.5 text-center">Phone Num</th>
              <th className="w-47.5 text-center">Role</th>
              <th className="text-right px-8 w-35">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-base font-normal text-black">
            {filteredStaff.map((member) => (
              <tr key={member.staff_id} className="hover:bg-slate-50/50 transition">
                <td className="px-8 py-5 font-bold text-black text-center">#{member.staff_id}</td>
                <td className="text-black text-lg font-normal max-w-55 overflow-hidden overflow-ellipsis whitespace-nowrap">{member.staff_name}</td>
                <td className="text-black text-center">{member.nic}</td>
                <td className="text-black text-left">{member.email}</td>
                <td className="text-black text-center">{member.phone}</td>
                <td className="text-center"><span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-sm uppercase tracking-wider font-bold min-w-fit max-w-47.5 truncate">{member.role}</span></td>
                <td className="px-8 text-center space-x-2">
                   <button onClick={() => { setEditingStaff(member); setFormData(member); }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition"><Edit2 size={16}/></button>
                   <button onClick={() => handleDelete(member.staff_id)} className="p-2 text-red-600 hover:text-red-700 bg-slate-50 rounded-xl transition"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-4xl p-6 shadow-2xl">
           <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl text-slate-900 uppercase font-bold">Edit Staff Member</h3>
                <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
             </div>
           <form onSubmit={handleUpdate} className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                   <div className="col-span-2">
                 <label className="text-base text-black block mb-1">Full Name</label>
                 <input type="text" value={formData.staff_name} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, staff_name: e.target.value})} />
                   </div>
                   <div>
                 <label className="text-base text-black block mb-1">NIC</label>
                 <input type="text" value={formData.nic} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, nic: e.target.value})} />
                   </div>
                   <div>
                 <label className="text-base text-black block mb-1">Phone</label>
                 <input type="text" value={formData.phone} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, phone: e.target.value})} />
                   </div>
                   <div className="col-span-2">
                 <label className="text-base text-black block mb-1">Email</label>
                 <input type="email" value={formData.email} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
                   <div className="col-span-2">
                 <label className="text-base text-black block mb-1">Address</label>
                 <input type="text" value={formData.address} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, address: e.target.value})} />
                   </div>
                   <div>
                 <label className="text-base text-black block mb-1">Date of Birth</label>
                 <input type="date" value={formData.dob} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({...formData, dob: e.target.value})} />
                   </div>
                   <div className="relative">
                 <label className="text-base text-black block mb-1">System Role</label>
                 <select value={formData.role} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 appearance-none" onChange={e => setFormData({...formData, role: e.target.value})}>
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
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest mt-4 hover:bg-blue-600 transition">Update Staff</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;