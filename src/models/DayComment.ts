import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IDayComment extends Document {
  userId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  day: number;
  comment: string;
  joineeComment?: string;
  updatedAt: Date;
}

const DayCommentSchema = new Schema<IDayComment>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  leadId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  day: { type: Number, required: true },
  comment: { type: String, required: true, default: "" },
  joineeComment: { type: String, default: "" },
  updatedAt: { type: Date, default: Date.now },
});

DayCommentSchema.index({ userId: 1, day: 1 }, { unique: true });

export const DayComment = models.DayComment || model<IDayComment>("DayComment", DayCommentSchema);
