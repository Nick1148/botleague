// 가벼운 폰 신호 → 펫 기분 (§21). 권한 팝업 0.
// 웹에서 접근 가능한 것만: 시간대·복귀갭·배터리(안드로이드 크롬, 무권한)·기기.
// 연락처·사진·앱·건강은 웹 불가 → 사용 안 함.

// 기분 태그 → { tag, label(말풍선), hint(전투 힌트: initiative/atk) }
// 순수 함수 (테스트 대상). label은 펫이 주인에게 하는 말.
export function signalMood({ hour, returnGapHours, batteryLevel, charging }) {
  if (returnGapHours >= 48)
    return { tag: "lonely", label: "오랜만이야… 계속 기다렸어!", hint: { initiative: 4, atk: 6 } }; // 재회 의욕
  if (batteryLevel != null && batteryLevel < 0.2 && !charging)
    return { tag: "worried", label: "주인 폰 배터리가 곧 꺼질 것 같아… 걱정돼.", hint: { initiative: -3, atk: -3 } };
  if (charging === true)
    return { tag: "energized", label: "충전 중이라 그런가, 나도 힘이 솟아!", hint: { initiative: 5, atk: 4 } };
  if (hour >= 0 && hour <= 5)
    return { tag: "sleepy", label: "새벽이네… 눈이 스르르 감긴다.", hint: { initiative: -6, atk: -2 } };
  if (hour >= 6 && hour <= 10)
    return { tag: "fresh", label: "개운한 아침이야! 몸이 가볍다.", hint: { initiative: 8, atk: 2 } };
  if (hour >= 18 && hour <= 23)
    return { tag: "chill", label: "저녁이네, 느긋한 기분이야.", hint: { initiative: 0, atk: 1 } };
  return { tag: "normal", label: "오늘 컨디션은 평범해.", hint: { initiative: 0, atk: 0 } };
}

// 브라우저에서 신호 수집 (impure). 배터리 미지원이면 null 폴백.
export async function readSignals(lastSeenMs, nowMs = Date.now()) {
  const hour = new Date(nowMs).getHours();
  const returnGapHours = lastSeenMs ? Math.max(0, (nowMs - lastSeenMs) / 3600000) : 0;
  let batteryLevel = null, charging = null;
  try {
    if (typeof navigator !== "undefined" && navigator.getBattery) {
      const b = await navigator.getBattery();
      batteryLevel = b.level;
      charging = b.charging;
    }
  } catch { /* 미지원/차단 → 시간대만으로 (폴백) */ }
  return { hour, returnGapHours, batteryLevel, charging };
}
