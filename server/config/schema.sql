-- StockSense PostgreSQL Database Schema (Supabase Compatible)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stocks (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  sector VARCHAR(100),
  market_cap NUMERIC(24, 2),
  is_gsm_asm BOOLEAN DEFAULT FALSE,   -- SEBI surveillance list flag, exclude if true
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id SERIAL PRIMARY KEY,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  promoter_holding DECIMAL(5,2),
  promoter_holding_trend VARCHAR(20),
  debt_to_equity DECIMAL(6,2),
  earnings_growth_yoy DECIMAL(6,2),
  earnings_growth_qoq DECIMAL(6,2),
  avg_daily_delivery_pct DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_prices (
  id BIGSERIAL PRIMARY KEY,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume NUMERIC(24, 2)
);
CREATE INDEX IF NOT EXISTS idx_stock_time ON stock_prices (stock_id, timestamp);

CREATE TABLE IF NOT EXISTS stock_indicators (
  id BIGSERIAL PRIMARY KEY,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  rsi DECIMAL(5,2),
  macd DECIMAL(10,4),
  macd_signal DECIMAL(10,4),
  ema20 DECIMAL(10,2),
  ema50 DECIMAL(10,2),
  ema200 DECIMAL(10,2),
  atr DECIMAL(10,2),
  adx DECIMAL(5,2),
  obv NUMERIC(24, 2),
  volume_trend VARCHAR(20),
  support_level DECIMAL(10,2),
  resistance_level DECIMAL(10,2)
);
CREATE INDEX IF NOT EXISTS idx_stock_time_ind ON stock_indicators (stock_id, timestamp);

CREATE TABLE IF NOT EXISTS stock_scores (
  id BIGSERIAL PRIMARY KEY,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  trend_score DECIMAL(5,2),
  momentum_score DECIMAL(5,2),
  volume_score DECIMAL(5,2),
  risk_score DECIMAL(5,2),
  final_score DECIMAL(5,2),
  risk_level VARCHAR(20),
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  target1 DECIMAL(10,2),
  target2 DECIMAL(10,2),
  risk_reward_ratio DECIMAL(5,2),
  suggestion_label VARCHAR(30),
  suggestion_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_time_score ON stock_scores (stock_id, timestamp);

CREATE TABLE IF NOT EXISTS paper_trades (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  target1 DECIMAL(10,2),
  target2 DECIMAL(10,2),
  entry_time TIMESTAMPTZ,
  exit_price DECIMAL(10,2),
  exit_time TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'open',
  pnl_percent DECIMAL(6,2)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_stock_watch UNIQUE (user_id, stock_id)
);

CREATE TABLE IF NOT EXISTS broker_holdings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_id INT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  broker_name VARCHAR(50) NOT NULL,
  trade_type VARCHAR(20) DEFAULT 'DELIVERY',
  buy_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  buy_date TIMESTAMPTZ NOT NULL,
  target_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'holding',
  sell_price DECIMAL(10,2),
  sell_date TIMESTAMPTZ,
  realized_pnl DECIMAL(12,2),
  realized_pnl_percent DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Migrations / alterations if table columns were previously BIGINT
ALTER TABLE stocks ALTER COLUMN market_cap TYPE NUMERIC(24, 2);
ALTER TABLE stock_prices ALTER COLUMN volume TYPE NUMERIC(24, 2);
ALTER TABLE stock_indicators ALTER COLUMN obv TYPE NUMERIC(24, 2);
