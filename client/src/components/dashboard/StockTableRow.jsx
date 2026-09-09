import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Target, ArrowUpRight } from 'lucide-react';
import ScoreBadge from '../common/ScoreBadge';
import RiskBadge from '../common/RiskBadge';

function StockTableRowComponent({ stock, onQuickTrade }) {
  const price = stock.price?.close || stock.score?.entry_price || 0;
  const score = stock.score?.final_score || 0;
  const rsi = stock.indicators?.rsi || 50;

  // Check recent update for live flash animation
  const isRecentlyUpdated = stock._updatedAt && (Date.now() - stock._updatedAt < 2500);
  const flashClass = isRecentlyUpdated
    ? stock._flashDirection === 'up'
      ? 'animate-flash-up px-2 py-0.5 rounded'
      : 'animate-flash-down px-2 py-0.5 rounded'
    : '';

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      {/* Stock Symbol & Name */}
      <td className="py-3.5 px-4">
        <div className="flex items-center space-x-2">
          <Link
            to={`/stocks/${stock.symbol}`}
            className="font-heading font-bold text-slate-900 hover:text-indigo-600 transition-colors"
          >
            {stock.symbol}
          </Link>
          {stock.is_gsm_asm && (
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold font-mono">
              GSM
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 truncate block max-w-[140px]">
          {stock.company_name}
        </span>
      </td>

      {/* LTP */}
      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
        <span className={flashClass}>
          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </td>

      {/* AI Score */}
      <td className="py-3.5 px-4">
        <div className="flex items-center space-x-2">
          <span className={`font-mono font-extrabold text-sm text-slate-900 ${isRecentlyUpdated ? 'animate-flash-neutral px-1.5 rounded' : ''}`}>
            {score}
          </span>
          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, score)}%` }}
            ></div>
          </div>
        </div>
      </td>

      {/* Suggestion & Reason */}
      <td className="py-3.5 px-4 max-w-[240px]">
        <div className="flex flex-col gap-0.5">
          <ScoreBadge label={stock.score?.suggestion_label} size="sm" />
          <span className="text-[10px] text-slate-500 truncate" title={stock.score?.suggestion_reason}>
            {stock.score?.suggestion_reason}
          </span>
        </div>
      </td>

      {/* RSI */}
      <td className="py-3.5 px-4 font-mono font-semibold">
        <span className={rsi > 70 ? 'text-rose-600' : rsi < 35 ? 'text-amber-600' : 'text-emerald-600'}>
          {rsi.toFixed(1)}
        </span>
      </td>

      {/* Risk Level */}
      <td className="py-3.5 px-4">
        <RiskBadge level={stock.score?.risk_level} />
      </td>

      {/* Strategy Levels */}
      <td className="py-3.5 px-4 font-mono text-[11px]">
        <div className="text-slate-700">
          Entry: <strong>₹{stock.score?.entry_price ? stock.score.entry_price.toFixed(1) : '-'}</strong>
        </div>
        <div className="text-slate-500">
          SL: <span className="text-rose-600">₹{stock.score?.stop_loss ? stock.score.stop_loss.toFixed(1) : '-'}</span> | T1: <span className="text-emerald-600">₹{stock.score?.target1 ? stock.score.target1.toFixed(1) : '-'}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end space-x-1.5">
          <button
            onClick={() => onQuickTrade && onQuickTrade(stock)}
            className="btn-primary p-2 rounded-xl"
            title="Simulate Paper Trade"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
          <Link
            to={`/stocks/${stock.symbol}`}
            className="btn-secondary p-2 rounded-xl"
            title="View Full Setup"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default memo(StockTableRowComponent, (prev, next) => {
  return (
    prev.stock.symbol === next.stock.symbol &&
    prev.stock.price?.close === next.stock.price?.close &&
    prev.stock.score?.final_score === next.stock.score?.final_score &&
    prev.stock.score?.suggestion_label === next.stock.score?.suggestion_label
  );
});
