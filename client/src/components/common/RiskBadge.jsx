import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function RiskBadge({ level = 'Low' }) {
  const isLow = level === 'Low';
  const isMed = level === 'Medium';
  const isHigh = level === 'High';

  let colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = ShieldCheck;

  if (isMed) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = Shield;
  } else if (isHigh) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = ShieldAlert;
  }

  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${colorClasses}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{level} Risk</span>
    </span>
  );
}
