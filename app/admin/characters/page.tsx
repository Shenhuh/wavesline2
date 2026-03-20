import Link from "next/link";
import { listAdminCharacters } from "@/lib/admin/characters";
import CharacterList from "./CharacterList";

export default async function AdminCharactersPage() {
  const characters = await listAdminCharacters();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>Characters</h1>
          <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>Manage chatbot characters.</p>
        </div>
        <Link href="/admin/characters/new" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
          color: "#ffffff", background: "#23252f", textDecoration: "none", flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="6.5" y1="1" x2="6.5" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="1" y1="6.5" x2="12" y2="6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New Character
        </Link>
      </div>

      <CharacterList characters={characters} />
    </div>
  );
}