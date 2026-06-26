import { Schema, Document, model, models } from "mongoose";

export interface IMandatoryDoc extends Document {
  key: string;
  title: string;
  content: string;
  updatedAt: Date;
}

const MandatoryDocSchema = new Schema<IMandatoryDoc>({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const MandatoryDoc = models.MandatoryDoc || model<IMandatoryDoc>("MandatoryDoc", MandatoryDocSchema);
