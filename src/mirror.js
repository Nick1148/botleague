// 주인 닮아가기 (§8.4) — 유저의 플레이 습관이 봇 성향에 서서히 스며든다.
// 원칙: 성격 한 줄이 주인공(보정 ±15), 하루 ±2, honest 축 제외, 미접속 무페널티, 결정론(명시적 수치 저장).
export const MIRROR_CAP = 15;
export const DAILY_CAP = 2;
const DRIFT_AXES = ["brave", "calm", "grit"];

export function defaultMirror() {
  return {
    axes: { brave: 0, calm: 0, grit: 0 },
    daily: { date: "", delta: { brave: 0, calm: 0, grit: 0 } },
    streak: { lastDate: "", days: 0 },
    harvestCounted: "",
  };
}

function drift(mirror, axis, dir, todayStr) {
  if (!DRIFT_AXES.includes(axis)) return false;
  if (mirror.daily.date !== todayStr) {
    mirror.daily.date = todayStr;
    mirror.daily.delta = { brave: 0, calm: 0, grit: 0 };
  }
  const nextDaily = mirror.daily.delta[axis] + dir;
  if (Math.abs(nextDaily) > DAILY_CAP) return false;
  const next = mirror.axes[axis] + dir;
  if (Math.abs(next) > MIRROR_CAP) return false;
  mirror.daily.delta[axis] = nextDaily;
  mirror.axes[axis] = next;
  return true;
}

// event: "skip" | "watch" | "allTicketsSpent" | "harvestFull" | "harvestDiligent"
export function applyBehavior(mirror, event, todayStr) {
  switch (event) {
    case "skip": return drift(mirror, "calm", -1, todayStr);
    case "watch": return drift(mirror, "calm", +1, todayStr);
    case "allTicketsSpent": return drift(mirror, "brave", +1, todayStr);
    case "harvestFull": return drift(mirror, "grit", -1, todayStr);
    case "harvestDiligent":
      if (mirror.harvestCounted === todayStr) return false;
      mirror.harvestCounted = todayStr;
      return drift(mirror, "grit", +1, todayStr);
    default: return false;
  }
}

// 연속 출석: 홈 진입 시 1회. 3일 달성마다 grit +1. 건너뛰어도 깎지 않는다.
export function touchStreak(mirror, todayStr) {
  if (mirror.streak.lastDate === todayStr) return false;
  const prev = mirror.streak.lastDate;
  const consecutive = prev && new Date(todayStr) - new Date(prev) === 86400000;
  mirror.streak.days = consecutive ? mirror.streak.days + 1 : 1;
  mirror.streak.lastDate = todayStr;
  if (mirror.streak.days > 0 && mirror.streak.days % 3 === 0) return drift(mirror, "grit", +1, todayStr);
  return false;
}

// 전투·말풍선용 실효 성향 (§8.4 원칙 3: 파츠·필살기에는 쓰지 않는다)
export function effectiveAxes(baseAxes, mirrorAxes = {}) {
  const clamp = (v) => Math.max(-100, Math.min(100, v));
  return {
    brave: clamp(baseAxes.brave + (mirrorAxes.brave ?? 0)),
    calm: clamp(baseAxes.calm + (mirrorAxes.calm ?? 0)),
    honest: baseAxes.honest,
    grit: clamp(baseAxes.grit + (mirrorAxes.grit ?? 0)),
  };
}

// 말풍선용 지배 미러 축 — |값| 3 이상일 때만
export function dominantMirror(mirrorAxes) {
  let best = null, bestV = 2;
  for (const [axis, v] of Object.entries(mirrorAxes)) {
    if (Math.abs(v) > bestV) { best = { axis, dir: Math.sign(v) }; bestV = Math.abs(v); }
  }
  return best;
}
