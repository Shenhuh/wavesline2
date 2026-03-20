// app/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedNext = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function getDestination() {
    const query = forcedNext
      ? `?next=${encodeURIComponent(forcedNext)}`
      : "";

    const res = await fetch(`/api/auth/post-login${query}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();
    return data.destination || "/chat";
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const destination = await getDestination();
      router.push(destination);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created. Check your email if confirmation is enabled."
    );
    setLoading(false);
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const redirectTo = forcedNext
      ? `${origin}/auth/callback?next=${encodeURIComponent(forcedNext)}`
      : `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 font-semibold text-[#2a313d] disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z"
          />
          <path
            fill="#34A853"
            d="M3.6 7.4l3.2 2.3C7.7 7.8 9.7 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5c-3.7 0-6.9 2.1-8.4 4.9Z"
          />
          <path
            fill="#FBBC05"
            d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.6-1.9 1.1-3.3 1.1-3.9 0-5.2-2.6-5.5-3.8l-3.2 2.5c1.5 3 4.6 4.9 8.7 4.9Z"
          />
          <path
            fill="#4285F4"
            d="M21.1 14.2c.1-.4.1-.8.1-1.3 0-.4 0-.8-.1-1.3H12v3.9h5.5c-.3 1.1-1 2-2.2 2.7l2.9 2.4c1.7-1.6 2.9-3.9 2.9-6.4Z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-black/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-[#677388]">
          <span className="bg-white px-2">or</span>
        </div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#2a313d]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#2a313d]">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            placeholder="••••••••"
          />
        </div>

        {message ? (
          <div className="rounded-xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-[#2a313d]">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#2a313d] px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
              ? "Sign In"
              : "Sign Up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setMessage("");
          }}
          className="w-full rounded-xl border border-black/10 px-4 py-3 font-medium text-[#2a313d]"
        >
          {mode === "signin" ? "Switch to Sign Up" : "Switch to Sign In"}
        </button>
      </form>
    </div>
  );
}