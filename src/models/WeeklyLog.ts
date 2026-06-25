import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IWeeklyLog extends Document {
  userId: mongoose.Types.ObjectId;
  weekNumber: number;
  interviewsCount: number;
  achievements: string;
  metrics: string;
  leadComment?: string;
  updatedAt: Date;
}

const WeeklyLogSchema = new Schema<IWeeklyLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  weekNumber: { type: Number, required: true },
  interviewsCount: { type: Number, required: true, default: 0 },
  achievements: { type: String, default: "" },
  metrics: { type: String, default: "" },
  leadComment: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

// Compound index to ensure a unique weekly log entry per user per week
WeeklyLogSchema.index({ userId: 1, weekNumber: 1 }, { unique: true });

export const WeeklyLog = models.WeeklyLog || model<IWeeklyLog>("WeeklyLog", WeeklyLogSchema);
