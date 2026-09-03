import { Router } from 'express'
import { createEnquiry, getEnquiries, getEnquiryById } from '../controllers/enquiryController.js'
import { verifySession, requireRole } from '../middlewares/auth.middleware.js'
import { requireAdminTier } from '../middlewares/adminPermission.middleware.js'
import { validateFormData } from '../middlewares/schema.middleware.js'
import { strictLimiter } from '../middlewares/rateLimit.middleware.js'
import { cacheMiddleware, clearCache } from '../middlewares/cache.middleware.js'
import { enquirySchema } from '../lib/schemaValidation.js'

const router = Router()

router.post('/',strictLimiter,
    validateFormData(enquirySchema),
    clearCache('enquiries'),
    createEnquiry
)

router.get(
    '/',
    verifySession,
    requireRole('admin'),
    requireAdminTier('owner', 'admin', 'support'),
    cacheMiddleware(30),
    getEnquiries
)

router.get(
    '/:id',
    verifySession,
    requireRole('admin'),
    requireAdminTier('owner', 'admin', 'support'),
    getEnquiryById
)

export default router