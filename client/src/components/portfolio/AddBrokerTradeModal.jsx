import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Calendar,
  Layers,
  HelpCircle,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { stockApi, portfolioApi } from '../../services/api';

const BROKER_OPTIONS = [
  { id: 'Zerodha Kite', name: 'Zerodha Kite', icon: '🪁', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Groww', name: 'Groww', icon: '🟢', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Upstox', name: 'Upstox', icon: '🟣', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'Angel One', name: 'Angel One', icon: '🟠', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'Dhan', name: 'Dhan', icon: '⚡', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'ICICI Direct', name: 'ICICI Direct', icon: '🔷', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'HDFC Sky', name: 'HDFC Sky', icon: '☁️', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'Kotak Neo', name: 'Kotak Neo', icon: '🔴', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'Paytm Money', name: 'Paytm Money', icon: '💳', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'Other Broker', name: 'Other Broker', icon: '🏦', color: 'bg-slate-50 text-slate-700 border-slate-200' }
];

export default function AddBrokerTradeModal({ isOpen, onClose, onTradeAdded, prefillStock }) {
  const [broker, setBroker] = useState('Zerodha Kite');
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradeType, setTradeType] = useState('DELIVERY');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Symbol Autocomplete search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (prefillStock) {
      setSymbol(prefillStock.symbol || '');
      setCompanyName(prefillStock.company_name || '');
      const cmp = prefillStock.price?.close || prefillStock.score?.entry_price || '';
      if (cmp) setBuyPrice(String(cmp));
      if (prefillStock.score?.target1) setTargetPrice(String(prefillStock.score.target1));
      if (prefillStock.score?.stop_loss) setStopLoss(String(prefillStock.score.stop_loss));
    }
  }, [prefillStock, isOpen]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setSymbol(val.toUpperCase());
    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await stockApi.searchStocks(val);
        if (res && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 200);
  };

  const handleSelectStock = (item) => {
    setSymbol(item.symbol);
    setCompanyName(item.company_name);
    setSearchQuery(item.symbol);
    setSearchResults([]);
    setIsSearching(false);

    // Fetch details to auto-populate CMP and levels
    stockApi.getStockDetail(item.symbol)
      .then(res => {
        if (res.data) {
          const s = res.data;
          const cmp = s.price?.close || s.score?.entry_price || '';
          if (cmp && !buyPrice) setBuyPrice(String(cmp));
          if (s.score?.target1 && !targetPrice) setTargetPrice(String(s.score.target1.toFixed(1)));
          if (s.score?.stop_loss && !stopLoss) setStopLoss(String(s.score.stop_loss.toFixed(1)));
        }
      })
      .catch(() => {});
  };

  const numBuyPrice = Number(buyPrice) || 0;
  const numQuantity = parseInt(quantity, 10) || 0;
  const totalInvested = numBuyPrice * numQuantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim()) {
      setError('Please select or enter a valid Stock Symbol.');
      return;
    }
    if (numBuyPrice <= 0) {
      setError('Please enter a valid Buy Price per share.');
      return;
    }
    if (numQuantity <= 0) {
      setError('Please enter a valid Quantity (at least 1 share).');
      return;
    }

    setLoading(true);

    try {
      await portfolioApi.addTrade({
        symbol: symbol.toUpperCase().trim(),
        broker_name: broker,
        trade_type: tradeType,
        buy_price: numBuyPrice,
        quantity: numQuantity,
        buy_date: buyDate,
        target_price: targetPrice ? Number(targetPrice) : null,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        notes: notes.trim()
      });

      if (onTradeAdded) onTradeAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record broker trade.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-2xl relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-xl text-slate-900">
              Record External Broker Trade
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Log stock bought on Zerodha, Groww, Upstox, etc. to track live P&L
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Step 1: Select Broker Application */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Broker / Trading App
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
              {BROKER_OPTIONS.map(b => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBroker(b.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all text-left ${
                    broker === b.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <span className="text-sm">{b.icon}</span>
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Stock Symbol Selection with Autocomplete */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Stock Symbol (NSE / BSE)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search symbol (e.g. RELIANCE, TCS, TATAMOTORS)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
              />

              {/* Autocomplete Dropdown */}
              {isSearching && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 max-h-48 overflow-y-auto">
                  {searchResults.map(item => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => handleSelectStock(item)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-indigo-50 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 font-mono">{item.symbol}</span>
                        <p className="text-[11px] text-slate-500 truncate">{item.company_name}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{item.sector}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {companyName && (
              <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
                Selected: {companyName}
              </span>
            )}
          </div>

          {/* Step 3: Buy Price & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Buy Price (Avg ₹)
              </label>
              <div className="relative">
                <span className="text-xs text-slate-400 absolute left-3.5 top-3 font-mono">₹</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  required
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="1322.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantity (Shares)
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Investment Amount Live Banner */}
          <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-700">Total Capital Invested:</span>
            </div>
            <span className="font-mono font-extrabold text-base text-indigo-700">
              ₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Step 4: Buy Date & Trade Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Purchase Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Holding Category
              </label>
              <select
                value={tradeType}
                onChange={(e) => setTradeType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="DELIVERY">Delivery / Long Term</option>
                <option value="SWING">Swing / Positional</option>
                <option value="INTRADAY">Intraday</option>
                <option value="F_AND_O">F&O / Derivatives</option>
              </select>
            </div>
          </div>

          {/* Step 5: Optional Target & Stop Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">
                Stop Loss (₹ Optional)
              </label>
              <input
                type="number"
                step="0.05"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="e.g. 1290.00"
                className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-xl text-xs font-mono text-rose-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                Target Price (₹ Optional)
              </label>
              <input
                type="number"
                step="0.05"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 1420.00"
                className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
            >
              <span>{loading ? 'Recording Trade...' : `Add to My Portfolio (${broker})`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
