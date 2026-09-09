import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [activeSubscribersCount, setActiveSubscribersCount] = useState(0);
  
  // High-performance Map of live stock updates (symbol -> partial updated stock entity)
  const [liveUpdatesMap, setLiveUpdatesMap] = useState({});
  const socketRef = useRef(null);
  const batchedUpdatesRef = useRef({});
  const rafHandleRef = useRef(null);

  // Determine socket connection URL
  const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    if (apiUrl.startsWith('http')) {
      return apiUrl.replace('/api', '');
    }
    // Default to localhost:5000 in development
    return window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
  };

  useEffect(() => {
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[WEBSOCKET] Connected to live streaming server: ${socket.id}`);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[WEBSOCKET] Disconnected from server: ${reason}`);
      setIsConnected(false);
    });

    socket.on('heartbeat', (data) => {
      setLastHeartbeat(Date.now());
      setSecondsAgo(0);
      if (data?.connectedClients) {
        setActiveSubscribersCount(data.connectedClients);
      }
    });

    // Handle high-frequency stock updates with RAF batching
    socket.on('stock-update', (updatedStocks) => {
      if (!Array.isArray(updatedStocks) || updatedStocks.length === 0) return;

      // Accumulate updates in batch buffer
      updatedStocks.forEach(stock => {
        if (stock?.symbol) {
          batchedUpdatesRef.current[stock.symbol.toUpperCase()] = {
            ...stock,
            _receivedAt: Date.now()
          };
        }
      });

      // Schedule RAF state merge to prevent UI freeze
      if (!rafHandleRef.current) {
        rafHandleRef.current = requestAnimationFrame(() => {
          setLiveUpdatesMap(prev => ({
            ...prev,
            ...batchedUpdatesRef.current
          }));
          batchedUpdatesRef.current = {};
          rafHandleRef.current = null;
        });
      }
    });

    // Heartbeat ticker (runs every second on client to update "Xs ago")
    const ticker = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(ticker);
      if (rafHandleRef.current) cancelAnimationFrame(rafHandleRef.current);
      socket.disconnect();
    };
  }, []);

  // Subscribe to specific stock symbols (for Compare / Detail pages)
  const subscribeSymbols = useCallback((symbols) => {
    if (socketRef.current && socketRef.current.connected && Array.isArray(symbols)) {
      socketRef.current.emit('subscribe-symbols', symbols);
    }
  }, []);

  // Unsubscribe from specific stock symbols
  const unsubscribeSymbols = useCallback((symbols) => {
    if (socketRef.current && socketRef.current.connected && Array.isArray(symbols)) {
      socketRef.current.emit('unsubscribe-symbols', symbols);
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        lastHeartbeat,
        secondsAgo,
        activeSubscribersCount,
        liveUpdatesMap,
        stockUpdates: liveUpdatesMap,
        subscribeSymbols,
        unsubscribeSymbols
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
