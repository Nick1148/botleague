import { createBot } from "./bot.js";
import { effectiveAxes } from "./mirror.js";
import { STAT_CAP } from "./state.js";

// 봇 ↔ 서버 스냅샷 (§14.2). 이름+성격이 결정론의 씨앗이므로
// 스냅샷은 {name, persona, statBonus, mirrorAxes}면 충분하다 — 관전 링크가 영원히 재생되는 이유.

export function toSnapshot(state) {
  return {
    name: state.bot.name,
    persona: state.bot.persona,
    statBonus: { ...state.progress.statBonus },
    mirrorAxes: { ...state.progress.mirror.axes },
  };
}

// 서버 행(snake_case)과 로컬 스냅샷(camelCase) 모두 수용
export function fromSnapshot(snap) {
  const bot = createBot(snap.name, snap.persona ?? snap.personaText);
  const sb = snap.statBonus ?? snap.stat_bonus ?? {};
  for (const k of Object.keys(bot.stats)) {
    bot.stats[k] = Math.min(STAT_CAP, bot.stats[k] + (sb[k] ?? 0));
  }
  bot.axes = effectiveAxes(bot.axes, snap.mirrorAxes ?? snap.mirror_axes ?? {});
  return bot;
}
