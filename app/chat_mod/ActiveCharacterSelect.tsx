"use client";

export type ActiveCharacterSelectOption = {
  id: string;
  name: string;
};

export default function ActiveCharacterSelect({
  name = "characterId",
  defaultValue,
  options,
}: {
  name?: string;
  defaultValue: string;
  options: ActiveCharacterSelectOption[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[#2a313d]"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((char) => (
        <option key={char.id} value={char.id}>
          {char.name}
        </option>
      ))}
    </select>
  );
}