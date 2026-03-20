// lib/chat/reply-memory.ts

import type { MessageLite } from "./reply-planner";
import type { CharacterMemory } from "./relationship";

function normalize(text: string) {
  return text.toLowerCase().trim();
}

export function buildLightMemorySummary(
  history: MessageLite[],
  runtimeMemory?: CharacterMemory
) {
  const lines: string[] = [];

  const recentUser = history.filter((m) => m.role === "user").slice(-8);

  const dynamicTopics: string[] = [];

  for (const msg of recentUser) {
    const t = normalize(msg.content);

    if (t.includes("monster")) dynamicTopics.push("user has been asking about monsters");
    if (t.includes("lore")) dynamicTopics.push("user is interested in lore");
    if (t.includes("rinascita")) dynamicTopics.push("user is focused on Rinascita");
    if (t.includes("relationship")) dynamicTopics.push("user is focused on character relationships");
    if (t.includes("group chat")) dynamicTopics.push("user is working on group chat behavior");
    if (t.includes("reply") || t.includes("human")) dynamicTopics.push("user wants more human-sounding replies");
    if (t.includes("phrolova")) dynamicTopics.push("user is focused on Phrolova");
    if (t.includes("luuk")) dynamicTopics.push("user is focused on Luuk");
    if (t.includes("code") || t.includes("route.ts")) dynamicTopics.push("user wants implementation help");
  }

  for (const topic of Array.from(new Set(dynamicTopics)).slice(0, 5)) {
    lines.push(`- ${topic}`);
  }

  if (runtimeMemory) {
    if (runtimeMemory.recentTopics.length) {
      lines.push(
        `- recent tracked topics: ${runtimeMemory.recentTopics.join(", ")}`
      );
    }

    if (
      runtimeMemory.emotionalStreak !== "neutral" &&
      runtimeMemory.emotionalStreakCount > 0
    ) {
      lines.push(
        `- user emotional streak: ${runtimeMemory.emotionalStreak} for ${runtimeMemory.emotionalStreakCount} turn(s)`
      );
    }

    if (runtimeMemory.lastUserIntent) {
      lines.push(`- last observed user intent: ${runtimeMemory.lastUserIntent}`);
    }

    if (runtimeMemory.unresolvedTopic) {
      lines.push(`- possibly unresolved topic: ${runtimeMemory.unresolvedTopic}`);
    }

    for (const note of runtimeMemory.userPatternNotes.slice(-4)) {
      lines.push(`- pattern note: ${note}`);
    }
  }

  return lines.join("\n");
}