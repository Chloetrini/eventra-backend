import mongoose, { Document, Schema } from 'mongoose'

// A singleton document — there is exactly one PlatformSettings row ever,
// found/created via getPlatformSettingsDoc in admin.controller.ts rather
// than looked up by any particular id. Powers the admin Settings page's
// Commission rate / Platform Configuration cards (everything on that page
// except the Admin, Teams & Roles card, which reads/writes User directly).
export interface IPlatformSettings extends Document {
  _id: mongoose.Types.ObjectId
  // Percentage points (e.g. 3 means 3%), matches the NumberStepper on the
  // Commission rate card directly — no unit conversion either side.
  platformFeePercent: number
  // Kept as the exact display strings the Settings page's <Select> already
  // uses as option values ("Naira" / "Dollar" / "Cedis", "3 days" / "5
  // days" / "7 days") rather than normalized codes/numbers, so the
  // frontend needs zero translation layer between what it sends and what
  // it renders back.
  currency: 'Naira' | 'Dollar' | 'Cedis'
  payoutHold: '3 days' | '5 days' | '7 days'
  autoApproveEvents: boolean
  autoApprovePromotions: boolean
  maintenanceMode: boolean
  updatedAt: Date
  createdAt: Date
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    platformFeePercent: { type: Number, required: true, min: 0, max: 100, default: 3 },
    currency: { type: String, enum: ['Naira', 'Dollar', 'Cedis'], default: 'Naira' },
    payoutHold: { type: String, enum: ['3 days', '5 days', '7 days'], default: '3 days' },
    autoApproveEvents: { type: Boolean, default: false },
    autoApprovePromotions: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const PlatformSettings =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema, 'platform_settings')

export default PlatformSettings
