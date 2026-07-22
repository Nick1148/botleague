import { describe, it, expect } from "vitest";
import { migrate, defaultProgress } from "../src/state.js";

const uuid = () => "00000000-0000-0000-0000-000000000000";

describe("migrate — 펫/단계 마이그레이션 (Slice 4)", () => {
  it("신규 상태에 펫과 단계가 있다", () => {
    const s = migrate({ v1Bot: { name: "뭉치", persona: "겁이 많다" }, v2: null }, uuid);
    expect(s.progress.pet).toBeTruthy();
    expect(s.progress.pet.fullness).toBeGreaterThan(0);
    expect(s.progress.stage).toBe(0);
  });
  it("펫 없는 구버전 v2에 펫을 보충하고 단계는 승수로 소급", () => {
    const s = migrate({ v1Bot: null, v2: { bot: { name: "a", persona: "b" }, progress: { record: { w: 5, l: 2 } } } }, uuid);
    expect(s.progress.pet).toBeTruthy();
    expect(s.progress.stage).toBe(1); // 5승 → 성체
  });
  it("기존 펫/단계는 보존", () => {
    const pet = { fullness: 11, energy: 22, affection: 33, lastDecay: 0, last: {} };
    const s = migrate({ v1Bot: null, v2: { bot: { name: "a", persona: "b" }, progress: { pet, stage: 2 } } }, uuid);
    expect(s.progress.pet.fullness).toBe(11);
    expect(s.progress.stage).toBe(2);
  });
});
