"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { AuthCard } from "./AuthCard";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (loginError) {
      // Deliberately generic — never confirm/deny whether an email is
      // registered (see SECURITY.md: don't leak account existence).
      setError("Incorrect email or password.");
      return;
    }

    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Welcome back">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line px-3 py-2.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line px-3 py-2.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-mastery-attention">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm text-ink/60">
        <Link href="/forgot-password" className="text-cobalt underline underline-offset-2">
          Forgot password?
        </Link>
        <p>
          New here?{" "}
          <Link href="/signup" className="text-cobalt underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
