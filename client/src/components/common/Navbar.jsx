import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  TrendingUp, 
  BarChart2, 
  Layers, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  User,
  Sparkles,
  Search,
  Briefcase
} from 'lucide-react';
import { stockApi } from '../../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsSearchLoading(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await stockApi.searchStocks(val);
        if (res && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearchLoading(false);
      }
    }, 200);
  };

  const handleSelectStock = (sym) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    navigate(`/stocks/${sym}`);
  };

  const navLinks = [
    { name: 'Scanner', path: '/dashboard', icon: BarChart2 },
    { name: 'Stock Comparison', path: '/compare', icon: Layers },
    { name: 'Paper Trading', path: '/paper-trades', icon: FileSpreadsheet },
    { name: 'My Broker Portfolio', path: '/portfolio', icon: Briefcase }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-slate-200/80 transition-all duration-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <TrendingUp className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 bg-clip-text text-transparent">
                  StockSense
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold font-mono tracking-wide bg-indigo-50 text-indigo-600 rounded border border-indigo-200/60">
                  NSE/BSE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium -mt-0.5">AI Stock Scanner & Decision Support</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user ? (
            <div className="hidden lg:flex items-center space-x-4">
              {/* Global Quick Search Bar */}
              <div className="relative w-64 xl:w-80">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setIsSearching(true); }}
                    placeholder="Search any NSE stock..."
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" />
                  {isSearchLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin absolute right-3 top-2.5"></div>
                  ) : searchQuery ? (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); }}
                      className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearching && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 max-h-80 overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      NSE / BSE Market Results
                    </div>
                    {searchResults.map((item) => (
                      <button
                        key={item.symbol}
                        onClick={() => handleSelectStock(item.symbol)}
                        className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-indigo-50/80 transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 font-mono">
                              {item.symbol}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 rounded font-semibold">
                              {item.exchange || 'NSE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{item.company_name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">{item.sector}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <nav className="flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-6">
              <a href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">How It Works</a>
              <a href="/#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="/#compliance" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Compliance</a>
            </div>
          )}

          {/* Right Action Area */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60 text-xs text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-medium">Live Market Sync</span>
                </div>

                <Link
                  to="/settings"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Settings & Profile"
                >
                  <Settings className="w-5 h-5" />
                </Link>

                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary px-4 py-2 text-sm font-semibold rounded-xl flex items-center space-x-1.5 shadow-md shadow-indigo-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started Free</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-2">
          {user ? (
            <>
              <div className="py-2 px-3 mb-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-600">
                <span>Signed in as <strong className="text-slate-900">{user.name}</strong></span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live
                </span>
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-indigo-600" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Settings className="w-5 h-5 text-slate-500" />
                <span>Account Settings</span>
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 border border-slate-200 text-slate-800 font-semibold rounded-xl text-sm"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 btn-primary font-semibold rounded-xl text-sm shadow-md"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
