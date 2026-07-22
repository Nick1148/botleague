import { mulberry32 } from "./rng.js";

// 파이팅 스타일 (§7 — 우마 각질 이식). dominantStyle(brave/caution/cunning/grit) 재활용.
export const STYLE_LABEL = {
  brave:   { name: "돌격형", tag: "💥", desc: "초반부터 몰아친다" },
  cunning: { name: "기교형", tag: "🎭", desc: "속임수와 페인트로 흔든다" },
  caution: { name: "방어형", tag: "🛡️", desc: "받아치고 반격한다" },
  grit:    { name: "일격형", tag: "🔥", desc: "끝까지 버티다 역전한다" },
};

// 스킬(기능 모듈) — 커리어에서 획득, 전투 중 발동(fireAt) + 컷인 연출.
// fireAt: "start"(개시) | "streak"(연타 시) | "lowhp"(위기). effect: {atk?,def?,heal?,energy?}
export const SKILL_POOL = [
  { id: "overclock", name: "오버클럭", style: "brave", fireAt: "start", effect: { atk: 6, energy: 30 }, desc: "시작하자마자 출력 폭발" },
  { id: "charge", name: "돌격 프로토콜", style: "brave", fireAt: "streak", effect: { atk: 9 }, desc: "몰아칠수록 탄력" },
  { id: "honeypot", name: "허니팟", style: "cunning", fireAt: "start", effect: { atk: 4, def: 2 }, desc: "미리 함정을 깐다" },
  { id: "zeroday", name: "제로데이", style: "cunning", fireAt: "lowhp", effect: { atk: 11 }, desc: "빈틈을 정확히 찌른다" },
  { id: "firewall", name: "방화벽", style: "caution", fireAt: "start", effect: { def: 7 }, desc: "피해를 감쇄한다" },
  { id: "counterflow", name: "역전파", style: "caution", fireAt: "lowhp", effect: { atk: 6, heal: 15 }, desc: "위기에 반격+복구" },
  { id: "failover", name: "페일오버", style: "grit", fireAt: "lowhp", effect: { heal: 26 }, desc: "쓰러지기 직전 재기동" },
  { id: "lastboot", name: "라스트 부팅", style: "grit", fireAt: "lowhp", effect: { atk: 15 }, desc: "마지막 힘을 끌어모은다" },
  { id: "cache", name: "캐시 최적화", style: "any", fireAt: "start", effect: { energy: 45 }, desc: "기력을 선충전한다" },
  { id: "hotfix", name: "핫픽스", style: "any", fireAt: "streak", effect: { heal: 10 }, desc: "맞으면서도 자가 복구" },
];

const BY_ID = Object.fromEntries(SKILL_POOL.map((s) => [s.id, s]));
export const getSkill = (id) => BY_ID[id];

export function skillsForStyle(style) {
  return SKILL_POOL.filter((s) => s.style === style || s.style === "any");
}

// 미보유 스킬 중 하나 제시 (커리어 보상). 결정론 rand 주입.
export function rollSkillReward(style, ownedIds, rand = mulberry32(Date.now() >>> 0)) {
  const pool = skillsForStyle(style).filter((s) => !ownedIds.includes(s.id));
  if (!pool.length) return null;
  return pool[Math.floor(rand() * pool.length)];
}
