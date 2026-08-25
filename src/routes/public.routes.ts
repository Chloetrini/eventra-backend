import { Router } from 'express'
import { getPublicPlatformCurrency } from '../controllers/public.controller.js'

const router = Router()

// Deliberately no verifySession/requireAdmin here — this is read by
// attendee/organizer pages and non-owner admin tiers alike, none of which
// can reach the owner-gated /admin/settings/platform endpoint. See
// public.controller.ts's doc comment.
router.get('/platform-currency', getPublicPlatformCurrency)

export default router
