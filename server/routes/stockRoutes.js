const express = require('express');
const router = express.Router();
const { getStocks, getStockDetail, searchLiveStocks, compareStocks, getSectors, getMarketPulse } = require('../controllers/stockController');
const authMiddleware = require('../middleware/authMiddleware');


// Real-Time Live Benchmark Indices & Market Pulse (NIFTY 50, SENSEX, Commodities, Crypto)
router.get('/market-pulse', getMarketPulse);

// Public/Landing preview & scanner
router.get('/preview', (req, res, next) => {
  // Return top 5 stocks for public landing page
  req.query.limit = 5;
  getStocks(req, res, next);
});

// Autocomplete search across all 2000+ NSE & BSE stocks
router.get('/search', searchLiveStocks);

// Sectors (public or auth)
router.get('/sectors', getSectors);


// Comparison endpoint
router.get('/compare', authMiddleware, compareStocks);

// Single stock details
router.get('/:symbol', authMiddleware, getStockDetail);

// Main scanner list
router.get('/', authMiddleware, getStocks);

module.exports = router;
