import mongoose, { Document, Schema } from 'mongoose'

// Powers the admin Overview page's "Recent activity" card. Every admin
// moderation action (approve/reject an event, verify an organizer,
// approve/reject a refund, flag/unflag an event, approve/reject a
// promotion) writes one entry here — see logAdminActivity in
// lib/adminActivity.ts, called from admin.controller.ts.
export type AdminActivityType =
  | 'event_approved'
  | 'event_rejected'
  | 'event_flagged'
  | 'event_unflagged'
  | 'organizer_approved'
  | 'organizer_rejected'
  | 'refund_approved'
  | 'refund_rejected'
  | 'promotion_approved'
  | 'promotion_rejected'

export interface IAdminActivityLog extends Document {
  _id: mongoose.Types.ObjectId
  actor: mongoose.Types.ObjectId
  type: AdminActivityType
  message: string
  relatedEvent?: mongoose.Types.ObjectId
  relatedOrganizer?: mongoose.Types.ObjectId
  relatedRefundRequest?: mongoose.Types.ObjectId
  createdAt: Date
}

const AdminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'event_approved',
        'event_rejected',
        'event_flagged',
        'event_unflagged',
        'organizer_approved',
        'organizer_rejected',
        'refund_approved',
        'refund_rejected',
        'promotion_approved',
        'promotion_rejected',
      ],
      required: true,
    },
    // Pre-rendered, human-readable summary (e.g. "Approved event \"Afrobeats
    // Night Market\" by Lagos Live Co.") — built once at write time from
    // real names, so the Overview page never needs to re-populate/re-derive
    // it from possibly-since-deleted related documents.
    message: { type: String, required: true, trim: true },
    relatedEvent: { type: Schema.Types.ObjectId, ref: 'Event' },
    relatedOrganizer: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedRefundRequest: { type: Schema.Types.ObjectId, ref: 'RefundRequest' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AdminActivityLogSchema.index({ createdAt: -1 })

const AdminActivityLog =
  mongoose.models.AdminActivityLog ||
  mongoose.model<IAdminActivityLog>('AdminActivityLog', AdminActivityLogSchema, 'admin_activity_logs')

export default AdminActivityLog
