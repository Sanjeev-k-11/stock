import React, { useState, useEffect } from 'react';
import { Target, X, Check, Calculator } from 'lucide-react';
import { paperTradeApi } from '../../services/api';

export default function TradeModal({ isOpen, onClose, initialStock, onTradeCreated }) {
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockId, setStockId] = useState(null);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialStock) {
      setStockSymbol(initialStock.symbol || '');
      setStockId(initialStock.id || null);
      setEntryPrice(initialStock.score?.entry_price || initialStock.price?.close || '');
      setStopLoss(initialStock.score?.stop_loss || '');
      setTarget1(initialStock.score?.target1 || '');
      setTarget2(initialStock.score?.target2 || '');
    }
  }, [initialStock]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await paperTradeApi.createTrade({
        stockId,
        symbol: stockSymbol,
        entryPrice: Number(entryPrice),
        stopLoss: Number(stopLoss),
        target1: Number(target1),
        target2: Number(target2)
      });
      if (onTradeCreated) onTradeCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit paper trade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-base">New Paper Trade Order</h3>
              <p className="text-xs text-slate-500">Zero-risk virtual execution tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Symbol</label>
            <input
              type="text"
              required
              value={stockSymbol}
              onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE, TCS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entry Price (₹)</label>
              <input
                type="number"
                step="0.05"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-600 mb-1">Stop Loss (₹)</label>
              <input
                type="number"
                step="0.05"
                required
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-sm font-mono text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-600 mb-1">Target 1 (₹)</label>
              <input
                type="number"
                step="0.05"
                required
                value={target1}
                onChange={(e) => setTarget1(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 text-sm font-mono text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-teal-600 mb-1">Target 2 (₹)</label>
              <input
                type="number"
                step="0.05"
                value={target2}
                onChange={(e) => setTarget2(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-teal-200 text-sm font-mono text-teal-600 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Submitting Trade...' : 'Confirm Virtual Position'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
