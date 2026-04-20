import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IWorkplace extends Document {
  name: string
  employerId: Types.ObjectId
  center: { lat: number; lng: number }
  radius: number
  employees: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const WorkplaceSchema = new Schema<IWorkplace>(
  {
    name: { type: String, required: true, trim: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    radius: { type: Number, required: true, min: 50, max: 1000 },
    employees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

const Workplace: Model<IWorkplace> =
  mongoose.models.Workplace ?? mongoose.model<IWorkplace>('Workplace', WorkplaceSchema)
export default Workplace
