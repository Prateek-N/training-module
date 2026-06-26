import LoginForm from "./LoginForm";
import { seedDefaultLead, seedMandatoryDoc } from "@/actions/admin";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  await Promise.all([
    seedDefaultLead(),
    seedMandatoryDoc()
  ]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md p-8 border border-line bg-card shadow-none relative">
        <div className="mb-10 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-panel border border-line mb-6">
            <span className="text-xl font-bold">🎯</span>
          </div>
          <h1 className="text-6xl font-display font-normal tracking-wide text-text-primary uppercase leading-tight">
            ONBOARDING
          </h1>
          <p className="text-xs font-bold text-text-secondary mt-2 tracking-widest uppercase">
            Day-Wise Training SOP Portal
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
