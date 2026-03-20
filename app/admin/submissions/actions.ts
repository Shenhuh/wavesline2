"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  approveSubmission,
  rejectSubmission,
} from "@/lib/character-submissions";
import {
  approveEventSubmission,
  rejectEventSubmission,
  getEventIdForSubmission,
} from "@/lib/event-submissions";

export async function approveSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) redirect("/admin/submissions?done=missing");

  await approveSubmission({ submissionId, approvedBy: "admin" });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/characters");

  redirect("/admin/submissions?done=approved");
}

export async function rejectSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) redirect("/admin/submissions?done=missing");

  await rejectSubmission({ submissionId, approvedBy: "admin" });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/characters");

  redirect("/admin/submissions?done=rejected");
}

export async function approveEventSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) redirect("/admin/submissions?done=missing");

  const eventId = await getEventIdForSubmission(submissionId);

  await approveEventSubmission({ submissionId, approvedBy: "admin" });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/events");
  if (eventId) revalidatePath(`/admin/events/${eventId}`);

  redirect("/admin/submissions?done=approved&tab=events");
}

export async function rejectEventSubmissionAction(formData: FormData) {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) redirect("/admin/submissions?done=missing");

  const eventId = await getEventIdForSubmission(submissionId);

  await rejectEventSubmission({ submissionId, approvedBy: "admin" });

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/events");
  if (eventId) revalidatePath(`/admin/events/${eventId}`);

  redirect("/admin/submissions?done=rejected&tab=events");
}