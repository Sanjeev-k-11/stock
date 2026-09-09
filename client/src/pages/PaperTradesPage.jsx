import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Target, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { paperTradeApi } from '../services/api';
import { useSocket } from '../context/SocketContext';
import ReportCard from '../components/paperTrading/ReportCard';
import TradeModal from '../components/paperTrading/TradeModal';

export default function PaperTradesPage() {
  const [trades, setTrades] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { socket, stockUpdates } = useSocket();

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      paperTradeApi.getTrades(),
      paperTradeApi.getReportCard()
    ])
      .then(([tradesRes, reportRes]) => {
        if (tradesRes.data) setTrades(tradesRes.data);
        if (reportRes.data) setReportData(reportRes.data);
      })
      .catch(err => {
        console.error('Failed to load paper trades:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to WebSocket trade-update events (e.g. target_hit, sl_hit from liveScanner)
  useEffect(() => {
    if (!socket) return;

    const handleTradeUpdate = (data) => {
      if (data && data.trade) {
        const symbol = data.trade.symbol;
        const status = data.trade.status;
        const price = data.trade.exit_price || data.trade.current_price;
        const pnl = data.trade.pnl_percent || 0;

        if (status === 'target_hit') {
          showToast(`🎯 TARGET HIT: ${symbol} achieved ₹${Number(price).toFixed(2)} (+${Number(pnl).toFixed(2)}%)!`);
        } else if (status === 'sl_hit') {
          showToast(`🛑 STOP LOSS HIT: ${symbol} closed at ₹${Number(price).toFixed(2)} (${Number(pnl).toFixed(2)}%) to protect capital.`);
        } else {
          showToast(`⚡ Position updated for ${symbol}: ${status}`);
        }

        // Reload data to refresh report card and status
        loadData();
      }
    };

    socket.on('trade-update', handleTradeUpdate);

    return () => {
      socket.off('trade-update', handleTradeUpdate);
    };
  }, [socket]);

  // Live update open trade prices on streaming stock update
  useEffect(() => {
    if (!stockUpdates || Object.keys(stockUpdates).length === 0) return;

    setTrades(prevTrades => {
      let changed = false;
      const updated = prevTrades.map(t => {
        if (t.status === 'open' && stockUpdates[t.symbol]) {
          const liveStock = stockUpdates[t.symbol];
          const newPrice = liveStock.price?.close || liveStock.price?.current || t.current_price;
          if (newPrice && newPrice !== t.current_price) {
            changed = true;
            const entry = Number(t.entry_price);
            const calcPnl = entry > 0 ? ((newPrice - entry) / entry) * 100 : 0;
            return {
              ...t,
              current_price: newPrice,
              calculated_pnl: calcPnl
            };
          }
        }
        return t;
      });
      return changed ? updated : prevTrades;
    });
  }, [stockUpdates]);

  const handleCloseTrade = async (tradeId, currentPrice) => {
    try {
      await paperTradeApi.closeTrade(tradeId, currentPrice);
      showToast('Position manually closed at market price.');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to close position.');
    }
  };

  const filteredTrades = trades.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return t.status === 'open';
    if (statusFilter === 'target_hit') return t.status === 'target_hit';
    if (statusFilter === 'sl_hit') return t.status === 'sl_hit';
    if (statusFilter === 'closed_manual') return t.status === 'closed_manual';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            <span>OPEN</span>
          </span>
        );
      case 'target_hit':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>TARGET HIT</span>
          </span>
        );
      case 'sl_hit':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>STOP LOSS HIT</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>CLOSED MANUAL</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast */}
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
        onTradeCreated={() => {
          showToast('New paper position opened successfully!');
          loadData();
        }}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
              Paper Trading & Strategy Verification
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Zero-risk virtual positions tracking algorithmic setup performance in real-time
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="btn-secondary p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm"
            title="Refresh positions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setTradeModalOpen(true)}
            className="btn-primary px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Paper Trade</span>
          </button>
        </div>
      </div>

      {/* Strategy Report Card */}
      <ReportCard reportData={reportData} />

      {/* Trades Table Area */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-5">
        
        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'All Trades' },
              { id: 'open', label: 'Open Positions' },
              { id: 'target_hit', label: 'Target Hits' },
              { id: 'sl_hit', label: 'SL Hits' },
              { id: 'closed_manual', label: 'Closed Manual' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400">
            Showing {filteredTrades.length} of {trades.length} positions
          </span>
        </div>

        {/* Positions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Entry Price</th>
                <th className="py-3 px-4">Current / Exit</th>
                <th className="py-3 px-4">Stop Loss</th>
                <th className="py-3 px-4">Target 1</th>
                <th className="py-3 px-4">P&L (%)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No positions found for the selected status.
                  </td>
                </tr>
              ) : (
                filteredTrades.map(trade => {
                  const pnl = Number(trade.calculated_pnl || trade.pnl_percent || 0);
                  const isProfit = pnl >= 0;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Stock Symbol */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/stock/${trade.symbol}`}
                          className="font-heading font-bold text-slate-900 hover:text-indigo-600 transition-colors block"
                        >
                          {trade.symbol}
                        </Link>
                        <span className="text-[10px] text-slate-400">{trade.company_name}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(trade.status)}
                      </td>

                      {/* Entry Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        ₹{Number(trade.entry_price).toFixed(2)}
                      </td>

                      {/* Current / Exit Price */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        ₹{Number(trade.exit_price || trade.current_price || trade.entry_price).toFixed(2)}
                      </td>

                      {/* Stop Loss */}
                      <td className="py-3.5 px-4 font-mono text-rose-600 font-semibold">
                        ₹{Number(trade.stop_loss).toFixed(2)}
                      </td>

                      {/* Target 1 */}
                      <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">
                        ₹{Number(trade.target1).toFixed(2)}
                      </td>

                      {/* P&L % */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-sm">
                        <span className={isProfit ? 'text-emerald-600' : 'text-rose-600'}>
                          {isProfit ? `+${pnl.toFixed(2)}%` : `${pnl.toFixed(2)}%`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {trade.status === 'open' ? (
                          <button
                            onClick={() => handleCloseTrade(trade.id, trade.current_price)}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                          >
                            Close Position
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(trade.exit_time || trade.entry_time).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
