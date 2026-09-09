import React from 'react';
import { ShieldAlert, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer id="disclaimer" className="mt-20 border-t border-slate-200/80 bg-white/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* SEBI Compliance Banner */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-4 shadow-sm">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="text-xs text-amber-900/90 leading-relaxed font-normal">
            <p className="font-semibold text-amber-950 text-sm mb-0.5">SEBI Regulatory & Decision-Support Disclaimer</p>
            <p>
              StockSense is an independent algorithmic and educational decision-support platform designed to assist retail investors in systematic screening. <strong>StockSense is NOT a SEBI-registered Investment Adviser (RIA) or Portfolio Management Service (PMS)</strong> and does not provide personalized investment advice or guaranteed return forecasts. All metrics, composite AI scores, and simulated paper-trading logs are strictly for informational and educational purposes. Always consult a SEBI-registered investment advisor prior to deploying real capital in Indian equities.
            </p>
          </div>
        </div>

        {/* Links & Brand Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/60 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-white">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-800">StockSense Platform</span>
            <span>— © {new Date().getFullYear()} All Rights Reserved.</span>
          </div>

          <div className="flex items-center space-x-6 text-slate-600">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">Scanner</Link>
            <Link to="/compare" className="hover:text-indigo-600 transition-colors">Compare</Link>
            <Link to="/paper-trades" className="hover:text-indigo-600 transition-colors">Paper Trading</Link>
            <span className="text-slate-300">|</span>
            <span className="flex items-center text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> NSE/BSE Filter Active
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
