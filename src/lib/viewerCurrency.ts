import { Request } from 'express'
import PlatformSettings from '../models/platformSettings.js'
import User from '../models/user.js'
import { getExchangeRate } from './exchangeRate.js'

export type Currency = 'Naira' | 'Dollar' | 'Cedis' | 'Pound'

// ---------------------------------------------------------------------
// The two fixed "ledger" currencies — what a stored amount actually IS,
// not what anyone chooses to look at. Neither of these is admin-editable
// or ever changes for an existing record; they describe real, settled
// facts:
//
//   EVENT_LEDGER_CURRENCY (Naira) — Event.minPrice/revenueTotal,
//   Order.subtotal/platformFee/organizerEarnings/total/refundAmount,
//   Ticket.price, RefundRequest.amount. These are what actually moved
//   through Paystack — Paystack only charges/refunds this account in NGN
//   (see PaystackService), so every one of these fields is a real Naira
//   amount and always will be, regardless of what currency anyone is
//   looking at it in.
//
//   TICKET_TYPE_CURRENCY (Dollar) — TicketType.price. This is the
//   organizer's master/list price for a ticket, kept in a currency that
//   doesn't drift with Naira's exchange rate over time. An organizer can
//   type a price in any of the three currencies when creating/editing a
//   ticket type (see ticketType.controller.ts) — whatever they type is
//   converted to Dollars once, at save time, and that's what's stored.
//   Everything downstream (checkout, Event.minPrice, revenue) is derived
//   FROM this by converting to Naira at the moment it's needed, since
//   that's the currency that actually gets charged and paid out.
//
// Changing PlatformSettings.currency does NOT touch either of these
// anymore — it only picks the sitewide DEFAULT for what a viewer with no
// personal currencyPreference sees. See updatePlatformSettings
// (admin.controller.ts) for the previous, since-retired behavior where a
// currency change actually rewrote every stored amount — that's exactly
// the mechanism that caused the corruption fixed earlier, and is no
// longer needed now that the ledger currencies above are fixed constants
// instead of following an admin setting.
// ---------------------------------------------------------------------
export const EVENT_LEDGER_CURRENCY: Currency = 'Naira'
export const TICKET_TYPE_CURRENCY: Currency = 'Dollar'

// Same find-or-create singleton pattern as getPlatformSettingsDoc in
// admin.controller.ts / public.controller.ts, duplicated here for the same
// reason those two duplicate it rather than import from each other.
async function getPlatformSettingsDoc() {
  const existing = await PlatformSettings.findOne()
  if (existing) return existing
  return PlatformSettings.create({})
}

/**
 * Resolves the currency a viewer should see amounts in: their own
 * currencyPreference if they're signed in and have set one, otherwise the
 * platform's sitewide default (PlatformSettings.currency — a safe,
 * display-only setting now, see the module doc comment above).
 *
 * Works for both authenticated and anonymous requests — several callers
 * (listPublicEvents, getSpotlightEvents, getEventBySlug) are fully public
 * routes with no verifySession middleware, so req.session?.userId is read
 * optionally here, never required.
 */
export async function resolveViewerCurrency(req: Request): Promise<Currency> {
  const userId = req.session?.userId
  if (userId) {
    const user = await User.findById(userId).select('currencyPreference')
    if (user?.currencyPreference) return user.currencyPreference
  }
  const settings = await getPlatformSettingsDoc()
  return settings.currency
}

/**
 * A live conversion rate from one currency to another, for DISPLAY only —
 * never used to touch stored data. 1 when the two currencies are the same
 * (skips the network call entirely, which is the common case: most
 * viewers never change their currency preference away from the default).
 */
export async function getDisplayRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1
  return getExchangeRate(from, to)
}

/** Applies an already-resolved display rate to a single amount, rounded to 2dp. */
export function applyRate(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100
}
