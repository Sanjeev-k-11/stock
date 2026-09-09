import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { portfolioApi } from '../../services/api';

export default function SellTradeModal({ isOpen, onClose, holding, onTradeSold }) {
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !holding) return null;

  const currentPrice = holding.current_price || holding.buy_price;
  const initialSellPrice = sellPrice || String(currentPrice);

  const numSellPrice = Number(sellPrice || currentPrice);
  const invested = Number(holding.buy_price) * Number(holding.quantity);
  const totalExit = numSellPrice * Number(holding.quantity);
  const pnl = totalExit - invested;
  const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
  const isProfit = pnl >= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (numSellPrice <= 0) {
      setError('Please enter a valid Sell Price per share.');
      return;
    }

    setLoading(true);

    try {
      await portfolioApi.sellTrade(holding.id, {
        sell_price: numSellPrice,
        sell_date: sellDate
      });

      if (onTradeSold) onTradeSold();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record trade exit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
            Record Sale on {holding.broker_name}
          </span>
          <h2 className="font-heading font-extrabold text-xl text-slate-900 mt-1">
            Close Position: {holding.symbol}
          </h2>
          <p className="text-xs text-slate-500">
            {holding.quantity} shares bought @ ₹{Number(holding.buy_price).toFixed(2)}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sell Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Selling / Exit Price (₹ per share)
            </label>
            <div className="relative">
              <span className="text-xs text-slate-400 absolute left-3.5 top-3 font-mono">₹</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                required
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder={String(currentPrice.toFixed(2))}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Current Live Market Price: <strong className="font-mono text-slate-800">₹{currentPrice.toFixed(2)}</strong>
            </span>
          </div>

          {/* Sell Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Exit / Sell Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="date"
                required
                value={sellDate}
                onChange={(e) => setSellDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Realized P&L Preview Banner */}
          <div className={`p-4 rounded-2xl border ${isProfit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>Realized Return:</span>
              <span className={isProfit ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {isProfit ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Net Profit / Loss:</span>
              <span className={`font-mono font-extrabold text-xl ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? `+₹${pnl.toFixed(2)}` : `-₹${Math.abs(pnl).toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
            >
              <span>{loading ? 'Recording Sale...' : 'Confirm Sale & Move to History'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
