import { describe, it, expect } from "vitest";
import { defaultMirror, applyBehavior, touchStreak, effectiveAxes, dominantMirror, MIRROR_CAP, DAILY_CAP } from "../src/mirror.js";

const D1 = "2026-07-19", D2 = "2026-07-20", D3 = "2026-07-21", D5 = "2026-07-23";

describe("applyBehavior 드리프트 캡", () => {
  it("스킵은 calm -1, 관전 완주는 calm +1", () => {
    const m = defaultMirror();
    applyBehavior(m, "skip", D1);
    expect(m.axes.calm).toBe(-1);
    applyBehavior(m, "watch", D1);
    expect(m.axes.calm).toBe(0);
  });
  it("하루 축당 ±2 상한", () => {
    const m = defaultMirror();
    expect(applyBehavior(m, "skip", D1)).toBe(true);
    expect(applyBehavior(m, "skip", D1)).toBe(true);
    expect(applyBehavior(m, "skip", D1)).toBe(false); // 3번째는 거부
    expect(m.axes.calm).toBe(-2);
    // 날짜가 바뀌면 다시 가능
    expect(applyBehavior(m, "skip", D2)).toBe(true);
    expect(m.axes.calm).toBe(-3);
  });
  it("총 ±15 상한", () => {
    const m = defaultMirror();
    m.axes.calm = -MIRROR_CAP;
    expect(applyBehavior(m, "skip", D1)).toBe(false);
    expect(m.axes.calm).toBe(-MIRROR_CAP);
  });
  it("부지런 수확은 하루 1회만 집계", () => {
    const m = defaultMirror();
    expect(applyBehavior(m, "harvestDiligent", D1)).toBe(true);
    expect(applyBehavior(m, "harvestDiligent", D1)).toBe(false);
    expect(m.axes.grit).toBe(1);
  });
  it("출전권 전부 소진은 brave +1", () => {
    const m = defaultMirror();
    applyBehavior(m, "allTicketsSpent", D1);
    expect(m.axes.brave).toBe(1);
  });
});

describe("touchStreak 연속 출석", () => {
  it("3일 연속마다 grit +1", () => {
    const m = defaultMirror();
    touchStreak(m, D1); touchStreak(m, D2);
    expect(m.axes.grit).toBe(0);
    touchStreak(m, D3);
    expect(m.axes.grit).toBe(1); // 3일째
  });
  it("하루 두 번 진입해도 1일로 집계", () => {
    const m = defaultMirror();
    touchStreak(m, D1); touchStreak(m, D1);
    expect(m.streak.days).toBe(1);
  });
  it("건너뛰면 스트릭 리셋, 축은 깎지 않음 (§12.5 무페널티)", () => {
    const m = defaultMirror();
    touchStreak(m, D1); touchStreak(m, D2); touchStreak(m, D3); // grit 1
    touchStreak(m, D5); // 하루 건너뜀
    expect(m.streak.days).toBe(1);
    expect(m.axes.grit).toBe(1); // 유지
  });
});

describe("effectiveAxes", () => {
  it("합산 + 클램프, honest는 불변", () => {
    const eff = effectiveAxes({ brave: 95, calm: 0, honest: -40, grit: -95 }, { brave: 10, calm: -5, grit: -10 });
    expect(eff.brave).toBe(100);   // 클램프
    expect(eff.calm).toBe(-5);
    expect(eff.honest).toBe(-40);  // 불변
    expect(eff.grit).toBe(-100);   // 클램프
  });
});

describe("dominantMirror", () => {
  it("절대값 3 이상 최대 축을 반환, 없으면 null", () => {
    expect(dominantMirror({ brave: 0, calm: -2, grit: 1 })).toBeNull();
    expect(dominantMirror({ brave: 0, calm: -5, grit: 3 })).toEqual({ axis: "calm", dir: -1 });
  });
});

describe("상수 계약", () => {
  it("캡 값", () => { expect(MIRROR_CAP).toBe(15); expect(DAILY_CAP).toBe(2); });
});
