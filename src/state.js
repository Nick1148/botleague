import { createBot } from "./bot.js";
import { DAILY_TICKETS } from "./league.js";

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
    history: [],               // { seed, me:{name,persona,statBonus}, opp:{name,persona,boost}, won, date }
  };
}

// 원시 저장값 → 상태 (v1 마이그레이션 포함). 순수 함수.
export function migrate({ v1Bot, v2 }) {
  if (v2 && v2.bot) {
    return { bot: v2.bot, progress: { ...defaultProgress(), ...(v2.progress ?? {}) } };
  }
  if (v1Bot && v1Bot.name) {
    return { bot: { name: v1Bot.name, persona: v1Bot.persona }, progress: defaultProgress() };
  }
  return null;
}

// 베이스 봇(결정론) + 훈련 보너스 머지 (§8) — 전투·카드에 쓰는 실전 봇
export function buildMyBot(state) {
  const bot = createBot(state.bot.name, state.bot.persona);
  for (const k of Object.keys(bot.stats)) {
    bot.stats[k] = Math.min(STAT_CAP, bot.stats[k] + (state.progress.statBonus[k] ?? 0));
  }
  bot.record = { ...state.progress.record };
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
