import { createBot } from "./bot.js";
import { NPC_DEFS } from "./npc.js";

// 로컬 리그 (§9.1) — Slice 3에서 상대만 서버 봇으로 교체된다
export const TIERS = ["두부 리그", "젤리 리그", "강철 리그", "티타늄 리그", "챔피언 리그"];
export const DAILY_TICKETS = 5;
const WIN_PTS = 20, LOSE_PTS = 10, PROMOTE_AT = 100, PROMOTE_KEEP = 20, DEMOTE_KEEP = 60;

// 하루가 바뀌면 출전권 리셋 (§4)
export function refreshTickets(progress, todayStr) {
  if (progress.ticketDate !== todayStr) {
    progress.ticketDate = todayStr;
    progress.tickets = DAILY_TICKETS;
  }
  return progress;
}

// 승패 → 포인트/승급/강등 (§9.1). progress를 제자리 수정, 이벤트 요약 반환.
export function applyResult(progress, won) {
  const summary = { promoted: false, demoted: false };
  if (won) {
    progress.points += WIN_PTS;
    if (progress.tier < TIERS.length - 1 && progress.points >= PROMOTE_AT) {
      progress.tier += 1;
      progress.points = PROMOTE_KEEP;
      summary.promoted = true;
    }
  } else {
    if (progress.points === 0 && progress.tier > 0) {
      progress.tier -= 1;
      progress.points = DEMOTE_KEEP;
      summary.demoted = true;
    } else {
      progress.points = Math.max(0, progress.points - LOSE_PTS);
    }
  }
  return summary;
}

// 티어 난이도 보정된 NPC 상대 (§9.1 매칭 — 로컬 버전)
export function pickOpponent(tier, rand) {
  const [name, persona] = NPC_DEFS[Math.floor(rand() * NPC_DEFS.length)];
  const bot = createBot(name, persona);
  const boost = tier * 4;
  for (const k of Object.keys(bot.stats)) bot.stats[k] += boost;
  return bot;
}
