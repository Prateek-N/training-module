"use server";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Progress } from "@/models/Progress";
import { DayComment } from "@/models/DayComment";
import { WeeklyLog } from "@/models/WeeklyLog";
import { ProbationReview } from "@/models/ProbationReview";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "./auth";
import tasksData from "@/lib/tasks.json";

export async function registerJoinee(prevState: any, formData: FormData) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();

    const name = formData.get("name")?.toString().trim();
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const buddy = formData.get("buddy")?.toString().trim() || adminUser.name;
    const startDateVal = formData.get("startDate")?.toString();

    if (!name || !username || !password || !startDateVal) {
      return { success: false, error: "All fields are required" };
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return { success: false, error: "Username is already taken" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newJoinee = new User({
      name,
      username,
      password: hashedPassword,
      role: "joinee",
      buddy,
      startDate: new Date(startDateVal),
    });

    await newJoinee.save();
    return { success: true };
  } catch (error: any) {
    console.error("Register joinee error:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

export async function getJoineesList() {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      throw new Error("Unauthorized");
    }

    await connectToDatabase();
    const joinees = await User.find({ role: "joinee" }).sort({ createdAt: -1 });

    const totalTasksCount = tasksData.length;

    const list = await Promise.all(
      joinees.map(async (j) => {
        const completedCount = await Progress.countDocuments({
          userId: j._id,
          completed: true,
        });

        const progressPercent = totalTasksCount > 0 
          ? Math.round((completedCount / totalTasksCount) * 100) 
          : 0;

        return {
          id: j._id.toString(),
          name: j.name,
          username: j.username,
          buddy: j.buddy,
          startDate: j.startDate.toISOString(),
          createdAt: j.createdAt.toISOString(),
          completedCount,
          totalTasksCount,
          progressPercent,
        };
      })
    );

    return { success: true, joinees: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function seedDefaultLead() {
  try {
    await connectToDatabase();
    const leadCount = await User.countDocuments({ role: "lead" });
    if (leadCount === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const defaultLead = new User({
        name: "Onboarding Buddy",
        username: "admin",
        password: hashedPassword,
        role: "lead",
        startDate: new Date(),
      });
      await defaultLead.save();
      return { success: true, seeded: true };
    }
    return { success: true, seeded: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteJoinee(joineeId: string) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();

    // 1. Delete the user
    await User.deleteOne({ _id: joineeId, role: "joinee" });

    // 2. Delete all progression progress
    await Progress.deleteMany({ userId: joineeId });

    // 3. Delete all day comments
    await DayComment.deleteMany({ userId: joineeId });

    // 4. Delete all weekly logs
    await WeeklyLog.deleteMany({ userId: joineeId });

    // 5. Delete any probation reviews
    await ProbationReview.deleteMany({ userId: joineeId });

    return { success: true };
  } catch (error: any) {
    console.error("Delete joinee error:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}
