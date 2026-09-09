const { getPool, isUsingFallback, memoryStore } = require('../config/db');
const { getLiveStockData } = require('../services/marketDataService');

/**
 * Controller for Managing External Broker Trades & Live Portfolio Valuations
 * (Zerodha Kite, Groww, Upstox, Angel One, Dhan, ICICI Direct, etc.)
 */

// GET /api/portfolio/holdings - Fetch user's active holdings or trade history
async function getHoldings(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { status = 'holding', broker } = req.query;

    if (isUsingFallback()) {
      let list = memoryStore.broker_holdings.filter(h => h.user_id === userId);
      if (status && status !== 'all') {
        list = list.filter(h => h.status === status);
      }
      if (broker && broker !== 'All') {
        list = list.filter(h => h.broker_name.toLowerCase() === broker.toLowerCase());
      }

      const enhanced = list.map(item => {
        const stock = memoryStore.stocks.find(s => s.id === item.stock_id) || {};
        const prices = memoryStore.stock_prices.filter(p => p.stock_id === item.stock_id);
        const lastPriceObj = prices.length > 0 ? prices[prices.length - 1] : { close: item.buy_price };
        const score = memoryStore.stock_scores.find(s => s.stock_id === item.stock_id) || {};

        const currentPrice = Number(lastPriceObj.close || item.buy_price);
        const investedAmount = Number(item.buy_price) * Number(item.quantity);
        const currentValue = currentPrice * Number(item.quantity);
        const pnl = currentValue - investedAmount;
        const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

        return {
          ...item,
          symbol: stock.symbol,
          company_name: stock.company_name,
          sector: stock.sector,
          current_price: currentPrice,
          invested_amount: Number(investedAmount.toFixed(2)),
          current_value: Number(currentValue.toFixed(2)),
          total_pnl: Number(pnl.toFixed(2)),
          pnl_percent: Number(pnlPercent.toFixed(2)),
          ai_score: score.final_score,
          suggestion_label: score.suggestion_label,
          suggestion_reason: score.suggestion_reason,
          stop_loss: item.stop_loss || score.stop_loss,
          target_price: item.target_price || score.target1
        };
      });

      return res.json({ success: true, data: enhanced });
    }

    // MySQL Implementation
    const pool = getPool();
    let query = `
      SELECT 
        bh.*,
        s.symbol,
        s.company_name,
        s.sector,
        s.is_gsm_asm,
        sp.close as current_price,
        sp.open as today_open,
        ss.final_score as ai_score,
        ss.suggestion_label,
        ss.suggestion_reason,
        ss.stop_loss as algo_stop_loss,
        ss.target1 as algo_target
      FROM broker_holdings bh
      JOIN stocks s ON bh.stock_id = s.id
      LEFT JOIN (
        SELECT stock_id, close, open
        FROM stock_prices
        WHERE id IN (
          SELECT MAX(id) FROM stock_prices GROUP BY stock_id
        )
      ) sp ON s.id = sp.stock_id
      LEFT JOIN (
        SELECT stock_id, final_score, suggestion_label, suggestion_reason, stop_loss, target1
        FROM stock_scores
        WHERE id IN (
          SELECT MAX(id) FROM stock_scores GROUP BY stock_id
        )
      ) ss ON s.id = ss.stock_id
      WHERE bh.user_id = ?
    `;

    const params = [userId];

    if (status && status !== 'all') {
      query += ` AND bh.status = ?`;
      params.push(status);
    }
    if (broker && broker !== 'All') {
      query += ` AND LOWER(bh.broker_name) = LOWER(?)`;
      params.push(broker);
    }

    query += ` ORDER BY bh.created_at DESC`;

    const [rows] = await pool.query(query, params);

    const enhanced = rows.map(item => {
      const currentPrice = Number(item.current_price || item.buy_price);
      const investedAmount = Number(item.buy_price) * Number(item.quantity);
      const currentValue = currentPrice * Number(item.quantity);
      const pnl = currentValue - investedAmount;
      const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;
      const todayOpen = Number(item.today_open || currentPrice);
      const dayPnl = (currentPrice - todayOpen) * Number(item.quantity);

      return {
        ...item,
        current_price: currentPrice,
        invested_amount: Number(investedAmount.toFixed(2)),
        current_value: Number(currentValue.toFixed(2)),
        total_pnl: Number(pnl.toFixed(2)),
        pnl_percent: Number(pnlPercent.toFixed(2)),
        day_pnl: Number(dayPnl.toFixed(2)),
        stop_loss: item.stop_loss || item.algo_stop_loss,
        target_price: item.target_price || item.algo_target
      };
    });

    return res.json({ success: true, data: enhanced });
  } catch (err) {
    console.error('Error fetching broker holdings:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch broker holdings.' });
  }
}

// POST /api/portfolio/trade - Record new trade from external broker
async function addTrade(req, res) {
  try {
    const userId = req.user?.id || 1;
    const {
      symbol,
      broker_name = 'Zerodha Kite',
      trade_type = 'DELIVERY',
      buy_price,
      quantity,
      buy_date = new Date(),
      target_price,
      stop_loss,
      notes
    } = req.body;

    if (!symbol || !buy_price || !quantity) {
      return res.status(400).json({ success: false, message: 'Stock Symbol, Buy Price, and Quantity are required.' });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    const numPrice = Number(buy_price);
    const numQty = parseInt(quantity, 10);

    if (numPrice <= 0 || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Buy Price and Quantity must be greater than 0.' });
    }

    if (isUsingFallback()) {
      let stock = memoryStore.stocks.find(s => s.symbol.toUpperCase() === cleanSymbol);
      if (!stock) {
        stock = {
          id: memoryStore.stocks.length + 1,
          symbol: cleanSymbol,
          company_name: `${cleanSymbol} Equities Ltd.`,
          sector: 'Indian Equities',
          market_cap: 10000000000,
          is_gsm_asm: 0,
          created_at: new Date()
        };
        memoryStore.stocks.push(stock);
      }

      const newHolding = {
        id: memoryStore.nextHoldingId++,
        user_id: userId,
        stock_id: stock.id,
        broker_name,
        trade_type,
        buy_price: numPrice,
        quantity: numQty,
        buy_date: new Date(buy_date),
        target_price: target_price ? Number(target_price) : null,
        stop_loss: stop_loss ? Number(stop_loss) : null,
        status: 'holding',
        sell_price: null,
        sell_date: null,
        realized_pnl: null,
        realized_pnl_percent: null,
        notes: notes || '',
        created_at: new Date()
      };

      memoryStore.broker_holdings.push(newHolding);
      return res.status(201).json({ success: true, message: 'Broker trade recorded successfully!', data: newHolding });
    }

    // MySQL Implementation
    const pool = getPool();
    let [stockRows] = await pool.query('SELECT id, symbol, company_name FROM stocks WHERE symbol = ?', [cleanSymbol]);
    let stockId;

    if (stockRows.length === 0) {
      // Dynamic fetch from live market if not yet in database
      const liveData = await getLiveStockData({ symbol: cleanSymbol });
      if (liveData) {
        const [ins] = await pool.query(
          'INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES (?, ?, ?, ?, ?)',
          [liveData.symbol, liveData.company_name, liveData.sector, liveData.market_cap, false]
        );
        stockId = (ins && ins[0] && ins[0].id) ? ins[0].id : (ins?.insertId || 0);
      } else {
        const [ins] = await pool.query(
          'INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES (?, ?, ?, ?, ?)',
          [cleanSymbol, cleanSymbol, 'Indian Equities', 50000000000, false]
        );
        stockId = (ins && ins[0] && ins[0].id) ? ins[0].id : (ins?.insertId || 0);
      }
    } else {
      stockId = stockRows[0].id;
    }

    const [insertRows, insertHeader] = await pool.query(
      `INSERT INTO broker_holdings 
        (user_id, stock_id, broker_name, trade_type, buy_price, quantity, buy_date, target_price, stop_loss, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'holding', ?)`,
      [
        userId,
        stockId,
        broker_name,
        trade_type,
        numPrice,
        numQty,
        new Date(buy_date),
        target_price ? Number(target_price) : null,
        stop_loss ? Number(stop_loss) : null,
        notes || ''
      ]
    );

    const insertedHoldingId = (insertRows && insertRows[0] && insertRows[0].id) ? insertRows[0].id : (insertHeader?.insertId || insertRows?.insertId || Date.now());

    return res.status(201).json({
      success: true,
      message: `Successfully logged purchase of ${numQty} shares of ${cleanSymbol} from ${broker_name}!`,
      data: { id: insertedHoldingId, stock_id: stockId, symbol: cleanSymbol }
    });
  } catch (err) {
    console.error('Error adding broker trade:', err);
    return res.status(500).json({ success: false, message: 'Failed to record broker trade.' });
  }
}

// PUT /api/portfolio/:id/sell - Record sale of shares / exit position
async function sellTrade(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { id } = req.params;
    const { sell_price, sell_date = new Date() } = req.body;

    if (!sell_price) {
      return res.status(400).json({ success: false, message: 'Sell price is required to close position.' });
    }

    const exitPrice = Number(sell_price);

    if (isUsingFallback()) {
      const holding = memoryStore.broker_holdings.find(h => h.id === Number(id) && h.user_id === userId);
      if (!holding) {
        return res.status(404).json({ success: false, message: 'Holding not found.' });
      }

      const invested = Number(holding.buy_price) * Number(holding.quantity);
      const totalExit = exitPrice * Number(holding.quantity);
      const pnl = totalExit - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      holding.status = 'sold';
      holding.sell_price = exitPrice;
      holding.sell_date = new Date(sell_date);
      holding.realized_pnl = Number(pnl.toFixed(2));
      holding.realized_pnl_percent = Number(pnlPct.toFixed(2));

      return res.json({ success: true, message: 'Position recorded as sold in Trade History!', data: holding });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM broker_holdings WHERE id = ? AND user_id = ?', [id, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trade holding record not found.' });
    }

    const holding = rows[0];
    const invested = Number(holding.buy_price) * Number(holding.quantity);
    const totalExit = exitPrice * Number(holding.quantity);
    const pnl = totalExit - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

    await pool.query(
      `UPDATE broker_holdings 
       SET status = 'sold', sell_price = ?, sell_date = ?, realized_pnl = ?, realized_pnl_percent = ?
       WHERE id = ? AND user_id = ?`,
      [exitPrice, new Date(sell_date), pnl, pnlPct, id, userId]
    );

    return res.json({
      success: true,
      message: `Position closed at ₹${exitPrice.toFixed(2)}. Realized P&L: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`
    });
  } catch (err) {
    console.error('Error selling trade:', err);
    return res.status(500).json({ success: false, message: 'Failed to record trade exit.' });
  }
}

// DELETE /api/portfolio/:id - Remove trade record
async function deleteTrade(req, res) {
  try {
    const userId = req.user?.id || 1;
    const { id } = req.params;

    if (isUsingFallback()) {
      const idx = memoryStore.broker_holdings.findIndex(h => h.id === Number(id) && h.user_id === userId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Holding not found.' });
      memoryStore.broker_holdings.splice(idx, 1);
      return res.json({ success: true, message: 'Trade record deleted.' });
    }

    const pool = getPool();
    await pool.query('DELETE FROM broker_holdings WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Trade record removed from portfolio.' });
  } catch (err) {
    console.error('Error deleting trade:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete trade record.' });
  }
}

// GET /api/portfolio/summary - Portfolio Aggregates & Broker Breakdown
async function getSummary(req, res) {
  try {
    const userId = req.user?.id || 1;

    let allHoldings = [];
    if (isUsingFallback()) {
      allHoldings = memoryStore.broker_holdings.filter(h => h.user_id === userId);
    } else {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT bh.*, s.symbol, s.company_name, s.sector, sp.close as current_price
         FROM broker_holdings bh
         JOIN stocks s ON bh.stock_id = s.id
         LEFT JOIN (
           SELECT stock_id, close FROM stock_prices WHERE id IN (SELECT MAX(id) FROM stock_prices GROUP BY stock_id)
         ) sp ON s.id = sp.stock_id
         WHERE bh.user_id = ?`,
        [userId]
      );
      allHoldings = rows;
    }

    const active = allHoldings.filter(h => h.status === 'holding');
    const closed = allHoldings.filter(h => h.status === 'sold');

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const brokerMap = {};
    const sectorMap = {};

    active.forEach(item => {
      const curPrice = Number(item.current_price || item.buy_price);
      const inv = Number(item.buy_price) * Number(item.quantity);
      const val = curPrice * Number(item.quantity);

      totalInvested += inv;
      totalCurrentValue += val;

      // Broker breakdown
      const b = item.broker_name || 'Other';
      brokerMap[b] = (brokerMap[b] || 0) + val;

      // Sector breakdown
      const sec = item.sector || 'Equities';
      sectorMap[sec] = (sectorMap[sec] || 0) + val;
    });

    const unrealizedPnl = totalCurrentValue - totalInvested;
    const unrealizedPnlPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;

    let realizedPnl = 0;
    let winCount = 0;
    let lossCount = 0;

    closed.forEach(item => {
      const p = Number(item.realized_pnl || 0);
      realizedPnl += p;
      if (p >= 0) winCount++;
      else lossCount++;
    });

    const totalClosed = winCount + lossCount;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalInvested: Number(totalInvested.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
        unrealizedPnlPercent: Number(unrealizedPnlPct.toFixed(2)),
        realizedPnl: Number(realizedPnl.toFixed(2)),
        activeHoldingsCount: active.length,
        closedTradesCount: closed.length,
        winRate: Number(winRate.toFixed(1)),
        brokerAllocation: Object.entries(brokerMap).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2)),
          percentage: totalCurrentValue > 0 ? Number(((value / totalCurrentValue) * 100).toFixed(1)) : 0
        })),
        sectorAllocation: Object.entries(sectorMap).map(([name, value]) => ({
          name,
          value: Number(value.toFixed(2)),
          percentage: totalCurrentValue > 0 ? Number(((value / totalCurrentValue) * 100).toFixed(1)) : 0
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching portfolio summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate portfolio summary.' });
  }
}

module.exports = {
  getHoldings,
  addTrade,
  sellTrade,
  deleteTrade,
  getSummary
};
