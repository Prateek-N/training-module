"use server";

import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Progress } from "@/models/Progress";
import { DayComment } from "@/models/DayComment";
import { WeeklyLog } from "@/models/WeeklyLog";
import { ProbationReview } from "@/models/ProbationReview";
import { getCurrentUser } from "./auth";
import mongoose from "mongoose";

export async function toggleTaskCompletion(
  joineeId: string,
  day: number,
  taskId: string,
  completed: boolean,
  notes: string,
  inProgress?: boolean
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to update another user's progress" };
    }

    await connectToDatabase();

    const progress = await Progress.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(joineeId), taskId },
      {
        $set: {
          day,
          completed,
          inProgress: !!inProgress,
          notes: notes || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { 
      success: true, 
      progress: { 
        taskId: progress.taskId, 
        completed: progress.completed, 
        inProgress: progress.inProgress,
        notes: progress.notes 
      } 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Toggle task error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getJoineeProgress(joineeId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to view this user's progress" };
    }

    await connectToDatabase();

    const progressList = await Progress.find({ userId: new mongoose.Types.ObjectId(joineeId) });

    const progressMap: Record<string, { completed: boolean; inProgress: boolean; notes: string }> = {};
    progressList.forEach((p) => {
      progressMap[p.taskId] = {
        completed: p.completed,
        inProgress: p.inProgress || false,
        notes: p.notes || "",
      };
    });

    return { success: true, progressMap };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function resetJoineeProgress(joineeId: string) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();
    await Progress.deleteMany({ userId: new mongoose.Types.ObjectId(joineeId) });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
  }
}

export async function saveDayComment(
  joineeId: string,
  day: number,
  comment: string
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    await connectToDatabase();

    const result = await DayComment.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(joineeId), day },
      {
        $set: {
          leadId: new mongoose.Types.ObjectId(adminUser.id),
          comment: comment || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { 
      success: true, 
      comment: result.comment
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Save day comment error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function saveJoineeDayComment(
  day: number,
  comment: string
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "joinee") {
      return { success: false, error: "Unauthorized. Expert permissions required." };
    }

    await connectToDatabase();

    // Find the lead who is buddy for this joinee
    const userDoc = await User.findById(currentUser.id);
    let leadId = new mongoose.Types.ObjectId(); // default fallback
    if (userDoc && userDoc.buddy) {
      const leadDoc = await User.findOne({ name: userDoc.buddy, role: "lead" });
      if (leadDoc) {
        leadId = leadDoc._id as mongoose.Types.ObjectId;
      }
    }

    const result = await DayComment.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(currentUser.id), day },
      {
        $set: {
          leadId,
          joineeComment: comment || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { 
      success: true, 
      comment: result.joineeComment
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Save joinee day comment error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getJoineeComments(joineeId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to view these comments" };
    }

    await connectToDatabase();

    const commentsList = await DayComment.find({ userId: new mongoose.Types.ObjectId(joineeId) });

    const commentsMap: Record<number, string> = {};
    const joineeCommentsMap: Record<number, string> = {};
    commentsList.forEach((c) => {
      commentsMap[c.day] = c.comment || "";
      joineeCommentsMap[c.day] = c.joineeComment || "";
    });

    return { success: true, commentsMap, joineeCommentsMap };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Get joinee comments error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function saveWeeklyLog(
  joineeId: string,
  weekNumber: number,
  data: { interviewsCount: number; achievements: string; metrics: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to update another user's weekly log" };
    }

    await connectToDatabase();

    const result = await WeeklyLog.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(joineeId), weekNumber },
      {
        $set: {
          interviewsCount: data.interviewsCount,
          achievements: data.achievements || "",
          metrics: data.metrics || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, log: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Save weekly log error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getWeeklyLogs(joineeId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to view this user's weekly logs" };
    }

    await connectToDatabase();

    const logs = await WeeklyLog.find({ userId: new mongoose.Types.ObjectId(joineeId) });

    const logsMap: Record<number, { interviewsCount: number; achievements: string; metrics: string; leadComment: string }> = {};
    logs.forEach((l) => {
      logsMap[l.weekNumber] = {
        interviewsCount: l.interviewsCount,
        achievements: l.achievements || "",
        metrics: l.metrics || "",
        leadComment: l.leadComment || "",
      };
    });

    return { success: true, logsMap };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Get weekly logs error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function saveWeeklyLeadComment(
  joineeId: string,
  weekNumber: number,
  comment: string
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Lead permissions required." };
    }

    await connectToDatabase();

    const result = await WeeklyLog.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(joineeId), weekNumber },
      {
        $set: {
          leadComment: comment || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, comment: result.leadComment };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Save weekly lead comment error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function submitProbationReview(
  joineeId: string,
  reviewData: {
    status: "completed" | "extended" | "failed";
    finalInterviewsCount: number;
    keyAccomplishments: string;
    performanceMetrics: string;
    justification: string;
    additionalInfo?: string;
  }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || adminUser.role !== "lead") {
      return { success: false, error: "Unauthorized. Lead permissions required." };
    }

    await connectToDatabase();

    const review = await ProbationReview.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(joineeId) },
      {
        $set: {
          leadId: new mongoose.Types.ObjectId(adminUser.id),
          status: reviewData.status,
          finalInterviewsCount: reviewData.finalInterviewsCount,
          keyAccomplishments: reviewData.keyAccomplishments || "",
          performanceMetrics: reviewData.performanceMetrics || "",
          justification: reviewData.justification,
          additionalInfo: reviewData.additionalInfo || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return { success: true, review };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Submit probation review error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getProbationReview(joineeId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    if (currentUser.role === "joinee" && currentUser.id !== joineeId) {
      return { success: false, error: "Unauthorized to view this review" };
    }

    await connectToDatabase();

    const review = await ProbationReview.findOne({ userId: new mongoose.Types.ObjectId(joineeId) });

    if (!review) {
      return { success: true, review: null };
    }

    return {
      success: true,
      review: {
        status: review.status,
        finalInterviewsCount: review.finalInterviewsCount,
        keyAccomplishments: review.keyAccomplishments,
        performanceMetrics: review.performanceMetrics,
        justification: review.justification,
        additionalInfo: review.additionalInfo,
        updatedAt: review.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Get probation review error:", error);
    return { success: false, error: errorMessage };
  }
}

