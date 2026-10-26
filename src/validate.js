// 입력·외부 데이터 검증 (봇 생성 입력, 관전 링크 ID, 서버에서 온 상대 스냅샷). 순수 함수.
import { STAT_CAP_VALUE, MIRROR_CAP_VALUE } from "./limits.js";

export const NAME_MAX = 10;     // DB bots_name_check 와 동일
export const PERSONA_MAX = 60;  // DB bots_persona_check 와 동일

// 제어문자·제로폭·양방향 제어문자(이름 위장용) 패턴
const INVISIBLE_RE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2066-\u2069\uFEFF]/g;

// 제어문자 제거 + 공백 정리 + 코드포인트 기준 길이 제한 (DB char_length 와 같은 기준)
export function cleanText(s, max) {
  const t = String(s ?? "").replace(INVISIBLE_RE, "")
    .replace(/\s+/g, " ").trim();
  return [...t].slice(0, max).join("");
}

// 봇 생성 입력 검증 → { ok, name, persona, error }
export function validateBotInput(rawName, rawPersona) {
  const name = cleanText(rawName, NAME_MAX);
  const persona = cleanText(rawPersona, PERSONA_MAX);
  if (!name && !persona) return { ok: false, name, persona, error: "이름과 성격을 입력해줘!" };
  if (!name) return { ok: false, name, persona, error: "이름을 입력해줘!" };
  if (!persona) return { ok: false, name, persona, error: "성격 한 줄을 입력해줘!" };
  return { ok: true, name, persona, error: "" };
}

// 관전 링크 ?watch= 값 — 서버 매치 ID는 uuid
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isMatchId = (s) => typeof s === "string" && UUID_RE.test(s);

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 다른 유저가 올린 값은 신뢰하지 않는다: 숫자 아님/음수/캡 초과를 정리
export function cleanStatBonus(sb) {
  const o = sb && typeof sb === "object" ? sb : {};
  const out = {};
  for (const k of ["power", "tech", "speed", "mind"]) out[k] = clamp(Math.round(num(o[k])), 0, STAT_CAP_VALUE);
  return out;
}
export function cleanMirrorAxes(m) {
  const o = m && typeof m === "object" ? m : {};
  const out = {};
  for (const k of ["brave", "calm", "grit"]) out[k] = clamp(Math.round(num(o[k])), -MIRROR_CAP_VALUE, MIRROR_CAP_VALUE);
  return out;
}
