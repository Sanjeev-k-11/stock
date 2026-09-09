import React from 'react';
import { Award, TrendingUp, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, BarChart2 } from 'lucide-react';

export default function ReportCard({ reportData }) {
  if (!reportData) return null;

  const winRate = reportData.winRate || 0;
  const avgRR = reportData.avgRRAchieved || 1.5;
  const maxDrawdown = reportData.maxDrawdown || 0;
  const totalTrades = reportData.totalTrades || 0;
  const targetHits = reportData.targetHitCount || 0;
  const slHits = reportData.slHitCount || 0;
  const cumulativePnl = reportData.cumulativePnl || 0;

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200/70">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900">
              Strategy Performance Report Card
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time algorithmic verification metrics tracking auto-generated & manual paper setups
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs font-bold text-emerald-700 font-mono uppercase tracking-wide">
            Verified Simulation
          </span>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
        
        {/* Win Rate */}
        <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Win Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-600">
              {winRate}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${winRate}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-600 mt-1 block">
            {targetHits} targets hit / {targetHits + slHits} resolved
          </span>
        </div>

        {/* Avg R:R Achieved */}
        <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Realized R:R</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono font-extrabold text-2xl sm:text-3xl text-indigo-700">
              1 : {avgRR}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block font-medium">
            System target risk-reward
          </span>
        </div>

        {/* Max Drawdown */}
        <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Max Drawdown</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono font-extrabold text-2xl sm:text-3xl text-rose-600">
              {maxDrawdown > 0 ? `-${maxDrawdown}%` : '0.0%'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block font-medium">
            Peak-to-valley variance
          </span>
        </div>

        {/* Cumulative Virtual PnL */}
        <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Virtual P&L</span>
            <BarChart2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`font-mono font-extrabold text-2xl sm:text-3xl ${cumulativePnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {cumulativePnl >= 0 ? `+${cumulativePnl}%` : `${cumulativePnl}%`}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 block font-medium">
            Across {totalTrades} total logged setups
          </span>
        </div>

      </div>

    </div>
  );
}
