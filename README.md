# StockSense — AI Stock Scanner & Comparison Platform for Indian Equities (NSE/BSE)

StockSense is a decision-support, algorithmic screening, multi-stock comparison, and virtual paper-trading platform tailored for Indian equities. It combines safety pre-filtering (SEBI GSM/ASM surveillance lists, micro-cap thresholds, delivery volume), multi-factor scoring (RSI, volume surges, EMAs, support/resistance), and real-time paper trading performance tracking with SEBI-compliant regulatory disclaimers.

---

## 🏛 Project Architecture

StockSense is cleanly separated into two distinct directories:
```
stock/
├── server/               # Express.js REST API, MySQL2 connection pooling, JWT, bcrypt, cron scheduler
│   ├── config/
│   │   ├── db.js         # MySQL2 pool manager with fallback in-memory store
│   │   └── schema.sql    # Complete MySQL DDL schema
│   ├── controllers/      # Auth, Stock Scanner, Comparison, Paper Trading, Watchlist
│   ├── middleware/       # JWT Auth verification, rate limiting
│   ├── routes/           # REST endpoints
│   ├── services/         # Deterministic scoring engine, seed universe, 5-min cron scheduler
│   ├── package.json
│   └── .env.example
│
├── client/               # React (Vite) + TailwindCSS + Recharts + Lucide-react
│   ├── src/
│   │   ├── components/   # Common (Navbar, Footer, DisclaimerModal), Dashboard, Compare, PaperTrading
│   │   ├── context/      # AuthContext with token handling
│   │   ├── pages/        # LandingPage, LoginPage, SignupPage, Dashboard, StockDetail, Compare, PaperTrades, Settings
│   │   ├── services/     # API fetch wrapper
│   │   └── index.css     # Glassmorphic fintech styling & design tokens
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup (`/server`)

```bash
cd server
npm install

# Copy environment variables
cp .env.example .env
```

Configure `server/.env` with your MySQL database credentials (if MySQL is running locally).
*Note: StockSense includes a smart auto-detecting database layer. If MySQL is not running or not yet configured, the server automatically starts using its in-memory database store with the complete 18+ Indian stock universe so you can run and test immediately!*

Start the backend API server:
```bash
npm start
# Server will run at http://localhost:5000
```

### 2. Frontend Setup (`/client`)

Open a separate terminal:
```bash
cd client
npm install
npm run dev
# Vite dev server will run at http://localhost:3000
```

Now open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Database Schema (`schema.sql`)

The MySQL database schema includes:
1. `users` — Authentication & password hashes
2. `stocks` — Symbol, Company Name, Sector, Market Cap, SEBI `is_gsm_asm` surveillance flag
3. `stock_fundamentals` — Promoter holding & trend, Debt/Equity, YoY/QoQ growth, Delivery %
4. `stock_prices` — Historical and live OHLCV price series
5. `stock_indicators` — RSI, MACD, Signal, EMA20/50/200, ATR, ADX, OBV, Support/Resistance
6. `stock_scores` — Trend, Momentum, Volume, Risk scores, Final composite score, Entry/SL/Target levels, and Suggestion Reason
7. `paper_trades` — Simulated virtual trades tracking `target_hit`, `sl_hit`, exit price, and P&L %
8. `watchlists` — User-curated watchlists

To import manually into MySQL:
```bash
mysql -u root -p < server/config/schema.sql
```

---

## 🧮 Calculation Logic & Scoring Rules

### A. Genuine-Stock Pre-Filters (Hard Exclude Before Scoring)
- Exclude if `is_gsm_asm = true` (SEBI surveillance list)
- Exclude if `market_cap < ₹500 Cr` (Micro-cap liquidity risk)
- Exclude if `avg_daily_delivery_pct < 20%` (Illiquid / speculative-only)
- Exclude if `debt_to_equity > 3.0` (Hyper-leveraged financial risk)

### B. Normalized Sub-Metrics (0–100 Scale)
- **RSI**: 100 at RSI 45–60; decays linearly to 0 towards 20 or 80.
- **Volume Trend**: `strong_up = 100`, `up = 70`, `flat = 40`, `down = 10`.
- **Risk Level**: `Low = 100`, `Medium = 60`, `High = 20`.
- **Risk-to-Reward**: `min(100, (RR / 2.5) * 100)`.
- **Promoter Holding**: `holding_pct * (trend === 'falling' ? 0.6 : 1.0)`.

### C. Weighted Composite Final Score
$$\text{Final Score} = (\text{Trend} \times 0.25) + (\text{Momentum} \times 0.20) + (\text{Volume} \times 0.20) + (\text{Risk} \times 0.15) + (\text{Support/Resistance} \times 0.20)$$

### D. Suggestion Decision Rules
- If `Risk === "High"` AND `promoterTrend === "falling"` $\rightarrow$ **`AVOID`** ("*High risk combined with weakening promoter confidence*")
- If $\text{Final Score} \ge 80 \rightarrow$ **`STRONG_CANDIDATE`** ("*High composite score across trend, volume, and risk factors*")
- If $\text{Final Score} \ge 60 \rightarrow$ **`WATCH`** ("*Decent setup but not all factors fully aligned*")
- Else $\rightarrow$ **`AVOID`** ("*Composite score below actionable threshold*")

### E. Strategy Levels
- **Entry**: Current Close Price
- **Stop Loss**: $\text{Entry} - (1.5 \times \text{ATR})$
- **Target 1**: $\text{Entry} + (2.25 \times \text{ATR})$ ($\approx 1:1.5\text{ R:R}$)
- **Target 2**: $\text{Entry} + (3.75 \times \text{ATR})$ ($\approx 1:2.5\text{ R:R}$)
- **Risk-to-Reward Ratio**: $(\text{Target 1} - \text{Entry}) / (\text{Entry} - \text{Stop Loss})$

---

## 🛡️ SEBI Regulatory Compliance Notice

StockSense is an independent analytical decision-support and educational tool. It does **not** provide personalized investment advice, portfolio management, or guaranteed returns under SEBI regulations. Always consult a SEBI-registered Investment Adviser before making live financial trades.
