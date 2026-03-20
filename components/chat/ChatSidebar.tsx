"use client";

type Character = {
  id: string;
  name: string;
  subtitle?: string;
};

type ChatSidebarProps = {
  characters: Character[];
  selectedCharacterId: string;
  onSelectCharacter: (id: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ChatSidebar({
  characters,
  selectedCharacterId,
  onSelectCharacter,
}: ChatSidebarProps) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-[rgba(60,66,74,0.58)] px-3 py-3 backdrop-blur-[3px]">
      <div className="mb-3 flex items-center gap-2 rounded-[4px] border border-[rgba(255,255,255,0.12)] bg-[rgba(59,64,72,0.78)] px-3 py-2 text-white shadow-sm">
        <div className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-[rgba(255,255,255,0.12)] text-[10px] font-bold">
          WL
        </div>
        <div className="text-[13px] font-semibold">WavesLine</div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {characters.map((character) => {
          const isActive = character.id === selectedCharacterId;

          return (
            <button
              key={character.id}
              onClick={() => onSelectCharacter(character.id)}
              className={`relative w-full rounded-[6px] border px-3 py-3 text-left transition ${
                isActive
                  ? "border-[rgba(255,255,255,0.6)] bg-[linear-gradient(180deg,rgba(245,247,250,0.97),rgba(231,235,241,0.92))] text-[#2b3340] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                  : "border-[rgba(255,255,255,0.16)] bg-[linear-gradient(180deg,rgba(104,110,120,0.62),rgba(82,88,96,0.65))] text-white hover:bg-[linear-gradient(180deg,rgba(114,120,130,0.72),rgba(87,93,101,0.72))]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-[#ece8ff] text-[#7a5cff]"
                      : "bg-[rgba(255,255,255,0.12)] text-white"
                  }`}
                >
                  {getInitials(character.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-[14px] font-bold ${
                      isActive ? "text-[#2d3440]" : "text-white"
                    }`}
                  >
                    {character.name}
                  </div>
                  <div
                    className={`mt-1 truncate text-xs ${
                      isActive ? "text-[#738099]" : "text-white/70"
                    }`}
                  >
                    {character.subtitle ?? "Open chat"}
                  </div>
                </div>

                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    isActive ? "bg-[#ff6f8e]" : "bg-white/35"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-[6px] border border-[rgba(255,255,255,0.16)] bg-[linear-gradient(180deg,rgba(104,110,120,0.62),rgba(82,88,96,0.65))] px-4 py-3 text-sm text-white">
        <div className="font-semibold">Good luck!</div>
      </div>
    </aside>
  );
}