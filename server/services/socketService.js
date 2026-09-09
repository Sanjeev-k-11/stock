const { Server } = require('socket.io');

let io = null;

/**
 * Socket.io Service for StockSense Real-Time Live Streaming
 * 
 * Free-Tier vs Paid Broker Feed Tradeoff:
 * -------------------------------------------------------------
 * 1. Free-Tier (Current):
 *    - Uses periodic exchange polling (every 10-15 seconds) via public market gateways.
 *    - Pushes data instantly to connected clients via WebSockets so the UI feels alive with 0 client polling.
 *    - Complies with rate limits and includes circuit-breaker backoff.
 * 
 * 2. Paid Broker Feed (Documented Upgrade Path):
 *    - For sub-second, true tick-by-tick market depth (L2/L3 streaming):
 *      - Zerodha Kite Connect WebSocket API (kite.trade)
 *      - Upstox WebSocket Streamer (upstox.com/developer/api-documentation)
 *      - Angel One SmartAPI WebSocket (smartapi.angelbroking.com)
 *    - To upgrade, replace the liveScanner polling loop with a direct broker WebSocket subscription
 *      and pass incoming ticks straight into broadcastStockUpdates().
 */

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
    transports: ['polling', 'websocket'],
    allowUpgrades: true
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Default join room for all live market updates
    socket.join('live-stocks');

    // Send immediate initial heartbeat so client knows it is connected instantly
    socket.emit('heartbeat', {
      isMarketOpen: true,
      timestamp: new Date().toISOString(),
      connectedClients: io.engine.clientsCount || 1
    });

    // Subscribe to specific stock symbols (e.g. for Compare page or Stock Detail page)
    socket.on('subscribe-symbols', (symbols) => {
      if (Array.isArray(symbols)) {
        symbols.forEach(sym => {
          if (sym) {
            const cleanSym = String(sym).toUpperCase().trim();
            socket.join(`symbol-${cleanSym}`);
          }
        });
      }
    });

    // Unsubscribe from specific symbols
    socket.on('unsubscribe-symbols', (symbols) => {
      if (Array.isArray(symbols)) {
        symbols.forEach(sym => {
          if (sym) {
            const cleanSym = String(sym).toUpperCase().trim();
            socket.leave(`symbol-${cleanSym}`);
          }
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

// Broadcast updated stocks array to all subscribers
function broadcastStockUpdates(updatedStocks) {
  if (!io || !updatedStocks || updatedStocks.length === 0) return;

  // Broadcast to global live-stocks room
  io.to('live-stocks').emit('stock-update', updatedStocks);

  // Broadcast to symbol-specific rooms
  updatedStocks.forEach(stock => {
    if (stock && stock.symbol) {
      io.to(`symbol-${stock.symbol.toUpperCase()}`).emit('stock-update', [stock]);
    }
  });
}

// Broadcast heartbeat to ensure frontend knows connection is actively streaming
function broadcastHeartbeat(meta = {}) {
  if (!io) return;
  io.to('live-stocks').emit('heartbeat', {
    timestamp: new Date().toISOString(),
    connectedClients: io.engine.clientsCount || 0,
    ...meta
  });
}

// Broadcast paper trade status changes (target_hit, sl_hit, etc.)
function broadcastTradeUpdate(tradeData) {
  if (!io || !tradeData) return;
  io.emit('trade-update', tradeData);
}

module.exports = {
  initSocket,
  getIO,
  broadcastStockUpdates,
  broadcastHeartbeat,
  broadcastTradeUpdate
};
