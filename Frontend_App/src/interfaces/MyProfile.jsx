import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Edit3, Lock, Save, X, Camera, Upload, Trash2 } from 'lucide-react';

const MyProfile = ({ user, onRefresh }) => {
  const normalizedUser = useMemo(() => ({
    ...user,
    staff_id: user?.staff_id || "",
    staff_name: user?.staff_name || user?.fullName || user?.username || "-",
    nic: user?.nic || "-",
    email: user?.email || "-",
    phone: user?.phone || "-",
    address: user?.address || "-",
    dob: user?.dob || "",
    role: user?.role || "-",
  }), [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ current: "", new: "", confirm: "" });
  const [displayUser, setDisplayUser] = useState({ ...normalizedUser });
  const [profileData, setProfileData] = useState({ ...normalizedUser });
  const [error, setError] = useState("");
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureVersion, setPictureVersion] = useState(0);
  const fileInputRef = useRef(null);

  const loadProfilePicture = useCallback(async (staffId) => {
    if (!staffId) {
      setProfilePicturePreview(null);
      return;
    }

    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    setProfilePicturePreview(null);

    for (const ext of possibleExtensions) {
      const baseImagePath = `http://localhost:5000/uploads/profile_picture/${staffId}${ext}`;
      const cacheBustedPath = `${baseImagePath}?v=${Date.now()}-${pictureVersion}`;

      try {
        const response = await fetch(cacheBustedPath, {
          method: 'GET',
          cache: 'no-store'
        });
        if (response.ok) {
          setProfilePicturePreview(cacheBustedPath);
          return;
        }
      } catch {
        // Try next extension.
      }
    }
  }, [pictureVersion]);

  useEffect(() => {
    setDisplayUser({ ...normalizedUser });
    setProfileData({ ...normalizedUser });
    setSelectedImageFile(null);
    loadProfilePicture(normalizedUser.staff_id);
  }, [normalizedUser, loadProfilePicture]);

  useEffect(() => {
    const refreshPictureIfVisible = () => {
      if (!document.hidden && normalizedUser.staff_id) {
        setPictureVersion((prev) => prev + 1);
      }
    };

    window.addEventListener('focus', refreshPictureIfVisible);
    document.addEventListener('visibilitychange', refreshPictureIfVisible);

    return () => {
      window.removeEventListener('focus', refreshPictureIfVisible);
      document.removeEventListener('visibilitychange', refreshPictureIfVisible);
    };
  }, [normalizedUser.staff_id]);

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedImageFile) {
      alert("Please select an image first");
      return;
    }

    setUploadingPicture(true);
    const formData = new FormData();
    formData.append("image", selectedImageFile);

    try {
      const res = await fetch(`http://localhost:5000/api/staff/upload-profile-picture/${normalizedUser.staff_id}`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert("Profile picture uploaded successfully!");
        setSelectedImageFile(null);
        setPictureVersion((prev) => prev + 1);
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to upload profile picture");
      }
    } catch {
      alert("Error uploading profile picture");
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!profilePicturePreview) {
      alert("No profile picture to delete");
      return;
    }

    if (!window.confirm("Are you sure you want to delete your profile picture?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/staff/delete-profile-picture/${normalizedUser.staff_id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setProfilePicturePreview(null);
        setSelectedImageFile(null);
        setPictureVersion((prev) => prev + 1);
        alert("Profile picture deleted successfully!");
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete profile picture");
      }
    } catch {
      alert("Error deleting profile picture");
    }
  };

  const profileFields = [
    { label: 'ID', value: displayUser.staff_id || '-' },
    { label: 'Full Name', value: displayUser.staff_name || '-' },
    { label: 'NIC', value: displayUser.nic || '-' },
    { label: 'Email', value: displayUser.email || '-' },
    { label: 'Phone', value: displayUser.phone || '-' },
    { label: 'Address', value: displayUser.address || '-' },
    { label: 'Date of Birth', value: displayUser.dob || '-' },
    { label: 'Role', value: displayUser.role || '-' },
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!normalizedUser.staff_id) {
      alert("Staff ID not found. Please log in again.");
      return;
    }

    const payload = {
      staff_name: profileData.staff_name,
      nic: profileData.nic,
      email: profileData.email,
      phone: profileData.phone,
      address: profileData.address,
      dob: profileData.dob,
      role: profileData.role,
    };

    const res = await fetch(`http://localhost:5000/api/staff/update/${normalizedUser.staff_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setIsEditing(false);
      const updatedUser = { ...displayUser, ...payload, staff_id: normalizedUser.staff_id };
      setDisplayUser(updatedUser);
      setProfileData(updatedUser);
      if (typeof onRefresh === 'function') {
        onRefresh(updatedUser);
      }
      alert("Profile updated successfully!");
    } else {
      const data = await res.json();
      alert(data.detail || "Failed to update profile");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError("");
    if (passData.new !== passData.confirm) return setError("Passwords don't match");

    const res = await fetch('http://localhost:5000/api/staff/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: normalizedUser.staff_id,
        current_password: passData.current,
        new_password: passData.new
      })
    });
    if (res.ok) {
      setShowPassModal(false);
      alert("Password updated!");
    } else {
      const data = await res.json();
      setError(data.detail);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="h-32 bg-slate-900 flex items-end px-8 pb-5 relative">
          <div className="absolute right-8 bottom-5 flex gap-3">
              <button onClick={() => { setProfileData({ ...normalizedUser }); setIsEditing(true); }} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition">
               <Edit3 size={18}/> Edit Profile
             </button>
             <button onClick={() => setShowPassModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition">
               <Lock size={18}/> Change Password
             </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black">
              {displayUser.staff_id}
            </div>
            <div>
              <h2 className="text-white font-black text-2xl uppercase tracking-tight">{displayUser.staff_name}</h2>
              <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">{displayUser.role}</p>
            </div>
          </div>
        </div>

        <div className="p-8 flex gap-8">
          {/* Left Side - Profile Picture */}
          <div className="flex flex-col items-center w-40 shrink-0">
            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center overflow-hidden mb-4 shrink-0">
              {profilePicturePreview ? (
                <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera size={48} className="text-slate-300" />
              )}
            </div>
            
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleProfileImageChange}
            />
            
            <button 
              type="button"
              onClick={() => {
                if (selectedImageFile) {
                  handleUploadProfilePicture();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              disabled={uploadingPicture}
            >
              <Upload size={16}/> {selectedImageFile ? (uploadingPicture ? 'Uploading...' : 'Confirm Upload') : 'Upload Photo'}
            </button>
            
            {profilePicturePreview && (
              <button 
                onClick={handleDeleteProfilePicture}
                disabled={uploadingPicture}
                className="w-full bg-red-100 hover:bg-red-500 text-red-600 hover:text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Trash2 size={16}/> Delete Photo
              </button>
            )}
          </div>

          {/* Right Side - Profile Fields */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {profileFields.map((field) => (
              <div key={field.label} className={`bg-slate-50 rounded-2xl p-4 ${field.label === 'Address' ? 'col-span-2' : ''}`}>
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider">{field.label}</p>
                <p className="text-lg text-black font-normal mt-1.5 wrap-break-word">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-4xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xl text-slate-900 uppercase font-bold">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-base text-black block mb-1">Full Name</label>
                  <input type="text" value={profileData.staff_name || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, staff_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-base text-black block mb-1">NIC</label>
                  <input type="text" value={profileData.nic || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, nic: e.target.value })} />
                </div>
                <div>
                  <label className="text-base text-black block mb-1">Phone</label>
                  <input type="text" value={profileData.phone || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, phone: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-base text-black block mb-1">Email</label>
                  <input type="email" value={profileData.email || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-base text-black block mb-1">Address</label>
                  <input type="text" value={profileData.address || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, address: e.target.value })} />
                </div>
                <div>
                  <label className="text-base text-black block mb-1">Date of Birth</label>
                  <input type="date" value={profileData.dob || ''} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-base" onChange={e => setProfileData({ ...profileData, dob: e.target.value })} />
                </div>
                <div className="relative">
                  <label className="text-base text-black block mb-1">System Role</label>
                  <select value={profileData.role || ''} className="w-full p-3 bg-slate-100 border border-slate-100 rounded-2xl outline-none text-slate-700 appearance-none text-base" disabled>
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
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest mt-4 hover:bg-blue-600 transition flex items-center justify-center gap-3">
                <Save size={20}/> Save Profile Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePasswordUpdate} className="bg-white w-full max-w-sm rounded-4xl p-6 space-y-3 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black uppercase text-slate-800">Change Password</h3>
            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl text-center">{error}</p>}
            
            <div className="space-y-3">
               <input type="password" placeholder="Current Password" required className="w-full p-3 bg-slate-50 rounded-2xl outline-none text-base" onChange={e => setPassData({...passData, current: e.target.value})} />
               <input type="password" placeholder="New Password (8+ chars, @ symbol)" required className="w-full p-3 bg-slate-50 rounded-2xl outline-none text-base" onChange={e => setPassData({...passData, new: e.target.value})} />
               <input type="password" placeholder="Confirm New Password" required className="w-full p-3 bg-slate-50 rounded-2xl outline-none text-base" onChange={e => setPassData({...passData, confirm: e.target.value})} />
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition shadow-lg">Update Password</button>
            <button type="button" onClick={() => setShowPassModal(false)} className="w-full text-slate-400 font-bold text-sm">Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MyProfile;