import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  LayoutGrid, 
  Table as TableIcon, 
  Filter, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Layers,
  Award
} from 'lucide-react';
import { stockApi, watchlistApi } from '../services/api';
import { useLiveStocks } from '../hooks/useLiveStocks';
import StockCard from '../components/dashboard/StockCard';
import StockTable from '../components/dashboard/StockTable';
import FilterSidebar from '../components/dashboard/FilterSidebar';
import DisclaimerModal from '../components/common/DisclaimerModal';
import TradeModal from '../components/paperTrading/TradeModal';
import LiveIndicator from '../components/common/LiveIndicator';

export default function DashboardPage() {
  const [initialStocks, setInitialStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filter States
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const searchDropdownRef = useRef(null);

  const [selectedSector, setSelectedSector] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [excludeSurveillance, setExcludeSurveillance] = useState(false);
  const [sortBy, setSortBy] = useState('final_score');
  const [sortOrder, setSortOrder] = useState('desc');

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Trade Modal State
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedStockForTrade, setSelectedStockForTrade] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const filterOptions = useMemo(() => ({
    search,
    sector: selectedSector,
    suggestion: selectedSuggestion,
    riskLevel: selectedRisk,
    minPrice,
    maxPrice,
    minScore,
    excludeSurveillance,
    sortBy,
    sortOrder
  }), [search, selectedSector, selectedSuggestion, selectedRisk, minPrice, maxPrice, minScore, excludeSurveillance, sortBy, sortOrder]);

  // High-frequency WebSocket Live Stocks Hook
  const { stocks = [] } = useLiveStocks(initialStocks, filterOptions);

  const fetchInitialStocks = () => {
    setLoading(true);
    stockApi.getStocks({
      sector: selectedSector,
      suggestion: selectedSuggestion,
      riskLevel: selectedRisk,
      minPrice,
      maxPrice,
      minScore,
      excludeSurveillance
    })
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          setInitialStocks(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to load initial stocks:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInitialStocks();
    stockApi.getSectors().then(res => {
      if (res.data) setSectors(res.data);
    }).catch(() => {});
  }, []);

  // On-demand search query for any stock, crypto, commodity across all broker feeds
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(() => {
      // 1. Fetch suggestions dropdown list
      stockApi.searchStocks(search.trim())
        .then(res => {
          if (res.data && Array.isArray(res.data)) {
            setSuggestions(res.data);
            setIsDropdownOpen(res.data.length > 0);
          }
        })
        .catch(() => {});

      // 2. Fetch & insert into scanner list
      stockApi.getStocks({ search: search.trim() })
        .then(res => {
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            setInitialStocks(prev => {
              const existingMap = new Set(prev.map(p => p.symbol));
              const newItems = res.data.filter(item => !existingMap.has(item.symbol));
              return newItems.length > 0 ? [...newItems, ...prev] : prev;
            });
          }
        })
        .catch(() => {})
        .finally(() => setIsSearchingOnline(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectSuggestion = (item) => {
    setSearch(item.symbol);
    setIsDropdownOpen(false);
    // Fetch and guarantee it's in initialStocks
    stockApi.getStocks({ search: item.symbol })
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setInitialStocks(prev => {
            const existingMap = new Set(prev.map(p => p.symbol));
            const newItems = res.data.filter(it => !existingMap.has(it.symbol));
            return newItems.length > 0 ? [...newItems, ...prev] : prev;
          });
        }
      })
      .catch(() => {});
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedSector('');
    setSelectedSuggestion('');
    setSelectedRisk('');
    setSelectedPriceRange('all');
    setMinPrice('');
    setMaxPrice('');
    setMinScore(0);
    setExcludeSurveillance(false);
    setSortBy('final_score');
    setSortOrder('desc');
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleQuickTrade = (stock) => {
    setSelectedStockForTrade(stock);
    setTradeModalOpen(true);
  };

  const handleWatchlistToggle = async (stock) => {
    try {
      await watchlistApi.addToWatchlist(stock.id, stock.symbol);
      showToast(`Added ${stock.symbol} to your Watchlist!`);
    } catch (err) {
      showToast(err.message || 'Already in Watchlist.');
    }
  };

  // Metrics
  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const strongCount = safeStocks.filter(s => s.score?.suggestion_label === 'STRONG_CANDIDATE').length;
  const watchCount = safeStocks.filter(s => s.score?.suggestion_label === 'WATCH').length;
  const avgScore = safeStocks.length > 0 
    ? (safeStocks.reduce((acc, s) => acc + (s.score?.final_score || 0), 0) / safeStocks.length).toFixed(1)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Disclaimer Modal */}
      <DisclaimerModal />

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        initialStock={selectedStockForTrade}
        onTradeCreated={() => showToast('Virtual Paper Trade position opened!')}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold font-mono border border-indigo-200/60">
              LIVE SCANNER
            </span>
            <LiveIndicator />
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 mt-1">
            Indian Equities Screener
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Streaming {stocks.length} NSE/BSE securities using composite AI momentum, volume & risk models
          </p>
        </div>

        {/* Metric Badges */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="bg-white/80 border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm min-w-[120px]">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Strong Setups</span>
            <div className="flex items-baseline space-x-1">
              <span className="font-mono font-extrabold text-lg text-emerald-600">{strongCount}</span>
              <span className="text-[11px] text-slate-400">stocks (≥80)</span>
            </div>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm min-w-[120px]">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Watchlist</span>
            <div className="flex items-baseline space-x-1">
              <span className="font-mono font-extrabold text-lg text-amber-600">{watchCount}</span>
              <span className="text-[11px] text-slate-400">stocks (60-79)</span>
            </div>
          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm min-w-[120px]">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Average Score</span>
            <div className="flex items-baseline space-x-1">
              <span className="font-mono font-extrabold text-lg text-indigo-700">{avgScore}</span>
              <span className="text-[11px] text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scanner Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1">
          <FilterSidebar
            sectors={sectors}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            selectedSuggestion={selectedSuggestion}
            setSelectedSuggestion={setSelectedSuggestion}
            selectedRisk={selectedRisk}
            setSelectedRisk={setSelectedRisk}
            selectedPriceRange={selectedPriceRange}
            setSelectedPriceRange={setSelectedPriceRange}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            minScore={minScore}
            setMinScore={setMinScore}
            excludeSurveillance={excludeSurveillance}
            setExcludeSurveillance={setExcludeSurveillance}
            onReset={handleResetFilters}
          />
        </div>

        {/* Right Stock Content Area */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Search, Sort, and View Toggle Bar */}
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm relative z-40">
            
            {/* Search Bar with Live Suggestions Dropdown */}
            <div className="relative w-full sm:w-96 z-50" ref={searchDropdownRef}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setIsDropdownOpen(true);
                }}
                placeholder="Search any stock, crypto, commodity (e.g. OLA, Blinkit, Gold, BTC)..."
                className="w-full pl-10 pr-10 py-2 bg-white/95 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
              />
              {isSearchingOnline && (
                <div className="absolute right-3.5 top-2.5 pointer-events-none">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Suggestions Dropdown */}
              {isDropdownOpen && suggestions.length > 0 && (
                <div 
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 py-2 z-[9999] max-h-80 overflow-y-auto ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[320px] sm:min-w-[400px]"
                  style={{ backgroundColor: '#ffffff', opacity: 1 }}
                >
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span>Live Market Matches</span>
                    <span className="text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-bold">{suggestions.length} found</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {suggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50/90 transition-all flex items-center justify-between group cursor-pointer bg-white"
                        style={{ backgroundColor: '#ffffff' }}
                      >
                        <div className="flex flex-col min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 font-mono text-sm">
                              {item.symbol}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              item.exchange === 'NSE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              item.exchange === 'BSE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              item.exchange === 'CRYPTO' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              item.exchange === 'COMMODITIES' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {item.exchange}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 truncate mt-0.5">
                            {item.company_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-700 font-medium whitespace-nowrap border border-slate-200/60">
                          {item.sector || 'Equities'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort & View Switches */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
              
              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/90 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="final_score">Sort: AI Score (Highest)</option>
                <option value="rsi">Sort: RSI Indicator</option>
                <option value="risk_reward">Sort: Risk-to-Reward</option>
                <option value="price">Sort: Price (LTP)</option>
                <option value="symbol">Sort: Stock Symbol</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                  title="Compact Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchInitialStocks}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors shadow-sm"
                title="Refresh Market Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>

            </div>

          </div>

          {/* Stock Display List */}
          {loading ? (
            <div className="glass-panel p-16 rounded-3xl text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Scanning Indian Equities Universe...</p>
            </div>
          ) : stocks.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl text-center">
              <p className="font-heading font-bold text-slate-800 text-lg">No Stocks Found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No equities matched your active combination of filters and threshold sliders.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 btn-primary px-5 py-2 rounded-xl text-xs font-semibold"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {stocks.map(stock => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onQuickTrade={handleQuickTrade}
                  onWatchlistToggle={handleWatchlistToggle}
                />
              ))}
            </div>
          ) : (
            <StockTable
              stocks={stocks}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onQuickTrade={handleQuickTrade}
            />
          )}

        </div>

      </div>

    </div>
  );
}
