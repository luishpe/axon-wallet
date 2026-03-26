// @ts-nocheck
// src/solana/prices.js
// Fetches real token prices via CoinGecko — free, no API key needed.

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

// Map Solana mint addresses to CoinGecko IDs
const MINT_TO_COINGECKO = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'jupiter-exchange-solana',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifchat',
}

export const SOL_MINT = 'So11111111111111111111111111111111111111112'

// Price cache — prevents hitting CoinGecko rate limits
let priceCache = {}
let lastFetch = 0
const CACHE_TTL = 60000

export async function getMultipleTokenPrices(mintAddresses) {
  if (!mintAddresses || mintAddresses.length === 0) return {}

   // Return cached prices if still fresh
  const now = Date.now()
  if (now - lastFetch < CACHE_TTL && Object.keys(priceCache).length > 0) {
    return priceCache
  }  

  try {
    // Get CoinGecko IDs for known mints
    const geckoIds = mintAddresses
      .map(m => MINT_TO_COINGECKO[m])
      .filter(Boolean)

    if (geckoIds.length === 0) return {}
    
    const res  = await fetch(
      `${COINGECKO_API}/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd`
    )
    const data = await res.json()

    // Map back to mint addresses
    const prices = {}
    for (const mint of mintAddresses) {
      const geckoId = MINT_TO_COINGECKO[mint]
      if (geckoId && data[geckoId]) {
        prices[mint] = data[geckoId].usd
      } else {
        prices[mint] = null
      }
    }
    // Save to cache
    priceCache = prices
    lastFetch = now

    return prices
  } catch {
    return priceCache
  }
}

export function formatUSD(amount) {
  if (amount === null || amount === undefined) return '—'
  if (amount < 0.01) return '<$0.01'
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`
  return `$${amount.toFixed(2)}`
}