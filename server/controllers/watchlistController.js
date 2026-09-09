const { getPool, isUsingFallback, memoryStore } = require('../config/db');

async function getWatchlist(req, res) {
  try {
    const userId = req.user.id;
    let watchlistStocks = [];

    if (isUsingFallback()) {
      const userWatch = memoryStore.watchlists.filter(w => w.user_id === userId);
      watchlistStocks = userWatch.map(w => {
        const s = memoryStore.stocks.find(stock => stock.id === w.stock_id);
        const sc = memoryStore.stock_scores.find(stock => stock.stock_id === w.stock_id);
        const prices = memoryStore.stock_prices.filter(p => p.stock_id === w.stock_id);
        const latestP = prices.length > 0 ? prices[prices.length - 1] : null;
        return {
          id: w.id,
          stock_id: w.stock_id,
          symbol: s?.symbol,
          company_name: s?.company_name,
          sector: s?.sector,
          close: latestP ? Number(latestP.close) : 0,
          final_score: sc ? Number(sc.final_score) : 0,
          suggestion_label: sc ? sc.suggestion_label : 'WATCH',
          added_at: w.added_at
        };
      });
    } else {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT w.id, w.stock_id, w.added_at, s.symbol, s.company_name, s.sector,
               sc.final_score, sc.suggestion_label,
               (SELECT close FROM stock_prices WHERE stock_id = s.id ORDER BY timestamp DESC LIMIT 1) as close
        FROM watchlists w
        JOIN stocks s ON w.stock_id = s.id
        LEFT JOIN stock_scores sc ON sc.stock_id = s.id
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
      `, [userId]);

      watchlistStocks = rows;
    }

    return res.json({ success: true, count: watchlistStocks.length, data: watchlistStocks });
  } catch (err) {
    console.error('getWatchlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch watchlist.' });
  }
}

async function addToWatchlist(req, res) {
  try {
    const userId = req.user.id;
    const { stockId, symbol } = req.body;

    let targetId = stockId;
    if (!targetId && symbol) {
      if (isUsingFallback()) {
        const s = memoryStore.stocks.find(item => item.symbol === symbol.toUpperCase());
        if (s) targetId = s.id;
      } else {
        const pool = getPool();
        const [rows] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [symbol.toUpperCase()]);
        if (rows.length > 0) targetId = rows[0].id;
      }
    }

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'Valid stock ID or symbol required.' });
    }

    if (isUsingFallback()) {
      const exists = memoryStore.watchlists.some(w => w.user_id === userId && w.stock_id === targetId);
      if (exists) {
        return res.status(400).json({ success: false, message: 'Stock is already in your watchlist.' });
      }
      memoryStore.watchlists.push({
        id: memoryStore.watchlists.length + 1,
        user_id: userId,
        stock_id: targetId,
        added_at: new Date()
      });
      return res.status(201).json({ success: true, message: 'Added to watchlist!' });
    }

    const pool = getPool();
    await pool.query(
      'INSERT IGNORE INTO watchlists (user_id, stock_id) VALUES (?, ?)',
      [userId, targetId]
    );

    return res.status(201).json({ success: true, message: 'Added to watchlist!' });
  } catch (err) {
    console.error('addToWatchlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add to watchlist.' });
  }
}

async function removeFromWatchlist(req, res) {
  try {
    const userId = req.user.id;
    const { stockId } = req.params;

    if (isUsingFallback()) {
      memoryStore.watchlists = memoryStore.watchlists.filter(
        w => !(w.user_id === userId && (w.stock_id === Number(stockId) || w.id === Number(stockId)))
      );
      return res.json({ success: true, message: 'Removed from watchlist.' });
    }

    const pool = getPool();
    const isNum = /^\d+$/.test(stockId);
    if (isNum) {
      const numId = parseInt(stockId, 10);
      await pool.query(
        'DELETE FROM watchlists WHERE user_id = ? AND (stock_id = ? OR id = ?)',
        [userId, numId, numId]
      );
    } else {
      const [sRows] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [String(stockId).toUpperCase()]);
      if (sRows.length > 0) {
        await pool.query('DELETE FROM watchlists WHERE user_id = ? AND stock_id = ?', [userId, sRows[0].id]);
      }
    }

    return res.json({ success: true, message: 'Removed from watchlist.' });
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove from watchlist.' });
  }
}

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
};
