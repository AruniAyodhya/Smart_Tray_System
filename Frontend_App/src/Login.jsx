import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Pass the user object {id, username, role} to App.jsx
        onLogin(data);
      } else {
        // FastAPI returns errors in the 'detail' property
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Cannot connect to server. Check if Backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans relative"
      style={{ backgroundImage: 'url(http://localhost:5000/uploads/logging.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" />

      {/* Glassmorphism card */}
      <div className="relative z-10 w-105 rounded-4xl p-10 border border-white/20 shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

        {/* Logo & heading */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}>
            <span className="text-white text-2xl font-black tracking-tighter">ST</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Smart Tray</h2>
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5">Staff Authentication Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-white/50 mb-2 ml-1 tracking-widest">Username</label>
            <input
              type="text"
              required
              className="w-full p-3.5 rounded-2xl outline-none font-medium transition-all text-white placeholder-white/30 border border-white/15 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              placeholder="Enter your username"
              onChange={(e) => setForm({...form, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-white/50 mb-2 ml-1 tracking-widest">Password</label>
            <input
              type="password"
              required
              className="w-full p-3.5 rounded-2xl outline-none font-medium transition-all text-white placeholder-white/30 border border-white/15 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              placeholder="••••••••"
              onChange={(e) => setForm({...form, password: e.target.value})}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-300 p-3 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full text-white font-black py-4 rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Authenticating...
              </>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>

        <p className="text-center text-white/25 text-[10px] font-bold uppercase tracking-widest mt-8">
          © 2026 Smart Tray System
        </p>
      </div>
    </div>
  );
};

export default Login;