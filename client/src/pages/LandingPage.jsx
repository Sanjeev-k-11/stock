import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown,
  ShieldCheck, 
  Sliders, 
  Layers, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Zap,
  Target,
  FileCheck,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Search,
  Activity,
  Cpu,
  Coins,
  Flame,
  Building2,
  HelpCircle,
  Award,
  BookOpen,
  LineChart,
  Percent,
  Clock,
  Lock,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { stockApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ScoreBadge from '../components/common/ScoreBadge';

// Initial benchmark indices baseline (will be immediately replaced with real live stream quotes)
const INITIAL_MARKET_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50', value: '23,897.70', price: 23897.70, change: '-182.70 (-0.76%)', positive: false },
  { symbol: '^NSEBANK', name: 'BANK NIFTY', value: '57,369.65', price: 57369.65, change: '-655.30 (-1.13%)', positive: false },
  { symbol: '^BSESN', name: 'SENSEX', value: '76,515.43', price: 76515.43, change: '-441.84 (-0.57%)', positive: false },
  { symbol: '^CNXIT', name: 'NIFTY IT', value: '41,890.65', price: 41890.65, change: '+125.40 (+0.30%)', positive: true },
  { symbol: '^CNXAUTO', name: 'NIFTY AUTO', value: '25,410.10', price: 25410.10, change: '+215.50 (+0.86%)', positive: true },
  { symbol: 'GC=F', name: 'GOLD (MCX)', value: '$4,476.60', price: 4476.60, change: '+45.50 (+1.03%)', positive: true },
  { symbol: 'CL=F', name: 'CRUDE OIL', value: '$91.48', price: 91.48, change: '+5.72 (+6.67%)', positive: true },
  { symbol: 'BTC-USD', name: 'BITCOIN', value: '$79,969.80', price: 79969.80, change: '+2,566.18 (+3.32%)', positive: true },
  { symbol: 'USDINR=X', name: 'USD/INR', value: '₹94.49', price: 94.49, change: '-0.89 (-0.93%)', positive: false },
  { symbol: 'RELIANCE.NS', name: 'RELIANCE', value: '₹1,322.00', price: 1322.00, change: '+45.00 (+3.52%)', positive: true },
  { symbol: 'TCS.NS', name: 'TCS', value: '₹4,180.50', price: 4180.50, change: '+28.30 (+0.68%)', positive: true },
  { symbol: 'HDFCBANK.NS', name: 'HDFC BANK', value: '₹1,648.20', price: 1648.20, change: '-12.40 (-0.75%)', positive: false }
];

// Master sector categories for public preview tab selector
const SECTOR_CATEGORIES = [
  { id: 'all', label: 'All Equities', icon: Activity, count: '280+' },
  { id: 'Energy & Power', label: 'Energy & Oil', icon: Flame, count: '40+' },
  { id: 'Banking & Financials', label: 'Banking & NBFC', icon: Building2, count: '43+' },
  { id: 'Automobile & EV', label: 'Auto & EV', icon: Zap, count: '29+' },
  { id: 'Information Technology', label: 'Tech & IT', icon: Cpu, count: '58+' },
  { id: 'Pharma & Healthcare', label: 'Pharma & Bio', icon: ShieldCheck, count: '26+' },
  { id: 'Infrastructure & Capital Goods', label: 'Infra & Defence', icon: Layers, count: '53+' },
];

export default function LandingPage() {
  const [marketPulse, setMarketPulse] = useState(INITIAL_MARKET_INDICES);
  const [pulseFlashes, setPulseFlashes] = useState({});
  const [previewStocks, setPreviewStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [priceFlashes, setPriceFlashes] = useState({});
  const [selectedSector, setSelectedSector] = useState('all');
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeScorePillar, setActiveScorePillar] = useState(0);

  // Interactive Paper Trading ROI Simulator State
  const [simCapital, setSimCapital] = useState(100000);
  const [simRiskPercent, setSimRiskPercent] = useState(2);
  const [simRRRatio, setSimRRRatio] = useState(2.5);

  const { stockUpdates, isConnected } = useSocket();

  // 1. Fetch 100% authentic REAL LIVE market pulse from exchange feeds
  const fetchMarketPulse = () => {
    stockApi.getMarketPulse()
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setMarketPulse(prev => {
            const newFlashes = {};
            res.data.forEach(item => {
              const old = prev.find(p => p.symbol === item.symbol);
              const oldPrice = old?.price || 0;
              const newPrice = item.price || 0;
              if (oldPrice > 0 && newPrice !== oldPrice) {
                newFlashes[item.symbol] = newPrice > oldPrice ? 'up' : 'down';
              }
            });
            if (Object.keys(newFlashes).length > 0) {
              setPulseFlashes(newFlashes);
              setTimeout(() => setPulseFlashes({}), 1000);
            }
            return res.data;
          });
        }
      })
      .catch(() => {});
  };

  const fetchPreview = () => {
    stockApi.getPreviewStocks()
      .then(res => {
        if (res.data) {
          const fresh = res.data;
          setPreviewStocks(prev => {
            const newFlashes = {};
            fresh.forEach(item => {
              const old = prev.find(p => p.symbol === item.symbol);
              const oldPrice = old?.price?.close || 0;
              const newPrice = item.price?.close || 0;
              if (oldPrice > 0 && newPrice !== oldPrice) {
                newFlashes[item.symbol] = newPrice > oldPrice ? 'up' : 'down';
              }
            });
            if (Object.keys(newFlashes).length > 0) {
              setPriceFlashes(newFlashes);
              setTimeout(() => setPriceFlashes({}), 800);
            }
            return fresh;
          });
          setLastUpdated(new Date());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Polling for live stock previews & live market pulse
  useEffect(() => {
    fetchMarketPulse();
    fetchPreview();
    const pulseInterval = setInterval(fetchMarketPulse, 3500);
    const stockInterval = setInterval(fetchPreview, 5000);
    return () => {
      clearInterval(pulseInterval);
      clearInterval(stockInterval);
    };
  }, []);

  // Merge instant WebSocket stock updates
  useEffect(() => {
    if (!stockUpdates || Object.keys(stockUpdates).length === 0) return;

    setPreviewStocks(prev => {
      let changed = false;
      const updated = prev.map(stock => {
        if (stockUpdates[stock.symbol]) {
          const live = stockUpdates[stock.symbol];
          const oldPrice = stock.price?.close || 0;
          const newPrice = live.price?.close || oldPrice;
          if (newPrice !== oldPrice) {
            changed = true;
            setPriceFlashes(f => ({ ...f, [stock.symbol]: newPrice > oldPrice ? 'up' : 'down' }));
            setTimeout(() => {
              setPriceFlashes(f => {
                const copy = { ...f };
                delete copy[stock.symbol];
                return copy;
              });
            }, 800);
          }
          return {
            ...stock,
            price: live.price || stock.price,
            score: live.score || stock.score
          };
        }
        return stock;
      });
      return changed ? updated : prev;
    });
  }, [stockUpdates]);

  // Filter stocks by selected sector tab (Strictly limited to 5 items on public page)
  const filteredStocks = selectedSector === 'all' 
    ? previewStocks.slice(0, 5) 
    : previewStocks.filter(s => s.sector?.toLowerCase().includes(selectedSector.toLowerCase()) || (selectedSector === 'Infrastructure & Capital Goods' && (s.sector?.includes('Infrastructure') || s.sector?.includes('Defence')))).slice(0, 5);


  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // 4 AI Scoring Pillars breakdown details
  const SCORING_PILLARS = [
    {
      title: 'Trend & Moving Average Alignment',
      weight: '35% Weight',
      icon: TrendingUp,
      color: 'from-blue-600 to-indigo-600',
      description: 'Evaluates price alignment above 20 EMA, 50 EMA, and 200 EMA to verify multi-timeframe structural bullishness. Eliminates false breakouts and counter-trend traps.',
      metrics: ['20 / 50 / 200 EMA Golden Cross', 'ADX Trend Strength > 25', 'MACD Zero-Line Signal Crossover']
    },
    {
      title: 'Volume Surge & Institutional Flow',
      weight: '25% Weight',
      icon: BarChart3,
      color: 'from-purple-600 to-pink-600',
      description: 'Scans for anomalous volume expansions 1.5x – 3x above the 20-day SMA, indicating institutional smart money participation and delivery accumulation.',
      metrics: ['20-day Volume SMA Multiple', 'On-Balance Volume (OBV) Trend', 'Delivery % vs Traded Quantity']
    },
    {
      title: 'Mean Reversion & Volatility Bands',
      weight: '20% Weight',
      icon: Sliders,
      color: 'from-emerald-600 to-teal-600',
      description: 'Normalizes 14-period RSI to detect optimal pullbacks into support zones (RSI 45–62) rather than chasing overbought climax traps (RSI > 80).',
      metrics: ['14-period RSI Momentum Squeeze', 'Bollinger Band Contraction & Expansion', 'ATR (Average True Range) Dynamic Volatility']
    },
    {
      title: 'Structural Safety & SEBI Filters',
      weight: '20% Weight',
      icon: ShieldCheck,
      color: 'from-amber-600 to-orange-600',
      description: 'Hard rejection filter for SEBI GSM / ASM surveillance lists, micro-cap illiquidity (< ₹500 Cr), extreme promoter pledges, and debt-heavy balances.',
      metrics: ['SEBI GSM & ASM List Filtering', 'Promoter Holding Stability > 45%', 'Debt-to-Equity & Liquidity Gate']
    }
  ];

  // FAQ Items
  const FAQ_ITEMS = [
    {
      q: 'How does StockSense calculate the 0–100 AI Composite Score?',
      a: 'The 0–100 score is a multi-factor mathematical synthesis of Trend Alignment (35%), Volume Expansion (25%), Mean Reversion Momentum (20%), and Structural Risk Safety (20%). It is updated continuously every 5 seconds without black-box opacity.'
    },
    {
      q: 'Is StockSense compliant with SEBI regulations for retail tools?',
      a: 'Yes. StockSense operates strictly as an educational algorithmic research and decision-support platform under SEBI guidelines. We do not offer registered portfolio management, tip sheets, or execution broking. All metrics, ATR levels, and paper trades are for analytical backtesting and study.'
    },
    {
      q: 'How many Indian companies and sectors are tracked in the database?',
      a: 'Over 280+ liquid NSE and BSE companies spanning 15 master sectors—including Energy & Oil, Banking & NBFC, IT & Tech, Auto & EV, Pharmaceuticals, Infrastructure, Defence, Metals, Consumer Goods, and Crypto/Commodity trackers.'
    },
    {
      q: 'What is the built-in Paper Trading feature and how does it work?',
      a: 'Paper Trading provides every user with a virtual capital of ₹10,00,000. You can simulate trades with automatic or manual order logging. Our cron engine monitors live stock price updates and automatically records when Target 1, Target 2, or Stop Loss is reached with zero financial risk.'
    },
    {
      q: 'How does the SEBI GSM / ASM surveillance pre-filter protect traders?',
      a: 'Stocks under SEBI Graded Surveillance Measure (GSM) or Additional Surveillance Measure (ASM) have extreme circuit limits, high 100% margin requirements, and elevated manipulation risk. StockSense flags or automatically excludes these high-risk securities from top candidate suggestions.'
    },
    {
      q: 'What is the latency of live market updates on StockSense?',
      a: 'Live quotes, score re-evaluations, and price flashes update over low-latency WebSockets every 5 seconds. You do not need to refresh the page to see live price ticks or updated technical ratings.'
    }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      
      {/* 1. Real-Time Live Market Pulse Benchmark Ribbon */}
      <div className="w-full bg-slate-900 text-slate-200 text-xs border-b border-slate-800 py-2.5 overflow-hidden select-none sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2 shrink-0 pr-4 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-mono font-bold text-slate-200 text-[11px] tracking-wider uppercase flex items-center gap-1.5">
              <span>REAL-TIME PULSE</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-sans font-semibold">LIVE</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar py-0.5 text-xs font-mono ml-3">
            {marketPulse.map((idx, i) => {
              const flash = pulseFlashes[idx.symbol];
              return (
                <div key={idx.symbol || i} className="flex items-center space-x-1.5 shrink-0 hover:bg-slate-800/60 px-2 py-0.5 rounded-lg transition-colors">
                  <span className="text-slate-400 font-semibold">{idx.name}:</span>
                  <span className={`font-bold transition-colors px-1 rounded ${
                    flash === 'up' 
                      ? 'bg-emerald-500/30 text-emerald-300 animate-pulse' 
                      : flash === 'down' 
                      ? 'bg-rose-500/30 text-rose-300 animate-pulse' 
                      : 'text-white'
                  }`}>
                    {idx.value}
                  </span>
                  <span className={`text-[11px] font-semibold flex items-center ${idx.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {idx.positive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {idx.change}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-4xl mx-auto mb-14">
            
            {/* Top Pill */}
            <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
              <span>Institutional Quantitative Scanner for 280+ Indian Equities</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold font-mono">v2.4 LIVE</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.12]">
              Systematic Decision Support for{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent">
                Indian Stock Markets.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Scan across 280+ companies in 15 sectors with real-time multi-factor technical scoring, automated SEBI surveillance filters, transparent Entry / SL / Target levels, and risk-free virtual paper trading.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto btn-primary px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/25 group hover:shadow-indigo-500/40 transition-all"
              >
                <span>Launch Free Scanner</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/login"
                className="w-full sm:w-auto btn-secondary px-8 py-3.5 rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center space-x-2 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <span>Existing Member Sign In</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ₹10,00,000 Virtual Paper Trading
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" /> SEBI-Compliant Design
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-500" /> 5-Second Live WebSockets
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-500" /> 280+ Equities Across 15 Sectors
              </span>
            </div>

          </div>

          {/* 3. Live Interactive Scanner Matrix Preview */}
          <div className="relative mt-8 max-w-5xl mx-auto">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-15"></div>
            
            <div className="relative glass-panel rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/80 bg-white/90 backdrop-blur-xl">
              
              {/* Mockup Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 mb-4 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-800">StockSense Live Quantitative Stream</span>
                    <p className="text-[10px] text-slate-400 font-sans">Real-time dynamic decision matrix with ATR calculated boundaries</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>LIVE STREAM</span>
                  </span>
                  <div className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-bold border border-indigo-100">
                    280+ Tickers Active
                  </div>
                </div>
              </div>

              {/* Sector Filter Tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-3 mb-3 border-b border-slate-100">
                {SECTOR_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = selectedSector === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedSector(cat.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-800/80 text-indigo-100' : 'bg-slate-200 text-slate-600'}`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Scanner Table (Max 5 items with blur gate) */}
              <div className="relative overflow-x-auto rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 pb-2">
                      <th className="py-2.5 px-3">Symbol / Company</th>
                      <th className="py-2.5 px-3">Sector</th>
                      <th className="py-2.5 px-3">Live Price (₹)</th>
                      <th className="py-2.5 px-3">Composite AI Score</th>
                      <th className="py-2.5 px-3">Decision Tag</th>
                      <th className="py-2.5 px-3">Entry / Stop Loss / Target</th>
                      <th className="py-2.5 px-3 text-right">R:R Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredStocks.length > 0 ? (
                      filteredStocks.map((stock, idx) => {
                        const flash = priceFlashes[stock.symbol];
                        const isBlurred = idx >= 3; // Blur rows 4 and 5 for public preview teaser
                        return (
                          <tr 
                            key={stock.symbol} 
                            className={`transition-all ${
                              isBlurred 
                                ? 'filter blur-[1.5px] opacity-60 select-none pointer-events-none hover:bg-transparent' 
                                : 'hover:bg-indigo-50/30'
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-heading font-bold text-slate-900">
                                {stock.symbol}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                {stock.company_name || stock.symbol}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {stock.sector || 'General'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`font-mono font-bold text-slate-800 px-2 py-1 rounded transition-colors inline-block ${
                                flash === 'up' ? 'bg-emerald-100 text-emerald-800' : flash === 'down' ? 'bg-rose-100 text-rose-800' : ''
                              }`}>
                                ₹{stock.price?.close?.toFixed(2) || '0.00'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {stock.score?.final_score || 0}/100
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <ScoreBadge label={stock.score?.suggestion_label || 'WATCH'} size="sm" />
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                              ₹{stock.score?.entry_price?.toFixed(1) || '0.0'} / <span className="text-rose-600 font-semibold">₹{stock.score?.stop_loss?.toFixed(1) || '0.0'}</span> / <span className="text-emerald-600 font-semibold">₹{stock.score?.target1?.toFixed(1) || '0.0'}</span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-indigo-600">
                              1:{stock.score?.risk_reward_ratio?.toFixed(2) || '2.00'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-6 text-center text-slate-400 text-xs">
                          Loading active sector universe...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Floating Glassmorphism Unlock Gate Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/80 to-transparent pt-12 pb-3 flex items-center justify-center pointer-events-auto">
                  <div className="bg-white/95 backdrop-blur-md border border-indigo-200/80 shadow-lg shadow-indigo-500/10 rounded-2xl px-5 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 font-heading">Preview Limited to 5 Equities</div>
                      <div className="text-[10px] text-slate-500">Sign in to unlock all 280+ companies & unfiltered trade levels.</div>
                    </div>
                    <Link 
                      to="/signup" 
                      className="btn-primary text-xs px-4 py-1.5 rounded-xl font-bold shadow-md hover:shadow-indigo-500/30 flex items-center gap-1 shrink-0"
                    >
                      <span>Unlock All 280+ Equities</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

              </div>

              {/* Table Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  Live stream auto-refreshing every 5 seconds without page reload
                </span>
                <Link to="/signup" className="text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                  Explore complete scanner with 280+ tickers <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 4. Platform Statistics & Trust Badges Section */}
      <section className="py-12 bg-slate-900 text-white relative border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="p-4">
              <div className="font-heading font-extrabold text-3xl sm:text-4xl text-indigo-400 mb-1">
                280+
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">
                NSE & BSE Equities
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Across 15 Industry Sectors
              </div>
            </div>

            <div className="p-4 border-l border-slate-800">
              <div className="font-heading font-extrabold text-3xl sm:text-4xl text-emerald-400 mb-1">
                5-Sec
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">
                WebSocket Latency
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Continuous Tick Push
              </div>
            </div>

            <div className="p-4 border-l border-slate-800">
              <div className="font-heading font-extrabold text-3xl sm:text-4xl text-purple-400 mb-1">
                100%
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">
                Transparent Logic
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Full Technical Breakdown
              </div>
            </div>

            <div className="p-4 border-l border-slate-800">
              <div className="font-heading font-extrabold text-3xl sm:text-4xl text-amber-400 mb-1">
                ₹10 Lakh
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-300">
                Virtual Capital
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Zero Risk Paper Trading
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. 4-Pillar Algorithmic Scoring Engine Breakdown */}
      <section id="how-it-works" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>THE QUANT ENGINE</span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-slate-900">
              How StockSense Computes the 0–100 Score
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Unlike black-box algorithms, StockSense uses a verifiable 4-pillar quantitative framework combining structural momentum, liquidity surges, and risk surveillance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Pillar Selector Buttons */}
            <div className="lg:col-span-5 space-y-3">
              {SCORING_PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                const isSelected = activeScorePillar === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveScorePillar(idx)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-start space-x-4 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-indigo-500/10'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-sm sm:text-base">
                          {pillar.title}
                        </span>
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {pillar.weight}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {pillar.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Detailed Pillar Deep-Dive Card */}
            <div className="lg:col-span-7">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                    {React.createElement(SCORING_PILLARS[activeScorePillar].icon, { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">Pillar #{activeScorePillar + 1} Deep-Dive</span>
                    <h3 className="font-heading font-bold text-xl text-slate-900">{SCORING_PILLARS[activeScorePillar].title}</h3>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {SCORING_PILLARS[activeScorePillar].description}
                </p>

                <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6">
                  <div className="text-xs font-mono font-semibold text-indigo-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> Active Mathematical Formula Signals
                  </div>
                  <div className="space-y-2.5">
                    {SCORING_PILLARS[activeScorePillar].metrics.map((m, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <div className="text-xs text-indigo-600 font-semibold">Algorithm Weight</div>
                    <div className="font-mono font-bold text-lg text-indigo-950 mt-0.5">{SCORING_PILLARS[activeScorePillar].weight}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-semibold">Execution Trigger</div>
                    <div className="font-mono font-bold text-lg text-emerald-950 mt-0.5">Automated Multi-Timeframe</div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Interactive Paper Trading ROI Simulator Preview */}
      <section className="py-20 bg-slate-50 border-y border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>PRACTICE RISK MANAGEMENT</span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-slate-900">
              Interactive Virtual Paper Trading Simulator
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Test your strategy with mathematical discipline. Every account receives ₹10,00,000 in virtual funds to test setups before taking real market exposure.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Virtual Capital Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Virtual Capital</span>
                  <span className="font-mono text-indigo-600">₹{simCapital.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="1000000"
                  step="10000"
                  value={simCapital}
                  onChange={(e) => setSimCapital(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>₹20k</span>
                  <span>₹10 Lakhs</span>
                </div>
              </div>

              {/* Risk Per Trade */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Risk Per Setup</span>
                  <span className="font-mono text-rose-600">{simRiskPercent}% (₹{((simCapital * simRiskPercent) / 100).toLocaleString('en-IN')})</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={simRiskPercent}
                  onChange={(e) => setSimRiskPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1% (Conservative)</span>
                  <span>5% (Aggressive)</span>
                </div>
              </div>

              {/* Targeted R:R */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Targeted Risk:Reward</span>
                  <span className="font-mono text-emerald-600">1:{simRRRatio}</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="4"
                  step="0.5"
                  value={simRRRatio}
                  onChange={(e) => setSimRRRatio(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>1:1.5</span>
                  <span>1:4.0 (High R:R)</span>
                </div>
              </div>

            </div>

            {/* Calculated Strategy Expectancy Summary Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-xs text-slate-400 font-medium">Risk Budget / Trade</div>
                <div className="font-heading font-bold text-xl text-rose-400 mt-1 font-mono">
                  ₹{((simCapital * simRiskPercent) / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Maximum Stop-Loss Risk</div>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0">
                <div className="text-xs text-slate-400 font-medium">Expected Profit / Target</div>
                <div className="font-heading font-bold text-xl text-emerald-400 mt-1 font-mono">
                  ₹{(((simCapital * simRiskPercent) / 100) * simRRRatio).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Target 1 & 2 Average Gain</div>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0">
                <div className="text-xs text-slate-400 font-medium">Break-Even Win Rate</div>
                <div className="font-heading font-bold text-xl text-indigo-400 mt-1 font-mono">
                  {(100 / (1 + simRRRatio)).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Profitable even with 40% Accuracy</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Auto-logs trades from scanner with 1-click execution
              </span>
              <Link to="/signup" className="btn-primary text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1">
                Start Paper Trading Free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 7. Comprehensive Feature Matrix */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>CORE CAPABILITIES</span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-slate-900">
              Engineered for Modern Indian Equities
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Everything you need for disciplined, rule-based screening without guesswork or emotional bias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="glass-panel p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-5 shadow-md shadow-indigo-500/25">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">AI-Assisted Stock Scanner</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                Scan 280+ tickers filtered by sector, market cap, score ranges, RSI zones, and risk profiles. Table and card views with 5-second live ticks.
              </p>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Real-time 0–100 composite ranking
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Mandatory transparent suggestion rationale
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Dynamic Stop-Loss & Target 1/2 calculations
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-5 shadow-md shadow-purple-500/25">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">Side-by-Side Stock Matrix</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                Directly compare 2 to 4 equities head-to-head. Evaluates score differentials, RSI momentum, and volume trends to declare the superior setup.
              </p>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Side-by-side indicator & level matrix
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Never forces a "best of bad bunch" pick
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Clear reasoning for superior setup selection
                </li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-7 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-md shadow-emerald-500/25">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">Paper Trading & Strategy Report Card</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                Automated trade logging with ₹10,00,000 virtual balance. Background cron engine checks live price ticks against Targets and Stop Losses.
              </p>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Automatic cron Target & Stop-Loss auditing
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Real-time Win Rate %, Realized R:R & Drawdown
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Zero financial risk sandbox
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 8. SEBI Compliance & Surveillance Framework */}
      <section id="compliance" className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-amber-100/70 text-amber-800 text-xs font-bold font-mono">
                  REGULATORY NOTICE
                </span>
                <span className="text-xs text-slate-400 font-medium">SEBI Compliance & Surveillance Safeguards</span>
              </div>
              <h3 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
                SEBI Compliance & Educational Disclaimer
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                StockSense operates strictly as an educational algorithmic research and analytical decision-support tool. 
                We do not provide personalized investment advisory or stock broking services under SEBI (Investment Advisers) Regulations. 
                All momentum scores, ATR levels, and algorithmic tags are purely data-driven technical metrics intended for paper trading, backtesting, and educational study.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-500 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> SEBI Research Analyst Guidelines Compliant</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> GSM / ASM Pre-filtering Active</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Transparent Algorithmic Logic</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Interactive FAQ Accordion */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-slate-900">
              Everything You Need to Know
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Got questions about our scoring models, data feeds, or compliance? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden transition-colors bg-slate-50/50 hover:bg-slate-50"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-6 py-4.5 flex items-center justify-between text-slate-900 font-heading font-bold text-sm sm:text-base focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ml-4 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 10. Call to Action Banner */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="font-heading font-bold text-2xl sm:text-4xl">
                Upgrade Your Stock Market Decision Making Today
              </h2>
              <p className="mt-3 text-sm sm:text-base text-indigo-200/90 leading-relaxed">
                Scan 280+ NSE equities with institutional quantitative algorithms and paper trade with ₹10,00,000 in virtual funds.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-indigo-900 font-bold text-sm sm:text-base hover:bg-indigo-50 transition-colors shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>Launch Stock Scanner</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base border border-white/20 transition-colors"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

