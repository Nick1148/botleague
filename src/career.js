// AI 부트캠프 커리어 (§22) — 우마무스메 커리어의 AI 리스킨. 순수 상태머신.
// 트레이닝 롤은 rand 주입(기본 Math.random) → 매 시즌 다른 전개(우마식 변동성). 전투 시드는 별도로 결정론.

export const MAX_TURNS = 12;
export const BENCHMARK_TURNS = [4, 8, 12]; // 평가전(벤치마크) — 못 이기면 배포 등급↓
export const HEAT_PER_TRAIN = 25;          // 발열(피로) 증가량
const REST_HEAT = 40, BASE_GAIN = 6, FAIL_STAT_LOSS = 3;
const STATS = ["power", "tech", "speed", "mind"];

export function startCareer() {
  return {
    turn: 1,
    heat: 0,                 // 0~100 발열 — 높으면 오버피팅(실패) 리스크
    motivation: 3,           // 1~5 동기(컨디션) — 효율 좌우
    statGain: { power: 0, tech: 0, speed: 0, mind: 0 },
    benchmarksPassed: 0,
    benchmarksTotal: BENCHMARK_TURNS.length,
    acquiredSkills: [],
    done: false,
    grade: null,
    log: [],
  };
}

// 발열 → 실패율(오버피팅). 발열 30까지 0, 이후 상승, 상한 0.6.
export function failChance(heat) {
  return Math.min(0.6, Math.max(0, (heat - 30)) / 100 * 0.75);
}

// 동기 1~5 → 획득 배율 (우마 기분 시스템)
export function motivationMult(level) {
  return [0.6, 0.8, 1.0, 1.2, 1.4][Math.max(0, Math.min(4, level - 1))];
}

const clampHeat = (v) => Math.max(0, Math.min(100, v));
const clampMot = (v) => Math.max(1, Math.min(5, v));

function advance(career) {
  career.turn += 1;
  if (career.turn > MAX_TURNS) {
    career.done = true;
    const total = STATS.reduce((s, k) => s + career.statGain[k], 0);
    career.grade = computeGrade(career.benchmarksPassed, career.benchmarksTotal, total);
  }
  return career;
}

// 트레이닝: 발열·동기 반영 실패 롤 → 성공 시 스탯↑, 실패 시 손실+동기↓. 턴 소비.
export function train(career, stat, rand = Math.random) {
  const failed = rand() < failChance(career.heat);
  let gain = 0;
  if (failed) {
    career.statGain[stat] = Math.max(0, career.statGain[stat] - FAIL_STAT_LOSS);
    career.motivation = clampMot(career.motivation - 1);
    career.heat = clampHeat(career.heat + Math.round(HEAT_PER_TRAIN * 0.6));
    career.log.push({ turn: career.turn, action: "train", stat, failed: true });
  } else {
    gain = Math.round(BASE_GAIN * motivationMult(career.motivation));
    career.statGain[stat] += gain;
    career.heat = clampHeat(career.heat + HEAT_PER_TRAIN);
    career.log.push({ turn: career.turn, action: "train", stat, gain });
  }
  advance(career);
  return { failed, gain };
}

export function rest(career) {
  career.heat = clampHeat(career.heat - REST_HEAT);
  career.log.push({ turn: career.turn, action: "rest" });
  advance(career);
  return career;
}

export function recreate(career) {
  career.motivation = clampMot(career.motivation + 1);
  career.heat = clampHeat(career.heat - 10);
  career.log.push({ turn: career.turn, action: "recreate" });
  advance(career);
  return career;
}

export function isBenchmarkTurn(career) {
  return BENCHMARK_TURNS.includes(career.turn);
}

// 평가전 결과 기록 → 턴 소비(평가전도 한 턴)
export function recordBenchmark(career, won) {
  if (won) career.benchmarksPassed += 1;
  else career.motivation = clampMot(career.motivation - 1);
  career.log.push({ turn: career.turn, action: "benchmark", won });
  advance(career);
  return career;
}

// 배포 등급 — 평가전 통과 + 총 스탯 (S/A/B/C/D)
export function computeGrade(passed, total, totalStats) {
  const score = passed * 25 + Math.min(60, totalStats * 0.6);
  if (score >= 110) return "S";
  if (score >= 85) return "A";
  if (score >= 60) return "B";
  if (score >= 35) return "C";
  return "D";
}
