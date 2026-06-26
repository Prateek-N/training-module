import { Schema, Document, model, models } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  password?: string;
  role: "lead" | "joinee";
  buddy?: string;
  startDate: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["lead", "joinee"], default: "joinee" },
  buddy: { type: String },
  startDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model<IUser>("User", UserSchema);
