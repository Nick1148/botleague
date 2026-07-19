// 방치 훈련 적립 (§8.2) — 30분당 1점, 8시간(16점) 캡. 순수 함수.
export const TRAIN_INTERVAL_MIN = 30;
export const TRAIN_CAP = 16;

export function accrueTraining(lastSeenMs, nowMs) {
  const elapsedMin = (nowMs - lastSeenMs) / 60000;
  if (elapsedMin <= 0) return 0;
  return Math.min(TRAIN_CAP, Math.floor(elapsedMin / TRAIN_INTERVAL_MIN));
}
