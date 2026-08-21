import mongoose, { Document, Schema } from 'mongoose'

// Kept intentionally small and organizer-focused for now — 'new_sale' is
// the one Chloe actually asked for (a ticket sells → the organizer sees
// it), the rest just reuse the same pipe for admin decisions that already
// email the organizer today (see admin.controller.ts / ticket.service.ts),
// so the bell doesn't have five different plumbing paths behind it.
export type NotificationType =
  | 'new_sale'
  | 'event_approved'
  | 'event_rejected'
  | 'promotion_approved'
  | 'promotion_rejected'
  | 'organizer_approved'
  | 'organizer_rejected'

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  recipient: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  message: string
  // Optional deep link the frontend can navigate to on click — e.g. the
  // event's dashboard page for a "new_sale" notification.
  link?: string
  relatedEvent?: mongoose.Types.ObjectId
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'new_sale',
        'event_approved',
        'event_rejected',
        'promotion_approved',
        'promotion_rejected',
        'organizer_approved',
        'organizer_rejected',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    relatedEvent: { type: Schema.Types.ObjectId, ref: 'Event' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Powers the bell/nav badge counts — "how many unread notifications does
// this recipient have, broken down by type" is the hottest query against
// this collection, run on close to every authenticated organizer page load.
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ recipient: 1, type: 1, isRead: 1 })

const Notification =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema, 'notifications')

export default Notification
