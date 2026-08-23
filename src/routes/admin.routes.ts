import { Router } from 'express'
import {
  acceptDisputeLoss,
  approveEvent,
  approveEventPromotion,
  approveOrganizer,
  approveRefundRequest,
  challengeDispute,
  flagEvent,
  getAdminNavCounts,
  getAdminOverview,
  getAdminPayoutsOverview,
  getAdminRevenue,
  getEventDetailForAdmin,
  getOrganizerDetailForAdmin,
  getPlatformStats,
  getRefundRequestDetail,
  getUserDetail,
  listAwaitingPayouts,
  listDisputes,
  listEventsForAdmin,
  listOrganizersForAdmin,
  listPayoutHistory,
  listPendingEvents,
  listPendingOrganizers,
  listRefundRequests,
  listUsers,
  rejectEvent,
  rejectEventPromotion,
  rejectOrganizer,
  rejectRefundRequest,
  releaseEventPayout,
  removeEvent,
  suspendUser,
  unflagEvent,
  unsuspendUser,
} from '../controllers/admin.controller.js'
import { createCategory, listAllCategories, updateCategory } from '../controllers/category.controller.js'
import { requireAdmin, verifySession } from '../middlewares/auth.middleware.js'
import { validateFormData } from '../middlewares/schema.middleware.js'
import { createCategorySchema, rejectEventSchema, updateCategorySchema } from '../lib/schemaValidation.js'

const router = Router()

router.use(verifySession, requireAdmin)

// Platform stats
router.get('/stats', getPlatformStats)

// Admin Console Overview page — needs-action counts, stat cards, revenue
// chart, top organizers.
router.get('/overview', getAdminOverview)

// Sidebar "Needs Action" badge counts
router.get('/nav-counts', getAdminNavCounts)

// User management — kept as "users" (not renamed to "attendees") to match
// the existing admin Users list/detail pages and routes.
router.get('/users', listUsers)
router.get('/users/:id', getUserDetail)
router.patch('/users/:id/suspend', suspendUser)
router.patch('/users/:id/unsuspend', unsuspendUser)

// Organizer approval + management. /pending stays above /:id so a request
// for the pending-queue path is never swallowed by the :id param route.
router.get('/organizers/pending', listPendingOrganizers)
router.get('/organizers', listOrganizersForAdmin)
router.get('/organizers/:id', getOrganizerDetailForAdmin)
router.patch('/organizers/:id/approve', approveOrganizer)
router.patch('/organizers/:id/reject', rejectOrganizer)

// Event approval + management. Same ordering reasoning as organizers above
// — /pending is registered before /:id.
router.get('/events/pending', listPendingEvents)
router.get('/events', listEventsForAdmin)
router.get('/events/:id', getEventDetailForAdmin)
router.patch('/events/:id/approve', approveEvent)
router.patch('/events/:id/reject', validateFormData(rejectEventSchema), rejectEvent)
router.patch('/events/:id/flag', flagEvent)
router.patch('/events/:id/unflag', unflagEvent)
router.patch('/events/:id/remove', removeEvent)

// Promotion approval
router.patch('/events/:id/promotion/approve', approveEventPromotion)
router.patch('/events/:id/promotion/reject', rejectEventPromotion)

// Refund requests
router.get('/refund-requests', listRefundRequests)
router.get('/refund-requests/:id', getRefundRequestDetail)
router.patch('/refund-requests/:id/approve', approveRefundRequest)
router.patch('/refund-requests/:id/reject', rejectRefundRequest)

// Disputes — real Paystack chargebacks (see PaymentDispute /
// handleDisputeWebhook), separate from in-app refund requests above.
router.get('/disputes', listDisputes)
router.patch('/disputes/:id/challenge', challengeDispute)
router.patch('/disputes/:id/accept-loss', acceptDisputeLoss)

// Revenue (Platform > Revenue)
router.get('/revenue', getAdminRevenue)

// Payouts (Platform > Payouts)
router.get('/payouts/overview', getAdminPayoutsOverview)
router.get('/payouts/awaiting', listAwaitingPayouts)
router.get('/payouts/history', listPayoutHistory)
router.post('/payouts/:organizerId/:eventId/release', releaseEventPayout)

// Categories
router.get('/categories', listAllCategories)
router.post('/categories', validateFormData(createCategorySchema), createCategory)
router.patch('/categories/:id', validateFormData(updateCategorySchema), updateCategory)

export default router
