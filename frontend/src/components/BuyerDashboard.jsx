import React, { useState, useEffect } from 'react';
import {
  Gavel,
  TrendingUp,
  Clock,
  Wallet,
  WifiOff,
  Loader2,
  ChevronRight
} from 'lucide-react';
import SockJS from "sockjs-client";
import { Client } from '@stomp/stompjs';

const BuyerDashboard = () => {
  const [auctions, setAuctions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  
  // We use an object to track the bid input for each specific auction ID
  const [bidInputs, setBidInputs] = useState({});

  useEffect(() => {
    let stompClient = null;

    const fetchAuctionsAndConnect = async () => {
      try {
        const token = localStorage.getItem('agro_token');
        
        // Fetch ALL auctions (Global Marketplace)
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch marketplace');
        
        const data = await response.json();
        
        // Buyers only care about ACTIVE auctions
        const activeAuctions = data.filter(a => a.status === 'ACTIVE');
        setAuctions(activeAuctions);
        setFetchError(null);

        // Connect to WebSockets to listen for live outbids
        const socket = new SockJS(`${import.meta.env.VITE_API_BASE_URL}/ws-auction`);
        stompClient = new Client({
          webSocketFactory: () => socket,
          connectHeaders: { Authorization: `Bearer ${token}` },
          debug: (str) => console.log(str),
          onConnect: () => {
            console.log("🟢 Buyer connected to live auction websocket!");
            
            // Subscribe to every active auction
            activeAuctions.forEach(auction => {
              stompClient.subscribe(`/topic/auction/${auction.id}`, (message) => {
                const newBid = JSON.parse(message.body);
                console.log(`🔥 Price jump on auction ${auction.id}: Rs.${newBid.bidAmount}`);

                // Instantly update the UI when ANYONE bids
                setAuctions(prev => prev.map(a => 
                  a.id === auction.id 
                    ? { ...a, winningBidAmount: newBid.bidAmount } 
                    : a
                ));
              });
            });
          }
        });
        stompClient.activate();
      } catch (err) {
        console.error(err);
        setFetchError("Marketplace offline. Check connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctionsAndConnect();
    
    return () => { if (stompClient) stompClient.deactivate(); }
  }, []);

  const handleInputChange = (auctionId, value) => {
    setBidInputs(prev => ({ ...prev, [auctionId]: value }));
  };

  const handlePlaceBid = async (auctionId, basePrice, currentHighest) => {
    const bidAmount = parseFloat(bidInputs[auctionId]);
    const minRequired = currentHighest ? currentHighest + 1 : basePrice;

    if (!bidAmount || bidAmount < minRequired) {
      alert(`Your bid must be at least ₹${minRequired.toLocaleString()}`);
      return;
    }

    const token = localStorage.getItem('agro_token');
    
    // Attempt to grab the logged-in user's ID from local storage (set during login)
    // If not found, we default to ID 2 (which is usually buyer1 from your seeder)
    const storedUser = JSON.parse(localStorage.getItem('agro_user') || '{}');
    const buyerId = storedUser.id || 2; 

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auctions/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          auctionId: auctionId,
          buyerId: buyerId,
          bidAmount: bidAmount
        })
      });

      if (response.ok) {
        // Clear the input field. 
        // We DO NOT manually update the auction price here because the 
        // WebSocket will instantly push the new price back to us automatically!
        setBidInputs(prev => ({ ...prev, [auctionId]: '' }));
      } else {
        const errorMsg = await response.text();
        alert(`Bid Rejected: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Bid error:", error);
      alert("Network error while placing bid.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 md:p-10 font-sans text-slate-200">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center tracking-tight">
            <TrendingUp className="w-8 h-8 mr-3 text-blue-500" />
            Live Marketplace
          </h1>
          <p className="text-slate-400 mt-1">Bid on premium agricultural yields in real-time.</p>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 px-5 py-2.5 rounded-lg flex items-center shadow-lg">
          <Wallet className="w-5 h-5 mr-3 text-emerald-400" />
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Available Funds</p>
            <p className="text-white font-bold tracking-tight">₹ ∞ (Unlimited)</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
           <div className="flex justify-center items-center py-20">
             <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             <span className="ml-3 text-slate-400">Loading live auctions...</span>
           </div>
        ) : fetchError ? (
           <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-8 text-center flex flex-col items-center">
             <WifiOff className="w-12 h-12 text-red-500 mb-3 opacity-80" />
             <h3 className="text-lg font-bold text-red-400 mb-1">Marketplace Offline</h3>
             <p className="text-slate-400 text-sm">{fetchError}</p>
           </div>
        ) : auctions.length === 0 ? (
           <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
             <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-white mb-2">No Active Auctions</h3>
             <p className="text-slate-400">Farmers haven't started any live auctions yet. Check back soon!</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => {
              const currentHighest = auction.winningBidAmount;
              const basePrice = auction.crop?.basePrice || 0;
              const minBid = currentHighest ? currentHighest + 1 : basePrice;

              return (
                <div key={auction.id} className="bg-slate-800 rounded-xl shadow-xl border border-blue-900/30 overflow-hidden flex flex-col relative group">
                  
                  {/* Pulsing Live Indicator */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 bg-[length:200%_auto] animate-gradient"></div>

                  <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-slate-800/50 mt-1">
                    <div>
                      <h3 className="font-bold text-lg text-white leading-tight mb-1">{auction.crop?.name || 'Unknown Crop'}</h3>
                      <p className="text-sm text-blue-400 font-medium">{auction.crop?.quantityKg || 0} kg</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-900/30 text-blue-400 border-blue-800/50">
                      <Clock className="w-3 h-3 mr-1 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Base Price</p>
                        <p className="text-slate-400 font-medium">₹{basePrice.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-400 uppercase tracking-wide font-bold mb-1">Current Highest</p>
                        <p className="text-3xl font-black text-white tracking-tight drop-shadow-md">
                          {currentHighest ? `₹${currentHighest.toLocaleString()}` : 'No Bids'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bidding Area */}
                    <div className="mt-6 bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Place Your Bid</label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                          <input 
                            type="number"
                            min={minBid}
                            placeholder={minBid.toLocaleString()}
                            value={bidInputs[auction.id] || ''}
                            onChange={(e) => handleInputChange(auction.id, e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg pl-8 pr-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => handlePlaceBid(auction.id, basePrice, currentHighest)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20 flex items-center"
                        >
                          Bid <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-right">Must be at least ₹{minBid.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;