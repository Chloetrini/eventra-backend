import mongoose from 'mongoose'
import logger from '../config/logger.js'
import Notification, { NotificationType } from '../models/notification.js'

interface CreateNotificationInput {
  recipient: mongoose.Types.ObjectId | string | undefined
  type: NotificationType
  title: string
  message: string
  link?: string
  relatedEvent?: mongoose.Types.ObjectId | string
}

/**
 * Single write path for in-app notifications. Deliberately separate from
 * EmailService — a notification here should always be created regardless
 * of the recipient's email-preference toggles (organizerNotificationPreferences),
 * since those only ever controlled whether an EMAIL goes out. The bell
 * should reflect what actually happened, not what the organizer opted into
 * being emailed about.
 *
 * Fire-and-forget by design: every call site wraps this in .catch(...) (or
 * calls it from a place that already tolerates a failure), the same way
 * EmailService sends are handled elsewhere in this codebase. A notification
 * failing to write should never block the request that triggered it.
 */
export class NotificationService {
  static async create(input: CreateNotificationInput): Promise<void> {
    if (!input.recipient) return

    try {
      await Notification.create({
        recipient: input.recipient,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        relatedEvent: input.relatedEvent,
      })
    } catch (error) {
      logger.error({ err: error, type: input.type, recipient: input.recipient }, 'Failed to create notification')
    }
  }
}
