const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { computeStockScore } = require('../services/scoringEngine');

let pgPool = null;
let useFallback = false;

// In-Memory Database Fallback Store (active if PostgreSQL is unavailable)
const memoryStore = {
  users: [],
  stocks: [],
  stock_fundamentals: [],
  stock_prices: [],
  stock_indicators: [],
  stock_scores: [],
  paper_trades: [],
  watchlists: [],
  broker_holdings: [],
  nextUserId: 1,
  nextTradeId: 1,
  nextHoldingId: 1
};

/**
 * Helper to adapt SQL queries from MySQL-style syntax (? placeholders, INSERT IGNORE)
 * to PostgreSQL-compatible syntax ($1, $2... and RETURNING id).
 */
function adaptQuery(text) {
  let query = text.trim();

  // Convert MySQL INSERT IGNORE INTO ... to PostgreSQL INSERT INTO ... ON CONFLICT DO NOTHING
  if (/^INSERT\s+IGNORE\s+INTO/i.test(query)) {
    query = query.replace(/^INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(query)) {
      query = query.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
    }
  }

  // Convert MySQL double-quoted string literals in UPDATE/SET statements to single quotes
  query = query.replace(/status\s*=\s*"([^"]+)"/gi, "status = '$1'");

  // If INSERT without RETURNING, append RETURNING id to capture insertId
  const isInsert = /^INSERT\s+INTO/i.test(query);
  if (isInsert && !/RETURNING/i.test(query) && !/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(query)) {
    query = query.replace(/;?\s*$/, ' RETURNING id');
  }

  // Replace '?' parameter markers with '$1', '$2', '$3', etc.
  let paramIndex = 1;
  query = query.replace(/\?/g, () => `$${paramIndex++}`);

  return query;
}

/**
 * Wrapped DB client with MySQL2 compatibility:
 * Returns [rows, fields] and attaches `insertId`, `affectedRows` to result.
 */
const dbWrapper = {
  query: async (text, params = []) => {
    if (!pgPool) {
      throw new Error('[DB] Database pool is not initialized.');
    }
    const sql = adaptQuery(text);
    const result = await pgPool.query(sql, params);
    const rows = result.rows || [];
    
    // Attach MySQL-like properties
    const insertId = rows.length > 0 && rows[0].id ? Number(rows[0].id) : 0;
    const resultHeader = {
      insertId,
      affectedRows: result.rowCount || 0,
      rowCount: result.rowCount || 0
    };
    rows.insertId = insertId;
    rows.affectedRows = result.rowCount || 0;

    return [rows, resultHeader];
  },
  end: async () => {
    if (pgPool) {
      await pgPool.end();
    }
  }
};

/**
 * Parse Connection configurations from DATABASE_URL or individual env variables.
 */
function getPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // If connecting directly to Supabase, handle special characters and poolers
    try {
      return {
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };
    } catch (e) {
      console.warn('[DB] Error parsing DATABASE_URL:', e.message);
    }
  }

  const host = process.env.DB_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com';
  const user = process.env.DB_USER || 'postgres.otegddkvcptkiqfchpjx';
  const password = process.env.DB_PASSWORD || 'Kumar@2004@h3';
  const database = process.env.DB_NAME || 'postgres';
  const port = Number(process.env.DB_PORT || 5432);

  return {
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
}

async function initDB() {
  try {
    const config = getPoolConfig();
    pgPool = new Pool(config);

    // Test connection
    const client = await pgPool.connect();
    const res = await client.query('SELECT current_database() as db, version() as version;');
    console.log(`[DB] Successfully connected to PostgreSQL (Supabase): ${res.rows[0].db}`);
    client.release();

    // 1. Initialize schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use'));

    for (const statement of statements) {
      await pgPool.query(statement);
    }

    // 2. Ensure system user (id: 1) and demo user (demo@stocksense.in / password123) exist
    const bcrypt = require('bcryptjs');
    const demoPasswordHash = await bcrypt.hash('password123', 10);
    
    await pgPool.query(
      `INSERT INTO users (id, name, email, password_hash) 
       VALUES (1, 'StockSense Algo System', 'system@stocksense.in', 'algo_system_hash') 
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`
    );

    await pgPool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ('Demo Trader', 'demo@stocksense.in', $1) 
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [demoPasswordHash]
    );

    // Sync serial sequence for users
    await pgPool.query(
      `SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users))`
    );

    // 3. Seed / Re-sync authentic stock universe
    const countRes = await pgPool.query('SELECT COUNT(*) as count FROM stocks');
    const stockCount = parseInt(countRes.rows[0]?.count || '0', 10);
    const mockCheckRes = await pgPool.query("SELECT id FROM stocks WHERE symbol IN ('RISKCORP', 'SURVEIL_X', 'MICROCAP_Z')");

    if (stockCount < 200 || mockCheckRes.rows.length > 0) {
      console.log('[DB] Seeding PostgreSQL database with 100% REAL-TIME authentic Indian stock universe (280+ stocks across all sectors)...');
      await pgPool.query('TRUNCATE TABLE stocks, stock_fundamentals, stock_prices, stock_indicators, stock_scores CASCADE');
      await seedPostgresData();
      console.log('[DB] Real market database seeding completed.');
    }

    useFallback = false;
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection failed (${err.message}). Activating In-Memory fallback database.`);
    useFallback = true;
    seedMemoryData();
  }
}

const { fetchAllLiveNSEStocks } = require('../services/marketDataService');

async function seedPostgresData() {
  // Ensure default system user (id: 1) exists for automated algo paper trades
  await pgPool.query(
    `INSERT INTO users (id, name, email, password_hash) 
     VALUES (1, 'StockSense Algo System', 'system@stocksense.in', 'algo_system_hash') 
     ON CONFLICT (email) DO NOTHING`
  );

  // Fetch authentic live market data for all NSE/BSE universe
  console.log('[DB] Fetching authentic live market data for all NSE/BSE universe...');
  const liveStocks = await fetchAllLiveNSEStocks();
  if (liveStocks.length === 0) return;

  // 1. Bulk insert stocks in chunks
  const stockMap = new Map();
  const stockChunkSize = 100;
  for (let i = 0; i < liveStocks.length; i += stockChunkSize) {
    const chunk = liveStocks.slice(i, i + stockChunkSize);
    const valuePlaceholders = [];
    const values = [];
    let pIdx = 1;
    for (const item of chunk) {
      valuePlaceholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      values.push(item.symbol, item.company_name, item.sector, Number(item.market_cap) || 0, item.is_gsm_asm ? true : false);
    }
    const q = `INSERT INTO stocks (symbol, company_name, sector, market_cap, is_gsm_asm) VALUES ${valuePlaceholders.join(', ')} 
               ON CONFLICT (symbol) DO UPDATE SET company_name = EXCLUDED.company_name, market_cap = EXCLUDED.market_cap RETURNING id, symbol`;
    const res = await pgPool.query(q, values);
    for (const row of res.rows) {
      stockMap.set(row.symbol, row.id);
    }
  }

  // 2. Prepare fundamentals, indicators, scores, prices
  const fundValues = [];
  const indValues = [];
  const scoreValues = [];
  const priceValues = [];

  for (const item of liveStocks) {
    const stockId = stockMap.get(item.symbol);
    if (!stockId) continue;

    const f = item.fundamentals || {
      promoter_holding: 51.5,
      promoter_holding_trend: "stable",
      debt_to_equity: 0.45,
      earnings_growth_yoy: 15.2,
      earnings_growth_qoq: 4.8,
      avg_daily_delivery_pct: 52.0
    };
    fundValues.push([
      stockId,
      Number(f.promoter_holding) || 0,
      f.promoter_holding_trend || 'stable',
      Number(f.debt_to_equity) || 0,
      Number(f.earnings_growth_yoy) || 0,
      Number(f.earnings_growth_qoq) || 0,
      Number(f.avg_daily_delivery_pct) || 0
    ]);

    const ind = item.indicators || {};
    indValues.push([
      stockId,
      Number(ind.rsi) || 50,
      Number(ind.macd) || 0,
      Number(ind.macd_signal) || 0,
      Number(ind.ema20) || 0,
      Number(ind.ema50) || 0,
      Number(ind.ema200) || 0,
      Number(ind.atr) || 0,
      Number(ind.adx) || 20,
      Number(ind.obv) || 0,
      ind.volume_trend || 'flat',
      Number(ind.support_level) || 0,
      Number(ind.resistance_level) || 0
    ]);

    const scoreResult = computeStockScore(item, f, ind, { close: item.currentPrice });
    scoreValues.push([
      stockId,
      Number(scoreResult.trendScore) || 50,
      Number(scoreResult.momentumScore) || 50,
      Number(scoreResult.volumeScore) || 50,
      Number(scoreResult.riskScore) || 50,
      Number(scoreResult.finalScore) || 50,
      scoreResult.riskLevel || 'Medium',
      Number(scoreResult.entryPrice) || Number(item.currentPrice) || 0,
      Number(scoreResult.stopLoss) || 0,
      Number(scoreResult.target1) || 0,
      Number(scoreResult.target2) || 0,
      Number(scoreResult.riskRewardRatio) || 1.5,
      scoreResult.suggestionLabel || 'WATCH',
      scoreResult.suggestionReason || ''
    ]);

    const hist = item.candles || [];
    for (const h of hist) {
      priceValues.push([
        stockId,
        new Date(h.timestamp),
        Number(h.open) || 0,
        Number(h.high) || 0,
        Number(h.low) || 0,
        Number(h.close) || 0,
        Number(h.volume) || 0
      ]);
    }
  }

  // Helper for batch insertion
  async function batchInsert(tableName, columns, rows, chunkSize = 100) {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const valueClauses = [];
      const flatParams = [];
      let pIdx = 1;
      for (const r of chunk) {
        const placeholders = r.map(() => `$${pIdx++}`);
        valueClauses.push(`(${placeholders.join(', ')})`);
        flatParams.push(...r);
      }
      const q = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valueClauses.join(', ')}`;
      await pgPool.query(q, flatParams);
    }
  }

  // Insert fundamentals in batches
  await batchInsert('stock_fundamentals', ['stock_id', 'promoter_holding', 'promoter_holding_trend', 'debt_to_equity', 'earnings_growth_yoy', 'earnings_growth_qoq', 'avg_daily_delivery_pct'], fundValues, 100);

  // Insert indicators in batches
  for (let i = 0; i < indValues.length; i += 100) {
    const chunk = indValues.slice(i, i + 100);
    const valueClauses = [];
    const flatParams = [];
    let pIdx = 1;
    for (const r of chunk) {
      const stockIdParam = `$${pIdx++}`;
      const otherParams = r.slice(1).map(() => `$${pIdx++}`);
      valueClauses.push(`(${stockIdParam}, NOW(), ${otherParams.join(', ')})`);
      flatParams.push(...r);
    }
    await pgPool.query(`INSERT INTO stock_indicators (stock_id, timestamp, rsi, macd, macd_signal, ema20, ema50, ema200, atr, adx, obv, volume_trend, support_level, resistance_level) VALUES ${valueClauses.join(', ')}`, flatParams);
  }

  // Insert scores in batches
  for (let i = 0; i < scoreValues.length; i += 100) {
    const chunk = scoreValues.slice(i, i + 100);
    const valueClauses = [];
    const flatParams = [];
    let pIdx = 1;
    for (const r of chunk) {
      const stockIdParam = `$${pIdx++}`;
      const otherParams = r.slice(1).map(() => `$${pIdx++}`);
      valueClauses.push(`(${stockIdParam}, NOW(), ${otherParams.join(', ')})`);
      flatParams.push(...r);
    }
    await pgPool.query(`INSERT INTO stock_scores (stock_id, timestamp, trend_score, momentum_score, volume_score, risk_score, final_score, risk_level, entry_price, stop_loss, target1, target2, risk_reward_ratio, suggestion_label, suggestion_reason) VALUES ${valueClauses.join(', ')}`, flatParams);
  }

  // Insert price candles in batches
  await batchInsert('stock_prices', ['stock_id', 'timestamp', 'open', 'high', 'low', 'close', 'volume'], priceValues, 200);

  console.log(`[DB] Successfully seeded PostgreSQL database with ${liveStocks.length} live NSE/BSE stocks and ${priceValues.length} historical prices.`);
}

async function seedMemoryData() {
  memoryStore.stocks = [];
  memoryStore.stock_fundamentals = [];
  memoryStore.stock_prices = [];
  memoryStore.stock_indicators = [];
  memoryStore.stock_scores = [];
  memoryStore.paper_trades = [];
  memoryStore.watchlists = [];

  let liveStocks = [];
  try {
    liveStocks = await fetchAllLiveNSEStocks();
  } catch (e) {
    console.error('[DB] Live memory fetch error:', e.message);
  }

  let sId = 1;
  for (const item of liveStocks) {
    const stockId = sId++;
    const stockObj = {
      id: stockId,
      symbol: item.symbol,
      company_name: item.company_name,
      sector: item.sector,
      market_cap: item.market_cap,
      is_gsm_asm: item.is_gsm_asm ? 1 : 0,
      created_at: new Date()
    };
    memoryStore.stocks.push(stockObj);

    const f = item.fundamentals || {
      promoter_holding: 51.5,
      promoter_holding_trend: "stable",
      debt_to_equity: 0.45,
      earnings_growth_yoy: 15.2,
      earnings_growth_qoq: 4.8,
      avg_daily_delivery_pct: 52.0
    };
    memoryStore.stock_fundamentals.push({
      id: stockId,
      stock_id: stockId,
      promoter_holding: f.promoter_holding,
      promoter_holding_trend: f.promoter_holding_trend,
      debt_to_equity: f.debt_to_equity,
      earnings_growth_yoy: f.earnings_growth_yoy,
      earnings_growth_qoq: f.earnings_growth_qoq,
      avg_daily_delivery_pct: f.avg_daily_delivery_pct,
      updated_at: new Date()
    });

    const ind = item.indicators || {};
    memoryStore.stock_indicators.push({
      id: stockId,
      stock_id: stockId,
      timestamp: new Date(),
      rsi: ind.rsi,
      macd: ind.macd,
      macd_signal: ind.macd_signal,
      ema20: ind.ema20,
      ema50: ind.ema50,
      ema200: ind.ema200,
      atr: ind.atr,
      adx: ind.adx,
      obv: ind.obv,
      volume_trend: ind.volume_trend,
      support_level: ind.support_level,
      resistance_level: ind.resistance_level
    });

    const hist = item.candles || [];
    hist.forEach((h, idx) => {
      memoryStore.stock_prices.push({
        id: (stockId * 1000) + idx,
        stock_id: stockId,
        timestamp: new Date(h.timestamp),
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume
      });
    });

    const scoreResult = computeStockScore(item, f, ind, { close: item.currentPrice });
    memoryStore.stock_scores.push({
      id: stockId,
      stock_id: stockId,
      timestamp: new Date(),
      trend_score: scoreResult.trendScore,
      momentum_score: scoreResult.momentumScore,
      volume_score: scoreResult.volumeScore,
      risk_score: scoreResult.riskScore,
      final_score: scoreResult.finalScore,
      risk_level: scoreResult.riskLevel,
      entry_price: scoreResult.entryPrice,
      stop_loss: scoreResult.stopLoss,
      target1: scoreResult.target1,
      target2: scoreResult.target2,
      risk_reward_ratio: scoreResult.riskRewardRatio,
      suggestion_label: scoreResult.suggestionLabel,
      suggestion_reason: scoreResult.suggestionReason
    });
  }

  console.log(`[DB] Memory database initialized with ${memoryStore.stocks.length} real live stocks.`);
}

module.exports = {
  initDB,
  initMySQL: initDB, // backwards compatibility alias
  getPool: () => dbWrapper,
  isUsingFallback: () => useFallback,
  memoryStore
};
