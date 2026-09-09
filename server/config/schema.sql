-- StockSense MySQL Database Schema
CREATE DATABASE IF NOT EXISTS stocksense;
USE stocksense;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  sector VARCHAR(100),
  market_cap BIGINT,
  is_gsm_asm BOOLEAN DEFAULT FALSE,   -- SEBI surveillance list flag, exclude if true
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  promoter_holding DECIMAL(5,2),
  promoter_holding_trend ENUM('increasing','stable','falling'),
  debt_to_equity DECIMAL(6,2),
  earnings_growth_yoy DECIMAL(6,2),
  earnings_growth_qoq DECIMAL(6,2),
  avg_daily_delivery_pct DECIMAL(5,2),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_prices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  timestamp DATETIME NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  INDEX idx_stock_time (stock_id, timestamp)
);

CREATE TABLE IF NOT EXISTS stock_indicators (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  timestamp DATETIME NOT NULL,
  rsi DECIMAL(5,2),
  macd DECIMAL(10,4),
  macd_signal DECIMAL(10,4),
  ema20 DECIMAL(10,2),
  ema50 DECIMAL(10,2),
  ema200 DECIMAL(10,2),
  atr DECIMAL(10,2),
  adx DECIMAL(5,2),
  obv BIGINT,
  volume_trend ENUM('strong_up','up','flat','down'),
  support_level DECIMAL(10,2),
  resistance_level DECIMAL(10,2),
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  INDEX idx_stock_time_ind (stock_id, timestamp)
);

CREATE TABLE IF NOT EXISTS stock_scores (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stock_id INT NOT NULL,
  timestamp DATETIME NOT NULL,
  trend_score DECIMAL(5,2),
  momentum_score DECIMAL(5,2),
  volume_score DECIMAL(5,2),
  risk_score DECIMAL(5,2),
  final_score DECIMAL(5,2),
  risk_level ENUM('Low','Medium','High'),
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  target1 DECIMAL(10,2),
  target2 DECIMAL(10,2),
  risk_reward_ratio DECIMAL(5,2),
  suggestion_label ENUM('STRONG_CANDIDATE','WATCH','AVOID'),
  suggestion_reason TEXT,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  INDEX idx_stock_time_score (stock_id, timestamp)
);

CREATE TABLE IF NOT EXISTS paper_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stock_id INT NOT NULL,
  entry_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  target1 DECIMAL(10,2),
  target2 DECIMAL(10,2),
  entry_time DATETIME,
  exit_price DECIMAL(10,2),
  exit_time DATETIME,
  status ENUM('open','target_hit','sl_hit','closed_manual') DEFAULT 'open',
  pnl_percent DECIMAL(6,2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stock_id INT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_watch (user_id, stock_id)
);

CREATE TABLE IF NOT EXISTS broker_holdings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stock_id INT NOT NULL,
  broker_name VARCHAR(50) NOT NULL, -- e.g., 'Zerodha Kite', 'Groww', 'Upstox', 'Angel One', 'Dhan', 'ICICI Direct', 'HDFC Sky', 'Paytm Money', 'Kotak Neo', 'Fyers', '5Paisa', 'Other'
  trade_type ENUM('DELIVERY', 'INTRADAY', 'SWING', 'F_AND_O') DEFAULT 'DELIVERY',
  buy_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  buy_date DATETIME NOT NULL,
  target_price DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  status ENUM('holding', 'sold') DEFAULT 'holding',
  sell_price DECIMAL(10,2),
  sell_date DATETIME,
  realized_pnl DECIMAL(12,2),
  realized_pnl_percent DECIMAL(6,2),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

