// app/select/page.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCharacters } from "@/lib/chat/app-chat";
import { chooseActiveCharacterAction } from "./actions";
import CharacterSelectDropdown from "./CharacterSelectDropdown";

export default async function SelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const characters = await listCharacters();

  return (
    <main className="min-h-screen bg-[#d7dbe2] px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
        <h1 className="text-5xl font-bold tracking-tight text-[#22304a]">
          Choose who you are portraying
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5f6f87]">
          Pick the active character you want to play as. You will chat as this
          character, and you will not be able to message the same character as a
          contact.
        </p>

        <form action={chooseActiveCharacterAction} className="mt-8 space-y-6">
          <div>
            <label className="mb-3 block text-lg font-semibold text-[#22304a]">
              Character
            </label>

            <CharacterSelectDropdown
              name="characterId"
              options={characters.map((character) => ({
                id: character.id,
                name: character.name,
                title: character.title,
                avatar: character.avatar ?? null,
              }))}
            />
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-[#232833] px-6 py-4 text-lg font-semibold text-white"
          >
            Continue to Chat
          </button>
        </form>
      </div>
    </main>
  );
}