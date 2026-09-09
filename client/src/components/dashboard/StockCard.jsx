import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  ArrowUpRight, 
  Target, 
  Percent, 
  Activity, 
  BarChart3,
  BookmarkPlus
} from 'lucide-react';
import ScoreBadge from '../common/ScoreBadge';
import RiskBadge from '../common/RiskBadge';

function StockCardComponent({ stock, onQuickTrade, onWatchlistToggle, isWatchlisted }) {
  const price = stock.price?.close || stock.score?.entry_price || 0;
  const score = stock.score?.final_score || 0;
  const suggestionLabel = stock.score?.suggestion_label || 'WATCH';
  const suggestionReason = stock.score?.suggestion_reason || 'Algorithmic assessment';
  const rr = stock.score?.risk_reward_ratio || 0;
  const rsi = stock.indicators?.rsi || 50;

  // Flash animation check (if updated within last 2.5 seconds)
  const isRecentlyUpdated = stock._updatedAt && (Date.now() - stock._updatedAt < 2500);
  const flashClass = isRecentlyUpdated
    ? stock._flashDirection === 'up'
      ? 'animate-flash-up rounded-lg px-1 -mx-1'
      : 'animate-flash-down rounded-lg px-1 -mx-1'
    : '';

  // Score color gradient
  const getScoreColor = (val) => {
    if (val >= 80) return 'from-emerald-500 to-teal-600 text-emerald-700';
    if (val >= 60) return 'from-amber-500 to-orange-500 text-amber-700';
    return 'from-rose-500 to-red-600 text-rose-700';
  };

  return (
    <div className="glass-card rounded-[22px] p-5 flex flex-col justify-between relative overflow-hidden group">
      
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Link
                to={`/stocks/${stock.symbol}`}
                className="font-heading font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight"
              >
                {stock.symbol}
              </Link>
              {stock.is_gsm_asm && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold font-mono border border-rose-200" title="SEBI Surveillance List">
                  GSM/ASM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal truncate max-w-[180px]">
              {stock.company_name}
            </p>
          </div>

          {/* Composite AI Score Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-baseline space-x-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">AI Score</span>
              <span className={`font-mono font-extrabold text-xl text-slate-900 ${isRecentlyUpdated ? 'animate-flash-neutral px-1 rounded' : ''}`}>
                {score}
              </span>
              <span className="text-[10px] font-mono text-slate-400">/100</span>
            </div>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full bg-gradient-to-r ${getScoreColor(score)} transition-all duration-500`}
                style={{ width: `${Math.min(100, score)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Price & Primary Sub-metrics */}
        <div className="flex items-baseline justify-between py-2.5 my-2 border-y border-slate-100/90">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Current Price</span>
            <span className={`font-mono font-bold text-base text-slate-900 transition-colors ${flashClass}`}>
              ₹ {price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-right">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">RSI (14)</span>
              <span className={`font-mono text-xs font-semibold ${rsi > 70 ? 'text-rose-600' : rsi < 35 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {rsi.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Risk:Reward</span>
              <span className="font-mono text-xs font-semibold text-indigo-600">
                1:{rr.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Suggestion Label with Mandatory Explicit Reason */}
        <div className="my-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
          <div className="flex items-center justify-between mb-1.5">
            <ScoreBadge label={suggestionLabel} />
            <RiskBadge level={stock.score?.risk_level || 'Medium'} />
          </div>
          <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
            {suggestionReason}
          </p>
        </div>

        {/* Strategy Levels Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center bg-white/70 p-2.5 rounded-xl border border-slate-100 text-[11px] mb-4">
          <div>
            <span className="text-[10px] text-slate-600 block">Stop Loss</span>
            <span className="font-mono font-semibold text-rose-600">
              ₹{stock.score?.stop_loss ? stock.score.stop_loss.toFixed(1) : '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Target 1</span>
            <span className="font-mono font-semibold text-emerald-600">
              ₹{stock.score?.target1 ? stock.score.target1.toFixed(1) : '-'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 block">Target 2</span>
            <span className="font-mono font-semibold text-teal-600">
              ₹{stock.score?.target2 ? stock.score.target2.toFixed(1) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
        <Link
          to={`/stocks/${stock.symbol}`}
          className="flex-1 btn-secondary py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-sm"
        >
          <span>Detailed Setup</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => onQuickTrade && onQuickTrade(stock)}
          className="btn-primary py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 shadow-sm shadow-indigo-500/15"
          title="Take Paper Trade"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Paper Trade</span>
        </button>
      </div>

    </div>
  );
}

export default memo(StockCardComponent, (prev, next) => {
  return (
    prev.stock.symbol === next.stock.symbol &&
    prev.stock.price?.close === next.stock.price?.close &&
    prev.stock.score?.final_score === next.stock.score?.final_score &&
    prev.stock.score?.suggestion_label === next.stock.score?.suggestion_label &&
    prev.isWatchlisted === next.isWatchlisted
  );
});
