import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getJoineesList } from "@/actions/admin";
import { getJoineeProgress, getJoineeComments } from "@/actions/progress";
import DashboardClient, { Joinee } from "./DashboardClient";
import tasksData from "@/lib/tasks.json";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let initialJoinees: Joinee[] = [];
  let initialProgress: Record<string, { completed: boolean; inProgress: boolean; notes: string }> = {};
  let initialComments: Record<number, string> = {};
  let initialJoineeComments: Record<number, string> = {};

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
    if (commentsRes.success) {
      if (commentsRes.commentsMap) {
        initialComments = commentsRes.commentsMap;
      }
      if (commentsRes.joineeCommentsMap) {
        initialJoineeComments = commentsRes.joineeCommentsMap;
      }
    }
  }

  return (
    <DashboardClient
      currentUser={user}
      initialJoinees={initialJoinees}
      initialProgress={initialProgress}
      initialComments={initialComments}
      initialJoineeComments={initialJoineeComments}
      allTasks={tasksData}
    />
  );
}
