import { createBot } from "./bot.js";
import { DAILY_TICKETS } from "./league.js";
import { defaultMirror, effectiveAxes } from "./mirror.js";
import { defaultPet } from "./pet.js";
import { stageForWins } from "./evolve.js";
import { STAT_CAP_VALUE } from "./limits.js";

// localStorage 상태 관리 — v2 단일 키. 순수 로직(migrate/buildMyBot)은 스토리지와 분리해 테스트한다.
const V1_KEY = "botleague.myBot";
const V2_KEY = "botleague.state.v2";
export const STAT_CAP = STAT_CAP_VALUE; // §8.2 레벨 캡 (종목당)
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
    lastSeen: 0,               // 마지막 방문 시각 (복귀 갭 → 기분 신호용)
    trainSince: 0,             // 방치 훈련 적립 기준 시각 (수확 시에만 이동 — 돌봄/방문으로 리셋되지 않음)
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

// crypto.randomUUID 는 보안 컨텍스트(https/localhost)에서만 존재 → LAN IP 등 http 접속용 폴백 (RFC4122 v4)
export function randomUUID() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// 원시 저장값 → 상태 (v1 마이그레이션 포함). uuidFn 주입 가능(테스트용).
export function migrate({ v1Bot, v2 }, uuidFn = randomUUID) {
  let s = null;
  if (v2 && v2.bot) {
    s = { bot: v2.bot, progress: { ...defaultProgress(), ...(v2.progress ?? {}) }, net: v2.net };
  } else if (v1Bot && v1Bot.name) {
    s = { bot: { name: v1Bot.name, persona: v1Bot.persona }, progress: defaultProgress() };
  }
  if (s && !(s.net?.deviceId && s.net?.ownerSecret)) s.net = { deviceId: uuidFn(), ownerSecret: uuidFn() }; // 온라인 신원 (§14 MVP 신뢰 모델)
  // 펫/단계 무손실 보충 (Slice 4 이전 유저): 펫이 없으면 지급, 단계는 승수 기준으로 소급(강등 없음)
  if (s) {
    // 손상/부분 저장값 방어: 중첩 객체가 깨져 있으면 기본값으로 (홈 진입 시 크래시 방지)
    const d = defaultProgress();
    for (const k of ["statBonus", "record", "mirror"]) {
      if (!isObj(s.progress[k])) s.progress[k] = d[k];
    }
    s.progress.statBonus = { ...d.statBonus, ...s.progress.statBonus };
    s.progress.record = { ...d.record, ...s.progress.record };
    if (!Array.isArray(s.progress.history)) s.progress.history = [];
    if (!s.progress.trainSince) s.progress.trainSince = s.progress.lastSeen || 0; // 기존 유저: lastSeen 이 훈련 기준이었음
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

// 사파리 사생활 보호 모드·스토리지 차단 시 localStorage 접근 자체가 throw → 앱이 하얀 화면이 되지 않게 방어
function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadState(storage = defaultStorage()) {
  let v1Bot = null, v2 = null;
  if (!storage) return null;
  try { v1Bot = JSON.parse(storage.getItem(V1_KEY) ?? "null"); } catch { /* 무시 */ }
  try { v2 = JSON.parse(storage.getItem(V2_KEY) ?? "null"); } catch { /* 무시 */ }
  return migrate({ v1Bot, v2 });
}

// 저장 실패(용량 초과·차단)는 false 반환 — 게임 진행은 멈추지 않는다 (이번 세션 메모리 상태로 계속)
export function saveState(state, storage = defaultStorage()) {
  if (!storage) return false;
  try { storage.setItem(V2_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
