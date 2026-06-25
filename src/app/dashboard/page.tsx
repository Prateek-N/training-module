import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getJoineesList } from "@/actions/admin";
import { getJoineeProgress, getJoineeComments } from "@/actions/progress";
import DashboardClient from "./DashboardClient";
import tasksData from "@/lib/tasks.json";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let initialJoinees: any[] = [];
  let initialProgress: Record<string, { completed: boolean; notes: string }> = {};
  let initialComments: Record<number, string> = {};

  if (user.role === "lead") {
    const res = await getJoineesList();
    if (res.success && res.joinees) {
      initialJoinees = res.joinees;
    }
  } else {
    const [progressRes, commentsRes] = await Promise.all([
      getJoineeProgress(user.id),
      getJoineeComments(user.id)
    ]);
    if (progressRes.success && progressRes.progressMap) {
      initialProgress = progressRes.progressMap;
    }
    if (commentsRes.success && commentsRes.commentsMap) {
      initialComments = commentsRes.commentsMap;
    }
  }

  return (
    <DashboardClient
      currentUser={user}
      initialJoinees={initialJoinees}
      initialProgress={initialProgress}
      initialComments={initialComments}
      allTasks={tasksData}
    />
  );
}
