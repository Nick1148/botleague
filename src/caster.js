// 이벤트 → 중계 자막 (§10.1). {A}=행동 주체, {B}=상대, {DMG}=데미지
const LINES = {
  start: ["양 선수 입장! 오늘도 명경기를 기대해 보겠습니다!"],
  hit: ["{A}, 깔끔하게 들어갑니다!", "{A}의 타격! {DMG} 데미지!", "{B}가 흔들립니다!"],
  crit: ["회심의 일격!! {A}!!", "이건 제대로 들어갔어요! {DMG}!!"],
  feint_hit: ["{A}의 페인트! {B}가 완전히 속았습니다!", "교묘합니다 {A}!"],
  guard: ["{A}, 침착하게 받아치기!", "읽고 있었다는 겁니다 {A}!"],
  special: ["{A}의 필살기가 작렬합니다!!", "스타디움이 흔들립니다! {A}!!"],
  trigger: ["잠깐, {A}의 눈빛이 달라졌습니다…!", "각성입니다! {A}!!"],
  low_hp: ["{A}, 위험합니다! 버틸 수 있을까요!", "아니 이게 무슨 일입니까! {A}, 벼랑 끝!"],
  end: ["승부 결정! 오늘의 승자, {A}!!"],
};

export function casterLine(event, names) {
  const pool = LINES[event.type];
  if (!pool) return null;
  const line = pool[(event.t ?? 0) % pool.length];
  return line
    .replaceAll("{A}", names[event.actor] ?? "")
    .replaceAll("{B}", names[1 - event.actor] ?? "")
    .replaceAll("{DMG}", String(event.dmg ?? ""));
}
