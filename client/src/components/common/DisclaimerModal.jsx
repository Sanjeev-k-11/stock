import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('stocksense_disclaimer_accepted_v1');
    if (!accepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('stocksense_disclaimer_accepted_v1', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 transform transition-all">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
        </div>

        <h3 className="text-xl font-heading font-bold text-center text-slate-900 mb-2">
          Regulatory & Educational Notice
        </h3>

        <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 my-5 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
          <p>
            <strong>StockSense</strong> is an educational analytics and decision-support tool. It does <strong>not</strong> provide personalized investment advice under SEBI regulations.
          </p>
          <p>
            Please consult a <strong>SEBI-registered Investment Adviser (RIA)</strong> before making any real trading or investment decisions. Past algorithmic performance and paper-trading results do not guarantee future returns.
          </p>
        </div>

        <button
          onClick={handleAcknowledge}
          className="w-full btn-primary py-3.5 px-6 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
        >
          <ShieldCheck className="w-5 h-5" />
          <span>I Understand & Acknowledge</span>
        </button>
      </div>
    </div>
  );
}
