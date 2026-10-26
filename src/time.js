// 한국 시간(KST, UTC+9) 기준 날짜 — 출전권 리셋·출석·기록 날짜를 기기 시간대와 무관하게 통일한다.
// KST는 서머타임이 없으므로 고정 오프셋 계산으로 충분하다 (Intl 미지원 환경에서도 동작). 순수 함수.
const KST_OFFSET_MS = 9 * 3600 * 1000;

export function kstDateStr(nowMs = Date.now()) {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD
}
