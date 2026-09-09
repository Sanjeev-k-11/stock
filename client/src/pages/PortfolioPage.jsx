import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  History, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Sliders,
  Filter,
  ExternalLink
} from 'lucide-react';
import { portfolioApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ScoreBadge from '../components/common/ScoreBadge';
import AddBrokerTradeModal from '../components/portfolio/AddBrokerTradeModal';
import SellTradeModal from '../components/portfolio/SellTradeModal';

const BROKERS = [
  { id: 'All', label: 'All Brokers', icon: '🌐' },
  { id: 'Zerodha Kite', label: 'Zerodha Kite', icon: '🪁' },
  { id: 'Groww', label: 'Groww', icon: '🟢' },
  { id: 'Upstox', label: 'Upstox', icon: '🟣' },
  { id: 'Angel One', label: 'Angel One', icon: '🟠' },
  { id: 'Dhan', label: 'Dhan', icon: '⚡' },
  { id: 'ICICI Direct', label: 'ICICI Direct', icon: '🔷' },
  { id: 'HDFC Sky', label: 'HDFC Sky', icon: '☁️' },
  { id: 'Kotak Neo', label: 'Kotak Neo', icon: '🔴' },
  { id: 'Paytm Money', label: 'Paytm Money', icon: '💳' },
  { id: 'Other Broker', label: 'Other', icon: '🏦' }
];

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('holdings'); // 'holdings' | 'history' | 'allocation'
  const [selectedBroker, setSelectedBroker] = useState('All');
  const [holdings, setHoldings] = useState([]);
  const [historyTrades, setHistoryTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedHoldingForSell, setSelectedHoldingForSell] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  // Socket
  const { stockUpdates, isConnected } = useSocket();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadPortfolioData = () => {
    setLoading(true);
    Promise.all([
      portfolioApi.getHoldings('holding', selectedBroker),
      portfolioApi.getHoldings('sold', selectedBroker),
      portfolioApi.getSummary()
    ])
      .then(([activeRes, historyRes, summaryRes]) => {
        if (activeRes.data) setHoldings(activeRes.data);
        if (historyRes.data) setHistoryTrades(historyRes.data);
        if (summaryRes.data) setSummary(summaryRes.data);
      })
      .catch(err => {
        console.error('Failed to load portfolio:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPortfolioData();
  }, [selectedBroker]);

  // Live update holdings prices on incoming WebSocket ticks
  useEffect(() => {
    if (!stockUpdates || Object.keys(stockUpdates).length === 0) return;

    setHoldings(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (stockUpdates[item.symbol]) {
          const live = stockUpdates[item.symbol];
          const newPrice = live.price?.close || live.price?.current || item.current_price;
          if (newPrice && newPrice !== item.current_price) {
            changed = true;
            const currentVal = newPrice * Number(item.quantity);
            const pnl = currentVal - item.invested_amount;
            const pnlPct = item.invested_amount > 0 ? (pnl / item.invested_amount) * 100 : 0;
            return {
              ...item,
              current_price: newPrice,
              current_value: Number(currentVal.toFixed(2)),
              total_pnl: Number(pnl.toFixed(2)),
              pnl_percent: Number(pnlPct.toFixed(2)),
              ai_score: live.score?.final_score || item.ai_score,
              suggestion_label: live.score?.suggestion_label || item.suggestion_label,
              _flashDirection: newPrice > item.current_price ? 'up' : 'down'
            };
          }
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, [stockUpdates]);

  const handleDeleteTrade = async (id, sym) => {
    if (!window.confirm(`Are you sure you want to remove ${sym} from your tracked portfolio?`)) return;
    try {
      await portfolioApi.deleteTrade(id);
      showToast(`Removed ${sym} trade record.`);
      loadPortfolioData();
    } catch (err) {
      showToast(err.message || 'Failed to delete trade.');
    }
  };

  const handleOpenSell = (holding) => {
    setSelectedHoldingForSell(holding);
    setSellModalOpen(true);
  };

  // Aggregates for current active view
  const currentTotalInvested = holdings.reduce((acc, h) => acc + (h.invested_amount || 0), 0);
  const currentTotalValue = holdings.reduce((acc, h) => acc + (h.current_value || 0), 0);
  const currentNetPnl = currentTotalValue - currentTotalInvested;
  const currentPnlPct = currentTotalInvested > 0 ? (currentNetPnl / currentTotalInvested) * 100 : 0;
  const isNetProfit = currentNetPnl >= 0;

  const totalRealizedPnl = historyTrades.reduce((acc, h) => acc + Number(h.realized_pnl || 0), 0);

  const getBrokerBadge = (name) => {
    const brokerItem = BROKERS.find(b => b.id.toLowerCase() === (name || '').toLowerCase());
    const icon = brokerItem?.icon || '🏦';
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-800 text-[11px] font-semibold">
        <span>{icon}</span>
        <span>{name}</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Add Trade Modal */}
      <AddBrokerTradeModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onTradeAdded={() => {
          showToast('New broker trade logged successfully!');
          loadPortfolioData();
        }}
      />

      {/* Sell Trade Modal */}
      <SellTradeModal
        isOpen={sellModalOpen}
        onClose={() => setSellModalOpen(false)}
        holding={selectedHoldingForSell}
        onTradeSold={() => {
          showToast('Trade position closed & recorded to History!');
          loadPortfolioData();
        }}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
              My Broker Holdings & Trade Manager
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track real stocks purchased in Zerodha, Groww, Upstox, Angel One with 100% live market valuations & P&L
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadPortfolioData}
            className="btn-secondary p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm"
            title="Refresh Live Prices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log External Broker Trade</span>
          </button>
        </div>
      </div>

      {/* Hero Metric Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invested */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Total Invested Capital</span>
          <div className="font-mono font-extrabold text-2xl text-slate-900 mt-1">
            ₹{currentTotalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Across {holdings.length} active positions
          </span>
        </div>

        {/* Current Live Valuation */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Current Live Valuation
          </span>
          <div className="font-mono font-extrabold text-2xl text-slate-900 mt-1">
            ₹{currentTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            Streamed live via NSE/BSE WebSockets
          </span>
        </div>

        {/* Unrealized P&L */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Unrealized Total P&L</span>
          <div className={`font-mono font-extrabold text-2xl mt-1 ${isNetProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isNetProfit ? `+₹${currentNetPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `-₹${Math.abs(currentNetPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
          <span className={`text-xs font-bold font-mono mt-1 block ${isNetProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isNetProfit ? `+${currentPnlPct.toFixed(2)}%` : `${currentPnlPct.toFixed(2)}%`} Total Return
          </span>
        </div>

        {/* Realized History P&L */}
        <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Realized Profit / Loss</span>
          <div className={`font-mono font-extrabold text-2xl mt-1 ${totalRealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalRealizedPnl >= 0 ? `+₹${totalRealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `-₹${Math.abs(totalRealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            From {historyTrades.length} completed trade exits
          </span>
        </div>

      </div>

      {/* Main Container */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
        
        {/* Navigation Tabs & Broker Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Main Tabs */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeTab === 'holdings' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Active Holdings ({holdings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeTab === 'history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Trade History ({historyTrades.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeTab === 'allocation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Broker Analytics</span>
            </button>
          </div>

          {/* Broker Filter Dropdown / Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">Broker:</span>
            {BROKERS.slice(0, 6).map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBroker(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 ${
                  selectedBroker === b.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>

        </div>

        {/* TAB 1: ACTIVE HOLDINGS */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-medium">Fetching Live Valuations from NSE...</p>
              </div>
            ) : holdings.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6" />
                </div>
                <p className="font-heading font-bold text-slate-800 text-base">No External Broker Holdings Recorded Yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click the button below to add your trades bought on Zerodha Kite, Groww, Upstox, Angel One, etc. to monitor live returns.
                </p>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="mt-4 btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log First Broker Trade</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-3 px-4">Stock / Company</th>
                      <th className="py-3 px-4">Broker</th>
                      <th className="py-3 px-4">Qty & Buy Avg</th>
                      <th className="py-3 px-4">Live CMP</th>
                      <th className="py-3 px-4">Current Value</th>
                      <th className="py-3 px-4">Unrealized P&L</th>
                      <th className="py-3 px-4">AI Score / Action</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {holdings.map((item) => {
                      const isProfit = (item.total_pnl || 0) >= 0;
                      const flashClass = item._flashDirection === 'up'
                        ? 'animate-flash-up px-1.5 py-0.5 rounded'
                        : item._flashDirection === 'down'
                        ? 'animate-flash-down px-1.5 py-0.5 rounded'
                        : '';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          
                          {/* Stock Symbol */}
                          <td className="py-3.5 px-4">
                            <Link
                              to={`/stocks/${item.symbol}`}
                              className="font-heading font-bold text-slate-900 hover:text-indigo-600 transition-colors block"
                            >
                              {item.symbol}
                            </Link>
                            <span className="text-[10px] text-slate-400">{item.company_name}</span>
                          </td>

                          {/* Broker Badge */}
                          <td className="py-3.5 px-4">
                            {getBrokerBadge(item.broker_name)}
                          </td>

                          {/* Qty & Buy Avg */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            <div>{item.quantity} shares</div>
                            <div className="text-[11px] text-slate-500 font-normal">@ ₹{Number(item.buy_price).toFixed(2)}</div>
                          </td>

                          {/* Live CMP */}
                          <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                            <span className={flashClass}>
                              ₹{Number(item.current_price || item.buy_price).toFixed(2)}
                            </span>
                          </td>

                          {/* Current Value */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            ₹{Number(item.current_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* P&L */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className={`font-extrabold text-sm ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isProfit ? `+₹${Number(item.total_pnl).toFixed(2)}` : `-₹${Math.abs(Number(item.total_pnl)).toFixed(2)}`}
                            </div>
                            <div className={`text-[11px] font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isProfit ? `+${Number(item.pnl_percent).toFixed(2)}%` : `${Number(item.pnl_percent).toFixed(2)}%`}
                            </div>
                          </td>

                          {/* AI Score & Action Advice */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              {item.ai_score ? (
                                <span className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {item.ai_score}/100
                                </span>
                              ) : null}
                              <ScoreBadge label={item.suggestion_label || 'WATCH'} size="sm" />
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenSell(item)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
                                title="Record Sale / Exit"
                              >
                                Sell / Exit
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(item.id, item.symbol)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRADE HISTORY (SOLD POSITIONS) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyTrades.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>No completed/sold trades found in your history.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Broker</th>
                      <th className="py-3 px-4">Buy Price</th>
                      <th className="py-3 px-4">Sell Price</th>
                      <th className="py-3 px-4">Realized Gain/Loss</th>
                      <th className="py-3 px-4">Purchase Date</th>
                      <th className="py-3 px-4">Sell Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {historyTrades.map((item) => {
                      const isProfit = Number(item.realized_pnl || 0) >= 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-heading font-bold text-slate-900">
                            <Link to={`/stocks/${item.symbol}`} className="hover:text-indigo-600">
                              {item.symbol}
                            </Link>
                            <span className="text-[10px] text-slate-400 block">{item.quantity} shares</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {getBrokerBadge(item.broker_name)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            ₹{Number(item.buy_price).toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            ₹{Number(item.sell_price || 0).toFixed(2)}
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <div className={`font-extrabold text-sm ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isProfit ? `+₹${Number(item.realized_pnl).toFixed(2)}` : `-₹${Math.abs(Number(item.realized_pnl)).toFixed(2)}`}
                            </div>
                            <div className={`text-[11px] font-bold ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isProfit ? `+${Number(item.realized_pnl_percent).toFixed(2)}%` : `${Number(item.realized_pnl_percent).toFixed(2)}%`}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {new Date(item.buy_date).toLocaleDateString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {item.sell_date ? new Date(item.sell_date).toLocaleDateString('en-IN') : '-'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteTrade(item.id, item.symbol)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete History Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BROKER & ASSET ALLOCATION */}
        {activeTab === 'allocation' && summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Broker Breakdown Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <PieChart className="w-5 h-5 text-indigo-600" />
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Broker-wise Portfolio Distribution
                </h3>
              </div>

              {summary.brokerAllocation && summary.brokerAllocation.length > 0 ? (
                <div className="space-y-3">
                  {summary.brokerAllocation.map(b => (
                    <div key={b.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{b.name}</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{b.value.toLocaleString('en-IN')} ({b.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${b.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No active broker distribution data.</p>
              )}
            </div>

            {/* Sector Breakdown Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Layers className="w-5 h-5 text-purple-600" />
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Sectoral Allocation
                </h3>
              </div>

              {summary.sectorAllocation && summary.sectorAllocation.length > 0 ? (
                <div className="space-y-3">
                  {summary.sectorAllocation.map(s => (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{s.name}</span>
                        <span className="font-mono font-bold text-slate-900">
                          ₹{s.value.toLocaleString('en-IN')} ({s.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full" style={{ width: `${s.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No sectoral allocation data.</p>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
