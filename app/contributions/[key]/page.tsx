import { notFound } from "next/navigation";
import {
  listSubmissionsForCharacter,
  getCharacterByKeyForContribution,
  formatCharacterFieldValue,
  CONTRIBUTABLE_FIELDS,
} from "@/lib/character-submissions";
import ContributionClient from "./ContributionClient";

export default async function ContributionPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const character = await getCharacterByKeyForContribution(key);
  if (!character) notFound();

  const submissions = await listSubmissionsForCharacter(character.id);
  const currentFieldValues = Object.fromEntries(
    CONTRIBUTABLE_FIELDS.map((field) => [
      field,
      formatCharacterFieldValue(character, field),
    ])
  );

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0d0f1a",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* Accent line */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent 0%, #3b82f6 40%, #8b5cf6 60%, transparent 100%)" }} />

      {/* Hero */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

          {character.avatar ? (
            <img src={character.avatar} alt={character.name} style={{
              width: 60, height: 60, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
              border: "2px solid rgba(99,102,241,0.4)",
              boxShadow: "0 0 16px rgba(99,102,241,0.2)",
            }} />
          ) : (
            <div style={{
              width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #1d4ed8, #6d28d9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 800, color: "white",
              boxShadow: "0 0 16px rgba(99,102,241,0.2)",
            }}>
              {character.name.charAt(0)}
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: 5 }}>
              Community Contribution · Wuthering Waves Fan Project
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.3px" }}>
              Shape{" "}
              <span style={{
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {character.name}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", margin: "4px 0 0", lineHeight: 1.5 }}>
              Know the lore? Submit a field, vote on others — no tech skills needed.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>
        <ContributionClient
          characterKey={character.key}
          submissions={submissions}
          currentFieldValues={currentFieldValues}
        />
      </div>
    </main>
  );
}