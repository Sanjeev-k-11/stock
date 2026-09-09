require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
const { initSocket } = require('./services/socketService');
const { startLiveScanner } = require('./services/liveScanner');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const stockRoutes = require('./routes/stockRoutes');
const paperTradeRoutes = require('./routes/paperTradeRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

// Health check & SEBI Educational Disclaimer endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'StockSense',
    version: '1.1.0',
    market: 'NSE/BSE (Indian Equities)',
    streaming: 'Socket.io WebSocket High-Frequency Broadcaster',
    compliance: 'SEBI Research Analyst / Educational Decision-Support Tool',
    disclaimer: 'StockSense is an educational analytics tool. It does not provide personalized investment advice under SEBI regulations. Please consult a SEBI-registered Investment Adviser before making any trading decisions.',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/paper-trades', paperTradeRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Bootstrap Server with WebSockets
async function startServer() {
  // 1. Start HTTP Server immediately so Render health check passes instantly
  httpServer.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 StockSense Backend Server running on port ${PORT}`);
    console.log(`📡 API Base:    http://localhost:${PORT}/api`);
    console.log(`⚡ WebSocket:   ws://localhost:${PORT} (Socket.io)`);
    console.log(`📊 Health:      http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });

  // 2. Initialize Socket.io broadcaster
  initSocket(httpServer);

  // 3. Connect to Database and start Live Scanner in background
  try {
    await initDB();
    startLiveScanner(12000); // 12-second live streaming cycle
  } catch (err) {
    console.error('[SERVER BOOTSTRAP ERROR]', err);
  }
}

startServer();
