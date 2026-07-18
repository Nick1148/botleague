import { KEYWORD_RULES, TRIGGER_RULES } from "./keywords.js";
import { mulberry32, hashString } from "./rng.js";

const AXES = ["brave", "calm", "honest", "grit"];
const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));

// 성격 문장 → { axes, trigger }  (§6.1, §6.2)
export function parsePersona(text) {
  const axes = { brave: 0, calm: 0, honest: 0, grit: 0 };
  let matched = false;
  for (const rule of KEYWORD_RULES) {
    if (rule.match.some((kw) => text.includes(kw))) {
      matched = true;
      for (const [axis, d] of Object.entries(rule.effects)) axes[axis] = clamp(axes[axis] + d);
    }
  }
  let trigger = null;
  for (const rule of TRIGGER_RULES) {
    if (rule.match.some((kw) => text.includes(kw))) { trigger = rule.trigger; break; }
  }
  // 사전에 없는 문장도 개성이 생기도록 문장 해시로 결정론적 변주
  const rand = mulberry32(hashString(text));
  const spread = matched ? 20 : 60;
  for (const axis of AXES) axes[axis] = clamp(axes[axis] + (rand() - 0.5) * spread);
  return { axes, trigger };
}
