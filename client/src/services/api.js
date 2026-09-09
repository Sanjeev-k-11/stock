let rawApiBase = import.meta.env.VITE_API_URL || 'https://stock-otz5.onrender.com/api';
if (rawApiBase.endsWith('/')) rawApiBase = rawApiBase.slice(0, -1);
if (rawApiBase.startsWith('http') && !rawApiBase.endsWith('/api')) {
  rawApiBase = `${rawApiBase}/api`;
}
const API_BASE = rawApiBase;

function getAuthHeader() {
  const token = localStorage.getItem('stocksense_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Token invalid or expired
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/') {
          localStorage.removeItem('stocksense_access_token');
          localStorage.removeItem('stocksense_user');
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (payload) => request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) })
};

export const stockApi = {
  getStocks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stocks?${query}`);
  },
  searchStocks: (query) => request(`/stocks/search?q=${encodeURIComponent(query)}`),
  getPreviewStocks: () => request('/stocks/preview'),
  getMarketPulse: () => request('/stocks/market-pulse'),
  getStockDetail: (symbol) => request(`/stocks/${symbol}`),
  compareStocks: (symbols) => request(`/stocks/compare?symbols=${symbols}`),
  getSectors: () => request('/stocks/sectors')
};

export const paperTradeApi = {
  getTrades: () => request('/paper-trades'),
  createTrade: (tradeData) => request('/paper-trades', { method: 'POST', body: JSON.stringify(tradeData) }),
  closeTrade: (id, exitPrice) => request(`/paper-trades/${id}/close`, { method: 'POST', body: JSON.stringify({ exitPrice }) }),
  getReportCard: () => request('/paper-trades/report-card')
};

export const watchlistApi = {
  getWatchlist: () => request('/watchlist'),
  addToWatchlist: (stockId, symbol) => request('/watchlist', { method: 'POST', body: JSON.stringify({ stockId, symbol }) }),
  removeFromWatchlist: (stockId) => request(`/watchlist/${stockId}`, { method: 'DELETE' })
};

export const portfolioApi = {
  getHoldings: (status = 'holding', broker = 'All') => request(`/portfolio/holdings?status=${status}&broker=${encodeURIComponent(broker)}`),
  getSummary: () => request('/portfolio/summary'),
  addTrade: (tradeData) => request('/portfolio/trade', { method: 'POST', body: JSON.stringify(tradeData) }),
  sellTrade: (id, sellData) => request(`/portfolio/${id}/sell`, { method: 'PUT', body: JSON.stringify(sellData) }),
  deleteTrade: (id) => request(`/portfolio/${id}`, { method: 'DELETE' })
};

