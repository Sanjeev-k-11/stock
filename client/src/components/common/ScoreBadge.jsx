import React from 'react';
import { CheckCircle2, Eye, AlertOctagon, HelpCircle } from 'lucide-react';

export default function ScoreBadge({ label, reason, showReason = false, size = 'md' }) {
  const isStrong = label === 'STRONG_CANDIDATE';
  const isWatch = label === 'WATCH';
  const isAvoid = label === 'AVOID';

  const config = {
    STRONG_CANDIDATE: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: CheckCircle2,
      dotColor: 'bg-emerald-500',
      text: 'STRONG CANDIDATE'
    },
    WATCH: {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      icon: Eye,
      dotColor: 'bg-amber-500',
      text: 'WATCHLIST'
    },
    AVOID: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: AlertOctagon,
      dotColor: 'bg-rose-500',
      text: 'AVOID'
    }
  }[label] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-700',
    icon: HelpCircle,
    dotColor: 'bg-slate-400',
    text: label || 'NEUTRAL'
  };

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-semibold tracking-wide ${config.bg} ${size === 'sm' ? 'text-[11px]' : 'text-xs'}`}>
        <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
        <span>{config.text}</span>
      </div>
      {(showReason || reason) && (
        <span className="text-[11px] text-slate-500 font-normal leading-tight">
          {reason || 'Algorithmic assessment'}
        </span>
      )}
    </div>
  );
}
