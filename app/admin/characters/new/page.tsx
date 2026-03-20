import { redirect } from "next/navigation";
import { createAdminCharacter } from "@/lib/admin/characters";
import CharacterForm from "../CharacterForm";

async function createCharacterAction(formData: FormData) {
  "use server";
  await createAdminCharacter(formData);
  redirect("/admin/characters");
}

export default function NewCharacterPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#23252f] tracking-tight">New Character</h1>
        <p className="mt-1 text-sm text-[#23252f]/50">Add a new character and configure behavior.</p>
      </div>
      <form action={createCharacterAction}>
        <CharacterForm submitLabel="Create Character" />
      </form>
    </div>
  );
}