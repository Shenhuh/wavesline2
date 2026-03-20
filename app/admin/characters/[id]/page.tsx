import { notFound, redirect } from "next/navigation";
import { deleteAdminCharacter, getAdminCharacterById, updateAdminCharacter } from "@/lib/admin/characters";
import CharacterForm from "../CharacterForm";
import Link from "next/link";

async function updateCharacterAction(formData: FormData) {
  "use server";
  await updateAdminCharacter(formData);
  const id = String(formData.get("id") ?? "");
  redirect(`/admin/characters/${id}`);
}

async function deleteCharacterAction(formData: FormData) {
  "use server";
  await deleteAdminCharacter(formData);
  redirect("/admin/characters");
}

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const character = await getAdminCharacterById(id);
  if (!character) notFound();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {character.avatar && (
              <img src={character.avatar} alt={character.name} className="h-9 w-9 rounded-full object-cover" />
            )}
            <h1 className="text-2xl font-bold text-[#23252f] tracking-tight">{character.name}</h1>
          </div>
          <p className="text-sm text-[#23252f]/50">Edit character behavior, voice, and sticker rules.</p>
        </div>
        <Link href="/admin/characters" className="text-sm text-[#23252f]/40 hover:text-[#23252f] transition-colors">
          ← All characters
        </Link>
      </div>

      <form action={updateCharacterAction}>
        <input type="hidden" name="id" value={character.id} />
        <CharacterForm character={character} submitLabel="Save Changes" />
      </form>

      {/* Danger zone */}
      <div
        className="mt-6 rounded-xl p-5"
        style={{ background: "white", border: "1px solid rgba(220,38,38,0.15)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <h3 className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">Danger Zone</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#23252f]">Delete this character</div>
            <div className="text-xs text-[#23252f]/40 mt-0.5">This action cannot be undone.</div>
          </div>
          <form action={deleteCharacterAction}>
            <input type="hidden" name="id" value={character.id} />
            <button
              type="submit"
              style={{
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#dc2626",
                background: "transparent",
                border: "1px solid rgba(220,38,38,0.25)",
                cursor: "pointer",
              }}
            >
              Delete Character
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}