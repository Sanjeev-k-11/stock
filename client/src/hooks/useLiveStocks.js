import { useState, useEffect, useMemo, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

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

/**
 * Custom Hook to merge base HTTP fetched stocks with high-frequency WebSocket updates
 * Debounces sort/filter re-computations to at most once every 500ms to guarantee 60fps rendering.
 */
export function useLiveStocks(initialStocks = [], filterOptions = {}) {
  const { liveUpdatesMap, isConnected, secondsAgo } = useSocket();
  const [stocks, setStocks] = useState(initialStocks);
  const [debouncedFilteredStocks, setDebouncedFilteredStocks] = useState([]);
  const debounceTimerRef = useRef(null);

  // Sync when initialStocks changes
  useEffect(() => {
    setStocks(initialStocks);
  }, [initialStocks]);

  // Merge live WebSocket updates into stock list
  useEffect(() => {
    if (!liveUpdatesMap || Object.keys(liveUpdatesMap).length === 0) return;

    setStocks(prevStocks => {
      let hasChanges = false;
      const updated = prevStocks.map(stock => {
        const live = liveUpdatesMap[stock.symbol.toUpperCase()];
        if (live && live._receivedAt) {
          // Check if price or score actually changed
          if (
            stock.price?.close !== live.price?.close ||
            stock.score?.final_score !== live.score?.final_score ||
            stock.score?.suggestion_label !== live.score?.suggestion_label
          ) {
            hasChanges = true;
            return {
              ...stock,
              ...live,
              _lastPrice: stock.price?.close,
              _priceDelta: live.price?.close - (stock.price?.close || live.price?.close),
              _flashDirection: live.price?.close > (stock.price?.close || 0) ? 'up' : 'down',
              _updatedAt: Date.now()
            };
          }
        }
        return stock;
      });

      return hasChanges ? updated : prevStocks;
    });
  }, [liveUpdatesMap]);

  // Debounced Filter & Sort computation (500ms max frequency)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const {
        search = '',
        sector = '',
        suggestion = '',
        riskLevel = '',
        minScore = 0,
        minPrice = '',
        maxPrice = '',
        excludeSurveillance = false,
        sortBy = 'final_score',
        sortOrder = 'desc'
      } = filterOptions;

      let result = stocks.filter(item => {
        if (search) {
          const cleanSearch = search.toLowerCase().trim();
          const searchWords = cleanSearch.split(/\s+/).filter(w => !['ltd', 'limited', 'corp', 'industries', 'co', 'the', 'pvt'].includes(w));
          const sym = (item.symbol || '').toLowerCase();
          const name = (item.company_name || '').toLowerCase();
          const sec = (item.sector || '').toLowerCase();
          const ind = (item.industry || '').toLowerCase();
          const desc = (item.company_profile?.business_description || '').toLowerCase();
          const model = (item.company_profile?.business_model || '').toLowerCase();

          const allText = `${sym} ${name} ${sec} ${ind} ${desc} ${model}`;

          const matchDirect = allText.includes(cleanSearch);
          const matchWords = searchWords.length > 0 && searchWords.every(w => allText.includes(w));

          // Domain alias heuristics
          let matchAlias = false;
          if (cleanSearch.includes('coin') || cleanSearch.includes('crypto') || cleanSearch.includes('btc')) {
            matchAlias = sec.includes('crypto') || sym.includes('btc') || sym.includes('eth') || sym.includes('sol') || sym.includes('doge') || name.includes('bitcoin') || name.includes('crypto');
          } else if (cleanSearch.includes('electr') || cleanSearch === 'ev') {
            matchAlias = allText.includes('electric') || allText.includes('power') || allText.includes('cable') || allText.includes('battery') || allText.includes('energy') || ['olaelec', 'tatapower', 'suzlon', 'powergrid', 'bhel', 'havells', 'polycab', 'kei', 'exideind', 'amarajabat', 'abb', 'siemens'].some(k => sym.includes(k));
          } else if (cleanSearch === 'oil' || cleanSearch === 'petrol' || cleanSearch === 'gas') {
            matchAlias = allText.includes('oil') || allText.includes('petroleum') || allText.includes('gas') || allText.includes('refin') || ['reliance', 'ongc', 'bpcl', 'ioc', 'hpcl', 'gail', 'petronet', 'mgl', 'igl', 'oil'].some(k => sym.includes(k));
          } else if (cleanSearch.includes('blinkit') || cleanSearch.includes('zepto')) {
            matchAlias = sym.includes('zomato') || name.includes('zomato');
          }

          if (!matchDirect && !matchWords && !matchAlias) return false;
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
        if (minPrice !== undefined && minPrice !== '' && !isNaN(minPrice) && Number(minPrice) > 0) {
          if ((item.price?.close || 0) < Number(minPrice)) return false;
        }
        if (maxPrice !== undefined && maxPrice !== '' && !isNaN(maxPrice) && Number(maxPrice) > 0) {
          if ((item.price?.close || 0) > Number(maxPrice)) return false;
        }
        if (excludeSurveillance) {
          if (item.is_gsm_asm) return false;
        }
        return true;
      });

      // Apply Sorting with Search Relevance Priority
      result.sort((a, b) => {
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

      setDebouncedFilteredStocks(result);
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [stocks, filterOptions]);

  return {
    stocks: debouncedFilteredStocks,
    rawStocks: stocks,
    setStocks,
    isConnected,
    secondsAgo
  };
}
