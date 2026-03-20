import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <div className="mt-6 rounded-xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-[#677388]">
      Loading login...
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#eef1f5] px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-[#2a313d]">Welcome back</h1>
        <p className="mt-2 text-sm text-[#677388]">
          Sign in to continue to Wavesline.
        </p>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}