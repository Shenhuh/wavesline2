import { PHROLOVA } from "./phrolova";
import { LUUK } from "./luuk";

export type CharacterId = "phrolova" | "luuk";

export type CharacterLoreSources = {
  factions: readonly string[];
  regions: readonly string[];
  monsters: readonly string[];
  loreEntries: readonly string[];
};

export type CharacterConfig = {
  id: CharacterId;
  name: string;
  starterMessage: string;
  prompt: string;
  loreSources: CharacterLoreSources;
};

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  phrolova: PHROLOVA,
  luuk: LUUK,
};

export function getCharacterConfig(characterId: string): CharacterConfig {
  if (characterId in CHARACTERS) {
    return CHARACTERS[characterId as CharacterId];
  }

  return {
    id: "phrolova",
    name: "Unknown Character",
    starterMessage: "Hello.",
    prompt: `
You are a character from Wuthering Waves.
Stay in character.
Never say you are an AI.
Reply naturally and conversationally.
`.trim(),
    loreSources: {
      factions: [],
      regions: [],
      monsters: [],
      loreEntries: [],
    },
  };
}