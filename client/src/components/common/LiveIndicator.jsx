import React from 'react';
import { useSocket } from '../../context/SocketContext';

export default function LiveIndicator({ className = '' }) {
  const { isConnected, secondsAgo, isMarketOpen } = useSocket();

  let statusText = 'Connecting...';
  let dotColor = 'bg-amber-400 animate-pulse';
  let badgeBorder = 'border-amber-200/80 bg-amber-50/70 text-amber-800';

  if (isConnected) {
    if (isMarketOpen) {
      statusText = `Live Market • updated ${Math.min(secondsAgo, 15)}s ago`;
      dotColor = 'bg-emerald-500 animate-pulse';
      badgeBorder = 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800';
    } else {
      statusText = `Post-Market • Live (${Math.min(secondsAgo, 15)}s)`;
      dotColor = 'bg-indigo-500 animate-pulse';
      badgeBorder = 'border-indigo-200/80 bg-indigo-50/70 text-indigo-800';
    }
  } else {
    statusText = 'Connecting • Live Stream';
    dotColor = 'bg-amber-400 animate-pulse';
    badgeBorder = 'border-amber-200/80 bg-amber-50/80 text-amber-800';
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm shadow-sm transition-all duration-300 ${badgeBorder} ${className}`}
      title={isConnected ? (isMarketOpen ? 'Connected to live exchange streaming via WebSockets' : 'Connected to post-market streaming') : 'Connecting to live WebSocket stream...'}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      <span className="font-mono tracking-tight text-[11px]">{statusText}</span>
    </div>
  );
}
