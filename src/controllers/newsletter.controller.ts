import { Request, Response } from 'express'
import { sendTsRestError, sendTsRestSuccess } from '../lib/responseHandler.js'
import tryCatchWrapper from '../lib/tryCatchWrapper.js'
import NewsletterSubscriber from '../models/newsletterSubcriber.js'
import { EmailService } from '../services/email.service.js'
import logger from '../config/logger.js'

export const subscribeToNewsletter = tryCatchWrapper(async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return sendTsRestError(res, 400, 'A valid email is required')
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await NewsletterSubscriber.findOne({ email: normalizedEmail })
  if (existing) {
    // Not an error — resubscribing (or double-clicking) should feel like
    // success to the person, not a failure.
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "You're already subscribed!",
      body: { email: normalizedEmail },
    })
  }

  await NewsletterSubscriber.create({ email: normalizedEmail })

  EmailService.sendNewsletterWelcomeEmail(normalizedEmail).catch(error =>
    logger.error({ err: error }, `Newsletter welcome email failed for ${normalizedEmail}`)
  )

  return sendTsRestSuccess(res, 201, {
    success: true,
    message: 'Subscribed successfully',
    body: { email: normalizedEmail },
  })
})