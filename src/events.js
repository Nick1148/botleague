// 커리어 스토리 이벤트 (§22) — AI 부트캠프 상황 + 선택지. 우마의 이벤트 이식(AI 리스킨).
// outcome: { stat?:{키:증감}, motivation?, heat?, skillReward?, msg }

export const EVENT_POOL = [
  {
    id: "night_run",
    text: "🌙 밤샘 연산을 돌릴까?",
    choices: [
      { label: "돌린다 (스탯↑ 발열↑)", outcome: { stat: { power: 8 }, heat: 20, msg: "밤새 굴려 출력이 올랐다. 대신 좀 뜨겁다." } },
      { label: "잔다 (동기↑)", outcome: { motivation: 1, heat: -10, msg: "푹 쉬었더니 의욕이 돈다." } },
    ],
  },
  {
    id: "weird_pattern",
    text: "🔍 학습 데이터에서 이상한 패턴을 발견했다.",
    choices: [
      { label: "파고든다 (기교↑ 발열↑)", outcome: { stat: { tech: 9 }, heat: 15, msg: "패턴을 분석해 기교가 늘었다." } },
      { label: "무시한다 (안전)", outcome: { motivation: 0, msg: "일단 넘어갔다. 무난하다." } },
    ],
  },
  {
    id: "spar_request",
    text: "🤖 옆집 AI가 스파링을 신청했다.",
    choices: [
      { label: "받는다 (반응↑)", outcome: { stat: { speed: 8 }, heat: 10, msg: "실전 감각으로 반응속도가 빨라졌다." } },
      { label: "거절한다 (쿨다운)", outcome: { heat: -20, msg: "정중히 거절하고 열을 식혔다." } },
    ],
  },
  {
    id: "found_bug",
    text: "🐛 코드에서 버그를 발견했다.",
    choices: [
      { label: "즉시 패치 (스킬 기회)", outcome: { skillReward: true, msg: "패치하다 새 기능을 익혔다!" } },
      { label: "나중에 (멘탈↑)", outcome: { stat: { mind: 7 }, msg: "일단 안정성부터 챙겼다." } },
    ],
  },
  {
    id: "praise",
    text: "💗 주인이 '잘하고 있어'라고 했다.",
    choices: [
      { label: "고맙다 (동기↑↑)", outcome: { motivation: 2, msg: "칭찬에 의욕이 솟는다." } },
      { label: "무덤덤 (기교↑)", outcome: { stat: { tech: 5 }, msg: "묵묵히 실력을 다졌다." } },
    ],
  },
  {
    id: "overheat_warn",
    text: "🔥 과부하 경고가 떴다!",
    choices: [
      { label: "쿨다운 (발열↓ 동기↓)", outcome: { heat: -35, motivation: -1, msg: "억지로 식혔다. 좀 시무룩." } },
      { label: "무시하고 강행 (근성↑ 발열↑)", outcome: { stat: { mind: 6 }, heat: 20, msg: "이 악물고 버텼다. 근성은 늘었다." } },
    ],
  },
];

const BY_ID = Object.fromEntries(EVENT_POOL.map((e) => [e.id, e]));

export function pickEvent(rand, seenIds = []) {
  const fresh = EVENT_POOL.filter((e) => !seenIds.includes(e.id));
  const pool = fresh.length ? fresh : EVENT_POOL;
  return pool[Math.floor(rand() * pool.length)];
}

const clampHeat = (v) => Math.max(0, Math.min(100, v));
const clampMot = (v) => Math.max(1, Math.min(5, v));

// 선택 결과를 커리어에 반영. { msg, skillReward } 반환(스킬은 호출부가 롤).
export function applyChoice(career, choice) {
  const o = choice.outcome;
  if (o.stat) for (const [k, d] of Object.entries(o.stat)) career.statGain[k] = Math.max(0, career.statGain[k] + d);
  if (o.motivation) career.motivation = clampMot(career.motivation + o.motivation);
  if (o.heat) career.heat = clampHeat(career.heat + o.heat);
  return { msg: o.msg ?? "", skillReward: !!o.skillReward };
}

export const getEvent = (id) => BY_ID[id];
