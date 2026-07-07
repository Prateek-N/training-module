import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IProbationReview extends Document {
  userId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  status: "completed" | "extended" | "failed";
  finalInterviewsCount: number;
  finalAssessmentsCount: number;
  keyAccomplishments: string;
  performanceMetrics: string;
  justification: string;
  additionalInfo?: string;
  updatedAt: Date;
}

const ProbationReviewSchema = new Schema<IProbationReview>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  leadId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["completed", "extended", "failed"], required: true },
  finalInterviewsCount: { type: Number, required: true, default: 0 },
  finalAssessmentsCount: { type: Number, required: true, default: 0 },
  keyAccomplishments: { type: String, default: "" },
  performanceMetrics: { type: String, default: "" },
  justification: { type: String, required: true },
  additionalInfo: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

export const ProbationReview = models.ProbationReview || model<IProbationReview>("ProbationReview", ProbationReviewSchema);
