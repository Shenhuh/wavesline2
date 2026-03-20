"use server";

import { redirect } from "next/navigation";
import { approveSubmission, rejectSubmission } from "@/lib/character-submissions";

export async function approveSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) {
    redirect("/admin/submissions?done=missing");
  }

  await approveSubmission({
    submissionId,
    approvedBy: "admin",
  });

  redirect("/admin/submissions?done=approved");
}

export async function rejectSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) {
    redirect("/admin/submissions?done=missing");
  }

  await rejectSubmission({
    submissionId,
    approvedBy: "admin",
  });

  redirect("/admin/submissions?done=rejected");
}