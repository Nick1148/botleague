import { mulberry32 } from "./rng.js";

// 결정론적 자동전투 (§6.3, §7). 2선승 최대 3라운드, 무승부 없음.
// 상성 구현: 교활(feint)은 공격을 카운터, 신중(guard)은 feint를 봉쇄, 공격은 guard를 뚫는다.
const TICKS_PER_ROUND = 40;

// conditions(선택): [condA, condB] 각 { atk, def, initiative } — 돌봄·기분의 전투 반영(§8.5).
// 인자 없으면 기존과 완전히 동일(상성 밸런스 테스트 계약 유지).
export function simulate(bots, seed, conditions) {
  const rand = mulberry32(seed >>> 0);
  const events = [];
  const roundWins = [0, 0];
  const rounds = [];
  let comeback = false;
  const axesNow = bots.map((b) => ({ ...b.axes }));
  const triggered = [false, false];
  const cond = (i) => conditions?.[i] ?? null;

  events.push({ t: 0, type: "start", actor: -1, hp: [maxHp(bots[0]), maxHp(bots[1])] });

  for (let round = 0; roundWins[0] < 2 && roundWins[1] < 2 && round < 3; round++) {
    const hp = [maxHp(bots[0]), maxHp(bots[1])];
    // 기력 시작치: 컨디션(선공)이 좋으면 초반부터 유리 (§8.5 "개운해서 선공")
    const energy = [Math.max(0, (cond(0)?.initiative ?? 0)) * 1.2, Math.max(0, (cond(1)?.initiative ?? 0)) * 1.2];
    const hitStreak = [0, 0]; // 연속 피격 (rage 트리거용)
    const lowHpLogged = [false, false];
    events.push({ t: events.length, type: "round_start", actor: -1, hp: [...hp], label: `R${round + 1}` });

    for (let tick = 0; tick < TICKS_PER_ROUND && hp[0] > 0 && hp[1] > 0; tick++) {
      const acts = [0, 1].map((i) => chooseAction(bots[i], axesNow[i], energy[i], rand));
      // 트리거 발동 체크 (첫 1회): HP 40% 미만 or 연속 3피격
      for (const i of [0, 1]) {
        const trig = bots[i].trigger;
        if (trig && !triggered[i] && (hp[i] < maxHp(bots[i]) * 0.4 || hitStreak[i] >= 3)) {
          triggered[i] = true;
          for (const [ax, d] of Object.entries(trig.effects)) axesNow[i][ax] = Math.max(-100, Math.min(100, axesNow[i][ax] + d));
          events.push({ t: events.length, type: "trigger", actor: i, hp: [...hp], label: trig.label });
        }
      }
      resolveTick(bots, acts, hp, energy, hitStreak, rand, events, conditions);
      for (const i of [0, 1]) {
        if (!lowHpLogged[i] && hp[i] > 0 && hp[i] < maxHp(bots[i]) * 0.12) {
          lowHpLogged[i] = true;
          events.push({ t: events.length, type: "low_hp", actor: i, hp: [...hp] });
        }
      }
    }
    // 라운드 승자: KO 우선, 아니면 남은 HP 비율 (동률이면 speed, 그래도 같으면 코인)
    let rw;
    if (hp[0] <= 0 || hp[1] <= 0) rw = hp[0] <= 0 ? 1 : 0;
    else {
      const p0 = hp[0] / maxHp(bots[0]), p1 = hp[1] / maxHp(bots[1]);
      rw = p0 === p1 ? (bots[0].stats.speed === bots[1].stats.speed ? (rand() < 0.5 ? 0 : 1) : (bots[0].stats.speed > bots[1].stats.speed ? 0 : 1)) : (p0 > p1 ? 0 : 1);
    }
    if (roundWins[1 - rw] > roundWins[rw]) comeback = true; // 지고 있다가 라운드를 따면 역전 서사
    roundWins[rw]++;
    rounds.push({ winnerIndex: rw });
    events.push({ t: events.length, type: "round_end", actor: rw, hp: [...hp], label: `R${round + 1}` });
  }

  const winnerIndex = roundWins[0] > roundWins[1] ? 0 : 1;
  events.push({ t: events.length, type: "end", actor: winnerIndex, hp: events.at(-1).hp });
  return { winnerIndex, rounds, events, comeback };
}

function maxHp(bot) { return 80 + bot.stats.power * 2; }

// 4축 → 행동 가중치 (§6.1 표의 코드화). 튜닝 노브는 이 함수의 상수들.
function chooseAction(bot, axes, energy, rand) {
  const w = {
    attack: 45 + axes.brave * 0.5,
    feint: 18 + Math.max(0, -axes.honest) * 0.55,
    guard: 18 + Math.max(0, -axes.brave) * 0.55,
    special: energy >= 100 ? 70 + (bot.trigger?.id === "style" ? 120 : 0) : 0,
    rest: 10 + Math.max(0, axes.calm) * 0.15,
  };
  for (const k of Object.keys(w)) w[k] = Math.max(1, w[k]);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (const [k, v] of Object.entries(w)) { roll -= v; if (roll <= 0) return k; }
  return "attack";
}

function resolveTick(bots, acts, hp, energy, hitStreak, rand, events, conditions) {
  // 상성 상호작용 → (i가 j에게 주는 데미지 배율, 이벤트 타입)
  for (const i of [0, 1]) {
    const j = 1 - i;
    const me = acts[i], op = acts[j];
    let mult = 0, type = null;
    if (me === "attack") {
      if (op === "feint") { mult = 0; }                       // 교활이 저돌을 흘림 (반격은 상대 턴에서)
      else if (op === "guard") { mult = 0.32; type = "hit"; } // 공격이 가드를 뚫음 (저돌>신중)
      else if (op === "rest") { mult = 1.3; type = "hit"; }
      else { mult = 1.0; type = "hit"; }
    } else if (me === "feint") {
      if (op === "attack") { mult = 1.5; type = "feint_hit"; } // 교활>저돌
      else if (op === "guard") { mult = 0; }                   // 신중>교활: 가드가 봉쇄
      else { mult = 0.35; type = "feint_hit"; }
    } else if (me === "special") {
      mult = op === "feint" && rand() < 0.5 ? 0 : 2.2; type = "special";
    } else if (me === "guard") {
      if (op === "feint") { mult = 1.4; type = "guard"; }      // 가드 카운터 (신중>교활 마무리)
      energy[i] += 12;
    } else if (me === "rest") { energy[i] += 30; }

    if (mult > 0) {
      if (me === "special") energy[i] = 0;
      const atkMod = conditions?.[i]?.atk ?? 0;   // 돌봄·기분 공격 보정 (§8.5)
      const defMod = conditions?.[j]?.def ?? 0;   // 상대 수비 보정
      const base = 8 + bots[i].stats.power * 0.8 + rand() * 6 + atkMod;
      const crit = rand() < 0.05 + bots[i].stats.tech * 0.006;
      let dmg = Math.round(base * mult * (crit ? 1.6 : 1));
      dmg = Math.max(1, dmg - Math.max(0, defMod));
      hp[j] = Math.max(0, hp[j] - dmg);
      hitStreak[j]++; hitStreak[i] = 0;
      energy[i] += 15; energy[j] += 10;
      const ev = { t: events.length, type: crit ? "crit" : type, actor: i, dmg, hp: [...hp] };
      if (type === "special" && bots[i].moveName) ev.label = bots[i].moveName; // 필살기 이름 컷인용
      events.push(ev);
      if (hp[j] <= 0) return;
    }
  }
}
