import React, { useState, useEffect, useRef } from 'react';
import {
  Sprout,
  Gavel,
  Activity,
  CheckCircle2,
  Clock,
  Plus,
  Microscope,
  X,
  Loader2,
  Sparkles,
  WifiOff,
  Package,
  Camera,
  UploadCloud
} from 'lucide-react';
import SockJS from "sockjs-client";
import { Client } from '@stomp/stompjs';
import ReactMarkdown from 'react-markdown'; // Optional: run `npm install react-markdown` to render the bolding/bullets nicely!

const FarmerDashboard = () => {
  // --- AUCTION STATE ---
  const [auctions, setAuctions] = useState([]);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // --- SOIL AI MODAL STATE ---
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  
  const [soilData, setSoilData] = useState({
    nitrogen: '', phosphorus: '', potassium: '', phLevel: '', region: 'Madhya Pradesh'
  });

  // --- DISEASE AI MODAL STATE (NEW) ---
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [isDiseaseLoading, setIsDiseaseLoading] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // --- NEW LISTING MODAL STATE ---
  const [isNewListingModalOpen, setIsNewListingModalOpen] = useState(false);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);
  const [newListingData, setNewListingData] = useState({ name: '', quantityKg: '', basePrice: '' });

  // --- FETCH REAL AUCTIONS FROM SPRING BOOT ---
  useEffect(() => {
    let stompClient = null;

    const fetchAuctionsAndConnectWS = async () => {
      try {
        const token = localStorage.getItem('agro_token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/my-auctions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) { throw new Error('Failed to fetch auctions'); }

        const data = await response.json();
        setAuctions(data);
        setFetchError(null);

        // websocket connection
        const socket = new SockJS(`${import.meta.env.VITE_API_BASE_URL}/ws-auction`);
        stompClient = new Client({
          webSocketFactory: () => socket,
          connectHeaders: { Authorization: `Bearer ${token}` },
          debug: (str) => console.log(str),
          onConnect: () => {
            console.log("🟢 Connected to live auction websocket!");
            data.forEach(auction => {
              if (auction.status === 'ACTIVE' || auction.status === 'PENDING') {
                stompClient.subscribe(`/topic/auction/${auction.id}`, (message) => {
                  const newBid = JSON.parse(message.body);
                  setAuctions(prevAuctions =>
                    prevAuctions.map(a => a.id === auction.id ? { ...a, winningBidAmount: newBid.bidAmount } : a)
                  );
                });
              }
            });
          }
        });
        stompClient.activate();
      } catch (err) {
        setFetchError("Could not connect to the server. Is Spring Boot running?");
      } finally {
        setIsLoadingAuctions(false);
      }
    };

    fetchAuctionsAndConnectWS();
    return () => { if (stompClient) stompClient.deactivate(); }
  }, []); 

  // --- AUCTION CONTROLS ---
  const handleStartAuction = async (auctionId) => {
    const token = localStorage.getItem('agro_token');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/${auctionId}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      alert(await response.text());
      setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, status: 'ACTIVE' } : a));
    }
  };

  const handleCloseAuction = async (auctionId) => {
    const token = localStorage.getItem('agro_token');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/${auctionId}/close`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      alert(await response.text());
      setAuctions(prev => prev.map(a => a.id === auctionId ? { ...a, status: 'COMPLETED' } : a));
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    setIsSubmittingListing(true);
    const token = localStorage.getItem('agro_token');

    try {
      const payload = {
        crop: {
          name: newListingData.name,
          quantityKg: parseFloat(newListingData.quantityKg),
          basePrice: parseFloat(newListingData.basePrice)
        }
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/my-auctions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (refreshResponse.ok) setAuctions(await refreshResponse.json());
        
        setIsNewListingModalOpen(false);
        setNewListingData({ name: '', quantityKg: '', basePrice: '' });
      }
    } finally {
      setIsSubmittingListing(false);
    }
  };

  // --- NEW: CROP DISEASE AI HANDLERS ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setDiseaseResult(null); // clear previous results
    }
  };

  const handleDiseaseAnalysis = async () => {
    if (!selectedImage) return;
    setIsDiseaseLoading(true);
    setDiseaseResult(null);

    const token = localStorage.getItem('agro_token');
    const formData = new FormData();
    formData.append('image', selectedImage); // Matches @RequestParam("image") in Spring Boot

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai/analyze-disease`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData // Note: When using FormData, do NOT set 'Content-Type'. The browser sets it automatically with the boundary!
      });

      if (response.ok) {
        const data = await response.json();
        setDiseaseResult(data.recommendation);
      } else {
        setDiseaseResult("Failed to analyze image. Please try again.");
      }
    } catch (error) {
      setDiseaseResult("Error connecting to AI service.");
    } finally {
      setIsDiseaseLoading(false);
    }
  };

  const closeDiseaseModal = () => {
    setIsDiseaseModalOpen(false);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setDiseaseResult(null);
  };

  // --- HELPERS ---
  const getStatusColor = (s) => s === 'ACTIVE' ? 'bg-green-900/30 text-green-400 border-green-800/50' : s === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50' : 'bg-slate-800 text-slate-300 border-slate-700';
  const getStatusIcon = (s) => s === 'ACTIVE' ? <Activity className="w-4 h-4 mr-1 animate-pulse" /> : s === 'PENDING' ? <Clock className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />;

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 font-sans text-slate-200">
      
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center tracking-tight">
            <Sprout className="w-8 h-8 mr-3 text-green-500" />
            AgroMind Terminal
          </h1>
          <p className="text-slate-400 mt-1">Manage your crops, monitor live auctions, and analyze soil.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          
          {/* DISEASE DETECTOR BUTTON */}
          <button 
            onClick={() => setIsDiseaseModalOpen(true)}
            className="flex-shrink-0 flex items-center justify-center bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/60 hover:border-emerald-500 text-emerald-400 px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Crop Scan AI
          </button>

          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="flex-shrink-0 flex items-center justify-center bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg"
          >
            <Microscope className="w-5 h-5 mr-2 text-blue-400" />
            Soil AI
          </button>
          
          <button 
            onClick={() => setIsNewListingModalOpen(true)}
            className="flex-shrink-0 flex items-center justify-center bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/20"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Listing
          </button>
        </div>
      </div>

      {/* Main Content Grid (AUCTIONS) */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold mb-6 flex items-center text-slate-300">
          <Gavel className="w-5 h-5 mr-2 text-slate-400" />
          Active & Past Auctions
        </h2>
        
        {isLoadingAuctions ? (
           <div className="flex justify-center items-center py-20">
             <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             <span className="ml-3 text-slate-400">Syncing with database...</span>
           </div>
        ) : fetchError ? (
           <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-8 text-center flex flex-col items-center">
             <WifiOff className="w-12 h-12 text-red-500 mb-3 opacity-80" />
             <h3 className="text-lg font-bold text-red-400 mb-1">Connection Lost</h3>
             <p className="text-slate-400 text-sm">{fetchError}</p>
           </div>
        ) : auctions.length === 0 ? (
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
             <p className="text-slate-400">You have no active listings. Click "New Listing" to start.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <div key={auction.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden flex flex-col hover:border-slate-500 transition-colors">
                <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-slate-800/50">
                  <div>
                    <h3 className="font-bold text-lg text-slate-100 leading-tight mb-1">{auction.crop?.name || 'Unknown Crop'}</h3>
                    <p className="text-sm text-slate-400">{auction.crop?.quantityKg || 0} kg</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(auction.status)}`}>
                    {getStatusIcon(auction.status)}
                    {auction.status}
                  </span>
                </div>
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Base Price</p>
                      <p className="text-slate-300 font-medium">₹{auction.crop?.basePrice?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                        {auction.status === 'COMPLETED' ? 'Winning Bid' : 'Current Highest'}
                      </p>
                      <p className={`text-2xl font-bold tracking-tight ${auction.status === 'ACTIVE' ? 'text-green-400 drop-shadow-sm' : 'text-white'}`}>
                        {auction.winningBidAmount ? `₹${auction.winningBidAmount.toLocaleString()}` : '--'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mb-2 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-1.5 rounded-full ${auction.status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : auction.status === 'COMPLETED' ? 'bg-slate-500' : 'bg-yellow-500'}`} 
                      style={{ width: auction.status === 'ACTIVE' ? '75%' : auction.status === 'COMPLETED' ? '100%' : '0%' }}
                    ></div>
                  </div>
                </div>
                <div className="p-4 bg-slate-900/50 border-t border-slate-700 mt-auto">
                  {auction.status === 'PENDING' && (
                    <button onClick={() => handleStartAuction(auction.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors text-sm shadow-lg shadow-blue-900/20">
                      Start Auction Now
                    </button>
                  )}
                  {auction.status === 'ACTIVE' && (
                    <button onClick={() => handleCloseAuction(auction.id)} className="w-full bg-red-600/90 hover:bg-red-500 text-white font-medium py-2 rounded-lg transition-colors text-sm flex justify-center items-center shadow-lg shadow-red-900/20 border border-red-500/50">
                      <Gavel className="w-4 h-4 mr-2" />
                      Drop the Gavel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- CROP SCAN AI MODAL (NEW) --- */}
      {isDiseaseModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-emerald-900/50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            <button onClick={closeDiseaseModal} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-emerald-400" />
              Crop Disease Vision AI
            </h2>
            <p className="text-sm text-slate-400 mb-6">Upload a clear photo of the affected leaves or fruit. Gemini will analyze the visual symptoms and recommend treatments.</p>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Image Upload Area */}
              {!selectedImage ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 hover:border-emerald-500 bg-slate-900/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                >
                  <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-emerald-400 mb-4 transition-colors" />
                  <p className="text-slate-300 font-medium mb-1">Click to upload crop image</p>
                  <p className="text-slate-500 text-sm">Supports JPG, PNG (Max 5MB)</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black mb-4">
                  <img src={imagePreviewUrl} alt="Crop preview" className="w-full h-64 object-contain" />
                  <button 
                    onClick={() => { setSelectedImage(null); setDiseaseResult(null); }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-500 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Analyze Button */}
              {selectedImage && !diseaseResult && (
                <button 
                  onClick={handleDiseaseAnalysis} 
                  disabled={isDiseaseLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex justify-center items-center text-lg"
                >
                  {isDiseaseLoading ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Gemini is analyzing...</>
                  ) : (
                    <><Camera className="w-5 h-5 mr-2" /> Diagnose Crop</>
                  )}
                </button>
              )}

              {/* AI Result Area */}
              {diseaseResult && (
                <div className="mt-4 bg-slate-900/80 border border-emerald-900/50 rounded-xl p-5 shadow-inner">
                  <h3 className="text-emerald-400 font-bold mb-3 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Diagnosis & Treatment Plan
                  </h3>
                  <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-emerald">
                    {/* If you installed react-markdown, wrap this in <ReactMarkdown> */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>{diseaseResult}</div>
                  </div>
                  
                  <button 
                    onClick={() => { setSelectedImage(null); setDiseaseResult(null); }}
                    className="mt-6 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                  >
                    + Analyze another image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- NEW LISTING MODAL --- */}
      {isNewListingModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            
            <button onClick={() => setIsNewListingModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <Package className="w-6 h-6 mr-2 text-green-400" />
              Create New Listing
            </h2>
            <p className="text-sm text-slate-400 mb-6">Add a new crop to the auction marketplace.</p>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Crop Name</label>
                <input
                  type="text"
                  required
                  value={newListingData.name}
                  onChange={(e) => setNewListingData({ ...newListingData, name: e.target.value })}
                  placeholder="e.g. Organic Wheat"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Quantity (kg)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newListingData.quantityKg}
                  onChange={(e) => setNewListingData({ ...newListingData, quantityKg: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newListingData.basePrice}
                  onChange={(e) => setNewListingData({ ...newListingData, basePrice: e.target.value })}
                  placeholder="e.g. 2500"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingListing}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-green-900/20 flex justify-center items-center text-lg mt-2"
              >
                {isSubmittingListing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-5 h-5 mr-2" /> Create Listing</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SOIL AI MODAL --- */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800 border border-blue-900/50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            
            <button onClick={() => { setIsAiModalOpen(false); setAiResult(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-blue-400" />
              Soil Analysis AI
            </h2>
            <p className="text-sm text-slate-400 mb-6">Enter your soil data and get AI-powered crop recommendations from Gemini.</p>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {!aiResult ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsAiLoading(true);
                  setAiResult(null);
                  const token = localStorage.getItem('agro_token');
                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai/analyze-soil`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        nitrogen: parseFloat(soilData.nitrogen),
                        phosphorus: parseFloat(soilData.phosphorus),
                        potassium: parseFloat(soilData.potassium),
                        phLevel: parseFloat(soilData.phLevel),
                        region: soilData.region
                      })
                    });
                    if (response.ok) {
                      const data = await response.json();
                      setAiResult(data.recommendation);
                    } else {
                      setAiResult("Failed to get recommendation. Please try again.");
                    }
                  } catch (error) {
                    setAiResult("Error connecting to AI service.");
                  } finally {
                    setIsAiLoading(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nitrogen (N)</label>
                      <input type="number" required value={soilData.nitrogen} onChange={(e) => setSoilData({ ...soilData, nitrogen: e.target.value })} placeholder="e.g. 90" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Phosphorus (P)</label>
                      <input type="number" required value={soilData.phosphorus} onChange={(e) => setSoilData({ ...soilData, phosphorus: e.target.value })} placeholder="e.g. 42" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Potassium (K)</label>
                      <input type="number" required value={soilData.potassium} onChange={(e) => setSoilData({ ...soilData, potassium: e.target.value })} placeholder="e.g. 43" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">pH Level</label>
                      <input type="number" step="0.1" required value={soilData.phLevel} onChange={(e) => setSoilData({ ...soilData, phLevel: e.target.value })} placeholder="e.g. 6.5" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Region</label>
                    <select value={soilData.region} onChange={(e) => setSoilData({ ...soilData, region: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                      <option>Madhya Pradesh</option>
                      <option>Maharashtra</option>
                      <option>Punjab</option>
                      <option>Uttar Pradesh</option>
                      <option>Rajasthan</option>
                      <option>Karnataka</option>
                      <option>Tamil Nadu</option>
                      <option>Gujarat</option>
                      <option>West Bengal</option>
                      <option>Bihar</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isAiLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-900/30 flex justify-center items-center text-lg mt-2">
                    {isAiLoading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gemini is thinking...</>
                    ) : (
                      <><Microscope className="w-5 h-5 mr-2" /> Get AI Recommendation</>
                    )}
                  </button>
                </form>
              ) : (
                <div className="bg-slate-900/80 border border-blue-900/50 rounded-xl p-5 shadow-inner">
                  <h3 className="text-blue-400 font-bold mb-3 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> AI Crop Recommendation
                  </h3>
                  <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-blue">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                  </div>
                  <button onClick={() => setAiResult(null)} className="mt-6 text-sm text-blue-500 hover:text-blue-400 font-medium">
                    + Run another analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;