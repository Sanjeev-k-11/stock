const express = require('express');
const router = express.Router();
const { getTrades, createTrade, closeTrade, getReportCard } = require('../controllers/paperTradeController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/report-card', authMiddleware, getReportCard);
router.get('/', authMiddleware, getTrades);
router.post('/', authMiddleware, createTrade);
router.post('/:id/close', authMiddleware, closeTrade);

module.exports = router;
