import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  X, 
  Award, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Target,
  BarChart2,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { stockApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ScoreBadge from '../components/common/ScoreBadge';
import RiskBadge from '../components/common/RiskBadge';
import LiveIndicator from '../components/common/LiveIndicator';

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allStocks, setAllStocks] = useState([]);
  const [selectedSymbols, setSelectedSymbols] = useState(['RELIANCE', 'TCS', 'TATAMOTORS']);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const { subscribeSymbols, unsubscribeSymbols, liveUpdatesMap } = useSocket();

  // Fetch all stocks for autocomplete
  useEffect(() => {
    stockApi.getStocks()
      .then(res => {
        if (res.data) setAllStocks(res.data);
      })
      .catch(() => {});
  }, []);

  // Initialize from query param if available
  useEffect(() => {
    const symbolsParam = searchParams.get('symbols');
    if (symbolsParam) {
      const syms = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (syms.length >= 2 && syms.length <= 4) {
        setSelectedSymbols(syms);
      }
    }
  }, [searchParams]);

  // Subscribe to specific comparison symbols via WebSocket
  useEffect(() => {
    if (selectedSymbols.length > 0) {
      subscribeSymbols(selectedSymbols);
    }
    return () => {
      if (selectedSymbols.length > 0) {
        unsubscribeSymbols(selectedSymbols);
      }
    };
  }, [selectedSymbols, subscribeSymbols, unsubscribeSymbols]);

  // Load comparison data whenever selectedSymbols change
  useEffect(() => {
    if (selectedSymbols.length >= 2) {
      setLoading(true);
      stockApi.compareStocks(selectedSymbols.join(','))
        .then(res => {
          if (res.data) setComparisonData(res.data);
        })
        .catch(err => {
          console.error('Comparison error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedSymbols]);

  // Live WebSocket update merge for compared stocks
  useEffect(() => {
    if (!liveUpdatesMap || !comparisonData?.stocks) return;

    setComparisonData(prev => {
      if (!prev || !prev.stocks) return prev;
      let hasChanges = false;
      const updated = prev.stocks.map(st => {
        const live = liveUpdatesMap[st.symbol.toUpperCase()];
        if (live && (live.price?.close !== st.price?.close || live.score?.final_score !== st.score?.final_score)) {
          hasChanges = true;
          return {
            ...st,
            ...live,
            _flashDirection: live.price?.close > (st.price?.close || 0) ? 'up' : 'down',
            _updatedAt: Date.now()
          };
        }
        return st;
      });

      return hasChanges ? { ...prev, stocks: updated } : prev;
    });
  }, [liveUpdatesMap]);

  const handleAddStock = (symbol) => {
    const clean = symbol.toUpperCase();
    if (selectedSymbols.includes(clean)) return;
    if (selectedSymbols.length >= 4) {
      alert('You can compare a maximum of 4 stocks at a time.');
      return;
    }
    const newSymbols = [...selectedSymbols, clean];
    setSelectedSymbols(newSymbols);
    setSearchParams({ symbols: newSymbols.join(',') });
    setSearchQuery('');
    setSearchSuggestions([]);
  };

  const handleRemoveStock = (symbol) => {
    if (selectedSymbols.length <= 2) {
      alert('At least 2 stocks are required for comparison.');
      return;
    }
    const newSymbols = selectedSymbols.filter(s => s !== symbol);
    setSelectedSymbols(newSymbols);
    setSearchParams({ symbols: newSymbols.join(',') });
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      const matches = allStocks.filter(s => 
        s.symbol.toLowerCase().includes(val.toLowerCase()) || 
        s.company_name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setSearchSuggestions(matches);
    } else {
      setSearchSuggestions([]);
    }
  };

  const stocks = comparisonData?.stocks || [];
  const topStockSymbol = comparisonData?.topStockSymbol;
  const topStockReason = comparisonData?.topStockReason;
  const topStock = comparisonData?.topStock;
  const hasStrongCandidate = comparisonData?.hasStrongCandidate;
  const flaggedStocks = comparisonData?.flaggedStocks || [];

  // Prepare visual comparison chart dataset
  const chartDataset = stocks.map(s => ({
    name: s.symbol,
    'AI Composite Score': s.score?.final_score || 0,
    'Trend Strength': s.score?.trend_score || 0,
    'Momentum': s.score?.momentum_score || 0,
    'Volume Quality': s.score?.volume_score || 0,
    'Support Alignment': s.score?.risk_score || 0,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
              Interactive Stock Comparison Matrix
            </h1>
            <LiveIndicator />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compare 2 to 4 Indian equities with visual multi-factor score charts, head-to-head metrics, and automated decision verdicts
          </p>
        </div>

        {/* Stock Selector Box */}
        <div className="relative w-full md:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Add stock to compare (e.g. INFY, SBIN)..."
              disabled={selectedSymbols.length >= 4}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 glass-dropdown rounded-2xl z-30 overflow-hidden shadow-xl">
              {searchSuggestions.map(s => (
                <button
                  key={s.symbol}
                  onClick={() => handleAddStock(s.symbol)}
                  className="w-full px-4 py-2.5 text-left text-xs hover:bg-indigo-50 flex items-center justify-between border-b border-slate-100 last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-slate-900">{s.symbol}</span>
                    <span className="text-slate-500 text-[11px] block truncate">{s.company_name}</span>
                  </div>
                  <span className="font-mono text-indigo-600 font-semibold">₹{s.price?.close}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Stock Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Comparing ({selectedSymbols.length}/4):
        </span>
        {selectedSymbols.map(sym => (
          <div
            key={sym}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all shadow-sm ${
              sym === topStockSymbol
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25'
                : 'bg-white border border-slate-200 text-slate-800'
            }`}
          >
            <span>{sym}</span>
            {sym === topStockSymbol && (
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-sans font-semibold">★ Winner</span>
            )}
            <button
              onClick={() => handleRemoveStock(sym)}
              className="p-0.5 rounded-full hover:bg-black/10 text-slate-400 hover:text-white"
              title="Remove from comparison"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* VISUAL MULTI-FACTOR COMPARISON CHART */}
      {stocks.length >= 2 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-heading font-bold text-base text-slate-900">
                  Visual Factor Comparison Chart (0-100 Scale)
                </h2>
                <span className="text-xs text-slate-500">Compare Trend, Momentum, Volume & AI Composite Scores side-by-side</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
              Higher = Stronger Setup
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700, fill: '#1E293B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="AI Composite Score" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Trend Strength" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Momentum" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Volume Quality" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* EASY-TO-UNDERSTAND COMPARISON VERDICT BOX */}
      {comparisonData && (
        <div className="space-y-4">
          
          {hasStrongCandidate ? (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 shadow-md">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-indigo-100 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shrink-0 shadow-md shadow-indigo-500/25">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      CLEAR WINNING CANDIDATE
                    </span>
                    <h3 className="font-heading font-extrabold text-xl text-slate-900 mt-0.5">
                      {topStockSymbol} is the Top Pick in this Comparison
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Composite Score:</span>
                  <span className="font-mono font-extrabold text-2xl text-indigo-700">
                    {topStock?.score?.final_score}/100
                  </span>
                </div>
              </div>

              {/* Simple Decision Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                <div className="p-3.5 rounded-2xl bg-white border border-indigo-100 shadow-sm">
                  <span className="font-bold text-slate-800 block mb-1">🎯 Why Choose {topStockSymbol}?</span>
                  <p className="text-slate-600 leading-relaxed">
                    {topStockReason}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                  <span className="font-bold text-emerald-800 block mb-1">🛡️ Capital Protection Plan</span>
                  <p className="text-slate-600 leading-relaxed">
                    Entry: ₹{topStock?.score?.entry_price?.toFixed(1)} | Stop Loss: ₹{topStock?.score?.stop_loss?.toFixed(1)} | Target: ₹{topStock?.score?.target1?.toFixed(1)} (R:R 1:{topStock?.score?.risk_reward_ratio?.toFixed(2)}).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-purple-800 block mb-1">⚡ Quick Action</span>
                    <p className="text-slate-600">
                      View full candlestick breakdown & indicators or open a simulated paper trade.
                    </p>
                  </div>
                  <Link
                    to={`/stock/${topStockSymbol}`}
                    className="mt-3 btn-primary py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1"
                  >
                    <span>Analyze Full Setup</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-200 bg-amber-50/70 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0 shadow-md shadow-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-amber-950">
                    No Strong Candidate Found in this Comparison
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed mt-1">
                    {topStockReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Flagged / AVOID Stocks Callout */}
          {flaggedStocks.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-rose-200/90 bg-rose-50/50">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Risk Exclusions & Avoid Reasons in this Comparison
              </span>
              <ul className="space-y-1.5">
                {flaggedStocks.map(f => (
                  <li key={f.symbol} className="text-xs text-rose-900">
                    <strong>{f.symbol}</strong>: {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {/* Comparison Matrix Detailed Table */}
      {stocks.length >= 2 && (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Table Column Headers */}
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-5 text-slate-500 font-semibold uppercase text-[11px] w-56">
                    Detailed Dimension
                  </th>
                  {stocks.map(s => {
                    const isTop = s.symbol === topStockSymbol;
                    return (
                      <th
                        key={s.symbol}
                        className={`py-4 px-5 text-center min-w-[200px] transition-colors ${
                          isTop ? 'bg-indigo-50/70 border-x-2 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <Link
                            to={`/stock/${s.symbol}`}
                            className="font-heading font-extrabold text-lg text-slate-900 hover:text-indigo-600"
                          >
                            {s.symbol}
                          </Link>
                          <span className="text-[11px] text-slate-500 font-normal truncate max-w-[170px]">
                            {s.company_name}
                          </span>
                          {isTop && (
                            <span className="mt-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px]">
                              TOP RANKED
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-slate-100">
                
                {/* 1. Composite Score */}
                <tr className="bg-white/40">
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Composite AI Score</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center font-mono font-extrabold text-base ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500 text-indigo-700' : 'text-slate-900'}`}>
                      {s.score?.final_score} / 100
                    </td>
                  ))}
                </tr>

                {/* 2. Suggestion Label */}
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Decision Suggestion</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      <div className="flex justify-center">
                        <ScoreBadge label={s.score?.suggestion_label} size="sm" />
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 3. Risk Level */}
                <tr className="bg-white/40">
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Risk Assessment</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      <RiskBadge level={s.score?.risk_level} />
                    </td>
                  ))}
                </tr>

                {/* 4. Current Price */}
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Current Price (LTP)</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center font-mono font-bold text-slate-800 ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      ₹{s.price?.close?.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* 5. RSI */}
                <tr className="bg-white/40">
                  <td className="py-3.5 px-5 font-semibold text-slate-700">RSI (14 Period)</td>
                  {stocks.map(s => {
                    const rsi = s.indicators?.rsi || 50;
                    return (
                      <td key={s.symbol} className={`py-3.5 px-5 text-center font-mono font-semibold ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                        <span className={rsi > 70 ? 'text-rose-600' : rsi < 35 ? 'text-amber-600' : 'text-emerald-600'}>
                          {rsi.toFixed(1)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Volume Trend */}
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Volume Trend</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center capitalize font-medium text-slate-700 ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      {s.indicators?.volume_trend?.replace('_', ' ')}
                    </td>
                  ))}
                </tr>

                {/* 7. Risk:Reward Ratio */}
                <tr className="bg-white/40">
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Risk:Reward Setup</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center font-mono font-bold text-indigo-700 ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      1 : {s.score?.risk_reward_ratio?.toFixed(2)}
                    </td>
                  ))}
                </tr>

                {/* 8. Strategy Levels */}
                <tr>
                  <td className="py-3.5 px-5 font-semibold text-slate-700">Entry / Stop Loss / T1</td>
                  {stocks.map(s => (
                    <td key={s.symbol} className={`py-3.5 px-5 text-center font-mono text-[11px] ${s.symbol === topStockSymbol ? 'bg-indigo-50/50 border-x-2 border-indigo-500' : ''}`}>
                      <div>Entry: ₹{s.score?.entry_price?.toFixed(1)}</div>
                      <div className="text-slate-500">
                        SL: <span className="text-rose-600">₹{s.score?.stop_loss?.toFixed(1)}</span> | T1: <span className="text-emerald-600">₹{s.score?.target1?.toFixed(1)}</span>
                      </div>
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
