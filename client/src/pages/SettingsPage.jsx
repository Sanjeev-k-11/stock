import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { 
  User, 
  Lock, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Sliders
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Preference switches
  const [notifyStrong, setNotifyStrong] = useState(true);
  const [notifyTargetHit, setNotifyTargetHit] = useState(true);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setLoadingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
          Account Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your profile credentials, decision-support alerts, and security settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Profile Overview */}
        <div className="md:col-span-1 glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-heading font-extrabold text-2xl mx-auto shadow-inner">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="text-center">
              <h3 className="font-heading font-bold text-slate-900 text-base">{user?.name || 'Trader'}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Account Status:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Pro
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Market Tier:</span>
                <span className="font-mono font-semibold text-slate-800">NSE/BSE Equities</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full mt-8 btn-secondary py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Right 2 Cols: Security & Alerts */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Change Password Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-5">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-heading font-bold text-base text-slate-900">
                Security & Password
              </h2>
            </div>

            {passwordMsg.text && (
              <div className={`mb-4 p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingPassword}
                className="btn-primary py-2.5 px-5 rounded-xl font-semibold text-xs flex items-center space-x-2 shadow-md"
              >
                <span>{loadingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

          {/* Decision Support Notifications */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h2 className="font-heading font-bold text-base text-slate-900">
                Decision Support Alerts
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-slate-100 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Strong Candidate Scanner Alerts</span>
                  <span className="text-slate-500">Notify when an NSE stock hits composite score ≥ 80</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyStrong}
                  onChange={(e) => setNotifyStrong(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-slate-100 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Paper Trade Target / SL Hit Logs</span>
                  <span className="text-slate-500">Automated simulation alerts on virtual executions</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyTargetHit}
                  onChange={(e) => setNotifyTargetHit(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                />
              </label>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
