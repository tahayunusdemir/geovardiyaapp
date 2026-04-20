import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ILocationLog extends Document {
  employeeId: Types.ObjectId
  workplaceId: Types.ObjectId
  lat: number
  lng: number
  isInside: boolean
  checkedAt: Date
}

const LocationLogSchema = new Schema<ILocationLog>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workplaceId: { type: Schema.Types.ObjectId, ref: 'Workplace', required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    isInside: { type: Boolean, required: true },
    checkedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

LocationLogSchema.index({ employeeId: 1, checkedAt: -1 })
LocationLogSchema.index({ workplaceId: 1, checkedAt: -1 })

const LocationLog: Model<ILocationLog> =
  mongoose.models.LocationLog ?? mongoose.model<ILocationLog>('LocationLog', LocationLogSchema)
export default LocationLog
