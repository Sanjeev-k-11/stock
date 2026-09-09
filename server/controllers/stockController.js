const { getPool, isUsingFallback, memoryStore } = require('../config/db');
const { generateDynamicCompanyProfile, getAuthenticCompanyProfile } = require('../services/companyIntelligenceService');

// Professional Standardized Sector Taxonomy for Indian & Global Markets
const STANDARD_SECTOR_TAXONOMY = {
  'Energy, Oil & Power': ['energy', 'oil', 'petroleum', 'gas', 'power', 'utility', 'utilities', 'renewable', 'solar', 'wind', 'coal', 'refining', 'pipeline', 'conglomerate'],
  'Banking & Financial Services': ['bank', 'banking', 'financial', 'finance', 'nbfc', 'insurance', 'broking', 'depository', 'amc', 'wealth', 'fintech', 'lending'],
  'Information Technology': ['information technology', 'technology', 'it services', 'software', 'cloud', 'ai', 'tech'],
  'Automobile & EV Mobility': ['automobile', 'auto', 'automotive', 'vehicle', 'ev', 'motor', 'mobility', 'tyre', 'component'],
  'Healthcare & Pharmaceuticals': ['healthcare', 'pharma', 'pharmaceutical', 'biotechnology', 'medicine', 'diagnostic', 'hospital'],
  'FMCG, Food & Retail': ['fmcg', 'consumer', 'food', 'beverage', 'snack', 'restaurant', 'tobacco', 'dairy', 'retail', 'apparel', 'fashion'],
  'Infrastructure & Capital Goods': ['infrastructure', 'capital goods', 'engineering', 'construction', 'electrical', 'cable', 'pipe', 'epc', 'building'],
  'Metals & Mining': ['metal', 'mining', 'steel', 'aluminium', 'aluminum', 'zinc', 'copper', 'iron', 'mineral'],
  'Defence & Aerospace': ['defence', 'defense', 'aerospace', 'marine', 'shipbuilder', 'military'],
  'Consumer Tech & Internet': ['consumer tech', 'internet', 'quick commerce', 'ecommerce', 'delivery', 'platform'],
  'Telecommunications': ['telecom', 'telecommunication', 'communication', '5g', 'network'],
  'Real Estate & Construction': ['real estate', 'property', 'realty', 'housing'],
  'Specialty Chemicals': ['chemical', 'specialty chemical', 'adhesive', 'fertilizer', 'paint'],
  'Commodities & Precious Metals': ['commodity', 'commodities', 'gold', 'silver', 'crude'],
  'Cryptocurrency': ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum']
};

function matchesSector(stock, selectedGroup) {
  if (!selectedGroup || selectedGroup === 'All') return true;
  const keywords = STANDARD_SECTOR_TAXONOMY[selectedGroup];
  if (!keywords) {
    const cleanGroup = selectedGroup.toLowerCase().trim();
    const target = ((stock.sector || '') + ' ' + (stock.industry || '') + ' ' + (stock.company_name || '')).toLowerCase();
    return target.includes(cleanGroup);
  }

  // Check sector and industry first (direct substring)
  const sectorInd = ((stock.sector || '') + ' ' + (stock.industry || '')).toLowerCase();
  if (keywords.some(kw => sectorInd.includes(kw))) return true;

  // Check symbol, company name, and description using word boundary to avoid false partial matches
  const nameDesc = ((stock.company_name || '') + ' ' + (stock.symbol || '') + ' ' + (stock.company_profile?.business_description || '')).toLowerCase();
  return keywords.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(nameDesc);
  });
}

// Helper to bundle complete stock entity
function formatStockEntity(stock, fundamentals, indicators, score, latestPrice) {
  const profile = generateDynamicCompanyProfile(
    stock.symbol,
    stock.company_name,
    stock.sector,
    latestPrice ? Number(latestPrice.close) : null,
    stock.market_cap,
    fundamentals
  );

  return {
    id: stock.id,
    symbol: stock.symbol,
    company_name: profile.company_name || stock.company_name,
    sector: profile.sector || stock.sector,
    industry: profile.industry,
    market_cap: Number(profile.market_cap || stock.market_cap),
    market_cap_category: profile.market_cap_category,
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
      promoter_holding: Number(fundamentals.promoter_holding || profile.promoter_holding),
      promoter_holding_trend: fundamentals.promoter_holding_trend || profile.promoter_holding_trend,
      debt_to_equity: Number(fundamentals.debt_to_equity || profile.debt_to_equity),
      earnings_growth_yoy: Number(fundamentals.earnings_growth_yoy || profile.earnings_growth_yoy),
      earnings_growth_qoq: Number(fundamentals.earnings_growth_qoq || profile.earnings_growth_qoq),
      avg_daily_delivery_pct: Number(fundamentals.avg_daily_delivery_pct || profile.avg_daily_delivery_pct),
      pe_ratio: profile.pe_ratio,
      book_value: profile.book_value
    } : {
      promoter_holding: profile.promoter_holding,
      promoter_holding_trend: profile.promoter_holding_trend,
      debt_to_equity: profile.debt_to_equity,
      earnings_growth_yoy: profile.earnings_growth_yoy,
      earnings_growth_qoq: profile.earnings_growth_qoq,
      avg_daily_delivery_pct: profile.avg_daily_delivery_pct,
      pe_ratio: profile.pe_ratio,
      book_value: profile.book_value
    },
    company_profile: {
      business_description: profile.business_description,
      business_model: profile.business_model,
      founded_year: profile.founded_year,
      listing_date: profile.listing_date,
      headquarters: profile.headquarters,
      growth_forecast: profile.growth_forecast
    },
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
      trend_score: Number(score.trend_score),
      momentum_score: Number(score.momentum_score),
      volume_score: Number(score.volume_score),
      risk_score: Number(score.risk_score),
      final_score: Number(score.final_score),
      risk_level: score.risk_level,
      entry_price: Number(score.entry_price),
      stop_loss: Number(score.stop_loss),
      target1: Number(score.target1),
      target2: Number(score.target2),
      risk_reward_ratio: Number(score.risk_reward_ratio),
      suggestion_label: score.suggestion_label,
      suggestion_reason: score.suggestion_reason,
      action_plan: score.actionPlan || score.action_plan || null
    } : null
  };
}

// 1. Get All Stocks for Scanner Dashboard
async function getStocks(req, res) {
  try {
    const {
      search = '',
      sector = '',
      suggestion = '',
      riskLevel = '',
      minScore = 0,
      minPrice = 0,
      maxPrice = 0,
      sortBy = 'final_score',
      sortOrder = 'desc',
      excludeSurveillance = 'false'
    } = req.query;

    let stockList = [];

    if (isUsingFallback()) {
      stockList = memoryStore.stocks.map(s => {
        const f = memoryStore.stock_fundamentals.find(item => item.stock_id === s.id);
        const ind = memoryStore.stock_indicators.find(item => item.stock_id === s.id);
        const sc = memoryStore.stock_scores.find(item => item.stock_id === s.id);
        const prices = memoryStore.stock_prices.filter(item => item.stock_id === s.id);
        const latestP = prices.length > 0 ? prices[prices.length - 1] : null;
        return formatStockEntity(s, f, ind, sc, latestP);
      });
    } else {
      const pool = getPool();
      const [stocks] = await pool.query('SELECT * FROM stocks');
      const [fundamentals] = await pool.query('SELECT * FROM stock_fundamentals');
      const [indicators] = await pool.query('SELECT * FROM stock_indicators');
      const [scores] = await pool.query('SELECT * FROM stock_scores');
      
      // Get latest price for each stock
      const [prices] = await pool.query(`
        SELECT p1.* FROM stock_prices p1
        INNER JOIN (
          SELECT stock_id, MAX(timestamp) as max_time FROM stock_prices GROUP BY stock_id
        ) p2 ON p1.stock_id = p2.stock_id AND p1.timestamp = p2.max_time
      `);

      stockList = stocks.map(s => {
        const f = fundamentals.find(item => item.stock_id === s.id);
        const ind = indicators.find(item => item.stock_id === s.id);
        const sc = scores.find(item => item.stock_id === s.id);
        const latestP = prices.find(item => item.stock_id === s.id);
        return formatStockEntity(s, f, ind, sc, latestP);
      });
    }

    // Apply Filters
    let filtered = stockList.filter(item => {
      if (search) {
        const cleanSearch = search.toLowerCase().trim();
        const searchWords = cleanSearch.split(/\s+/).filter(w => !['ltd', 'limited', 'corp', 'industries', 'co', 'the', 'pvt'].includes(w));
        const sym = (item.symbol || '').toLowerCase();
        const name = (item.company_name || '').toLowerCase();
        const sec = (item.sector || '').toLowerCase();

        const matchDirect = sym.includes(cleanSearch) || name.includes(cleanSearch);
        const matchWords = searchWords.length > 0 && searchWords.some(w => sym.includes(w) || name.includes(w) || sec.includes(w));

        if (!matchDirect && !matchWords) return false;
      }
      if (sector && sector !== 'All') {
        if (!matchesSector(item, sector)) return false;
      }
      if (suggestion && suggestion !== 'All') {
        if (item.score?.suggestion_label !== suggestion) return false;
      }
      if (riskLevel && riskLevel !== 'All') {
        if (item.score?.risk_level !== riskLevel) return false;
      }
      if (minScore && Number(minScore) > 0) {
        if ((item.score?.final_score || 0) < Number(minScore)) return false;
      }
      if (minPrice && Number(minPrice) > 0) {
        if ((item.price?.close || 0) < Number(minPrice)) return false;
      }
      if (maxPrice && Number(maxPrice) > 0) {
        if ((item.price?.close || 0) > Number(maxPrice)) return false;
      }
      if (excludeSurveillance === 'true') {
        if (item.is_gsm_asm) return false;
      }
      return true;
    });

    // Dynamic Multi-Asset Search from Live Market
    if (search && search.trim().length >= 2) {
      const cleanSym = search.trim();
      const existingSymbols = new Set(filtered.map(f => f.symbol.toUpperCase()));

      try {
        const searchMatches = await searchNSEMarket(cleanSym);
        const toFetch = searchMatches.filter(m => !existingSymbols.has(m.symbol.toUpperCase())).slice(0, 4);

        for (const cand of toFetch) {
          try {
            const live = await getLiveStockData(cand);
            if (live) {
              existingSymbols.add(live.symbol.toUpperCase());
              if (isUsingFallback()) {
                const existing = memoryStore.stocks.find(s => s.symbol === live.symbol);
                let newId = existing ? existing.id : memoryStore.stocks.length + 1;
                if (!existing) {
                  const s = { id: newId, symbol: live.symbol, company_name: live.company_name, sector: live.sector, market_cap: live.market_cap, is_gsm_asm: 0 };
                  memoryStore.stocks.push(s);
                  memoryStore.stock_fundamentals.push({ stock_id: newId, ...live.fundamentals });
                  memoryStore.stock_indicators.push({ stock_id: newId, ...live.indicators });
                  live.candles.forEach(c => memoryStore.stock_prices.push({ stock_id: newId, ...c }));
                  const sc = computeStockScore(s, live.fundamentals, live.indicators, { close: live.currentPrice });
                  memoryStore.stock_scores.push({ stock_id: newId, ...sc, trend_score: sc.trendScore, momentum_score: sc.momentumScore, volume_score: sc.volumeScore, risk_score: sc.riskScore, final_score: sc.finalScore, risk_level: sc.riskLevel, entry_price: sc.entryPrice, stop_loss: sc.stopLoss, target1: sc.target1, target2: sc.target2, risk_reward_ratio: sc.riskRewardRatio, suggestion_label: sc.suggestionLabel, suggestion_reason: sc.suggestionReason });
                }
                const sObj = memoryStore.stocks.find(s => s.id === newId);
                const fObj = memoryStore.stock_fundamentals.find(f => f.stock_id === newId) || live.fundamentals;
                const indObj = memoryStore.stock_indicators.find(ind => ind.stock_id === newId) || live.indicators;
                const scObj = memoryStore.stock_scores.find(sc => sc.stock_id === newId) || computeStockScore(sObj, fObj, indObj, { close: live.currentPrice });
                const entity = formatStockEntity(sObj, fObj, indObj, scObj, { close: live.currentPrice, open: live.candles[live.candles.length - 1]?.open, high: live.candles[live.candles.length - 1]?.high, low: live.candles[live.candles.length - 1]?.low, volume: live.candles[live.candles.length - 1]?.volume });
                filtered.push(entity);
              } else {
                const pool = getPool();
                const [existing] = await pool.query('SELECT id FROM stocks WHERE symbol = ?', [live.symbol]);
                let stockId;
                if (existing.length > 0) {
                  stockId = existing[0].id;
                } else {
                  const [ins] = await pool.query(
                    'INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES (?, ?, ?, ?, ?)',
                    [live.symbol, live.company_name, live.sector, live.market_cap, false]
                  );
                  stockId = ins.insertId;
                  const f = live.fundamentals;
                  await pool.query(
                    'INSERT INTO stock_fundamentals (stock_id, promoter_holding, promoter_holding_trend, debt_to_equity, earnings_growth_yoy, earnings_growth_qoq, avg_daily_delivery_pct) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [stockId, f.promoter_holding, f.promoter_holding_trend, f.debt_to_equity, f.earnings_growth_yoy, f.earnings_growth_qoq, f.avg_daily_delivery_pct]
                  );
                  const ind = live.indicators;
                  await pool.query(
                    'INSERT INTO stock_indicators (stock_id, timestamp, rsi, macd, macd_signal, ema20, ema50, ema200, atr, adx, obv, volume_trend, support_level, resistance_level) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [stockId, ind.rsi, ind.macd, ind.macd_signal, ind.ema20, ind.ema50, ind.ema200, ind.atr, ind.adx, ind.obv, ind.volume_trend, ind.support_level, ind.resistance_level]
                  );
                  for (const h of live.candles) {
                    await pool.query(
                      'INSERT INTO stock_prices (stock_id, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
                      [stockId, new Date(h.timestamp), h.open, h.high, h.low, h.close, h.volume]
                    );
                  }
                  const sc = computeStockScore({ symbol: live.symbol }, f, ind, { close: live.currentPrice });
                  await pool.query(
                    'INSERT INTO stock_scores (stock_id, timestamp, trend_score, momentum_score, volume_score, risk_score, final_score, risk_level, entry_price, stop_loss, target1, target2, risk_reward_ratio, suggestion_label, suggestion_reason) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [stockId, sc.trendScore, sc.momentumScore, sc.volumeScore, sc.riskScore, sc.finalScore, sc.riskLevel, sc.entryPrice, sc.stopLoss, sc.target1, sc.target2, sc.riskRewardRatio, sc.suggestionLabel, sc.suggestionReason]
                  );
                }

                const [fRows] = await pool.query('SELECT * FROM stock_fundamentals WHERE stock_id = ?', [stockId]);
                const [indRows] = await pool.query('SELECT * FROM stock_indicators WHERE stock_id = ?', [stockId]);
                const [scRows] = await pool.query('SELECT * FROM stock_scores WHERE stock_id = ?', [stockId]);

                const entity = formatStockEntity(
                  { id: stockId, symbol: live.symbol, company_name: live.company_name, sector: live.sector, market_cap: live.market_cap, is_gsm_asm: false },
                  fRows[0] || live.fundamentals,
                  indRows[0] || live.indicators,
                  scRows[0] || null,
                  { close: live.currentPrice, open: live.candles[live.candles.length - 1]?.open, high: live.candles[live.candles.length - 1]?.high, low: live.candles[live.candles.length - 1]?.low, volume: live.candles[live.candles.length - 1]?.volume }
                );
                filtered.push(entity);
              }
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error('[SEARCH DYNAMIC ERROR]', err.message);
      }
    }

    // Apply Sorting with Search Relevance Priority
    filtered.sort((a, b) => {
      if (search && search.trim().length > 0) {
        const q = search.toLowerCase().trim();
        const aSym = (a.symbol || '').toLowerCase();
        const bSym = (b.symbol || '').toLowerCase();
        const aName = (a.company_name || '').toLowerCase();
        const bName = (b.company_name || '').toLowerCase();

        const aExact = aSym === q || aName.startsWith(q);
        const bExact = bSym === q || bName.startsWith(q);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aSym.startsWith(q);
        const bStarts = bSym.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case 'final_score':
          valA = a.score?.final_score || 0;
          valB = b.score?.final_score || 0;
          break;
        case 'symbol':
          return sortOrder === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        case 'price':
          valA = a.price?.close || 0;
          valB = b.price?.close || 0;
          break;
        case 'rsi':
          valA = a.indicators?.rsi || 0;
          valB = b.indicators?.rsi || 0;
          break;
        case 'market_cap':
          valA = a.market_cap || 0;
          valB = b.market_cap || 0;
          break;
        case 'risk_reward':
          valA = a.score?.risk_reward_ratio || 0;
          valB = b.score?.risk_reward_ratio || 0;
          break;
        default:
          valA = a.score?.final_score || 0;
          valB = b.score?.final_score || 0;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return res.json({
      success: true,
      total: filtered.length,
      data: filtered
    });
  } catch (err) {
    console.error('getStocks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stocks list.' });
  }
}

const { searchNSEMarket, getLiveStockData } = require('../services/marketDataService');
const { computeStockScore } = require('../services/scoringEngine');

// 2. Get Single Stock Detail (with on-demand live fetch for ANY NSE symbol)
async function getStockDetail(req, res) {
  try {
    const { symbol } = req.params;
    const cleanSym = symbol.toUpperCase().trim();

    let stockEntity = null;
    let historicalPrices = [];

    if (isUsingFallback()) {
      let s = memoryStore.stocks.find(item => item.symbol === cleanSym || String(item.id) === cleanSym);
      
      // If not in memory store, dynamically fetch live from NSE on-demand
      if (!s) {
        console.log(`[ON-DEMAND] Fetching live market data for unlisted symbol: ${cleanSym}`);
        const live = await getLiveStockData({ symbol: cleanSym });
        if (live) {
          const newId = memoryStore.stocks.length + 1;
          s = {
            id: newId,
            symbol: cleanSym,
            company_name: live.company_name,
            sector: live.sector,
            market_cap: live.market_cap,
            is_gsm_asm: 0
          };
          memoryStore.stocks.push(s);
          memoryStore.stock_fundamentals.push({ stock_id: newId, ...live.fundamentals });
          memoryStore.stock_indicators.push({ stock_id: newId, ...live.indicators });
          live.candles.forEach((c, idx) => {
            memoryStore.stock_prices.push({ stock_id: newId, ...c });
          });
          const sc = computeStockScore(s, live.fundamentals, live.indicators, { close: live.currentPrice });
          memoryStore.stock_scores.push({ stock_id: newId, ...sc, trend_score: sc.trendScore, momentum_score: sc.momentumScore, volume_score: sc.volumeScore, risk_score: sc.riskScore, final_score: sc.finalScore, risk_level: sc.riskLevel, entry_price: sc.entryPrice, stop_loss: sc.stopLoss, target1: sc.target1, target2: sc.target2, risk_reward_ratio: sc.riskRewardRatio, suggestion_label: sc.suggestionLabel, suggestion_reason: sc.suggestionReason });
        }
      }

      if (!s) {
        return res.status(404).json({ success: false, message: `Stock '${cleanSym}' not found on NSE/BSE.` });
      }

      const f = memoryStore.stock_fundamentals.find(item => item.stock_id === s.id);
      const ind = memoryStore.stock_indicators.find(item => item.stock_id === s.id);
      const sc = memoryStore.stock_scores.find(item => item.stock_id === s.id);
      const prices = memoryStore.stock_prices
        .filter(item => item.stock_id === s.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const latestP = prices.length > 0 ? prices[prices.length - 1] : null;
      stockEntity = formatStockEntity(s, f, ind, sc, latestP);
      historicalPrices = prices.map(p => ({
        timestamp: p.timestamp,
        date: new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
        volume: Number(p.volume),
        ema20: p.ema20 ? Number(p.ema20) : Number((Number(p.close) * 0.985).toFixed(2)),
        ema50: p.ema50 ? Number(p.ema50) : Number((Number(p.close) * 0.965).toFixed(2))
      }));
    } else {
      const pool = getPool();
      let [stocks] = await pool.query('SELECT * FROM stocks WHERE symbol = ? OR id = ?', [cleanSym, cleanSym]);
      
      const live = await getLiveStockData({ symbol: cleanSym });
      let stockId;

      if (stocks.length === 0) {
        if (live) {
          const [ins] = await pool.query(
            'INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES (?, ?, ?, ?, ?)',
            [live.symbol, live.company_name, live.sector, live.market_cap, false]
          );
          stockId = ins.insertId;
          const f = live.fundamentals;
          await pool.query(
            'INSERT INTO stock_fundamentals (stock_id, promoter_holding, promoter_holding_trend, debt_to_equity, earnings_growth_yoy, earnings_growth_qoq, avg_daily_delivery_pct) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [stockId, f.promoter_holding, f.promoter_holding_trend, f.debt_to_equity, f.earnings_growth_yoy, f.earnings_growth_qoq, f.avg_daily_delivery_pct]
          );
          const ind = live.indicators;
          await pool.query(
            'INSERT INTO stock_indicators (stock_id, timestamp, rsi, macd, macd_signal, ema20, ema50, ema200, atr, adx, obv, volume_trend, support_level, resistance_level) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [stockId, ind.rsi, ind.macd, ind.macd_signal, ind.ema20, ind.ema50, ind.ema200, ind.atr, ind.adx, ind.obv, ind.volume_trend, ind.support_level, ind.resistance_level]
          );
          for (const h of live.candles) {
            await pool.query(
              'INSERT INTO stock_prices (stock_id, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [stockId, new Date(h.timestamp), h.open, h.high, h.low, h.close, h.volume]
            );
          }
          const sc = computeStockScore({ symbol: live.symbol, market_cap: live.market_cap }, f, ind, { close: live.currentPrice });
          await pool.query(
            'INSERT INTO stock_scores (stock_id, timestamp, trend_score, momentum_score, volume_score, risk_score, final_score, risk_level, entry_price, stop_loss, target1, target2, risk_reward_ratio, suggestion_label, suggestion_reason) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [stockId, sc.trendScore, sc.momentumScore, sc.volumeScore, sc.riskScore, sc.finalScore, sc.riskLevel, sc.entryPrice, sc.stopLoss, sc.target1, sc.target2, sc.riskRewardRatio, sc.suggestionLabel, sc.suggestionReason]
          );

          [stocks] = await pool.query('SELECT * FROM stocks WHERE id = ?', [stockId]);
        }
      } else {
        stockId = stocks[0].id;
        if (live) {
          // Update authentic market cap & fundamentals
          await pool.query('UPDATE stocks SET market_cap = ?, company_name = ? WHERE id = ?', [live.market_cap, live.company_name, stockId]);
          const f = live.fundamentals;
          await pool.query(
            `UPDATE stock_fundamentals 
             SET promoter_holding = ?, promoter_holding_trend = ?, debt_to_equity = ?, earnings_growth_yoy = ?, earnings_growth_qoq = ?, avg_daily_delivery_pct = ?
             WHERE stock_id = ?`,
            [f.promoter_holding, f.promoter_holding_trend, f.debt_to_equity, f.earnings_growth_yoy, f.earnings_growth_qoq, f.avg_daily_delivery_pct, stockId]
          );
          const ind = live.indicators;
          await pool.query(
            `UPDATE stock_indicators 
             SET rsi = ?, macd = ?, macd_signal = ?, ema20 = ?, ema50 = ?, ema200 = ?, atr = ?, adx = ?, obv = ?, volume_trend = ?, support_level = ?, resistance_level = ?
             WHERE stock_id = ?`,
            [ind.rsi, ind.macd, ind.macd_signal, ind.ema20, ind.ema50, ind.ema200, ind.atr, ind.adx, ind.obv, ind.volume_trend, ind.support_level, ind.resistance_level, stockId]
          );
          const sc = computeStockScore({ symbol: live.symbol, market_cap: live.market_cap }, f, ind, { close: live.currentPrice });
          await pool.query(
            `UPDATE stock_scores 
             SET trend_score = ?, momentum_score = ?, volume_score = ?, risk_score = ?, final_score = ?, risk_level = ?, entry_price = ?, stop_loss = ?, target1 = ?, target2 = ?, risk_reward_ratio = ?, suggestion_label = ?, suggestion_reason = ?
             WHERE stock_id = ?`,
            [sc.trendScore, sc.momentumScore, sc.volumeScore, sc.riskScore, sc.finalScore, sc.riskLevel, sc.entryPrice, sc.stopLoss, sc.target1, sc.target2, sc.riskRewardRatio, sc.suggestionLabel, sc.suggestionReason, stockId]
          );
          [stocks] = await pool.query('SELECT * FROM stocks WHERE id = ?', [stockId]);
        }
      }

      if (stocks.length === 0) {
        return res.status(404).json({ success: false, message: `Stock '${cleanSym}' not found on NSE/BSE.` });
      }

      const s = stocks[0];
      const [fundamentals] = await pool.query('SELECT * FROM stock_fundamentals WHERE stock_id = ?', [s.id]);
      const [indicators] = await pool.query('SELECT * FROM stock_indicators WHERE stock_id = ?', [s.id]);
      const [scores] = await pool.query('SELECT * FROM stock_scores WHERE stock_id = ?', [s.id]);
      const [prices] = await pool.query('SELECT * FROM stock_prices WHERE stock_id = ? ORDER BY timestamp ASC', [s.id]);

      const latestP = prices.length > 0 ? prices[prices.length - 1] : null;
      stockEntity = formatStockEntity(s, fundamentals[0], indicators[0], scores[0], latestP);
      historicalPrices = prices.map(p => ({
        timestamp: p.timestamp,
        date: new Date(p.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
        volume: Number(p.volume),
        ema20: p.ema20 ? Number(p.ema20) : Number((Number(p.close) * 0.985).toFixed(2)),
        ema50: p.ema50 ? Number(p.ema50) : Number((Number(p.close) * 0.965).toFixed(2))
      }));
    }

      // Fetch 100% authentic live exchange company profile & future projections
      try {
        const authenticProfile = await getAuthenticCompanyProfile(
          stockEntity.symbol,
          stockEntity.company_name,
          stockEntity.sector,
          stockEntity.price ? Number(stockEntity.price.close) : null,
          stockEntity.market_cap,
          stockEntity.fundamentals
        );
        if (authenticProfile) {
          stockEntity.company_profile = authenticProfile;
          stockEntity.industry = authenticProfile.industry;
          stockEntity.sector = authenticProfile.sector;
          stockEntity.market_cap = authenticProfile.market_cap;
          stockEntity.market_cap_category = authenticProfile.market_cap_category;
          if (stockEntity.fundamentals) {
            stockEntity.fundamentals.promoter_holding = authenticProfile.promoter_holding;
            stockEntity.fundamentals.debt_to_equity = authenticProfile.debt_to_equity;
            stockEntity.fundamentals.earnings_growth_yoy = authenticProfile.earnings_growth_yoy;
            stockEntity.fundamentals.pe_ratio = authenticProfile.pe_ratio;
            stockEntity.fundamentals.book_value = authenticProfile.book_value;
          }
        }
      } catch (profileErr) {
        console.error('[PROFILE SYNC] Detail enhancement error:', profileErr.message);
      }

      return res.json({
        success: true,
        data: {
          ...stockEntity,
          history: historicalPrices
        }
      });
    } catch (err) {
      console.error('getStockDetail error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch stock detail.' });
    }
  }

// Live Autocomplete Search for ANY Indian Stock
async function searchLiveStocks(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 1. Search local DB
    let localMatches = [];
    if (isUsingFallback()) {
      localMatches = memoryStore.stocks
        .filter(s => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.company_name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
        .map(s => ({ symbol: s.symbol, company_name: s.company_name, sector: s.sector, exchange: 'NSE' }));
    } else {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT symbol, company_name, sector FROM stocks WHERE symbol LIKE ? OR company_name LIKE ? LIMIT 6',
        [`%${q}%`, `%${q}%`]
      );
      localMatches = rows.map(r => ({ ...r, exchange: 'NSE' }));
    }

    // 2. Search Yahoo Finance live market API for any other Indian equities
    let liveMatches = [];
    try {
      liveMatches = await searchNSEMarket(q);
    } catch (e) {}

    // Merge and deduplicate by symbol
    const mergedMap = new Map();
    localMatches.forEach(item => mergedMap.set(item.symbol, item));
    liveMatches.forEach(item => {
      if (!mergedMap.has(item.symbol)) {
        mergedMap.set(item.symbol, item);
      }
    });

    const results = Array.from(mergedMap.values()).slice(0, 10);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('searchLiveStocks error:', err);
    return res.status(500).json({ success: false, message: 'Search failed.' });
  }
}

// 3. Compare 2 to 4 Stocks Side-by-Side
async function compareStocks(req, res) {
  try {
    const { symbols } = req.query; // e.g. "RELIANCE,TCS,TATAMOTORS"
    if (!symbols) {
      return res.status(400).json({ success: false, message: 'Please specify comma-separated symbols (e.g. ?symbols=RELIANCE,TCS).' });
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (symbolList.length < 2 || symbolList.length > 4) {
      return res.status(400).json({ success: false, message: 'Please select between 2 and 4 stocks for comparison.' });
    }

    let compared = [];

    if (isUsingFallback()) {
      for (const sym of symbolList) {
        const s = memoryStore.stocks.find(item => item.symbol === sym);
        if (s) {
          const f = memoryStore.stock_fundamentals.find(item => item.stock_id === s.id);
          const ind = memoryStore.stock_indicators.find(item => item.stock_id === s.id);
          const sc = memoryStore.stock_scores.find(item => item.stock_id === s.id);
          const prices = memoryStore.stock_prices.filter(item => item.stock_id === s.id);
          const latestP = prices.length > 0 ? prices[prices.length - 1] : null;
          compared.push(formatStockEntity(s, f, ind, sc, latestP));
        }
      }
    } else {
      const pool = getPool();
      for (const sym of symbolList) {
        const [stocks] = await pool.query('SELECT * FROM stocks WHERE symbol = ?', [sym]);
        if (stocks.length > 0) {
          const s = stocks[0];
          const [fundamentals] = await pool.query('SELECT * FROM stock_fundamentals WHERE stock_id = ?', [s.id]);
          const [indicators] = await pool.query('SELECT * FROM stock_indicators WHERE stock_id = ?', [s.id]);
          const [scores] = await pool.query('SELECT * FROM stock_scores WHERE stock_id = ?', [s.id]);
          const [prices] = await pool.query('SELECT * FROM stock_prices WHERE stock_id = ? ORDER BY timestamp DESC LIMIT 1', [s.id]);
          compared.push(formatStockEntity(s, fundamentals[0], indicators[0], scores[0], prices[0]));
        }
      }
    }

    if (compared.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 valid stocks are required for comparison.' });
    }

    // Determine Top-Ranked Candidate
    // Rule: Must have score >= 60 to qualify as a candidate. Never force-pick if none clears 60.
    const eligibleCandidates = compared.filter(s => (s.score?.final_score || 0) >= 60);
    let topStock = null;
    let topStockReason = '';
    let hasStrongCandidate = false;

    if (eligibleCandidates.length > 0) {
      // Sort eligible by final_score descending
      eligibleCandidates.sort((a, b) => (b.score?.final_score || 0) - (a.score?.final_score || 0));
      topStock = eligibleCandidates[0];
      hasStrongCandidate = true;
      topStockReason = `${topStock.symbol} ranks highest with an AI composite score of ${topStock.score.final_score}/100. Key driver: ${topStock.score.suggestion_reason}`;
    } else {
      topStockReason = 'No strong candidate found in this comparison. All selected stocks have composite scores below the 60/100 actionable threshold.';
    }

    // Identify Flagged / AVOID stocks with reasons
    const flaggedStocks = compared
      .filter(s => s.score?.suggestion_label === 'AVOID' || s.is_gsm_asm)
      .map(s => ({
        symbol: s.symbol,
        reason: s.score?.suggestion_reason || (s.is_gsm_asm ? 'SEBI surveillance list flagged' : 'Below safety threshold')
      }));

    return res.json({
      success: true,
      data: {
        stocks: compared,
        topStockSymbol: hasStrongCandidate ? topStock.symbol : null,
        topStock,
        topStockReason,
        hasStrongCandidate,
        flaggedStocks
      }
    });
  } catch (err) {
    console.error('compareStocks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compare stocks.' });
  }
}

// 4. Get Available Standardized Sectors
async function getSectors(req, res) {
  try {
    const sectors = Object.keys(STANDARD_SECTOR_TAXONOMY);
    return res.json({ success: true, data: sectors });
  } catch (err) {
    console.error('getSectors error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sectors.' });
  }
}

const { getLiveMarketPulse } = require('../services/marketDataService');

// 5. Get Real-Time Live Benchmark Indices & Market Pulse
async function getMarketPulse(req, res) {
  try {
    const pulse = await getLiveMarketPulse();
    return res.json({ success: true, data: pulse });
  } catch (err) {
    console.error('getMarketPulse error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch live market pulse.' });
  }
}

module.exports = {
  getStocks,
  getStockDetail,
  searchLiveStocks,
  compareStocks,
  getSectors,
  getMarketPulse
};

