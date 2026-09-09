import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import StockTableRow from './StockTableRow';

export default function StockTable({ stocks = [], sortBy, sortOrder, onSort, onQuickTrade }) {
  return (
    <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border border-slate-200/80">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 cursor-pointer" onClick={() => onSort('symbol')}>
                <div className="flex items-center space-x-1">
                  <span>Stock / Company</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer" onClick={() => onSort('price')}>
                <div className="flex items-center space-x-1">
                  <span>LTP (₹)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer" onClick={() => onSort('final_score')}>
                <div className="flex items-center space-x-1">
                  <span>AI Score</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Suggestion & Rationale</th>
              <th className="py-3.5 px-4 cursor-pointer" onClick={() => onSort('rsi')}>
                <div className="flex items-center space-x-1">
                  <span>RSI (14)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3.5 px-4">Risk Level</th>
              <th className="py-3.5 px-4">Entry / SL / Target</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stocks.map((stock) => (
              <StockTableRow
                key={stock.symbol}
                stock={stock}
                onQuickTrade={onQuickTrade}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
