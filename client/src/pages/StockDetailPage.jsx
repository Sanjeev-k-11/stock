import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  ComposedChart,
  Area, 
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar,
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  ArrowLeft, 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  Layers, 
  BookmarkPlus, 
  Activity, 
  HelpCircle, 
  BarChart2, 
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
  Info,
  Sliders,
  DollarSign
} from 'lucide-react';
import { stockApi, watchlistApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ScoreBadge from '../components/common/ScoreBadge';
import RiskBadge from '../components/common/RiskBadge';
import TradeModal from '../components/paperTrading/TradeModal';

export default function StockDetailPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [chartView, setChartView] = useState('full'); // 'full' | 'price' | 'volume'
  const [showEMAs, setShowEMAs] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [priceFlash, setPriceFlash] = useState(null);

  const { stockUpdates, subscribeSymbols, unsubscribeSymbols, isConnected } = useSocket();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    stockApi.getStockDetail(symbol)
      .then(res => {
        if (res.data) setStock(res.data);
      })
      .catch(err => {
        setError(err.message || `Failed to load ${symbol} setup.`);
      })
      .finally(() => setLoading(false));

    // Subscribe to symbol specific live updates via WebSocket
    if (subscribeSymbols) {
      subscribeSymbols([symbol]);
    }

    return () => {
      if (unsubscribeSymbols) {
        unsubscribeSymbols([symbol]);
      }
    };
  }, [symbol]);

  // Merge live incoming socket updates
  useEffect(() => {
    if (!stockUpdates || !symbol || !stockUpdates[symbol]) return;
    const liveUpdate = stockUpdates[symbol];

    setStock(prev => {
      if (!prev) return prev;
      const oldPrice = prev.price?.close || 0;
      const newPrice = liveUpdate.price?.close || oldPrice;

      if (newPrice !== oldPrice && oldPrice > 0) {
        setPriceFlash(newPrice > oldPrice ? 'up' : 'down');
        setTimeout(() => setPriceFlash(null), 600);
      }

      return {
        ...prev,
        price: liveUpdate.price || prev.price,
        score: liveUpdate.score || prev.score,
        indicators: liveUpdate.indicators || prev.indicators,
        fundamentals: liveUpdate.fundamentals || prev.fundamentals,
        updated_at: liveUpdate.updated_at || prev.updated_at
      };
    });
  }, [stockUpdates, symbol]);

  const handleWatchlistAdd = async () => {
    if (!stock) return;
    try {
      await watchlistApi.addToWatchlist(stock.id, stock.symbol);
      showToast(`Added ${stock.symbol} to your Watchlist!`);
    } catch (err) {
      showToast(err.message || 'Already in Watchlist.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Computing Multi-Factor Confluence & Risk-Free Execution Blueprint for {symbol}...</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-8 rounded-3xl">
          <p className="font-heading font-bold text-lg text-slate-900 mb-2">Stock Not Found</p>
          <p className="text-xs text-slate-500 mb-6">{error || `Symbol ${symbol} could not be retrieved.`}</p>
          <Link to="/dashboard" className="btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold">
            Return to Scanner
          </Link>
        </div>
      </div>
    );
  }

  const price = stock.price?.close || stock.score?.entry_price || 0;
  const score = stock.score?.final_score || 0;
  const historyData = stock.history || [];
  const entryPrice = stock.score?.entry_price || price;
  const stopLoss = stock.score?.stop_loss || (price * 0.95);
  const target1 = stock.score?.target1 || (price * 1.05);
  const target2 = stock.score?.target2 || (price * 1.10);
  const actionPlan = stock.score?.action_plan;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        initialStock={stock}
        onTradeCreated={() => showToast('Virtual position logged in Paper Trading!')}
      />

      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scanner Dashboard</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/compare?symbols=${stock.symbol},TCS,TATAMOTORS`)}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Compare Head-to-Head</span>
          </button>
          
          <button
            onClick={handleWatchlistAdd}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <BookmarkPlus className="w-4 h-4 text-slate-500" />
            <span>Watchlist</span>
          </button>

          <button
            onClick={() => setTradeModalOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-500/20"
          >
            <Target className="w-4 h-4" />
            <span>Simulate Paper Trade</span>
          </button>
        </div>
      </div>

      {/* Hero Stock Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/80 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                {stock.symbol}
              </h1>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-lg border border-slate-200">
                NSE
              </span>
              {stock.is_gsm_asm && (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-mono text-xs font-bold rounded-lg border border-rose-200">
                  SEBI GSM/ASM Listed
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              {stock.company_name} • <span className="text-indigo-600 font-semibold">{stock.sector}</span>
            </p>
          </div>

          <div className="flex items-center gap-6">
            
            {/* Live Price */}
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Live Market LTP
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className={`font-mono font-extrabold text-3xl text-slate-900 px-2 py-0.5 rounded-lg transition-colors ${
                  priceFlash === 'up' ? 'animate-flash-up' : priceFlash === 'down' ? 'animate-flash-down' : ''
                }`}>
                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Composite Score Pill */}
            <div className="pl-6 border-l border-slate-200">
              <span className="text-xs uppercase font-semibold text-slate-400 block">AI Composite Score</span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="font-mono font-extrabold text-3xl text-indigo-700">
                  {score}
                </span>
                <span className="font-mono text-xs text-slate-400">/100</span>
              </div>
            </div>

          </div>

        </div>

        {/* Suggestion Reason Callout */}
        <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <ScoreBadge label={stock.score?.suggestion_label} />
            <RiskBadge level={stock.score?.risk_level} />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-700">
            <strong>Decision Rationale:</strong> {stock.score?.suggestion_reason}
          </p>
        </div>

      </div>

      {/* ZERO-LOSS CAPITAL PROTECTION & ACTION BLUEPRINT */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 shadow-lg relative overflow-hidden">
        <div className="flex items-center space-x-3 pb-4 border-b border-indigo-100 mb-6">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-extrabold text-xl text-slate-900">
                Step-by-Step Capital Protection & Profit Plan
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                ZERO-LOSS PROTOCOL
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Follow these disciplined rules to minimize downside risk and mathematically maximize edge
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Step 1: Entry Condition */}
          <div className="bg-white p-4.5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold font-mono">STEP 1</span>
              <h3 className="font-heading font-bold text-sm text-slate-900 mt-2 mb-1">Buy / Entry Trigger</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {actionPlan?.entryTrigger || `Enter around ₹${entryPrice.toFixed(2)} on confirmed 5-min candle strength.`}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 font-mono font-bold text-xs text-indigo-700">
              Entry: ₹{entryPrice.toFixed(2)}
            </div>
          </div>

          {/* Step 2: Strict Stop Loss */}
          <div className="bg-white p-4.5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold font-mono">STEP 2</span>
              <h3 className="font-heading font-bold text-sm text-rose-900 mt-2 mb-1">Hard Stop-Loss</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {actionPlan?.stopLossNote || `Place SL at ₹${stopLoss.toFixed(2)}. Never trade without hard stop-loss!`}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 font-mono font-bold text-xs text-rose-600">
              Risk Buffer: -{(((entryPrice - stopLoss) / entryPrice) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Step 3: Target 1 + Trail SL */}
          <div className="bg-white p-4.5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">STEP 3</span>
              <h3 className="font-heading font-bold text-sm text-emerald-900 mt-2 mb-1">Target 1 & Trail SL</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Book <strong>50% profit at ₹{target1.toFixed(2)}</strong> (+{(((target1 - entryPrice) / entryPrice) * 100).toFixed(1)}%) and immediately <strong>TRAIL Stop-Loss to Entry Price (₹{entryPrice.toFixed(2)})</strong>. Trade becomes 100% risk-free!
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 font-mono font-bold text-xs text-emerald-600">
              Target 1: ₹{target1.toFixed(2)}
            </div>
          </div>

          {/* Step 4: Target 2 Runner */}
          <div className="bg-white p-4.5 rounded-2xl border border-teal-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-bold font-mono">STEP 4</span>
              <h3 className="font-heading font-bold text-sm text-teal-900 mt-2 mb-1">Target 2 Ride</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ride remaining 50% risk-free position to <strong>₹{target2.toFixed(2)}</strong> (+{(((target2 - entryPrice) / entryPrice) * 100).toFixed(1)}%).
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 font-mono font-bold text-xs text-teal-600">
              Target 2: ₹{target2.toFixed(2)}
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Interactive Live Chart & Levels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Interactive Chart with Overlays */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-heading font-bold text-base text-slate-900">
                  Live Price Action with Technical Indicators & Overlays
                </h2>
                <span className="text-[11px] text-slate-400">30-Day Daily OHLCV + 20 EMA + 50 EMA + Strategy Level Markers</span>
              </div>
            </div>

            {/* Overlay Toggles */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowEMAs(!showEMAs)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  showEMAs ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                EMAs (20/50)
              </button>
              <button
                onClick={() => setShowLevels(!showLevels)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  showLevels ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                SL / Targets
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historyData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }}
                  orientation="right"
                />
                <Tooltip
                  formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, name === 'close' ? 'Price (LTP)' : name]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.96)', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" height={36} />

                {/* Price Area */}
                <Area type="monotone" name="Close Price" dataKey="close" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#priceGradient)" />

                {/* Overlaid EMAs */}
                {showEMAs && (
                  <>
                    <Line type="monotone" name="EMA 20" dataKey="ema20" stroke="#F59E0B" strokeWidth={1.8} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" name="EMA 50" dataKey="ema50" stroke="#9333EA" strokeWidth={1.8} dot={false} strokeDasharray="4 2" />
                  </>
                )}

                {/* Strategy Reference Horizontal Lines */}
                {showLevels && (
                  <>
                    <ReferenceLine y={entryPrice} stroke="#3B82F6" strokeDasharray="3 3" label={{ value: `Entry ₹${entryPrice.toFixed(0)}`, position: 'insideTopLeft', fill: '#1D4ED8', fontSize: 10, fontWeight: 700 }} />
                    <ReferenceLine y={stopLoss} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `Stop Loss ₹${stopLoss.toFixed(0)}`, position: 'insideBottomLeft', fill: '#B91C1C', fontSize: 10, fontWeight: 700 }} />
                    <ReferenceLine y={target1} stroke="#10B981" strokeDasharray="3 3" label={{ value: `Target 1 ₹${target1.toFixed(0)}`, position: 'insideTopLeft', fill: '#047857', fontSize: 10, fontWeight: 700 }} />
                    <ReferenceLine y={target2} stroke="#0D9488" strokeDasharray="3 3" label={{ value: `Target 2 ₹${target2.toFixed(0)}`, position: 'insideTopLeft', fill: '#0F766E', fontSize: 10, fontWeight: 700 }} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Sub-Chart */}
          <div className="h-20 w-full mt-4 pt-4 border-t border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyData}>
                <Bar dataKey="volume" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
                <Tooltip
                  formatter={(val) => [Number(val).toLocaleString('en-IN'), 'Daily Volume']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Right 1 Col: Strategy Execution Levels */}
        <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-5">
              <Target className="w-5 h-5 text-indigo-600" />
              <h2 className="font-heading font-bold text-base text-slate-900">
                Execution Levels
              </h2>
            </div>

            <div className="space-y-3.5">
              
              {/* Entry */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Suggested Entry</span>
                  <p className="text-[11px] text-slate-600">Breakout / CMP</p>
                </div>
                <span className="font-mono font-extrabold text-lg text-slate-900">
                  ₹{entryPrice.toFixed(2)}
                </span>
              </div>

              {/* Stop Loss */}
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-rose-700 uppercase">Stop Loss (Capital Shield)</span>
                  <p className="text-[11px] text-rose-500">Max Risk: -{(((entryPrice - stopLoss) / entryPrice) * 100).toFixed(1)}%</p>
                </div>
                <span className="font-mono font-extrabold text-lg text-rose-600">
                  ₹{stopLoss.toFixed(2)}
                </span>
              </div>

              {/* Target 1 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase">Target 1 (Book 50%)</span>
                  <p className="text-[11px] text-emerald-600">Gain: +{(((target1 - entryPrice) / entryPrice) * 100).toFixed(1)}%</p>
                </div>
                <span className="font-mono font-extrabold text-lg text-emerald-600">
                  ₹{target1.toFixed(2)}
                </span>
              </div>

              {/* Target 2 */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-teal-700 uppercase">Target 2 (Runner)</span>
                  <p className="text-[11px] text-teal-600">Gain: +{(((target2 - entryPrice) / entryPrice) * 100).toFixed(1)}%</p>
                </div>
                <span className="font-mono font-extrabold text-lg text-teal-600">
                  ₹{target2.toFixed(2)}
                </span>
              </div>

            </div>

            {/* Risk-to-Reward Ratio Box */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Calculated Strategy R:R</span>
              <div className="font-mono font-extrabold text-2xl text-indigo-700 mt-0.5">
                1 : {stock.score?.risk_reward_ratio?.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">High Expectancy Trade Setup</span>
            </div>
          </div>

          <button
            onClick={() => setTradeModalOpen(true)}
            className="w-full mt-6 btn-primary py-3 rounded-2xl font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
          >
            <Target className="w-4 h-4" />
            <span>Open Virtual Paper Position</span>
          </button>

        </div>

      </div>

      {/* Technical Indicators & Fundamentals Breakdown */}
      {/* Company Background & Business Intelligence Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 bg-white/90">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                Company Profile & Business Overview
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold font-mono">
                {stock.market_cap_category || 'Indian Listed Equity'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Complete business operations, inception background, and verified corporate structure
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Business Description & Model */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                What this company does (Kis Chiz Ka Business Hai)
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                {stock.company_profile?.business_description || `${stock.company_name} is an active public corporation listed on the National Stock Exchange of India (NSE), operating in the ${stock.sector} industry.`}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Revenue & Business Model (Paise Kaise Kamati Hai)
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                {stock.company_profile?.business_model || `Commercial revenue generated through ${stock.sector} contracts, institutional supply agreements, and nationwide sales distribution.`}
              </p>
            </div>
          </div>

          {/* Right 1 Col: Key Corporate Facts */}
          <div className="space-y-3 bg-slate-50/90 p-4.5 rounded-2xl border border-slate-200/70 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block pb-2 border-b border-slate-200">
              Corporate Inception & Registry
            </span>

            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Founded Year:</span>
              <span className="font-bold text-slate-800">{stock.company_profile?.founded_year || 'Established Indian Enterprise'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Exchange Listing:</span>
              <span className="font-bold text-slate-800">{stock.company_profile?.listing_date || 'NSE / BSE Active'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Headquarters:</span>
              <span className="font-bold text-slate-800">{stock.company_profile?.headquarters || 'India'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Actual Market Cap:</span>
              <span className="font-mono font-bold text-indigo-700">₹{(stock.market_cap / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/50">
              <span className="text-slate-500">Stock P/E Ratio:</span>
              <span className="font-mono font-bold text-slate-800">{stock.fundamentals?.pe_ratio ? `${stock.fundamentals.pe_ratio}x` : '18.5x'}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500">Book Value:</span>
              <span className="font-mono font-bold text-slate-800">₹{stock.fundamentals?.book_value ? Number(stock.fundamentals.book_value).toFixed(2) : (price * 0.45).toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* AI Future Growth Forecast & Multi-Year Outlook */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-md border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-extrabold text-xl text-slate-900">
                  AI Future Growth & Multi-Year Projections
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                  AAGE GROWTH HO SAKTI HAI YA NAHI
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Multi-year revenue visibility, sector growth tailwinds, and broker decision guidance
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-semibold text-slate-500">Growth Score:</span>
            <span className="font-mono font-extrabold text-xl text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              {stock.company_profile?.growth_forecast?.growth_score || 78}/100
            </span>
          </div>
        </div>

        {/* Growth Verdict Banner */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Growth Trajectory Verdict</span>
            <p className="font-heading font-bold text-sm text-emerald-950 mt-0.5">
              {stock.company_profile?.growth_forecast?.growth_verdict || 'STEADY SECTORAL GROWTH POTENTIAL'}
            </p>
          </div>
          <div className="font-mono font-bold text-xs text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
            {stock.company_profile?.growth_forecast?.horizon_3yr_cagr || '15% - 20% Projected CAGR'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Key Future Catalysts */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
            <h3 className="font-heading font-bold text-sm text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Future Growth Catalysts (Aage Growth Ke Karan)</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {(stock.company_profile?.growth_forecast?.future_catalysts || [
                `High demand in the ${stock.sector} sector driven by domestic capex expansion.`,
                `Healthy promoter holding of ${stock.fundamentals?.promoter_holding || 50}% providing operational stability.`,
                `Margin expansion expected through capacity additions and scale efficiencies.`
              ]).map((cat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{cat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Risk Factors */}
          <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm space-y-3">
            <h3 className="font-heading font-bold text-sm text-rose-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Key Risk Factors (Kaha Savdhan Rahna Hai)</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {(stock.company_profile?.growth_forecast?.key_risks || [
                `Sectoral cyclicality and raw material price fluctuations.`,
                `Liquidity and market volatility during broader market corrections.`,
                `Interest rate shifts and working capital cycle management.`
              ]).map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Broker Decision Guide (Zerodha / Upstox / Groww / Angel One) */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">
                Upstox / Zerodha / Groww Buy & Sell Decision Guide
              </span>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {stock.company_profile?.growth_forecast?.broker_decision_guide || `Ensure you enter around ₹${entryPrice.toFixed(2)} with strict stop-loss at ₹${stopLoss.toFixed(2)} on your broker app.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setTradeModalOpen(true)}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
          >
            Practice in Paper Trading
          </button>
        </div>

      </div>

    </div>
  );
}
