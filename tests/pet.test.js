import { describe, it, expect } from "vitest";
import { defaultPet, decayPet, feed, play, rest, condition, canAct, CARE } from "../src/pet.js";

const HOUR = 3600 * 1000;

describe("defaultPet", () => {
  it("돌봄 스탯 0~100, 중간값 시작", () => {
    const p = defaultPet(0);
    for (const k of ["fullness", "energy", "affection"]) {
      expect(p[k]).toBeGreaterThan(0); expect(p[k]).toBeLessThanOrEqual(100);
    }
  });
});

describe("decayPet 자연 감소", () => {
  it("시간이 지나면 스탯이 준다 (바닥 0)", () => {
    const p = defaultPet(0); p.fullness = 100; p.energy = 100; p.affection = 100;
    decayPet(p, 5 * HOUR);
    expect(p.fullness).toBeLessThan(100);
    expect(p.fullness).toBeGreaterThanOrEqual(0);
  });
  it("아주 오래 지나도 음수로 안 감", () => {
    const p = defaultPet(0);
    decayPet(p, 1000 * HOUR);
    expect(p.fullness).toBe(0); expect(p.energy).toBe(0);
  });
  it("경과 0이면 변화 없음", () => {
    const p = defaultPet(0); const before = { ...p };
    decayPet(p, 0);
    expect(p.fullness).toBe(before.fullness);
  });
});

describe("돌봄 액션 (캡 100, 쿨다운)", () => {
  it("feed는 포만을 올리고 100을 안 넘는다", () => {
    const p = defaultPet(0); p.fullness = 80;
    feed(p, 0);
    expect(p.fullness).toBeLessThanOrEqual(100);
    expect(p.fullness).toBeGreaterThan(80);
  });
  it("play는 애정을 올리고 기운을 쓴다", () => {
    const p = defaultPet(0); p.energy = 50; p.affection = 20;
    play(p, 0);
    expect(p.affection).toBeGreaterThan(20);
    expect(p.energy).toBeLessThan(50);
  });
  it("rest는 기운을 올린다", () => {
    const p = defaultPet(0); p.energy = 20;
    rest(p, 0);
    expect(p.energy).toBeGreaterThan(20);
  });
  it("쿨다운 중에는 canAct=false, 지나면 true", () => {
    const p = defaultPet(0);
    feed(p, 0);
    expect(canAct(p, "feed", 0)).toBe(false);
    expect(canAct(p, "feed", CARE.feed.cooldownMs + 1)).toBe(true);
  });
});

describe("condition 전투 보정 + 사유", () => {
  it("배고프면 공격 디버프 + 사유 라벨", () => {
    const p = defaultPet(0); p.fullness = 10;
    const c = condition(p, { tag: "normal", label: "", hint: { initiative: 0, atk: 0 } });
    expect(c.atk).toBeLessThan(0);
    expect(c.reasons.some((r) => r.includes("배") || r.includes("고프"))).toBe(true);
  });
  it("애정 높으면 공격 버프", () => {
    const p = defaultPet(0); p.affection = 90; p.fullness = 60; p.energy = 60;
    const c = condition(p, { tag: "normal", label: "", hint: { initiative: 0, atk: 0 } });
    expect(c.atk).toBeGreaterThan(0);
  });
  it("mood 힌트가 합산된다 (fresh=선공)", () => {
    const p = defaultPet(0);
    const c = condition(p, { tag: "fresh", label: "", hint: { initiative: 8, atk: 2 } });
    expect(c.initiative).toBeGreaterThanOrEqual(8);
  });
  it("항상 reasons 배열과 숫자 보정을 반환", () => {
    const p = defaultPet(0);
    const c = condition(p, { tag: "normal", label: "", hint: { initiative: 0, atk: 0 } });
    expect(Array.isArray(c.reasons)).toBe(true);
    expect(typeof c.atk).toBe("number");
  });
});
