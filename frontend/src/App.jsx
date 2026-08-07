import React, { useEffect, useState } from 'react';
import FarmerDashboard from './components/FarmerDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import AuthScreen from './components/AuthScreen';
import { Sprout, Wallet,LogOut } from 'lucide-react';

function App() {
  const [user,setUser]=useState(null);
  const [isCheckingSession,setIsCheckSession]=useState(true);

  useEffect(()=>{
    const token=localStorage.getItem('agro_token');
    const storedUser=localStorage.getItem('agro_user');
    if(token && storedUser){
      setUser(JSON.parse(storedUser));
    }

    setIsCheckSession(false);
  },[]);

  if(isCheckingSession){
    return <div className="min-h-screen bg-slate-900"></div>
  }

  // if there is not user logged in ,show the AuthScreen
  if(!user){
    return <AuthScreen onLoginSuccess={(userData)=>setUser(userData)}/>
  }
  const handleLogout=()=>{
    localStorage.removeItem('agro_token');
    localStorage.removeItem('agro_user');
    window.location.reload(); // Refreshes the page to clear React state
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      
      {/* Top Navigation Bar */}
      <nav className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold text-white tracking-tight flex items-center">
            <span className="bg-emerald-500 text-slate-950 px-2 py-1 rounded mr-2">Agro</span>Mind
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center">
              <span className="text-slate-400 text-sm mr-2">Role:</span>
              <span className={`text-sm font-bold ${user.role === 'FARMER' ? 'text-emerald-400' : 'text-blue-400'}`}>
                {user.role}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area: Routes based on User Role */}
      <main>
        {user.role === 'FARMER' ? <FarmerDashboard /> : <BuyerDashboard />}
      </main>

    </div>
  );
}

export default App;