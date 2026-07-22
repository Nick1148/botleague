// 진화 (§8.5) — 성장의 보상이자 공유 순간. 승수 기반 3단계.
// 리서치(디지몬): 진화가 리텐션·공유 엔진.
export const STAGE_NAMES = ["아기", "성체", "완전체"];
export const EVOLVE_AT = [0, 3, 12]; // 각 단계 진입 승수

export function stageForWins(wins) {
  if (wins >= EVOLVE_AT[2]) return 2;
  if (wins >= EVOLVE_AT[1]) return 1;
  return 0;
}

// 승수가 prev→next로 바뀔 때 단계가 올라갔으면 새 단계, 아니면 null
export function checkEvolve(prevWins, newWins) {
  if (newWins <= prevWins) return null;
  const before = stageForWins(prevWins);
  const after = stageForWins(newWins);
  return after > before ? after : null;
}
