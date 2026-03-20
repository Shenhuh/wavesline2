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
    <main style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "system-ui, sans-serif" }}>

      {/* ── HERO BANNER ── */}
      <div style={{ background: "#23252f", padding: "32px 20px 28px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {character.avatar ? (
              <img src={character.avatar} alt={character.name}
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.2)" }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "white", flexShrink: 0 }}>
                {character.name.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                Community Character Project
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.5px" }}>
                Help shape {character.name}
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "6px 0 0", lineHeight: 1.6 }}>
                This character's data is built by the community. Submit what you know, vote on what others proposed, and the best answers get approved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPLANATION ── */}
      <div style={{ background: "white", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#23252f", marginBottom: 16 }}>
            How does this work?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              {
                icon: "📋",
                title: "Pick a field to improve",
                desc: `Each field is one specific thing about ${character.name} — like their title, how they talk, what they like, or their opening message.`,
              },
              {
                icon: "✏️",
                title: "Submit your version",
                desc: "Write what you think is the most accurate answer for that field, based on the actual lore. One field per submission.",
              },
              {
                icon: "🗳️",
                title: "Vote on others",
                desc: "Multiple people can submit different answers for the same field. Vote up the most accurate one. Vote down inaccurate ones.",
              },
              {
                icon: "✅",
                title: "Admin approves the best",
                desc: "Votes help surface strong proposals. The admin reviews and picks the one that gets added to the character.",
              },
            ].map((item) => (
              <div key={item.title} style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#23252f", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(35,37,47,0.55)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Example callout */}
          <div style={{ marginTop: 20, background: "#f6f7f9", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 8 }}>
              Example — how voting helps
            </div>
            <div style={{ fontSize: 13, color: "rgba(35,37,47,0.7)", lineHeight: 1.7 }}>
              Imagine two users submit different answers for <strong style={{ color: "#23252f" }}>{character.name}'s Title</strong>.
              One says <em>"Overseer"</em>, another says <em>"Conductor"</em>. Other users who know the lore
              vote on which is more accurate. The one with more upvotes rises to the top, making
              it easier for admin to approve the right one. <strong style={{ color: "#23252f" }}>Your vote matters.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 64px" }}>
        <ContributionClient
          characterKey={character.key}
          submissions={submissions}
          currentFieldValues={currentFieldValues}
        />
      </div>
    </main>
  );
}