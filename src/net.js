import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

// 온라인 레이어 (§14) — RPC만 호출, 실패는 전부 null 반환 → 호출부가 로컬 NPC 모드로 폴백.
// 오프라인이어도 게임은 절대 멈추지 않는다 (§10.2 "게임은 LLM 없이도 완결"과 같은 원칙).

async function rpc(fn, args, timeoutMs = 4000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function upsertMyBot(state) {
  const p = state.progress;
  return rpc("bl_upsert_bot", {
    p_device_id: state.net.deviceId,
    p_secret: state.net.ownerSecret,
    p_name: state.bot.name,
    p_persona: state.bot.persona,
    p_stat_bonus: p.statBonus,
    p_mirror: p.mirror.axes,
    p_tier: p.tier,
    p_points: p.points,
    p_wins: p.record.w,
    p_losses: p.record.l,
  });
}

export const fetchOpponent = (tier, deviceId) =>
  rpc("bl_match_opponent", { p_tier: tier, p_device_id: deviceId });

export const insertMatch = (seed, snapA, snapB, winner) =>
  rpc("bl_insert_match", { p_seed: seed, p_snap_a: snapA, p_snap_b: snapB, p_winner: winner });

export const fetchMatch = (id) => rpc("bl_get_match", { p_id: id });

export const fetchRanking = (limit, deviceId) =>
  rpc("bl_get_ranking", { p_limit: limit, p_device_id: deviceId });
