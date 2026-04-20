import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IPushSubscription extends Document {
  userId: Types.ObjectId
  subscription: {
    endpoint: string
    keys: { auth: string; p256dh: string }
  }
  createdAt: Date
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    subscription: {
      endpoint: { type: String, required: true },
      keys: {
        auth: { type: String, required: true },
        p256dh: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
)

const PushSubscriptionModel: Model<IPushSubscription> =
  mongoose.models.PushSubscription ??
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)
export default PushSubscriptionModel
