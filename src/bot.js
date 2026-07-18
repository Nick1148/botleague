import { parsePersona } from "./persona.js";
import { pickParts } from "./parts.js";
import { generateMoveName } from "./moves.js";
import { mulberry32, hashString } from "./rng.js";

// 이름+성격 → 봇 객체 (§5). 스탯 시작치 10~14 — 성장은 Slice 2.
export function createBot(name, personaText) {
  const { axes, trigger } = parsePersona(personaText);
  const rand = mulberry32(hashString(name + "::" + personaText));
  const roll = () => 10 + Math.floor(rand() * 5);
  return {
    name, personaText, axes, trigger,
    stats: { power: roll(), tech: roll(), speed: roll(), mind: roll() },
    parts: pickParts(axes, rand),
    moveName: generateMoveName(name, personaText, axes),
    record: { w: 0, l: 0 },
  };
}
