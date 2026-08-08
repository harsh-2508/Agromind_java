import React, { useState } from 'react';
import { Sprout, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'BUYER' // Default role for registration
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Authentication failed');
      }

      const data = await response.json();
      
      // 1. Save the token
      if (data.token) {
        localStorage.setItem('agro_token', data.token);
      }
      
      // --- THE FIX: Build and save the complete user object to match App.jsx ---
      const userData = data.user || { 
        role: formData.role, 
        email: formData.email,
        id: data.id || 1 // Fallback ID if backend doesn't return it directly in data
      };
      
      localStorage.setItem('agro_user', JSON.stringify(userData));

      // Pass it up to App.jsx
      onLoginSuccess(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      
      {/* Logo Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
          <Sprout className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          Agro<span className="text-emerald-500">Mind</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isLogin ? 'Sign in to access your dashboard' : 'Join the agricultural marketplace'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] sm:rounded-2xl sm:px-10 border border-slate-800 relative overflow-hidden">
          
          {/* Subtle top glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Show Name & Role fields only if Registering */}
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">First Name</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <input name="firstName" type="text" required onChange={handleChange} className="bg-slate-950 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors" placeholder="John" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Last Name</label>
                    <input name="lastName" type="text" required onChange={handleChange} className="bg-slate-950 block w-full px-3 py-2.5 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors mt-1" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">I am a...</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'FARMER'})}
                      className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${formData.role === 'FARMER' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      Farmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'BUYER'})}
                      className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${formData.role === 'BUYER' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                    >
                      Buyer
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Email address</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input name="email" type="email" required onChange={handleChange} className="bg-slate-950 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors" placeholder="you@example.com" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input name="password" type="password" required onChange={handleChange} className="bg-slate-950 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors" placeholder="••••••••" />
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-950 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign in to AgroMind' : 'Create Account'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors focus:outline-none"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
