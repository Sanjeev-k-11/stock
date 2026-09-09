import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Radio, Wifi, WifiOff } from 'lucide-react';

export default function LiveIndicator({ className = '' }) {
  const { isConnected, secondsAgo } = useSocket();

  let statusText = 'Connecting...';
  let dotColor = 'bg-amber-400';
  let badgeBorder = 'border-amber-200/80 bg-amber-50/70 text-amber-800';

  if (isConnected) {
    if (secondsAgo <= 20) {
      statusText = `Live • updated ${secondsAgo}s ago`;
      dotColor = 'bg-emerald-500 animate-pulse';
      badgeBorder = 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800';
    } else if (secondsAgo <= 45) {
      statusText = `Live • ${secondsAgo}s ago`;
      dotColor = 'bg-amber-500';
      badgeBorder = 'border-amber-200/80 bg-amber-50/70 text-amber-800';
    } else {
      statusText = 'Streaming Paused';
      dotColor = 'bg-slate-400';
      badgeBorder = 'border-slate-200 bg-slate-50 text-slate-600';
    }
  } else {
    statusText = 'Disconnected • Reconnecting';
    dotColor = 'bg-rose-500 animate-ping';
    badgeBorder = 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm transition-all duration-300 ${badgeBorder} ${className}`}
      title={isConnected ? 'Connected to live exchange streaming via WebSockets' : 'Reconnecting to live WebSocket stream...'}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      <span className="font-mono tracking-tight text-[11px]">{statusText}</span>
    </div>
  );
}
