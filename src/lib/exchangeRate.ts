import axios from 'axios'

// Currency codes for each of the platform's supported display currencies —
// keep in sync with PlatformSettings' `currency` enum (models/platformSettings.ts).
const CURRENCY_CODES: Record<'Naira' | 'Dollar' | 'Cedis', string> = {
  Naira: 'NGN',
  Dollar: 'USD',
  Cedis: 'GHS',
}

/**
 * Fetches the live conversion rate from one platform currency to another —
 * how many units of `to` one unit of `from` is worth. Multiply an amount in
 * `from` by this to get the equivalent amount in `to`.
 *
 * Uses open.er-api.com — free, no API key required, rates refresh daily.
 * Swap the base URL here if a different provider/key is ever needed; every
 * caller only depends on this function's signature, not the provider.
 *
 * Called from updatePlatformSettings (admin.controller.ts) BEFORE any
 * financial record is touched — if this throws, the whole currency-change
 * request fails and nothing in the database is modified.
 */
export async function getExchangeRate(
  from: 'Naira' | 'Dollar' | 'Cedis',
  to: 'Naira' | 'Dollar' | 'Cedis'
): Promise<number> {
  if (from === to) return 1

  const fromCode = CURRENCY_CODES[from]
  const toCode = CURRENCY_CODES[to]

  const { data } = await axios.get(`https://open.er-api.com/v6/latest/${fromCode}`, { timeout: 10000 })

  if (data?.result !== 'success' || typeof data?.rates?.[toCode] !== 'number') {
    throw new Error(`Could not fetch a live exchange rate from ${from} to ${to} — try again shortly`)
  }

  return data.rates[toCode]
}
