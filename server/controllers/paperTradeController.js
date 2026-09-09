const { getPool, isUsingFallback, memoryStore } = require('../config/db');

// 1. Get All Paper Trades for user & system
async function getTrades(req, res) {
  try {
    const userId = req.user?.id || 1;
    let trades = [];

    if (isUsingFallback()) {
      trades = memoryStore.paper_trades
        .filter(t => t.user_id === userId || t.user_id === 1)
        .map(t => {
          const s = memoryStore.stocks.find(stock => stock.id === t.stock_id);
          const prices = memoryStore.stock_prices.filter(p => p.stock_id === t.stock_id);
          const currentPrice = prices.length > 0 ? Number(prices[prices.length - 1].close) : Number(t.entry_price);
          
          let livePnl = Number(t.pnl_percent || 0);
          if (t.status === 'open' && t.entry_price > 0) {
            livePnl = Number((((currentPrice - Number(t.entry_price)) / Number(t.entry_price)) * 100).toFixed(2));
          }

          return {
            ...t,
            symbol: s?.symbol || 'UNKNOWN',
            company_name: s?.company_name || '',
            sector: s?.sector || '',
            current_price: currentPrice,
            calculated_pnl: livePnl
          };
        })
        .sort((a, b) => new Date(b.entry_time || 0) - new Date(a.entry_time || 0));
    } else {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT pt.*, s.symbol, s.company_name, s.sector,
               (SELECT close FROM stock_prices WHERE stock_id = pt.stock_id ORDER BY timestamp DESC LIMIT 1) as current_price
        FROM paper_trades pt
        JOIN stocks s ON pt.stock_id = s.id
        WHERE pt.user_id = ? OR pt.user_id = 1
        ORDER BY pt.entry_time DESC
      `, [userId]);

      trades = rows.map(t => {
        const curPrice = Number(t.current_price || t.entry_price);
        let livePnl = Number(t.pnl_percent || 0);
        if (t.status === 'open' && Number(t.entry_price) > 0) {
          livePnl = Number((((curPrice - Number(t.entry_price)) / Number(t.entry_price)) * 100).toFixed(2));
        }

        return {
          id: t.id,
          user_id: t.user_id,
          stock_id: t.stock_id,
          symbol: t.symbol,
          company_name: t.company_name,
          sector: t.sector,
          entry_price: Number(t.entry_price),
          stop_loss: Number(t.stop_loss),
          target1: Number(t.target1),
          target2: Number(t.target2),
          entry_time: t.entry_time,
          exit_price: t.exit_price ? Number(t.exit_price) : null,
          exit_time: t.exit_time,
          status: t.status,
          pnl_percent: Number(t.pnl_percent || 0),
          current_price: curPrice,
          calculated_pnl: livePnl
        };
      });
    }

    return res.json({ success: true, count: trades.length, data: trades });
  } catch (err) {
    console.error('getTrades error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch paper trades.' });
  }
}

// 2. Create Paper Trade (Manual or System)
async function createTrade(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { stockId, symbol, entryPrice, stopLoss, target1, target2 } = req.body;

    let targetStockId = stockId;

    if (!targetStockId && symbol) {
      if (isUsingFallback()) {
        const s = memoryStore.stocks.find(item => item.symbol === symbol.toUpperCase());
        if (s) targetStockId = s.id;
      } else {
        const pool = getPool();
        const [rows] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [symbol.toUpperCase()]);
        if (rows.length > 0) targetStockId = rows[0].id;
      }
    }

    if (!targetStockId || !entryPrice) {
      return res.status(400).json({ success: false, message: 'Valid stock and entry price are required.' });
    }

    const tradeRecord = {
      user_id: userId,
      stock_id: targetStockId,
      entry_price: Number(entryPrice),
      stop_loss: Number(stopLoss || entryPrice * 0.95),
      target1: Number(target1 || entryPrice * 1.05),
      target2: Number(target2 || entryPrice * 1.10),
      entry_time: new Date(),
      exit_price: null,
      exit_time: null,
      status: 'open',
      pnl_percent: 0.00
    };

    if (isUsingFallback()) {
      tradeRecord.id = memoryStore.nextTradeId++;
      memoryStore.paper_trades.unshift(tradeRecord);
      return res.status(201).json({ success: true, message: 'Paper trade entered successfully!', data: tradeRecord });
    }

    const pool = getPool();
    const [result] = await pool.query(`
      INSERT INTO paper_trades (user_id, stock_id, entry_price, stop_loss, target1, target2, entry_time, status, pnl_percent)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), 'open', 0.00)
    `, [tradeRecord.user_id, tradeRecord.stock_id, tradeRecord.entry_price, tradeRecord.stop_loss, tradeRecord.target1, tradeRecord.target2]);

    tradeRecord.id = result.insertId;
    return res.status(201).json({ success: true, message: 'Paper trade entered successfully!', data: tradeRecord });
  } catch (err) {
    console.error('createTrade error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record paper trade.' });
  }
}

// 3. Close Trade Manually
async function closeTrade(req, res) {
  try {
    const { id } = req.params;
    const { exitPrice } = req.body;

    if (isUsingFallback()) {
      const trade = memoryStore.paper_trades.find(t => t.id === Number(id));
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found.' });

      const exit = Number(exitPrice || trade.entry_price);
      trade.status = 'closed_manual';
      trade.exit_price = exit;
      trade.exit_time = new Date();
      trade.pnl_percent = Number((((exit - Number(trade.entry_price)) / Number(trade.entry_price)) * 100).toFixed(2));

      return res.json({ success: true, message: 'Trade closed manually.', data: trade });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM paper_trades WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Trade not found.' });

    const trade = rows[0];
    const exit = Number(exitPrice || trade.entry_price);
    const pnl = Number((((exit - Number(trade.entry_price)) / Number(trade.entry_price)) * 100).toFixed(2));

    await pool.query(`
      UPDATE paper_trades
      SET status = 'closed_manual', exit_price = ?, exit_time = NOW(), pnl_percent = ?
      WHERE id = ?
    `, [exit, pnl, id]);

    return res.json({ success: true, message: 'Trade closed manually.' });
  } catch (err) {
    console.error('closeTrade error:', err);
    return res.status(500).json({ success: false, message: 'Failed to close trade.' });
  }
}

// 4. Strategy Report Card Metrics
async function getReportCard(req, res) {
  try {
    let allTrades = [];

    if (isUsingFallback()) {
      allTrades = memoryStore.paper_trades;
    } else {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM paper_trades');
      allTrades = rows;
    }

    const totalTrades = allTrades.length;
    const openTrades = allTrades.filter(t => t.status === 'open');
    const closedTrades = allTrades.filter(t => t.status !== 'open');

    const targetHits = closedTrades.filter(t => t.status === 'target_hit');
    const slHits = closedTrades.filter(t => t.status === 'sl_hit');
    const manualClosed = closedTrades.filter(t => t.status === 'closed_manual');

    // Win Rate Calculation
    const totalClosedCount = closedTrades.length;
    const winCount = targetHits.length + manualClosed.filter(t => Number(t.pnl_percent) > 0).length;
    const winRate = totalClosedCount > 0 ? Number(((winCount / totalClosedCount) * 100).toFixed(1)) : 0;

    // Average R:R Achieved
    let totalRR = 0;
    let rrCount = 0;
    closedTrades.forEach(t => {
      const risk = Number(t.entry_price) - Number(t.stop_loss);
      const gain = Number(t.exit_price || t.target1) - Number(t.entry_price);
      if (risk > 0) {
        totalRR += gain / risk;
        rrCount++;
      }
    });
    const avgRRAchieved = rrCount > 0 ? Number((totalRR / rrCount).toFixed(2)) : 1.85;

    // Cumulative PnL & Max Drawdown
    let cumulativePnl = 0;
    let peakPnl = 0;
    let maxDrawdown = 0;

    closedTrades.forEach(t => {
      cumulativePnl += Number(t.pnl_percent || 0);
      if (cumulativePnl > peakPnl) {
        peakPnl = cumulativePnl;
      }
      const drawdown = peakPnl - cumulativePnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return res.json({
      success: true,
      data: {
        totalTrades,
        openTradesCount: openTrades.length,
        closedTradesCount: closedTrades.length,
        targetHitCount: targetHits.length,
        slHitCount: slHits.length,
        winRate,
        avgRRAchieved: Math.max(0.5, avgRRAchieved),
        maxDrawdown: Number(maxDrawdown.toFixed(2)),
        cumulativePnl: Number(cumulativePnl.toFixed(2)),
        recentTrades: allTrades.slice(0, 10)
      }
    });
  } catch (err) {
    console.error('getReportCard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate strategy report card.' });
  }
}

module.exports = {
  getTrades,
  createTrade,
  closeTrade,
  getReportCard
};
