import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IProgress extends Document {
  userId: mongoose.Types.ObjectId;
  day: number;
  taskId: string;
  completed: boolean;
  notes?: string;
  updatedAt: Date;
}

const ProgressSchema = new Schema<IProgress>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: Number, required: true },
  taskId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  notes: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

ProgressSchema.index({ userId: 1, taskId: 1 }, { unique: true });

export const Progress = models.Progress || model<IProgress>("Progress", ProgressSchema);
