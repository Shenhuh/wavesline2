// app/not-authorized/page.tsx
import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#d7dbe2] p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-[#2a313d]">Not authorized</h1>
        <p className="mt-2 text-sm text-[#677388]">
          Your account is signed in, but it is not on the admin allowlist.
        </p>

        <div className="mt-5">
          <Link
            href="/chat"
            className="inline-flex rounded-xl border border-black/10 px-4 py-2 font-semibold text-[#2a313d]"
          >
            Go to Chat
          </Link>
        </div>
      </div>
    </main>
  );
}