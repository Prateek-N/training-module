"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/actions/auth";

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(loginUser, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-4 text-sm text-danger bg-danger-dim border border-danger-border rounded-none">
          {state.error}
        </div>
      )}
      
      <div>
        <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          required
          autoComplete="username"
          className="w-full px-5 py-3 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent transition"
          placeholder="e.g. admin"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full px-5 py-3 rounded-input bg-panel border border-line text-text-primary placeholder-text-secondary/50 focus:outline-none focus:bg-card focus:border-accent transition"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 bg-accent text-accent-text font-bold rounded-button hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer uppercase tracking-widest text-xs"
      >
        {isPending ? "Signing In..." : "Sign In"}
      </button>


    </form>
  );
}
