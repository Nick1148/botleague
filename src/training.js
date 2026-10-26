// 방치 훈련 적립 (§8.2) — 30분당 1점, 8시간(16점) 캡. 순수 함수.
export const TRAIN_INTERVAL_MIN = 30;
export const TRAIN_CAP = 16;

export function accrueTraining(lastSeenMs, nowMs) {
  const elapsedMin = (nowMs - lastSeenMs) / 60000;
  if (elapsedMin <= 0) return 0;
  return Math.min(TRAIN_CAP, Math.floor(elapsedMin / TRAIN_INTERVAL_MIN));
}

// 수확 후 다음 적립 기준 시각. 캡 미만이면 남은 자투리 시간(30분 미만 진행분)을 보존하고,
// 캡에 닿았으면 그 이상은 버려지므로 now부터 다시 센다. 기준이 미래(기기 시계 변경)면 now로 보정.
export function nextTrainSince(trainSinceMs, nowMs) {
  if (!trainSinceMs || trainSinceMs > nowMs) return nowMs;
  const pts = accrueTraining(trainSinceMs, nowMs);
  if (pts >= TRAIN_CAP) return nowMs;
  return trainSinceMs + pts * TRAIN_INTERVAL_MIN * 60000;
}
