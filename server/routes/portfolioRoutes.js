const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const authMiddleware = require('../middleware/authMiddleware');

// All portfolio management routes are protected with JWT auth
router.use(authMiddleware);

router.get('/holdings', portfolioController.getHoldings);
router.get('/summary', portfolioController.getSummary);
router.post('/trade', portfolioController.addTrade);
router.put('/:id/sell', portfolioController.sellTrade);
router.delete('/:id', portfolioController.deleteTrade);

module.exports = router;
