import { describe, it, expect } from "vitest";
import { signalMood } from "../src/signals.js";

const base = { hour: 14, returnGapHours: 1, batteryLevel: 0.8, charging: false };

describe("signalMood 우선순위 (§21 가벼운 폰 신호)", () => {
  it("48시간 이상 미접속 → lonely (최우선)", () => {
    const m = signalMood({ ...base, returnGapHours: 60, batteryLevel: 0.1, charging: false });
    expect(m.tag).toBe("lonely");
    expect(m.label.length).toBeGreaterThan(2);
  });
  it("배터리 20% 미만 & 비충전 → worried", () => {
    expect(signalMood({ ...base, batteryLevel: 0.12 }).tag).toBe("worried");
  });
  it("충전 중 → energized", () => {
    expect(signalMood({ ...base, charging: true }).tag).toBe("energized");
  });
  it("새벽(0~5시) → sleepy", () => {
    expect(signalMood({ ...base, hour: 3 }).tag).toBe("sleepy");
  });
  it("아침(6~10시) → fresh", () => {
    expect(signalMood({ ...base, hour: 8 }).tag).toBe("fresh");
  });
  it("낮(11~17시) → normal", () => {
    expect(signalMood({ ...base, hour: 14 }).tag).toBe("normal");
  });
  it("저녁(18~23시) → chill", () => {
    expect(signalMood({ ...base, hour: 21 }).tag).toBe("chill");
  });
  it("배터리 정보 없음(null)이어도 시간대로 동작 (폴백)", () => {
    const m = signalMood({ hour: 8, returnGapHours: 1, batteryLevel: null, charging: null });
    expect(m.tag).toBe("fresh");
  });
  it("모든 mood는 전투 힌트를 가진다", () => {
    for (const h of [3, 8, 14, 21]) {
      const m = signalMood({ ...base, hour: h });
      expect(m.hint).toHaveProperty("initiative");
    }
  });
});
