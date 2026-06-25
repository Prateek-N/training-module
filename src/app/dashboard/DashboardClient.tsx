"use client";

import React, { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/actions/auth";
import { registerJoinee, getJoineesList, deleteJoinee } from "@/actions/admin";
import { 
  toggleTaskCompletion, 
  getJoineeProgress, 
  resetJoineeProgress, 
  saveDayComment, 
  getJoineeComments,
  saveWeeklyLog,
  getWeeklyLogs,
  saveWeeklyLeadComment,
  submitProbationReview,
  getProbationReview
} from "@/actions/progress";
import { 
  LogOut, 
  UserPlus, 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  User, 
  Clock, 
  Check, 
  RotateCcw,
  ExternalLink,
  Sun,
  Moon,
  Trash2
} from "lucide-react";

interface Task {
  id: string;
  day: number;
  category: string;
  title: string;
  description: string;
}

interface Joinee {
  id: string;
  name: string;
  username: string;
  buddy?: string;
  startDate: string;
  completedCount: number;
  totalTasksCount: number;
  progressPercent: number;
}

interface DashboardClientProps {
  currentUser: {
    id: string;
    name: string;
    username: string;
    role: "lead" | "joinee";
    buddy?: string;
    startDate: string;
  };
  initialJoinees: Joinee[];
  initialProgress: Record<string, { completed: boolean; notes: string }>;
  initialComments?: Record<number, string>;
  allTasks: Task[];
}

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Use UTC properties to guarantee identical rendering on Server (SSR) and Client
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

export default function DashboardClient({
  currentUser,
  initialJoinees,
  initialProgress,
  initialComments = {},
  allTasks
}: DashboardClientProps) {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState<number>(1);
  const [progressMap, setProgressMap] = useState<Record<string, { completed: boolean; notes: string }>>(initialProgress);
  const [joinees, setJoinees] = useState<Joinee[]>(initialJoinees);
  const [selectedJoinee, setSelectedJoinee] = useState<string | null>(null);
  const [selectedJoineeProgress, setSelectedJoineeProgress] = useState<Record<string, { completed: boolean; notes: string }>>({});
  const [selectedJoineeActiveDay, setSelectedJoineeActiveDay] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Tab states for Month navigation
  const [activeTab, setActiveTab] = useState<"month1" | "month2" | "month3" | "review">("month1");
  const [leadActiveTab, setLeadActiveTab] = useState<"month1" | "month2" | "month3" | "review">("month1");

  // Weekly logs states (Months 2 & 3 / Weeks 7–18)
  const [weeklyLogs, setWeeklyLogs] = useState<Record<number, { interviewsCount: number; achievements: string; metrics: string; leadComment: string }>>({});
  const [selectedWeek, setSelectedWeek] = useState<number>(7);

  // Weekly inputs state
  const [weekInterviews, setWeekInterviews] = useState<string>("0");
  const [weekAchievements, setWeekAchievements] = useState<string>("");
  const [weekMetrics, setWeekMetrics] = useState<string>("");
  const [savingWeekLog, setSavingWeekLog] = useState<boolean>(false);

  // Weekly lead feedback comments
  const [weekFeedbackText, setWeekFeedbackText] = useState<string>("");
  const [savingWeekFeedback, setSavingWeekFeedback] = useState<boolean>(false);

  // Probation final review states
  const [probationReview, setProbationReview] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<"completed" | "extended" | "failed">("completed");
  const [reviewInterviews, setReviewInterviews] = useState<number>(0);
  const [reviewAchievements, setReviewAchievements] = useState<string>("");
  const [reviewMetrics, setReviewMetrics] = useState<string>("");
  const [reviewJustification, setReviewJustification] = useState<string>("");
  const [reviewAdditionalInfo, setReviewAdditionalInfo] = useState<string>("");
  const [savingReview, setSavingReview] = useState<boolean>(false);

  const [commentsMap, setCommentsMap] = useState<Record<number, string>>(initialComments || {});
  const [dayCommentText, setDayCommentText] = useState<string>("");
  const [savingComment, setSavingComment] = useState<boolean>(false);

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync React theme state with DOM class on mount
    const isDark = document.documentElement.classList.contains("dark");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  const [registerState, registerAction, isRegisterPending] = useActionState(registerJoinee, null);
  const [, startTransition] = useTransition();

  // Sync dayCommentText when selected joinee, active day, or comments map changes (Leads)
  useEffect(() => {
    if (currentUser.role === "lead" && selectedJoinee) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDayCommentText(commentsMap[selectedJoineeActiveDay] || "");
    }
  }, [currentUser.role, selectedJoinee, selectedJoineeActiveDay, commentsMap]);

  // Save daily comment handler (Leads only)
  const handleSaveDayComment = async () => {
    if (!selectedJoinee) return;
    setSavingComment(true);

    const res = await saveDayComment(selectedJoinee, selectedJoineeActiveDay, dayCommentText);
    if (res.success) {
      setCommentsMap(prev => ({
        ...prev,
        [selectedJoineeActiveDay]: dayCommentText
      }));
      alert("Comment saved successfully.");
    } else {
      alert("Failed to save comment: " + res.error);
    }
    setSavingComment(false);
  };

  // Handle logout
  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
    router.refresh();
  };

  // Sync notesState from database progressMap on day shift
  useEffect(() => {
    const initialNotes: Record<string, string> = {};
    allTasks.forEach(task => {
      if (progressMap[task.id]) {
        initialNotes[task.id] = progressMap[task.id].notes;
      } else {
        initialNotes[task.id] = "";
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotesState(initialNotes);
  }, [allTasks, progressMap]);

  // Load selected joinee progress (for Leads)
  const viewJoineeDetails = async (joineeId: string) => {
    if (selectedJoinee === joineeId) {
      setSelectedJoinee(null);
      return;
    }
    
    setSelectedJoinee(joineeId);
    setLeadActiveTab("month1"); // Reset active tab for lead view
    setSelectedWeek(7); // Reset week
    
    const [progressRes, commentsRes, logsRes, reviewRes] = await Promise.all([
      getJoineeProgress(joineeId),
      getJoineeComments(joineeId),
      getWeeklyLogs(joineeId),
      getProbationReview(joineeId)
    ]);
    
    if (progressRes.success && progressRes.progressMap) {
      setSelectedJoineeProgress(progressRes.progressMap);
    }
    if (commentsRes.success && commentsRes.commentsMap) {
      setCommentsMap(commentsRes.commentsMap);
    } else {
      setCommentsMap({});
    }
    if (logsRes.success && logsRes.logsMap) {
      setWeeklyLogs(logsRes.logsMap);
    } else {
      setWeeklyLogs({});
    }
    if (reviewRes.success && reviewRes.review) {
      setProbationReview(reviewRes.review);
      setReviewStatus(reviewRes.review.status);
      setReviewInterviews(reviewRes.review.finalInterviewsCount);
      setReviewAchievements(reviewRes.review.keyAccomplishments);
      setReviewMetrics(reviewRes.review.performanceMetrics);
      setReviewJustification(reviewRes.review.justification);
      setReviewAdditionalInfo(reviewRes.review.additionalInfo || "");
    } else {
      setProbationReview(null);
      setReviewStatus("completed");
      setReviewInterviews(0);
      setReviewAchievements("");
      setReviewMetrics("");
      setReviewJustification("");
      setReviewAdditionalInfo("");
    }
  };

  // Load joinee details on mount if role is joinee
  useEffect(() => {
    if (currentUser.role === "joinee") {
      const fetchJoineeData = async () => {
        const [logsRes, reviewRes] = await Promise.all([
          getWeeklyLogs(currentUser.id),
          getProbationReview(currentUser.id)
        ]);
        if (logsRes.success && logsRes.logsMap) {
          setWeeklyLogs(logsRes.logsMap);
        }
        if (reviewRes.success && reviewRes.review) {
          setProbationReview(reviewRes.review);
        }
      };
      fetchJoineeData();
    }
  }, [currentUser.id, currentUser.role]);

  // Sync weekly form inputs when week or weeklyLogs changes
  useEffect(() => {
    const currentWeekLog = weeklyLogs[selectedWeek] || { interviewsCount: 0, achievements: "", metrics: "", leadComment: "" };
    setWeekInterviews(String(currentWeekLog.interviewsCount || 0));
    setWeekAchievements(currentWeekLog.achievements || "");
    setWeekMetrics(currentWeekLog.metrics || "");
    setWeekFeedbackText(currentWeekLog.leadComment || "");
  }, [selectedWeek, weeklyLogs]);

  // Sync aggregation on probation review tab
  useEffect(() => {
    const isLeadReviewActive = currentUser.role === "lead" && selectedJoinee && leadActiveTab === "review";
    const isJoineeReviewActive = currentUser.role === "joinee" && activeTab === "review";

    if ((isLeadReviewActive || isJoineeReviewActive) && !probationReview) {
      let totalInterviews = 0;
      const achievementsList: string[] = [];
      const metricsList: string[] = [];

      for (let w = 7; w <= 18; w++) {
        const log = weeklyLogs[w];
        if (log) {
          totalInterviews += log.interviewsCount || 0;
          if (log.achievements?.trim()) {
            achievementsList.push(`• Week ${w}: ${log.achievements.trim()}`);
          }
          if (log.metrics?.trim()) {
            metricsList.push(`• Week ${w}: ${log.metrics.trim()}`);
          }
        }
      }

      setReviewInterviews(totalInterviews);
      setReviewAchievements(achievementsList.join("\n"));
      setReviewMetrics(metricsList.join("\n"));
    }
  }, [activeTab, leadActiveTab, weeklyLogs, currentUser.role, selectedJoinee, probationReview]);

  // Save Weekly Log (Joinees only)
  const handleSaveWeeklyLog = async () => {
    setSavingWeekLog(true);
    const count = parseInt(weekInterviews) || 0;
    const res = await saveWeeklyLog(currentUser.id, selectedWeek, {
      interviewsCount: count,
      achievements: weekAchievements,
      metrics: weekMetrics,
    });

    if (res.success) {
      setWeeklyLogs(prev => ({
        ...prev,
        [selectedWeek]: {
          ...prev[selectedWeek],
          interviewsCount: count,
          achievements: weekAchievements,
          metrics: weekMetrics,
          leadComment: prev[selectedWeek]?.leadComment || ""
        }
      }));
      alert("Weekly log saved successfully.");
    } else {
      alert("Failed to save weekly log: " + res.error);
    }
    setSavingWeekLog(false);
  };

  // Save Weekly Lead Comment (Leads only)
  const handleSaveWeeklyFeedback = async () => {
    if (!selectedJoinee) return;
    setSavingWeekFeedback(true);

    const res = await saveWeeklyLeadComment(selectedJoinee, selectedWeek, weekFeedbackText);
    if (res.success) {
      setWeeklyLogs(prev => ({
        ...prev,
        [selectedWeek]: {
          ...prev[selectedWeek],
          interviewsCount: prev[selectedWeek]?.interviewsCount || 0,
          achievements: prev[selectedWeek]?.achievements || "",
          metrics: prev[selectedWeek]?.metrics || "",
          leadComment: weekFeedbackText
        }
      }));
      alert("Weekly lead feedback saved successfully.");
    } else {
      alert("Failed to save weekly feedback: " + res.error);
    }
    setSavingWeekFeedback(false);
  };

  // Submit Final Probation Review (Leads only)
  const handleSubmitProbationReview = async () => {
    if (!selectedJoinee) return;
    if (!reviewJustification.trim()) {
      alert("Please provide a detailed justification for this probation decision.");
      return;
    }

    setSavingReview(true);
    const res = await submitProbationReview(selectedJoinee, {
      status: reviewStatus,
      finalInterviewsCount: reviewInterviews,
      keyAccomplishments: reviewAchievements,
      performanceMetrics: reviewMetrics,
      justification: reviewJustification,
      additionalInfo: reviewAdditionalInfo
    });

    if (res.success) {
      setProbationReview({
        status: reviewStatus,
        finalInterviewsCount: reviewInterviews,
        keyAccomplishments: reviewAchievements,
        performanceMetrics: reviewMetrics,
        justification: reviewJustification,
        additionalInfo: reviewAdditionalInfo,
        updatedAt: new Date().toISOString()
      });
      alert(`Probation review finalized with status: ${reviewStatus.toUpperCase()}`);
    } else {
      alert("Failed to submit probation review: " + res.error);
    }
    setSavingReview(false);
  };

  // Reset a joinee's progress (Leads only)
  const handleResetProgress = async (joineeId: string) => {
    if (confirm("Are you sure you want to reset all progress for this joinee? This action cannot be undone.")) {
      const res = await resetJoineeProgress(joineeId);
      if (res.success) {
        // Refresh joinees list
        const updated = await getJoineesList();
        if (updated.success && updated.joinees) {
          setJoinees(updated.joinees);
        }
        if (selectedJoinee === joineeId) {
          setSelectedJoineeProgress({});
        }
        alert("Progress reset successfully.");
      }
    }
  };

  // Delete a joinee (Leads only)
  const handleDeleteJoinee = async (joineeId: string, joineeName: string) => {
    if (confirm(`WARNING: Are you sure you want to permanently delete the expert "${joineeName}"? All progress, comments, logs, and final probation reviews will be deleted from the database. This action cannot be undone.`)) {
      const res = await deleteJoinee(joineeId);
      if (res.success) {
        // Deselect if currently expanded
        if (selectedJoinee === joineeId) {
          setSelectedJoinee(null);
          setSelectedJoineeProgress({});
        }
        // Refresh joinees list
        const updated = await getJoineesList();
        if (updated.success && updated.joinees) {
          setJoinees(updated.joinees);
        }
        alert("Expert successfully deleted.");
      } else {
        alert("Failed to delete expert: " + res.error);
      }
    }
  };

  // Checkbox toggle handler (Joinees/Leads)
  const handleCheckboxToggle = async (taskId: string, day: number, currentCompleted: boolean) => {
    const newCompleted = !currentCompleted;
    const currentNotes = notesState[taskId] || "";

    // Optimistic Update
    setProgressMap(prev => ({
      ...prev,
      [taskId]: { completed: newCompleted, notes: currentNotes }
    }));

    const res = await toggleTaskCompletion(currentUser.id, day, taskId, newCompleted, currentNotes);
    if (!res.success) {
      // Revert if error
      setProgressMap(prev => ({
        ...prev,
        [taskId]: { completed: currentCompleted, notes: currentNotes }
      }));
      alert("Failed to save progress. Please try again.");
    }
  };

  // Lead checkbox toggle handler
  const handleLeadCheckboxToggle = async (taskId: string, day: number, currentCompleted: boolean) => {
    if (!selectedJoinee) return;

    const newCompleted = !currentCompleted;
    const currentNotes = selectedJoineeProgress[taskId]?.notes || "";

    // Optimistic Update
    setSelectedJoineeProgress(prev => ({
      ...prev,
      [taskId]: { completed: newCompleted, notes: currentNotes }
    }));

    const res = await toggleTaskCompletion(selectedJoinee, day, taskId, newCompleted, currentNotes);
    if (res.success) {
      // Refresh joinees list to update the progress bar in the master list
      const updated = await getJoineesList();
      if (updated.success && updated.joinees) {
        setJoinees(updated.joinees);
      }
    } else {
      // Revert if error
      setSelectedJoineeProgress(prev => ({
        ...prev,
        [taskId]: { completed: currentCompleted, notes: currentNotes }
      }));
      alert("Failed to save progress. Please try again.");
    }
  };

  // Notes save handler
  const handleSaveNotes = async (taskId: string, day: number) => {
    setSavingNotes(prev => ({ ...prev, [taskId]: true }));
    const currentNotes = notesState[taskId] || "";
    const isCompleted = progressMap[taskId]?.completed || false;

    const res = await toggleTaskCompletion(currentUser.id, day, taskId, isCompleted, currentNotes);
    
    if (res.success) {
      setProgressMap(prev => ({
        ...prev,
        [taskId]: { completed: isCompleted, notes: currentNotes }
      }));
    } else {
      alert("Failed to save notes.");
    }
    setSavingNotes(prev => ({ ...prev, [taskId]: false }));
  };

  // Handle register success
  useEffect(() => {
    if (registerState?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsModalOpen(false);
      // Reload joinees list
      startTransition(async () => {
        const res = await getJoineesList();
        if (res.success && res.joinees) {
          setJoinees(res.joinees);
        }
      });
    }
  }, [registerState]);

  // Calculate user progress stats
  const completedTasks = Object.keys(progressMap).filter(k => progressMap[k]?.completed).length;
  const totalTasks = allTasks.length;
  const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate weekly progress
  const getWeekProgress = (weekNum: number) => {
    // Week 1: Days 1-5, Week 2: Days 6-10, Week 3: Days 11-15
    const startDay = (weekNum - 1) * 5 + 1;
    const endDay = weekNum * 5;
    const weekTasks = allTasks.filter(t => t.day >= startDay && t.day <= endDay);
    const weekCompleted = weekTasks.filter(t => progressMap[t.id]?.completed).length;
    return weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
  };

  const activeDayTasks = allTasks.filter(t => t.day === activeDay);
  const activeDayCompleted = activeDayTasks.filter(t => progressMap[t.id]?.completed).length;

  const filteredJoinees = joinees.filter(j => 
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    j.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-line px-6 py-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent border border-line flex items-center justify-center">
            <span className="text-white text-xs font-bold font-sans">🎯</span>
          </div>
          <div>
            <h1 className="text-2xl font-display font-normal tracking-wider text-text-primary uppercase leading-none">
              ONBOARDING
            </h1>
            <p className="text-[9px] font-bold text-text-secondary tracking-widest uppercase">Expert Ramp-Up Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-text-primary uppercase tracking-wider">{currentUser.name}</p>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{currentUser.role === "lead" ? "Team Lead" : "New Joiner"}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-line bg-panel hover:bg-panel-2 transition text-text-primary cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-line bg-panel hover:bg-panel-2 transition text-xs font-bold uppercase tracking-wider text-text-primary rounded-button cursor-pointer"
          >
            <LogOut size={12} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        
        {/* NEW JOINER DASHBOARD VIEW */}
        {currentUser.role === "joinee" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Campaign Hero Tile */}
            <div className="lg:col-span-3">
              <div 
                className="relative h-64 sm:h-80 w-full overflow-hidden bg-cover bg-center flex items-end p-8 border border-line bg-no-repeat rounded-none"
                style={{ backgroundImage: theme === "dark" ? "url('/workspace_hero_dark.png')" : "url('/workspace_hero.png')" }}
              >
                {/* Dark overlay for contrast */}
                <div className="absolute inset-0 bg-black/45" />
                <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-white tracking-widest uppercase bg-danger px-3 py-1 rounded-full mb-3 inline-block">
                      LIVE RAMP-UP
                    </span>
                    <h2 className="text-6xl sm:text-7xl font-display font-normal text-white uppercase leading-none tracking-wide select-none">
                      DAY {String(activeDay).padStart(2, '0')}
                    </h2>
                    <p className="text-[10px] sm:text-xs font-semibold text-white/90 uppercase tracking-widest mt-1">
                      {activeDayTasks[0]?.category || "Core training"} Focus
                    </p>
                  </div>
                  <div>
                    <div className="bg-card text-text-primary px-6 py-3 rounded-button font-bold text-[10px] uppercase tracking-widest inline-flex items-center gap-2 shadow-none select-none">
                      <span>Progress:</span>
                      <span className="text-good">{activeDayCompleted}/{activeDayTasks.length} Done</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Phase Navigation Tabs */}
            <div className="lg:col-span-3 flex border-b border-line gap-2 overflow-x-auto pb-1 mt-4">
              {[
                { id: "month1", label: "Month 1: Onboarding Checklist (Day 1-30)" },
                { id: "month2", label: "Month 2: Supervised (Week 7-12)" },
                { id: "month3", label: "Month 3: Independent (Week 13-18)" },
                { id: "review", label: "Probation Review" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 border-b-2 font-display text-base tracking-wider uppercase transition cursor-pointer font-bold ${
                    activeTab === tab.id
                      ? "border-accent text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Left & Center Panel: Switchable Views */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* MONTH 1: ONBOARDING CHECKLIST */}
              {activeTab === "month1" && (
                <>
                  {/* Day selection horizontal rail */}
                  <div className="glass-panel p-6 rounded-none space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <Clock size={14} className="text-text-primary" />
                        Select Onboarding Day
                      </h3>
                      <span className="text-[10px] font-bold px-3 py-1 bg-accent border border-line text-accent-text rounded-button uppercase tracking-wider">
                        Day {activeDay} of 30
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                        const dayTasks = allTasks.filter(t => t.day === day);
                        const dayCompleted = dayTasks.filter(t => progressMap[t.id]?.completed).length;
                        const isFullyCompleted = dayTasks.length > 0 && dayCompleted === dayTasks.length;
                        
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setActiveDay(day)}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-button border text-xs font-bold transition cursor-pointer flex flex-col items-center min-w-20 uppercase tracking-wider ${
                              activeDay === day
                                ? "bg-accent border-accent text-accent-text"
                                : isFullyCompleted
                                ? "bg-card border-2 border-good text-good"
                                : "bg-panel border-line text-text-secondary hover:bg-panel-2 hover:text-text-primary"
                            }`}
                          >
                            <span>Day {day}</span>
                            <span className="text-[9px] mt-0.5 opacity-80 font-sans">
                              {dayCompleted}/{dayTasks.length} Done
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-3xl font-display font-normal text-text-primary uppercase tracking-wider">
                        Day {activeDay} Training Checklist
                      </h2>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        {activeDayCompleted}/{activeDayTasks.length} Tasks
                      </span>
                    </div>

                    {activeDayTasks.length === 0 ? (
                      <div className="glass-panel p-12 text-center rounded-none text-text-secondary">
                        <p className="text-sm font-bold uppercase tracking-wider">No tasks defined for this day.</p>
                      </div>
                    ) : (
                      activeDayTasks.map((task) => {
                        const isCompleted = progressMap[task.id]?.completed || false;
                        return (
                          <div 
                            key={task.id} 
                            className="glass-panel p-6 rounded-none transition flex gap-6 items-start hover:border-text-primary"
                          >
                            <button 
                              type="button"
                              onClick={() => handleCheckboxToggle(task.id, task.day, isCompleted)}
                              className="mt-0.5 flex-shrink-0 text-text-secondary hover:text-text-primary transition cursor-pointer border-none bg-transparent p-0"
                            >
                              {isCompleted ? (
                                <CheckCircle className="text-good fill-good/10" size={24} />
                              ) : (
                                <Circle className="text-line hover:text-text-primary" size={24} />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-none bg-panel text-text-secondary border border-line">
                                  {task.category}
                                </span>
                              </div>
                              <h4 className={`text-base font-bold mt-2 tracking-tight ${isCompleted ? "line-through text-text-secondary" : "text-text-primary"}`}>
                                {task.title}
                              </h4>
                              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{task.description}</p>
                              
                              {/* Notes/Links form */}
                              <div className="mt-4 pt-4 border-t border-line space-y-2">
                                <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                                  Progress Note / Proof Link (Resume doc, recordings, logs)
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={notesState[task.id] || ""}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setNotesState(prev => ({ ...prev, [task.id]: text }));
                                    }}
                                    placeholder="Add notes or paste drive link here..."
                                    className="flex-1 px-4 py-2 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveNotes(task.id, task.day)}
                                    disabled={savingNotes[task.id]}
                                    className="px-4 py-2 bg-accent border border-accent text-accent-text hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-button disabled:opacity-50 flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                  >
                                    {savingNotes[task.id] ? "Saving..." : <Check size={12} />}
                                    <span>Save</span>
                                  </button>
                                </div>
                                {progressMap[task.id]?.notes && progressMap[task.id].notes.startsWith("http") && (
                                  <a 
                                    href={progressMap[task.id].notes} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-text-primary hover:underline uppercase tracking-wider mt-1"
                                  >
                                    <ExternalLink size={10} />
                                    <span>Open Link</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Lead Feedback Comment Box (Joinee read-only view) */}
                  <div className="glass-panel p-6 rounded-none space-y-3">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <span>💬 Buddy / Lead Feedback (Day {activeDay})</span>
                    </h3>
                    {commentsMap[activeDay] ? (
                      <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium leading-relaxed break-words font-sans">
                        &quot;{commentsMap[activeDay]}&quot;
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary italic font-sans">
                        No comments or feedback logged by your buddy for this day yet.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* MONTH 2 & 3: WEEKLY LOGS */}
              {(activeTab === "month2" || activeTab === "month3") && (
                <>
                  {/* Week selection horizontal rail */}
                  <div className="glass-panel p-6 rounded-none space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <Clock size={14} className="text-text-primary" />
                        Select Work Week
                      </h3>
                      <span className="text-[10px] font-bold px-3 py-1 bg-accent border border-line text-accent-text rounded-button uppercase tracking-wider">
                        Week {selectedWeek}
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {(activeTab === "month2" ? [7, 8, 9, 10, 11, 12] : [13, 14, 15, 16, 17, 18]).map((week) => {
                        const log = weeklyLogs[week];
                        const hasLog = log && (log.interviewsCount > 0 || log.achievements || log.metrics);
                        
                        return (
                          <button
                            key={week}
                            type="button"
                            onClick={() => setSelectedWeek(week)}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-button border text-xs font-bold transition cursor-pointer flex flex-col items-center min-w-20 uppercase tracking-wider ${
                              selectedWeek === week
                                ? "bg-accent border-accent text-accent-text"
                                : hasLog
                                ? "bg-card border-2 border-good text-good"
                                : "bg-panel border-line text-text-secondary hover:bg-panel-2 hover:text-text-primary"
                            }`}
                          >
                            <span>Week {week}</span>
                            <span className="text-[9px] mt-0.5 opacity-80">
                              {hasLog ? "Logged" : "Empty"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly form inputs */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-3xl font-display font-normal text-text-primary uppercase tracking-wider">
                        Week {selectedWeek} Performance Log
                      </h2>
                      <span className="text-[10px] font-bold px-3 py-1 bg-accent border border-line text-accent-text rounded-button uppercase tracking-wider">
                        {activeTab === "month2" ? "Month 2: Supervised" : "Month 3: Independent"}
                      </span>
                    </div>

                    <div className="glass-panel p-6 rounded-none space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                          Number of Interviews Conducted
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={weekInterviews}
                          onChange={(e) => setWeekInterviews(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary focus:outline-none focus:bg-card focus:border-accent text-xs font-semibold uppercase tracking-wider"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                          Key Achievements & Accomplishments
                        </label>
                        <textarea
                          rows={4}
                          value={weekAchievements}
                          onChange={(e) => setWeekAchievements(e.target.value)}
                          placeholder="Summarize your key achievements, candidate interactions, and projects worked on..."
                          className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                          Performance Metrics & Contributions
                        </label>
                        <textarea
                          rows={3}
                          value={weekMetrics}
                          onChange={(e) => setWeekMetrics(e.target.value)}
                          placeholder="E.g. SLA response rate, candidate satisfaction notes, resume audit accuracy..."
                          className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveWeeklyLog}
                          disabled={savingWeekLog}
                          className="px-6 py-2.5 bg-accent border border-accent text-accent-text hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-button disabled:opacity-50 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          {savingWeekLog ? "Saving..." : "Save Weekly Log"}
                        </button>
                      </div>
                    </div>

                    {/* Buddy / Lead weekly comment box */}
                    <div className="glass-panel p-6 rounded-none space-y-3">
                      <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <span>💬 Buddy / Lead Feedback (Week {selectedWeek})</span>
                      </h3>
                      {weeklyLogs[selectedWeek]?.leadComment ? (
                        <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium leading-relaxed break-words font-sans">
                          &quot;{weeklyLogs[selectedWeek].leadComment}&quot;
                        </p>
                      ) : (
                        <p className="text-xs text-text-secondary italic font-sans">
                          No comments or feedback logged by your buddy for this week yet.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* PROBATION REVIEW */}
              {activeTab === "review" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-3xl font-display font-normal text-text-primary uppercase tracking-wider">
                      Probation Review Status
                    </h2>
                  </div>

                  {!probationReview ? (
                    <div className="glass-panel p-8 text-center rounded-none border border-line bg-card space-y-4">
                      <div className="w-12 h-12 rounded-full bg-panel border border-line flex items-center justify-center mx-auto">
                        <span className="text-xl">⏳</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Evaluation Review Pending</h3>
                        <p className="text-[11px] text-text-secondary mt-2 max-w-sm mx-auto leading-relaxed uppercase tracking-wider font-semibold">
                          Your Team Lead has not finalized your probation evaluation yet. 
                          Keep performing tasks, updating your weekly logs, and syncing with your Buddy!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={`glass-panel p-8 rounded-none border space-y-6 ${
                      probationReview.status === "completed" 
                        ? "border-good bg-good-dim" 
                        : probationReview.status === "extended" 
                        ? "border-warn bg-panel" 
                        : "border-danger bg-danger-dim"
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
                        <div>
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                            Probation Evaluation Status
                          </span>
                          <h3 className="text-4xl font-display font-normal text-text-primary uppercase tracking-wider mt-1 leading-none">
                            {probationReview.status === "completed" 
                              ? "Probation Completed Successfully 🎉" 
                              : probationReview.status === "extended" 
                              ? "Probation Period Extended ⏳" 
                              : "Probation Evaluation Failed ❌"}
                          </h3>
                        </div>
                        <span className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-button border ${
                          probationReview.status === "completed" 
                            ? "bg-good text-white border-good" 
                            : probationReview.status === "extended" 
                            ? "bg-panel text-text-primary border-line" 
                            : "bg-danger text-white border-danger"
                        }`}>
                          {probationReview.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                            Final Interviews Conducted
                          </span>
                          <p className="text-lg font-bold text-text-primary uppercase tracking-wider">{probationReview.finalInterviewsCount} Interviews</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                            Date of Evaluation
                          </span>
                          <p className="text-lg font-bold text-text-primary uppercase tracking-wider">{formatDate(probationReview.updatedAt)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t border-line">
                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block">
                          Key Achievements & Accomplishments
                        </span>
                        <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium whitespace-pre-line leading-relaxed font-sans">
                          {probationReview.keyAccomplishments}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block">
                          Performance Metrics & Contributions
                        </span>
                        <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium whitespace-pre-line leading-relaxed font-sans">
                          {probationReview.performanceMetrics}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block">
                          Buddy / Lead Justification
                        </span>
                        <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium whitespace-pre-line leading-relaxed font-sans">
                          {probationReview.justification}
                        </p>
                      </div>

                      {probationReview.additionalInfo && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block">
                            Additional Information
                          </span>
                          <p className="text-xs text-text-primary bg-panel p-4 border border-line rounded-none italic font-medium whitespace-pre-line leading-relaxed font-sans">
                            {probationReview.additionalInfo}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right Panel: Welcome, Stats & Warnings */}
            <div className="space-y-6">
              
              {/* User details card */}
              <div className="glass-panel p-6 rounded-none relative overflow-hidden">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-line pb-3 mb-4">
                  New Joiner Profile
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-text-secondary font-medium">Name</span>
                    <span className="text-text-primary font-bold">{currentUser.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <span className="text-text-secondary font-medium">Buddy/Lead</span>
                    <span className="text-text-primary font-bold">{currentUser.buddy || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-text-secondary font-medium">Start Date</span>
                    <span className="text-text-primary font-bold">
                      {formatDate(currentUser.startDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Summary bar */}
              <div className="glass-panel p-6 rounded-none space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Ramp-Up Progress
                </h3>
                
                <div>
                  <div className="flex justify-between text-xs mb-1 font-bold uppercase tracking-wider">
                    <span className="text-text-secondary">Total Completion</span>
                    <span className="text-text-primary">{overallPercentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-panel border border-line rounded-none overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${overallPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mt-1.5 block">
                    {completedTasks} of {totalTasks} tasks checked
                  </span>
                </div>

                <div className="pt-4 border-t border-line space-y-3">
                  {[
                    { nr: 1, label: "Week 1: SOP Foundation", color: "bg-accent" },
                    { nr: 2, label: "Week 2: Mock Exercises", color: "bg-accent" },
                    { nr: 3, label: "Week 3: Supervised Mocking", color: "bg-accent" },
                    { nr: 4, label: "Week 4: Hands-on Mocking", color: "bg-[#007d48]" },
                    { nr: 5, label: "Week 5: Hands-on Practice", color: "bg-[#007d48]" },
                    { nr: 6, label: "Week 6: Hands-on Assessment", color: "bg-danger" }
                  ].map((w) => (
                    <div key={w.nr}>
                      <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider">
                        <span className="text-text-secondary">{w.label}</span>
                        <span className="text-text-primary">{getWeekProgress(w.nr)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-panel border border-line rounded-none overflow-hidden">
                        <div className={`h-full ${w.color} transition-all`} style={{ width: `${getWeekProgress(w.nr)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zero-tolerance guidelines (styled callout from original design) */}
              <div className="glass-panel p-6 border border-danger bg-card rounded-none space-y-3">
                <h4 className="text-xs font-bold text-danger flex items-center gap-2 uppercase tracking-widest">
                  🚨 Zero‑Tolerance Compliance
                </h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  These standards apply from Day 1. Violations lead to immediate evaluation:
                </p>
                <ul className="text-[11px] text-text-secondary space-y-2 list-disc pl-4 font-medium leading-relaxed">
                  <li>No missed pre-checks (30-20-10 protocol)</li>
                  <li>No missing screen/audio recordings</li>
                  <li>No access-denial email omissions</li>
                  <li>No AI-generated candidate feedback sheets</li>
                  <li>No late client task updates</li>
                  <li>No impersonation or misrepresentation</li>
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* TEAM LEAD (ADMIN) DASHBOARD VIEW */}
        {currentUser.role === "lead" && (
          <div className="space-y-6">
            
            {/* Dashboard Action Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-6 border-b border-line">
              <div>
                <h2 className="text-4xl font-display font-normal text-text-primary uppercase tracking-wider">Team Lead Dashboard</h2>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mt-1">Register new joinees and track progression.</p>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-text font-bold rounded-button hover:opacity-90 active:scale-95 transition cursor-pointer uppercase tracking-widest text-xs"
              >
                <UserPlus size={14} />
                <span>Add New Joiner</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex max-w-md bg-panel border border-line rounded-input overflow-hidden focus-within:bg-card focus-within:border-accent transition">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search joiners by name or username..."
                className="w-full px-5 py-3 bg-transparent text-text-primary placeholder-text-secondary/50 focus:outline-none text-xs uppercase tracking-wider font-semibold"
              />
            </div>

            {/* Joinees Listing */}
            <div className="space-y-4">
              {filteredJoinees.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-none text-text-secondary">
                  <p className="text-sm font-bold uppercase tracking-wider">No new joinees registered yet.</p>
                  <p className="text-xs mt-1 uppercase tracking-widest">Click &quot;Add New Joiner&quot; above to seed your team.</p>
                </div>
              ) : (
                filteredJoinees.map((joinee) => {
                  const isExpanded = selectedJoinee === joinee.id;
                  
                  return (
                    <div key={joinee.id} className="glass-panel rounded-none overflow-hidden transition">
                      {/* Main Card Item */}
                      <div 
                        onClick={() => viewJoineeDetails(joinee.id)}
                        className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer hover:bg-panel transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-text-primary uppercase tracking-wide">{joinee.name}</h3>
                            <span className="px-2.5 py-0.5 bg-panel border border-line rounded-none text-[10px] font-bold font-sans text-text-secondary uppercase tracking-widest">
                              @{joinee.username}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] text-text-secondary mt-2 flex-wrap font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-text-primary" />
                              Buddy: {joinee.buddy || "Unassigned"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-text-primary" />
                              Joined: {(() => {
                                const d = new Date(joinee.startDate);
                                return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Progress visual */}
                        <div className="flex items-center gap-4 w-full md:w-64">
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] mb-1 font-bold uppercase tracking-wider">
                              <span className="text-text-secondary">Progress</span>
                              <span className="text-text-primary">{joinee.progressPercent}%</span>
                            </div>
                            <div className="w-full h-2 bg-panel border border-line rounded-none overflow-hidden">
                              <div 
                                className="h-full bg-accent transition-all duration-300"
                                style={{ width: `${joinee.progressPercent}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-text-secondary">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Day-Wise Checklist Details */}
                      {isExpanded && (
                        <div className="border-t border-line bg-panel p-6 space-y-6">
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-line pb-4">
                            <div>
                              <h4 className="text-lg font-display font-normal text-text-primary uppercase tracking-wider">
                                Detailed Progression Dashboard for {joinee.name}
                              </h4>
                              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">
                                Phase tracking and evaluation console
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleResetProgress(joinee.id)}
                                className="flex items-center gap-1.5 px-4 py-2 border border-danger bg-card hover:bg-danger text-danger hover:text-white transition text-[10px] font-bold rounded-button cursor-pointer uppercase tracking-wider"
                              >
                                <RotateCcw size={12} />
                                <span>Reset Progress</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteJoinee(joinee.id, joinee.name)}
                                className="flex items-center gap-1.5 px-4 py-2 border border-danger bg-card hover:bg-danger text-danger hover:text-white transition text-[10px] font-bold rounded-button cursor-pointer uppercase tracking-wider"
                              >
                                <Trash2 size={12} />
                                <span>Delete Expert</span>
                              </button>
                            </div>
                          </div>

                          {/* Lead Month Navigation Tabs */}
                          <div className="flex border-b border-line gap-2 overflow-x-auto">
                            {[
                              { id: "month1", label: "Month 1: Onboarding" },
                              { id: "month2", label: "Month 2: Supervised" },
                              { id: "month3", label: "Month 3: Independent" },
                              { id: "review", label: "Probation Review" },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setLeadActiveTab(tab.id as any)}
                                className={`px-4 py-2 border-b-2 font-display text-sm tracking-wider uppercase transition cursor-pointer font-bold ${
                                  leadActiveTab === tab.id
                                    ? "border-accent text-text-primary"
                                    : "border-transparent text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* MONTH 1 PROGRESS DETAILS */}
                          {leadActiveTab === "month1" && (
                            <>
                              {/* Day Filter Sub-tabs */}
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                                  const dayTasks = allTasks.filter(t => t.day === day);
                                  const dayCompleted = dayTasks.filter(t => selectedJoineeProgress[t.id]?.completed).length;
                                  const isFullyCompleted = dayTasks.length > 0 && dayCompleted === dayTasks.length;
                                  
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => setSelectedJoineeActiveDay(day)}
                                      className={`flex-shrink-0 px-3 py-1.5 rounded-button border text-[10px] font-bold transition cursor-pointer flex flex-col items-center min-w-16 uppercase tracking-wider ${
                                        selectedJoineeActiveDay === day
                                          ? "bg-accent border-accent text-accent-text"
                                          : isFullyCompleted
                                          ? "bg-card border-2 border-good text-good"
                                          : "bg-card border border-line text-text-secondary hover:border-text-primary"
                                      }`}
                                    >
                                      <span>Day {day}</span>
                                      <span className="text-[9px] mt-0.5 opacity-80">{dayCompleted}/{dayTasks.length}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Render Tasks for selected joinee's day */}
                              <div className="space-y-3">
                                {allTasks.filter(t => t.day === selectedJoineeActiveDay).length === 0 ? (
                                  <div className="p-6 bg-card border border-line rounded-none text-center text-text-secondary text-xs uppercase tracking-wider">
                                    No tasks defined for Day {selectedJoineeActiveDay}.
                                  </div>
                                ) : (
                                  allTasks.filter(t => t.day === selectedJoineeActiveDay).map((task) => {
                                    const isCompleted = selectedJoineeProgress[task.id]?.completed || false;
                                    const note = selectedJoineeProgress[task.id]?.notes || "";
                                    
                                    return (
                                      <div key={task.id} className="p-4 bg-card border border-line rounded-none flex items-start gap-4">
                                        <button
                                          type="button"
                                          onClick={() => handleLeadCheckboxToggle(task.id, task.day, isCompleted)}
                                          className="mt-0.5 flex-shrink-0 text-text-secondary hover:text-text-primary transition cursor-pointer font-normal border-none bg-transparent p-0"
                                        >
                                          {isCompleted ? (
                                            <CheckCircle className="text-good fill-good/10" size={20} />
                                          ) : (
                                            <Circle className="text-line hover:text-text-primary" size={20} />
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-sm font-bold text-text-primary">{task.title}</h5>
                                          <p className="text-xs text-text-secondary mt-0.5">{task.description}</p>
                                          
                                          {note && (
                                            <div className="mt-3 p-3 bg-panel rounded-none border border-line space-y-1">
                                              <span className="text-[9px] font-bold text-text-primary uppercase tracking-widest">
                                                Joinee Progress Note:
                                              </span>
                                              <p className="text-xs text-text-primary italic font-medium break-all">&quot;{note}&quot;</p>
                                              {note.startsWith("http") && (
                                                <a 
                                                  href={note} 
                                                  target="_blank" 
                                                  rel="noreferrer" 
                                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-text-primary hover:underline uppercase tracking-wider mt-1"
                                                >
                                                  <ExternalLink size={10} />
                                                  <span>Open Link</span>
                                                </a>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Lead Comment Box */}
                              <div className="mt-6 pt-6 border-t border-line bg-card p-6 rounded-none space-y-3">
                                <label className="block text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                                  <span>💬 Team Lead Feedback & Comments (Day {selectedJoineeActiveDay})</span>
                                </label>
                                <textarea
                                  rows={3}
                                  value={dayCommentText}
                                  onChange={(e) => setDayCommentText(e.target.value)}
                                  placeholder="Add progress feedback, notes on quality, warnings, or encouragement for this day..."
                                  className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent"
                                />
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={handleSaveDayComment}
                                    disabled={savingComment}
                                    className="px-6 py-2.5 bg-accent border border-accent text-accent-text hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-button disabled:opacity-50 flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                  >
                                    {savingComment ? "Saving..." : "Save Comment"}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}

                          {/* MONTH 2 & 3 WEEKLY PROGRESS SUMMARY & COMMENTS */}
                          {(leadActiveTab === "month2" || leadActiveTab === "month3") && (
                            <>
                              {/* Week Filter Sub-tabs */}
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                {(leadActiveTab === "month2" ? [7, 8, 9, 10, 11, 12] : [13, 14, 15, 16, 17, 18]).map((week) => {
                                  const log = weeklyLogs[week];
                                  const hasLog = log && (log.interviewsCount > 0 || log.achievements || log.metrics);
                                  
                                  return (
                                    <button
                                      key={week}
                                      type="button"
                                      onClick={() => setSelectedWeek(week)}
                                      className={`flex-shrink-0 px-3 py-1.5 rounded-button border text-[10px] font-bold transition cursor-pointer flex flex-col items-center min-w-16 uppercase tracking-wider ${
                                        selectedWeek === week
                                          ? "bg-accent border-accent text-accent-text"
                                          : hasLog
                                          ? "bg-card border-2 border-good text-good"
                                          : "bg-card border border-line text-text-secondary hover:border-text-primary"
                                      }`}
                                    >
                                      <span>Week {week}</span>
                                      <span className="text-[9px] mt-0.5 opacity-80">{hasLog ? "Logged" : "Empty"}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Display Joinee Logs Side-by-Side with Feedback Form */}
                              <div className="space-y-4">
                                <div className="p-4 bg-card border border-line rounded-none space-y-4">
                                  <div className="flex justify-between items-center border-b border-line pb-2 mb-2">
                                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                                      Joinee Inputs for Week {selectedWeek}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 border border-line rounded-none text-text-secondary uppercase">
                                      {weeklyLogs[selectedWeek] ? "Submitted" : "No Submission"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                                    <div className="p-3 bg-panel border border-line space-y-1">
                                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block font-sans">
                                        Interviews Conducted:
                                      </span>
                                      <span className="text-sm font-bold text-text-primary font-mono">
                                        {weeklyLogs[selectedWeek]?.interviewsCount || 0}
                                      </span>
                                    </div>
                                    <div className="p-3 bg-panel border border-line space-y-1 md:col-span-2">
                                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block font-sans">
                                        Achievements & Accomplishments:
                                      </span>
                                      <p className="text-xs text-text-primary font-medium italic">
                                        {weeklyLogs[selectedWeek]?.achievements ? `"${weeklyLogs[selectedWeek].achievements}"` : "None logged yet"}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-panel border border-line space-y-1 md:col-span-3">
                                      <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block font-sans">
                                        Metrics & Contributions:
                                      </span>
                                      <p className="text-xs text-text-primary font-medium italic">
                                        {weeklyLogs[selectedWeek]?.metrics ? `"${weeklyLogs[selectedWeek].metrics}"` : "None logged yet"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Weekly Lead Comment Form */}
                                <div className="mt-6 pt-6 border-t border-line bg-card p-6 rounded-none space-y-3">
                                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <span>💬 Buddy / Lead Weekly Feedback (Week {selectedWeek})</span>
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={weekFeedbackText}
                                    onChange={(e) => setWeekFeedbackText(e.target.value)}
                                    placeholder="Add constructive comments, guidance or reviews for this week..."
                                    className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent"
                                  />
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={handleSaveWeeklyFeedback}
                                      disabled={savingWeekFeedback}
                                      className="px-6 py-2.5 bg-accent border border-accent text-accent-text hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-button disabled:opacity-50 flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                                    >
                                      {savingWeekFeedback ? "Saving..." : "Save Weekly Feedback"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* MONTH 3 PROBATION COMPILATION AND EVALUATION REVIEW */}
                          {leadActiveTab === "review" && (
                            <div className="space-y-6">
                              <div className="flex justify-between items-center border-b border-line pb-4">
                                <div>
                                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest">
                                    Probation Review & Evaluation Panel
                                  </h4>
                                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">
                                    Assess candidate accomplishments and decide probation completion.
                                  </p>
                                </div>
                                {probationReview && (
                                  <span className="text-[9px] font-bold px-3 py-1 bg-good border border-good text-white rounded-button uppercase tracking-wider">
                                    Finalized Status: {probationReview.status}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                <div className="p-4 bg-panel border border-line space-y-1">
                                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block font-sans">
                                    Month 1 Training Checkmarks:
                                  </span>
                                  <span className="text-lg font-bold text-text-primary">
                                    {joinee.progressPercent}% Completed
                                  </span>
                                </div>
                                <div className="p-4 bg-panel border border-line space-y-1">
                                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest block font-sans">
                                    Month 2 & 3 Aggregated Interviews Conducted:
                                  </span>
                                  <span className="text-lg font-bold text-text-primary">
                                    {reviewInterviews} Interviews conducted
                                  </span>
                                </div>
                              </div>

                              {/* Review evaluation form */}
                              <div className="glass-panel p-6 rounded-none space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                      Probation Review Decision
                                    </label>
                                    <select
                                      value={reviewStatus}
                                      onChange={(e) => setReviewStatus(e.target.value as any)}
                                      className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary focus:outline-none focus:bg-card focus:border-accent text-xs font-semibold uppercase tracking-wider"
                                    >
                                      <option value="completed">Completed Successfully (Pass)</option>
                                      <option value="extended">Extend Probation Period</option>
                                      <option value="failed">Failed / Terminate</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                      Total Interviews Count (Custom adjustment)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={reviewInterviews}
                                      onChange={(e) => setReviewInterviews(parseInt(e.target.value) || 0)}
                                      className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary focus:outline-none focus:bg-card focus:border-accent text-xs font-semibold"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                    Key Achievements during probation (Editable compilation)
                                  </label>
                                  <textarea
                                    rows={5}
                                    value={reviewAchievements}
                                    onChange={(e) => setReviewAchievements(e.target.value)}
                                    placeholder="Compile accomplishments..."
                                    className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                    Performance Metrics & Contributions (Editable compilation)
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={reviewMetrics}
                                    onChange={(e) => setReviewMetrics(e.target.value)}
                                    placeholder="Compile metrics..."
                                    className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                    Detailed Justification for ending probation successfully (Required)
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={reviewJustification}
                                    onChange={(e) => setReviewJustification(e.target.value)}
                                    placeholder="Provide detailed feedback, justification, and recommendations for this expert's probation..."
                                    className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                                    Additional Information / General Notes
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={reviewAdditionalInfo}
                                    onChange={(e) => setReviewAdditionalInfo(e.target.value)}
                                    placeholder="Optional additional context..."
                                    className="w-full px-4 py-3 bg-panel border border-line rounded-input text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent font-sans"
                                  />
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="button"
                                    onClick={handleSubmitProbationReview}
                                    disabled={savingReview}
                                    className="px-6 py-2.5 bg-accent border border-accent text-accent-text hover:opacity-90 active:scale-95 transition-all text-xs font-bold rounded-button disabled:opacity-50 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                  >
                                    {savingReview ? "Finalizing..." : "Finalize Probation Evaluation"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-line py-8 text-center bg-card">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">© 2026 Onboarding Training SOP Portal. ALL RIGHTS RESERVED. @Prateek Narvariya</p>
      </footer>

      {/* REGISTER NEW JOINEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-none">
          <div className="w-full max-w-md p-6 bg-card border border-line rounded-none shadow-none relative">
            <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 uppercase tracking-wide">
              <UserPlus className="text-text-primary" size={20} />
              Register New Joinee
            </h3>

            {registerState?.error && (
              <div className="p-3 mb-4 text-xs text-danger bg-danger-dim border border-danger-border rounded-none">
                {registerState.error}
              </div>
            )}

            <form action={registerAction} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Bhavya Sharma"
                  className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/40 focus:outline-none focus:bg-card focus:border-accent text-xs uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="e.g. bhavya"
                  className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/40 focus:outline-none focus:bg-card focus:border-accent text-xs uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/40 focus:outline-none focus:bg-card focus:border-accent text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary focus:outline-none focus:bg-card focus:border-accent text-xs uppercase tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-primary mb-1 uppercase tracking-wider">
                    Buddy / Team Lead
                  </label>
                  <input
                    type="text"
                    name="buddy"
                    placeholder={currentUser.name}
                    className="w-full px-4 py-2.5 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/40 focus:outline-none focus:bg-card focus:border-accent text-xs uppercase tracking-wider"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-line bg-panel hover:bg-panel-2 text-text-secondary hover:text-text-primary transition text-[10px] font-bold rounded-button cursor-pointer uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisterPending}
                  className="px-5 py-2.5 bg-accent text-accent-text font-bold rounded-button hover:opacity-90 transition text-[10px] disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {isRegisterPending ? "Registering..." : "Add Joinee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
