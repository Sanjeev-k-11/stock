import React from 'react';
import { Filter, RotateCcw, ShieldCheck, Zap, SlidersHorizontal, IndianRupee } from 'lucide-react';

const DEFAULT_SECTORS = [
  'Energy, Oil & Power',
  'Banking & Financial Services',
  'Information Technology',
  'Automobile & EV Mobility',
  'Healthcare & Pharmaceuticals',
  'FMCG, Food & Retail',
  'Infrastructure & Capital Goods',
  'Metals & Mining',
  'Defence & Aerospace',
  'Consumer Tech & Internet',
  'Telecommunications',
  'Real Estate & Construction',
  'Specialty Chemicals',
  'Commodities & Precious Metals',
  'Cryptocurrency'
];

export default function FilterSidebar({
  sectors = DEFAULT_SECTORS,
  selectedSector,
  setSelectedSector,
  selectedSuggestion,
  setSelectedSuggestion,
  selectedRisk,
  setSelectedRisk,
  selectedPriceRange,
  setSelectedPriceRange,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minScore,
  setMinScore,
  excludeSurveillance,
  setExcludeSurveillance,
  onReset
}) {
  const priceBrackets = [
    { id: 'all', label: 'All Prices', min: '', max: '' },
    { id: 'under50', label: '< ₹50', min: '', max: 50 },
    { id: '50to200', label: '₹50 - ₹200', min: 50, max: 200 },
    { id: '200to500', label: '₹200 - ₹500', min: 200, max: 500 },
    { id: '500to1500', label: '₹500 - ₹1.5k', min: 500, max: 1500 },
    { id: '1500to5000', label: '₹1.5k - ₹5k', min: 1500, max: 5000 },
    { id: 'above5000', label: '> ₹5,000', min: 5000, max: '' },
  ];

  const handleBracketClick = (bracket) => {
    setSelectedPriceRange(bracket.id);
    setMinPrice(bracket.min);
    setMaxPrice(bracket.max);
  };

  const handleCustomMinChange = (val) => {
    setSelectedPriceRange('custom');
    setMinPrice(val);
  };

  const handleCustomMaxChange = (val) => {
    setSelectedPriceRange('custom');
    setMaxPrice(val);
  };

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm font-heading">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          <span>Screening Filters</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-indigo-600 flex items-center space-x-1 font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Suggestion Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          AI Suggestion Label
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {['All', 'STRONG_CANDIDATE', 'WATCH', 'AVOID'].map((sug) => {
            const active = selectedSuggestion === sug || (sug === 'All' && !selectedSuggestion);
            const labelMap = {
              All: 'All Stocks',
              STRONG_CANDIDATE: 'Strong Setup',
              WATCH: 'Watchlist',
              AVOID: 'Avoid'
            };
            return (
              <button
                key={sug}
                onClick={() => setSelectedSuggestion(sug === 'All' ? '' : sug)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all text-left truncate ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {labelMap[sug]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range / Budget Filter */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
            <span>Price / Budget (₹)</span>
          </label>
          {(minPrice || maxPrice) && (
            <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {minPrice ? `₹${minPrice}` : '₹0'} - {maxPrice ? `₹${maxPrice}` : '∞'}
            </span>
          )}
        </div>
        
        {/* Quick Price Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {priceBrackets.map((bracket) => {
            const isActive = selectedPriceRange === bracket.id || (bracket.id === 'all' && !selectedPriceRange && !minPrice && !maxPrice);
            return (
              <button
                key={bracket.id}
                onClick={() => handleBracketClick(bracket)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all text-center truncate ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {bracket.label}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Min Price (₹)</span>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => handleCustomMinChange(e.target.value)}
              className="w-full bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Max Price (₹)</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => handleCustomMaxChange(e.target.value)}
              className="w-full bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sector Dropdown */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Sector / Industry
        </label>
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="w-full bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Sectors (All NSE/BSE)</option>
          {(sectors && sectors.length > 0 ? sectors : DEFAULT_SECTORS).map((sec) => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
      </div>

      {/* Minimum Composite Score Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Min Composite Score
          </label>
          <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            ≥ {minScore}/100
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0 (All)</span>
          <span>60 (Watch)</span>
          <span>80+ (Strong)</span>
        </div>
      </div>

      {/* Risk Level Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Risk Tolerance Level
        </label>
        <div className="flex gap-1.5">
          {['All', 'Low', 'Medium', 'High'].map((risk) => {
            const active = selectedRisk === risk || (risk === 'All' && !selectedRisk);
            return (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk === 'All' ? '' : risk)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {risk}
              </button>
            );
          })}
        </div>
      </div>

      {/* Safety & Surveillance Toggle */}
      <div className="pt-2 border-t border-slate-200/80">
        <label className="flex items-center space-x-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeSurveillance}
            onChange={(e) => setExcludeSurveillance(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <div>
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Exclude GSM / ASM
            </span>
            <p className="text-[10px] text-slate-600">SEBI Surveillance list filter</p>
          </div>
        </label>
      </div>

    </div>
  );
}
