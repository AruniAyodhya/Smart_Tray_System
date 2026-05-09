import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Upload, Camera } from 'lucide-react';

const MenuCatalog = () => {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState({ name: "", price: "", description: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageVersion, setImageVersion] = useState(0);
  const fileInputRef = useRef(null);
  const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const [formError, setFormError] = useState("");

  const fetchMenu = async () => {
    const res = await fetch('http://localhost:5000/api/menu');
    const data = await res.json();
    setMenuItems(data);
  };

  useEffect(() => {
    let isMounted = true;

    // Increment imageVersion to force cache-busting on every navigation to this page
    setImageVersion(Date.now());

    const loadMenu = async () => {
      const res = await fetch('http://localhost:5000/api/menu');
      const data = await res.json();
      if (isMounted) {
        setMenuItems(data);
      }
    };

    loadMenu();
    return () => {
      isMounted = false;
    };
  }, [location.key]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const priceValue = Number(formData.price);
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      setFormError("Price must be greater than zero.");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("price", priceValue);
    data.append("description", formData.description);
    if (selectedFile) data.append("image", selectedFile);

    const url = editingItem 
      ? `http://localhost:5000/api/menu/update/${editingItem.menuID}`
      : 'http://localhost:5000/api/menu/add';
    
    const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', body: data });
    if (res.ok) {
      setShowModal(false);
      fetchMenu();
      removeImage();
      setFormError("");
      setImageVersion((v) => v + 1);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this item?")) {
      await fetch(`http://localhost:5000/api/menu/delete/${id}`, { method: 'DELETE' });
      fetchMenu();
      setImageVersion((v) => v + 1);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: "", price: "", description: "" });
    setFormError("");
    removeImage();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900 uppercase">Menu Catalog</h2>
        <button onClick={() => { setEditingItem(null); setFormData({name:"", price:"", description:""}); setImagePreview(null); setFormError(""); setShowModal(true); }} 
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition shadow-lg">
          <Plus size={20}/> Add New Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {menuItems.map((item) => {
          let imageUrl = null;
          for (const ext of possibleExtensions) {
            if (item.image_path && item.image_path.endsWith(ext)) {
              imageUrl = `http://localhost:5000/${item.image_path}?v=${imageVersion}`;
              break;
            }
          }
          if (!imageUrl && item.image_path) {
            imageUrl = `http://localhost:5000/${item.image_path}?v=${imageVersion}`;
          }
          return (
            <div key={item.menuID} className="bg-white rounded-4xl overflow-hidden border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
              <div className="h-52 overflow-hidden relative">
                <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={item.name} />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black text-slate-900 shadow-sm">
                  {item.menuID}
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                  <span className="text-blue-600 font-black text-lg">Rs.{item.price}</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">{item.description}</p>
                <div className="flex gap-3">
                  <button onClick={() => { setEditingItem(item); setFormData(item); setImagePreview(imageUrl); setFormError(""); setShowModal(true); }} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-bold hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center gap-2">
                    <Edit2 size={16}/> Edit
                  </button>
                  <button onClick={() => handleDelete(item.menuID)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2">
          <div className="bg-white w-full max-w-lg rounded-4xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-slate-900 uppercase">{editingItem ? "Edit Menu Item" : "Add New Item"}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-50 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{formError}</p>}
              <input type="text" placeholder="Item Name" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.name} onChange={e => setFormData({...formData, name:e.target.value})} required/>
              <input type="number" min="0.01" step="0.01" placeholder="Price (Rs.)" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100" value={formData.price} onChange={e => setFormData({...formData, price:e.target.value})} required/>
              
              <div className="relative">
                <label className="text-xs font-bold text-slate-400 mb-2 block ml-1 uppercase tracking-widest">Food Image</label>
                {!imagePreview ? (
                  <label className="w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition">
                    <Camera size={28} className="text-slate-300 mb-2"/>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Image</span>
                    <input type="file" className="hidden" accept="image/*" ref={fileInputRef} onChange={handleImageChange} required={!editingItem}/>
                  </label>
                ) : (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border-4 border-slate-50">
                    <img src={imagePreview} className="w-full h-full object-cover" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition">
                      <X size={16}/>
                    </button>
                  </div>
                )}
              </div>

              <textarea placeholder="Description" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-100 h-20" value={formData.description} onChange={e => setFormData({...formData, description:e.target.value})} required/>
              <div className="pt-1 space-y-2">
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition">
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCatalog;