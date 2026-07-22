// 반려동물 돌봄 (§8.5) — 돌봄이 전투의 '준비(prep)'다.
// 밥·놀기·재우기로 컨디션을 만들고, 그게 전투 결과의 사유가 된다. 순수 로직(TDD).

const HOUR = 3600 * 1000;
const clamp = (v) => Math.max(0, Math.min(100, v));

// 액션 정의: 효과 + 쿨다운. 쿨다운이 "돌보러 다시 오는" 리텐션 루프를 만든다.
export const CARE = {
  feed: { cooldownMs: 3 * HOUR },
  play: { cooldownMs: 2 * HOUR },
  rest: { cooldownMs: 6 * HOUR },
};

// 시간당 자연 감소율
const DECAY = { fullness: 6, energy: 5, affection: 2 };

export function defaultPet(nowMs = Date.now()) {
  return {
    fullness: 70, energy: 70, affection: 50,
    lastDecay: nowMs,
    last: { feed: -Infinity, play: -Infinity, rest: -Infinity },
  };
}

// 경과 시간만큼 스탯 감소 (바닥 0). lastDecay 갱신.
export function decayPet(pet, elapsedMs) {
  if (elapsedMs <= 0) return pet;
  const h = elapsedMs / HOUR;
  pet.fullness = clamp(pet.fullness - DECAY.fullness * h);
  pet.energy = clamp(pet.energy - DECAY.energy * h);
  pet.affection = clamp(pet.affection - DECAY.affection * h);
  return pet;
}

export function canAct(pet, action, nowMs = Date.now()) {
  return nowMs - (pet.last[action] ?? -Infinity) >= CARE[action].cooldownMs;
}

export function feed(pet, nowMs = Date.now()) {
  pet.fullness = clamp(pet.fullness + 40);
  pet.affection = clamp(pet.affection + 5);
  pet.last.feed = nowMs;
  return pet;
}
export function play(pet, nowMs = Date.now()) {
  pet.affection = clamp(pet.affection + 30);
  pet.energy = clamp(pet.energy - 15); // 놀면 기운을 쓴다
  pet.last.play = nowMs;
  return pet;
}
export function rest(pet, nowMs = Date.now()) {
  pet.energy = clamp(pet.energy + 50);
  pet.last.rest = nowMs;
  return pet;
}

// 돌봄 상태 + 기분 → 전투 보정치 + 사람이 읽는 사유 (전투가 '읽히는 공개'가 되는 핵심)
export function condition(pet, mood) {
  let atk = 0, def = 0, initiative = 0, energy = 0;
  const reasons = [];

  if (pet.fullness < 30) { atk -= 8; initiative -= 3; reasons.push("🍚 배가 고파서 초반에 흔들린다"); }
  else if (pet.fullness > 75) { atk += 3; reasons.push("🍚 든든하게 먹어 힘이 넘친다"); }

  if (pet.energy < 30) { initiative -= 6; def -= 4; reasons.push("💤 기운이 없어 몸이 무겁다"); }
  else if (pet.energy > 75) { initiative += 4; reasons.push("⚡ 기운이 팔팔하다"); }

  if (pet.affection > 70) { atk += 7; reasons.push("💗 주인 사랑을 듬뿍 받아 자신감 넘친다"); }
  else if (pet.affection < 25) { atk -= 4; reasons.push("💔 요즘 관심이 부족해 시무룩하다"); }

  // 기분(폰 신호) 힌트 합산
  const hint = mood?.hint ?? { initiative: 0, atk: 0 };
  initiative += hint.initiative ?? 0;
  atk += hint.atk ?? 0;
  if (mood?.tag && mood.tag !== "normal" && mood.label) reasons.push("📱 " + mood.label);

  return { atk, def, initiative, energy, reasons };
}
