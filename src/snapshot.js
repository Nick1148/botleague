import { createBot } from "./bot.js";
import { effectiveAxes } from "./mirror.js";
import { STAT_CAP } from "./state.js";
import { getSkill } from "./skills.js";
import { cleanStatBonus, cleanMirrorAxes } from "./validate.js";

// 봇 ↔ 서버 스냅샷 (§14.2). 이름+성격이 결정론의 씨앗이므로
// 스냅샷은 {name, persona, statBonus, mirrorAxes, skills}면 충분하다 — 관전 링크가 영원히 재생되는 이유.
// skills 는 전투 결과에 영향을 주므로 반드시 함께 저장해야 리플레이·관전이 실제 경기와 같다.

export function toSnapshot(state) {
  return {
    name: state.bot.name,
    persona: state.bot.persona,
    statBonus: { ...state.progress.statBonus },
    mirrorAxes: { ...state.progress.mirror.axes },
    skills: [...(state.progress.skills ?? [])],
  };
}

// 서버 행(snake_case)과 로컬 스냅샷(camelCase) 모두 수용.
// 다른 유저가 올린 값일 수 있으므로 숫자·범위·스킬 id를 정리한다 (변조된 스냅샷으로 크래시/치트 방지).
export function fromSnapshot(snap) {
  const name = String(snap?.name ?? "???");
  const persona = String(snap?.persona ?? snap?.personaText ?? "");
  const bot = createBot(name, persona);
  const sb = cleanStatBonus(snap?.statBonus ?? snap?.stat_bonus);
  for (const k of Object.keys(bot.stats)) {
    bot.stats[k] = Math.min(STAT_CAP, bot.stats[k] + (sb[k] ?? 0));
  }
  bot.axes = effectiveAxes(bot.axes, cleanMirrorAxes(snap?.mirrorAxes ?? snap?.mirror_axes));
  const skills = Array.isArray(snap?.skills) ? snap.skills : [];
  bot.skills = [...new Set(skills.filter((id) => typeof id === "string" && getSkill(id)))];
  return bot;
}
