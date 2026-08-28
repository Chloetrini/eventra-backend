/**
 * ONE-TIME migration: converts every TicketType.price from its current
 * Naira-magnitude value (₦10,000, ₦1,500,000, etc — the clean whole
 * numbers restored by the three currency-repair scripts earlier this
 * month) into a true Dollar value, using a live NGN→USD exchange rate.
 * After the platform's new architecture (see lib/viewerCurrency.ts),
 * TicketType.price is always stored in Dollars — the organizer's stable
 * master/list price — while Event.minPrice and every other money field
 * (Order/Ticket/RefundRequest) stay Naira, because that's what Paystack
 * actually charges/refunds. This script is what makes that switch real
 * for data that already exists; new ticket types created after this ships
 * are already stored correctly by createTicketType/updateTicketType
 * (ticketType.controller.ts) — this script only ever needs to run once.
 *
 * Also recomputes Event.minPrice for every event afterward, converting
 * each event's new cheapest-active-ticket-type Dollar price back to Naira
 * — otherwise Explore's price filter/sort and the event page's headline
 * price would be left showing the OLD Naira-magnitude number next to
 * ticket type prices that now say "$6.50".
 *
 * SAFE BY DEFAULT — READ-ONLY unless run with --apply:
 *   npx tsx scripts/convertTicketTypesToUsd20260828.ts             (dry run — prints BEFORE/AFTER, changes nothing)
 *   npx tsx scripts/convertTicketTypesToUsd20260828.ts --apply     (writes the conversion)
 *
 * Guard: if the ticket types in the database already look like small
 * Dollar amounts (average under ₦1,000-equivalent), this refuses to run
 * with --apply — that's the signature of a database this script (or
 * something else) has already converted, and running it again would
 * silently re-shrink every price a second time. Add --force only if
 * you're certain that's not what's happening.
 *
 * Everything in one MongoDB transaction: either every TicketType and every
 * Event.minPrice gets updated together, or (if anything fails partway)
 * nothing does.
 */
import mongoose from 'mongoose'
import dns from 'dns'
import { env } from '../src/config/keys.js'
import { getExchangeRate } from '../src/lib/exchangeRate.js'
import TicketType from '../src/models/ticketType.js'
import Event from '../src/models/event.js'

dns.setServers(['8.8.8.8', '8.8.4.4'])

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

const round2 = (n: number) => Math.round(n * 100) / 100

async function run() {
  await mongoose.connect(env.MONGO_URI, { dbName: env.DATABASE_NAME })
  console.log(`Connected — ${APPLY ? 'APPLY mode (will write)' : 'DRY RUN (read-only)'}`)

  const ticketTypes = await TicketType.find({}).select('_id name price event').lean()
  if (ticketTypes.length === 0) {
    console.log('No ticket types found — nothing to do.')
    await mongoose.disconnect()
    return
  }

  const currentAverage = ticketTypes.reduce((sum, tt) => sum + tt.price, 0) / ticketTypes.length
  const looksAlreadyConverted = currentAverage < 1000

  console.log(`\nFound ${ticketTypes.length} ticket type(s). Current average price: ${currentAverage.toFixed(2)}`)

  if (looksAlreadyConverted && !FORCE) {
    console.log(
      '\n⚠️  These prices already look like small Dollar amounts (average under 1,000) — this looks like it has ALREADY been converted.'
    )
    console.log('Refusing to run to avoid converting twice. Pass --force if you are certain this is wrong.')
    if (APPLY) {
      await mongoose.disconnect()
      process.exit(1)
    }
  }

  // Fetched once, used for every row — see getExchangeRate (lib/exchangeRate.ts).
  const nairaToDollar = await getExchangeRate('Naira', 'Dollar')
  const dollarToNaira = await getExchangeRate('Dollar', 'Naira')
  console.log(`\nLive rate: 1 Naira = ${nairaToDollar} Dollar   |   1 Dollar = ${dollarToNaira} Naira`)

  const updates = ticketTypes.map(tt => ({
    _id: tt._id,
    name: tt.name,
    event: tt.event,
    before: tt.price,
    after: round2(tt.price * nairaToDollar),
  }))

  console.log('\n--- Sample (first 10) ---')
  for (const u of updates.slice(0, 10)) {
    console.log(`  ${u.name}: ₦${u.before.toLocaleString('en-NG')}  ->  $${u.after}`)
  }

  const beforeTotal = updates.reduce((sum, u) => sum + u.before, 0)
  const afterTotal = updates.reduce((sum, u) => sum + u.after, 0)
  console.log(`\nTotal across all ticket types — BEFORE: ₦${beforeTotal.toLocaleString('en-NG')}   AFTER: $${afterTotal.toFixed(2)}`)

  // Every affected event's cheapest active ticket type, recomputed from the
  // AFTER (Dollar) prices above, converted back to Naira for Event.minPrice.
  const eventIds = Array.from(new Set(updates.map(u => u.event.toString())))
  const minPriceByEvent = new Map<string, number>()
  for (const eventId of eventIds) {
    const thisEventUpdates = updates.filter(u => u.event.toString() === eventId)
    // isActive isn't in the lean projection above — re-check against the
    // live TicketType docs so an inactive ticket type never wins "cheapest".
    const activeIds = new Set(
      (await TicketType.find({ event: eventId, isActive: true }).select('_id').lean()).map(d => d._id.toString())
    )
    const cheapestActive = thisEventUpdates
      .filter(u => activeIds.has(u._id.toString()))
      .sort((a, b) => a.after - b.after)[0]
    minPriceByEvent.set(eventId, cheapestActive ? round2(cheapestActive.after * dollarToNaira) : 0)
  }

  console.log(`\n${eventIds.length} event(s) will have Event.minPrice recomputed.`)

  if (!APPLY) {
    console.log('\nDry run only — nothing written. Re-run with --apply once these numbers look right.')
    await mongoose.disconnect()
    return
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const ticketTypeOps = updates.map(u => ({
        updateOne: { filter: { _id: u._id }, update: { $set: { price: u.after } } },
      }))
      await TicketType.bulkWrite(ticketTypeOps, { session })

      const eventOps = Array.from(minPriceByEvent.entries()).map(([eventId, minPrice]) => ({
        updateOne: { filter: { _id: eventId }, update: { $set: { minPrice } } },
      }))
      if (eventOps.length > 0) {
        await Event.bulkWrite(eventOps, { session })
      }
    })
    console.log(`\n✅ Applied — ${updates.length} ticket type(s) and ${minPriceByEvent.size} event(s) updated.`)
  } finally {
    await session.endSession()
  }

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
