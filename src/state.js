import { createBot } from "./bot.js";
import { DAILY_TICKETS } from "./league.js";
import { defaultMirror, effectiveAxes } from "./mirror.js";
import { defaultPet } from "./pet.js";
import { stageForWins } from "./evolve.js";

// localStorage 상태 관리 — v2 단일 키. 순수 로직(migrate/buildMyBot)은 스토리지와 분리해 테스트한다.
const V1_KEY = "botleague.myBot";
const V2_KEY = "botleague.state.v2";
export const STAT_CAP = 40; // §8.2 레벨 캡 (종목당)
const HISTORY_MAX = 20;

export function defaultProgress() {
  return {
    statBonus: { power: 0, tech: 0, speed: 0, mind: 0 },
    trainingStat: "power",
    pendingTrain: 0,           // 수확 대기 훈련 점수
    tier: 0,
    points: 0,
    tickets: DAILY_TICKETS,
    ticketDate: "",
    lastSeen: 0,
    record: { w: 0, l: 0 },
    mirror: defaultMirror(),   // 주인 닮아가기 (§8.4)
    pet: defaultPet(0),        // 반려동물 돌봄 (§8.5)
    stage: 0,                  // 버전(진화) 단계 — 0 프로토타입/1 정식/2 레전드
    career: null,              // AI 부트캠프 진행 중이면 career 객체 (§22)
    skills: [],                // 배포된 봇이 보유한 스킬 id (전투 발동)
    history: [],               // { seed, me:{...,cond,skills}, opp:{...}, won, date }
  };
}

// 커리어 졸업 → 최종 빌드를 봇에 은행 처리(스탯 캡, 스킬 병합). progress 제자리 수정.
export function bankCareer(progress, career) {
  for (const k of Object.keys(progress.statBonus)) {
    progress.statBonus[k] = Math.min(STAT_CAP, progress.statBonus[k] + (career.statGain[k] ?? 0));
  }
  for (const id of career.acquiredSkills) if (!progress.skills.includes(id)) progress.skills.push(id);
  progress.career = null;
  return progress;
}

// 원시 저장값 → 상태 (v1 마이그레이션 포함). uuidFn 주입 가능(테스트용).
export function migrate({ v1Bot, v2 }, uuidFn = () => crypto.randomUUID()) {
  let s = null;
  if (v2 && v2.bot) {
    s = { bot: v2.bot, progress: { ...defaultProgress(), ...(v2.progress ?? {}) }, net: v2.net };
  } else if (v1Bot && v1Bot.name) {
    s = { bot: { name: v1Bot.name, persona: v1Bot.persona }, progress: defaultProgress() };
  }
  if (s && !s.net) s.net = { deviceId: uuidFn(), ownerSecret: uuidFn() }; // 온라인 신원 (§14 MVP 신뢰 모델)
  // 펫/단계 무손실 보충 (Slice 4 이전 유저): 펫이 없으면 지급, 단계는 승수 기준으로 소급(강등 없음)
  if (s) {
    if (!s.progress.pet) s.progress.pet = defaultPet(0);
    s.progress.stage = Math.max(s.progress.stage ?? 0, stageForWins(s.progress.record?.w ?? 0));
    // Slice 5 필드 보충 (기존 유저는 "이미 배포된 봇"으로 취급 → 새 시즌 유도)
    if (s.progress.career === undefined) s.progress.career = null;
    if (!s.progress.skills) s.progress.skills = [];
  }
  return s;
}

// 베이스 봇(결정론) + 훈련 보너스 + 미러 성향 머지 (§8, §8.4) — 전투·카드에 쓰는 실전 봇
// 파츠·필살기·트리거는 createBot(base 축)에서 이미 확정 → 미러는 axes만 물들인다.
export function buildMyBot(state) {
  const bot = createBot(state.bot.name, state.bot.persona);
  for (const k of Object.keys(bot.stats)) {
    bot.stats[k] = Math.min(STAT_CAP, bot.stats[k] + (state.progress.statBonus[k] ?? 0));
  }
  bot.axes = effectiveAxes(bot.axes, state.progress.mirror?.axes);
  bot.record = { ...state.progress.record };
  bot.skills = [...(state.progress.skills ?? [])]; // 배포된 스킬 → 전투 발동 (§7)
  return bot;
}

export function pushHistory(progress, entry) {
  progress.history.unshift(entry);
  if (progress.history.length > HISTORY_MAX) progress.history.length = HISTORY_MAX;
}

/* ---------- 브라우저 스토리지 바인딩 ---------- */

export function loadState(storage = globalThis.localStorage) {
  let v1Bot = null, v2 = null;
  try { v1Bot = JSON.parse(storage.getItem(V1_KEY) ?? "null"); } catch { /* 무시 */ }
  try { v2 = JSON.parse(storage.getItem(V2_KEY) ?? "null"); } catch { /* 무시 */ }
  return migrate({ v1Bot, v2 });
}

export function saveState(state, storage = globalThis.localStorage) {
  storage.setItem(V2_KEY, JSON.stringify(state));
}
