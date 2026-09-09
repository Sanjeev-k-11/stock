import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <TrendingUp className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Welcome Back to StockSense
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Log in to access live stock scans, comparisons & paper portfolios
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/80 shadow-xl">
          
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("For demo purposes, you can create a new account with your email or reset credentials in Settings."); }} className="text-xs text-indigo-600 hover:underline font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick 1-Click Demo Login */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@stocksense.in');
                  setPassword('password123');
                }}
                className="w-full py-2.5 px-3 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Auto-Fill Demo Credentials (demo@stocksense.in)</span>
              </button>
            </div>

          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
              Create free account
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
