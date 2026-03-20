// app/login/page.tsx
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#d7dbe2] p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-[#2a313d]">Login</h1>
        <p className="mt-2 text-sm text-[#677388]">
          Sign in or create an account to continue.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}