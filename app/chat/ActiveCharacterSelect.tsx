"use client";

export type ActiveCharacterSelectOption = { id: string; name: string };

export default function ActiveCharacterSelect({ name = "characterId", defaultValue, options }: {
  name?: string; defaultValue: string; options: ActiveCharacterSelectOption[];
}) {
  return (
    <select name={name} defaultValue={defaultValue}
      className="w-full rounded px-2.5 py-1.5 text-xs font-medium text-white/70 outline-none transition-colors focus:text-white/90"
      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((char) => (
        <option key={char.id} value={char.id} style={{ background: "#2a2c35", color: "#fff" }}>{char.name}</option>
      ))}
    </select>
  );
}