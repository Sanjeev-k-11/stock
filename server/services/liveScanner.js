const { getPool, isUsingFallback, memoryStore } = require('../config/db');
const { computeStockScore } = require('./scoringEngine');
const { getLiveStockData, NSE_SYMBOLS } = require('./marketDataService');
const { broadcastStockUpdates, broadcastHeartbeat, broadcastTradeUpdate } = require('./socketService');

/**
 * StockSense High-Frequency Live Market Scanner & WebSocket Broadcaster
 * 
 * Frequency: Every 12 seconds per batch
 * Error Handling: Promise.allSettled + Circuit Breaker failure backoff
 */

// In-memory cache of last broadcast state to ensure we only broadcast actual changes
const lastBroadcastState = new Map(); // symbol -> { price, score, suggestion }
const failureCounts = new Map();     // symbol -> consecutive failure count
const backoffUntil = new Map();      // symbol -> timestamp ms

let isScannerRunning = false;
let scannerIntervalTimer = null;

function isMarketHours() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utc + (3600000 * 5.5)); // IST = UTC + 5:30
  
  const day = istTime.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return true; // Keep active in development/testing mode

  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 15; // 9:15 IST
  const marketClose = 15 * 60 + 30; // 15:30 IST

  return (timeInMinutes >= marketOpen && timeInMinutes <= marketClose) || process.env.NODE_ENV === 'development';
}

function formatStockUpdateEntity(stock, fundamentals, indicators, score, latestPrice) {
  return {
    id: stock.id,
    symbol: stock.symbol,
    company_name: stock.company_name,
    sector: stock.sector,
    market_cap: Number(stock.market_cap),
    is_gsm_asm: Boolean(stock.is_gsm_asm),
    price: latestPrice ? {
      open: Number(latestPrice.open),
      high: Number(latestPrice.high),
      low: Number(latestPrice.low),
      close: Number(latestPrice.close),
      volume: Number(latestPrice.volume),
      timestamp: latestPrice.timestamp
    } : null,
    fundamentals: fundamentals ? {
      promoter_holding: Number(fundamentals.promoter_holding),
      promoter_holding_trend: fundamentals.promoter_holding_trend,
      debt_to_equity: Number(fundamentals.debt_to_equity),
      earnings_growth_yoy: Number(fundamentals.earnings_growth_yoy),
      earnings_growth_qoq: Number(fundamentals.earnings_growth_qoq),
      avg_daily_delivery_pct: Number(fundamentals.avg_daily_delivery_pct)
    } : null,
    indicators: indicators ? {
      rsi: Number(indicators.rsi),
      macd: Number(indicators.macd),
      macd_signal: Number(indicators.macd_signal),
      ema20: Number(indicators.ema20),
      ema50: Number(indicators.ema50),
      ema200: Number(indicators.ema200),
      atr: Number(indicators.atr),
      adx: Number(indicators.adx),
      obv: Number(indicators.obv),
      volume_trend: indicators.volume_trend,
      support_level: Number(indicators.support_level),
      resistance_level: Number(indicators.resistance_level)
    } : null,
    score: score ? {
      trend_score: Number(score.trend_score || score.trendScore),
      momentum_score: Number(score.momentum_score || score.momentumScore),
      volume_score: Number(score.volume_score || score.volumeScore),
      risk_score: Number(score.risk_score || score.riskScore),
      final_score: Number(score.final_score || score.finalScore),
      risk_level: score.risk_level || score.riskLevel,
      entry_price: Number(score.entry_price || score.entryPrice),
      stop_loss: Number(score.stop_loss || score.stopLoss),
      target1: Number(score.target1 || score.target1),
      target2: Number(score.target2 || score.target2),
      risk_reward_ratio: Number(score.risk_reward_ratio || score.riskRewardRatio),
      suggestion_label: score.suggestion_label || score.suggestionLabel,
      suggestion_reason: score.suggestion_reason || score.suggestionReason,
      action_plan: score.actionPlan || score.action_plan || null
    } : null
  };
}

async function runLiveScanCycle() {
  const startTime = Date.now();
  const changedStocks = [];
  const now = Date.now();

  try {
    if (isUsingFallback()) {
      // In-Memory Mode Live Refresh with micro-fluctuations
      for (const stock of memoryStore.stocks) {
        const prices = memoryStore.stock_prices.filter(p => p.stock_id === stock.id);
        const lastP = prices.length > 0 ? prices[prices.length - 1] : { close: 1000, high: 1020, low: 980 };
        const fundamentals = memoryStore.stock_fundamentals.find(f => f.stock_id === stock.id);
        const indicators = memoryStore.stock_indicators.find(i => i.stock_id === stock.id);

        const delta = (Math.random() - 0.49) * 0.003;
        const newClose = Number((lastP.close * (1 + delta)).toFixed(2));
        const newHigh = Number(Math.max(lastP.high, newClose + Math.random()).toFixed(2));
        const newLow = Number(Math.min(lastP.low, newClose - Math.random()).toFixed(2));

        if (prices.length > 0) {
          prices[prices.length - 1].close = newClose;
          prices[prices.length - 1].high = newHigh;
          prices[prices.length - 1].low = newLow;
        }

        const score = computeStockScore(stock, fundamentals, indicators, { close: newClose });
        const existingScore = memoryStore.stock_scores.find(s => s.stock_id === stock.id);
        if (existingScore) {
          Object.assign(existingScore, {
            trend_score: score.trendScore,
            momentum_score: score.momentumScore,
            volume_score: score.volumeScore,
            risk_score: score.riskScore,
            final_score: score.finalScore,
            risk_level: score.riskLevel,
            entry_price: score.entryPrice,
            stop_loss: score.stopLoss,
            target1: score.target1,
            target2: score.target2,
            risk_reward_ratio: score.riskRewardRatio,
            suggestion_label: score.suggestionLabel,
            suggestion_reason: score.suggestionReason
          });
        }

        const lastState = lastBroadcastState.get(stock.symbol);
        const isChanged = !lastState || lastState.price !== newClose || lastState.score !== score.finalScore;

        if (isChanged) {
          lastBroadcastState.set(stock.symbol, { price: newClose, score: score.finalScore, suggestion: score.suggestionLabel });
          const entity = formatStockUpdateEntity(stock, fundamentals, indicators, score, { ...lastP, close: newClose, high: newHigh, low: newLow });
          changedStocks.push(entity);
        }
      }
    } else {
      // MySQL Real Live NSE Data Pipeline
      const pool = getPool();
      const [dbStocks] = await pool.query('SELECT * FROM stocks');
      
      // Filter out symbols currently in failure backoff
      const eligibleSymbols = NSE_SYMBOLS.filter(item => {
        const until = backoffUntil.get(item.symbol) || 0;
        return now >= until;
      });

      // Fetch live batches safely in parallel using Promise.allSettled
      const fetchPromises = eligibleSymbols.map(item => getLiveStockData(item));
      const results = await Promise.allSettled(fetchPromises);

      for (let i = 0; i < eligibleSymbols.length; i++) {
        const item = eligibleSymbols[i];
        const res = results[i];

        if (res.status === 'fulfilled' && res.value) {
          // Success: reset failure counter
          failureCounts.set(item.symbol, 0);
          backoffUntil.delete(item.symbol);

          const liveData = res.value;
          let stock = dbStocks.find(s => s.symbol === liveData.symbol);

          if (!stock) {
            // Auto-insert missing stock
            const [ins] = await pool.query(
              'INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES (?, ?, ?, ?, ?)',
              [liveData.symbol, liveData.company_name, liveData.sector, liveData.market_cap, false]
            );
            const stockId = ins.insertId;
            stock = { id: stockId, symbol: liveData.symbol, company_name: liveData.company_name, sector: liveData.sector, market_cap: liveData.market_cap, is_gsm_asm: 0 };
            
            const f = liveData.fundamentals;
            await pool.query(
              'INSERT INTO stock_fundamentals (stock_id, promoter_holding, promoter_holding_trend, debt_to_equity, earnings_growth_yoy, earnings_growth_qoq, avg_daily_delivery_pct) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [stockId, f.promoter_holding, f.promoter_holding_trend, f.debt_to_equity, f.earnings_growth_yoy, f.earnings_growth_qoq, f.avg_daily_delivery_pct]
            );
            
            const ind = liveData.indicators;
            await pool.query(
              'INSERT INTO stock_indicators (stock_id, timestamp, rsi, macd, macd_signal, ema20, ema50, ema200, atr, adx, obv, volume_trend, support_level, resistance_level) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [stockId, ind.rsi, ind.macd, ind.macd_signal, ind.ema20, ind.ema50, ind.ema200, ind.atr, ind.adx, ind.obv, ind.volume_trend, ind.support_level, ind.resistance_level]
            );

            for (const h of liveData.candles) {
              await pool.query(
                'INSERT INTO stock_prices (stock_id, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [stockId, new Date(h.timestamp), h.open, h.high, h.low, h.close, h.volume]
              );
            }

            const score = computeStockScore({ symbol: liveData.symbol }, f, ind, { close: liveData.currentPrice });
            await pool.query(`
              INSERT INTO stock_scores (stock_id, timestamp, trend_score, momentum_score, volume_score, risk_score, final_score, risk_level, entry_price, stop_loss, target1, target2, risk_reward_ratio, suggestion_label, suggestion_reason)
              VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              stockId, score.trendScore, score.momentumScore, score.volumeScore, score.riskScore, score.finalScore,
              score.riskLevel, score.entryPrice, score.stopLoss, score.target1, score.target2,
              score.riskRewardRatio, score.suggestionLabel, score.suggestionReason
            ]);

            dbStocks.push(stock);
          } else {
            // Update latest price & indicators
            const [prices] = await pool.query('SELECT * FROM stock_prices WHERE stock_id = ? ORDER BY timestamp DESC LIMIT 1', [stock.id]);
            const [fundamentals] = await pool.query('SELECT * FROM stock_fundamentals WHERE stock_id = ?', [stock.id]);
            const [indicators] = await pool.query('SELECT * FROM stock_indicators WHERE stock_id = ?', [stock.id]);

            if (prices.length > 0 && fundamentals.length > 0 && indicators.length > 0) {
              const lastP = prices[0];
              const newClose = liveData.currentPrice;
              const newHigh = Math.max(Number(lastP.high), newClose);
              const newLow = Math.min(Number(lastP.low), newClose);

              await pool.query('UPDATE stock_prices SET close = ?, high = ?, low = ? WHERE id = ?', [newClose, newHigh, newLow, lastP.id]);

              const score = computeStockScore(stock, fundamentals[0], liveData.indicators || indicators[0], { close: newClose });
              await pool.query(`
                UPDATE stock_scores
                SET trend_score = ?, momentum_score = ?, volume_score = ?, risk_score = ?, final_score = ?,
                    risk_level = ?, entry_price = ?, stop_loss = ?, target1 = ?, target2 = ?,
                    risk_reward_ratio = ?, suggestion_label = ?, suggestion_reason = ?, timestamp = NOW()
                WHERE stock_id = ?
              `, [
                score.trendScore, score.momentumScore, score.volumeScore, score.riskScore, score.finalScore,
                score.riskLevel, score.entryPrice, score.stopLoss, score.target1, score.target2,
                score.riskRewardRatio, score.suggestionLabel, score.suggestionReason, stock.id
              ]);

              const lastState = lastBroadcastState.get(stock.symbol);
              const isChanged = !lastState || lastState.price !== newClose || lastState.score !== score.finalScore;

              if (isChanged) {
                lastBroadcastState.set(stock.symbol, { price: newClose, score: score.finalScore, suggestion: score.suggestionLabel });
                const entity = formatStockUpdateEntity(stock, fundamentals[0], liveData.indicators || indicators[0], score, { ...lastP, close: newClose, high: newHigh, low: newLow });
                changedStocks.push(entity);
              }
            }
          }
        } else {
          // Failure handling: circuit breaker backoff
          const prevFails = (failureCounts.get(item.symbol) || 0) + 1;
          failureCounts.set(item.symbol, prevFails);
          if (prevFails >= 3) {
            console.warn(`[CIRCUIT BREAKER] Symbol ${item.symbol} failed 3 consecutive cycles. Backing off for 60s.`);
            backoffUntil.set(item.symbol, now + 60000); // 60s backoff
          }
        }
      }

      // Check and broadcast open paper trades
      const [openTrades] = await pool.query(`
        SELECT pt.*, s.symbol,
               (SELECT high FROM stock_prices WHERE stock_id = pt.stock_id ORDER BY timestamp DESC LIMIT 1) as cur_high,
               (SELECT low FROM stock_prices WHERE stock_id = pt.stock_id ORDER BY timestamp DESC LIMIT 1) as cur_low
        FROM paper_trades pt
        INNER JOIN stocks s ON s.id = pt.stock_id
        WHERE pt.status = 'open'
      `);

      for (const trade of openTrades) {
        const curHigh = Number(trade.cur_high || 0);
        const curLow = Number(trade.cur_low || 0);
        const target1 = Number(trade.target1);
        const stopLoss = Number(trade.stop_loss);
        const entry = Number(trade.entry_price);

        if (curHigh >= target1) {
          const pnl = Number((((target1 - entry) / entry) * 100).toFixed(2));
          await pool.query("UPDATE paper_trades SET status = 'target_hit', exit_price = ?, exit_time = NOW(), pnl_percent = ? WHERE id = ?", [target1, pnl, trade.id]);
          broadcastTradeUpdate({ tradeId: trade.id, symbol: trade.symbol, status: 'target_hit', exitPrice: target1, pnlPercent: pnl });
        } else if (curLow <= stopLoss) {
          const pnl = Number((((stopLoss - entry) / entry) * 100).toFixed(2));
          await pool.query("UPDATE paper_trades SET status = 'sl_hit', exit_price = ?, exit_time = NOW(), pnl_percent = ?", [stopLoss, pnl, trade.id]);
          broadcastTradeUpdate({ tradeId: trade.id, symbol: trade.symbol, status: 'sl_hit', exitPrice: stopLoss, pnlPercent: pnl });
        }
      }
    }

    // 1. Broadcast only changed stocks to WebSocket clients
    if (changedStocks.length > 0) {
      broadcastStockUpdates(changedStocks);
    }

    // 2. Broadcast heartbeat (always sends status and market state)
    const cycleDuration = Date.now() - startTime;
    broadcastHeartbeat({
      isMarketOpen: isMarketHours(),
      trackedCount: NSE_SYMBOLS.length,
      changedCount: changedStocks.length,
      cycleDurationMs: cycleDuration,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[LIVE SCANNER] Error during live scan cycle:', err);
  }
}

function startLiveScanner(intervalMs = 12000) {
  if (isScannerRunning) return;
  isScannerRunning = true;

  console.log(`[LIVE SCANNER] Starting 24/7 live WebSocket market broadcaster (Interval: ${intervalMs / 1000}s)...`);

  // Run initial cycle immediately
  runLiveScanCycle();

  // Run continuous scanner and heartbeat broadcast so WebSocket never pauses
  scannerIntervalTimer = setInterval(() => {
    runLiveScanCycle();
  }, intervalMs);
}

function stopLiveScanner() {
  if (scannerIntervalTimer) {
    clearInterval(scannerIntervalTimer);
    scannerIntervalTimer = null;
  }
  isScannerRunning = false;
}

module.exports = {
  startLiveScanner,
  stopLiveScanner,
  runLiveScanCycle
};
