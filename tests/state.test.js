import { describe, it, expect } from "vitest";
import { defaultProgress, migrate, buildMyBot, STAT_CAP } from "../src/state.js";
import { createBot } from "../src/bot.js";

describe("defaultProgress", () => {
  it("초기값 계약", () => {
    const p = defaultProgress();
    expect(p.tier).toBe(0);
    expect(p.points).toBe(0);
    expect(p.tickets).toBe(5);
    expect(p.statBonus).toEqual({ power: 0, tech: 0, speed: 0, mind: 0 });
    expect(p.trainingStat).toBe("power");
    expect(p.history).toEqual([]);
  });
});

describe("migrate (v1 → v2)", () => {
  it("v1 봇 키만 있으면 v2 상태로 승격", () => {
    const s = migrate({ v1Bot: { name: "뭉치", persona: "겁이 많다" }, v2: null });
    expect(s.bot).toEqual({ name: "뭉치", persona: "겁이 많다" });
    expect(s.progress.tier).toBe(0);
  });
  it("v2가 있으면 그대로, 누락 필드는 기본값 보충", () => {
    const s = migrate({ v1Bot: null, v2: { bot: { name: "a", persona: "b" }, progress: { tier: 2 } } });
    expect(s.progress.tier).toBe(2);
    expect(s.progress.tickets).toBe(5); // 보충됨
  });
  it("아무것도 없으면 null (신규 유저)", () => {
    expect(migrate({ v1Bot: null, v2: null })).toBeNull();
  });
});

describe("buildMyBot (§8 — 베이스 + 훈련 보너스)", () => {
  it("statBonus가 합산된다", () => {
    const base = createBot("뭉치", "겁이 많다");
    const bot = buildMyBot({ bot: { name: "뭉치", persona: "겁이 많다" }, progress: { ...defaultProgress(), statBonus: { power: 5, tech: 0, speed: 2, mind: 0 } } });
    expect(bot.stats.power).toBe(base.stats.power + 5);
    expect(bot.stats.speed).toBe(base.stats.speed + 2);
  });
  it("종목당 캡 40", () => {
    const bot = buildMyBot({ bot: { name: "뭉치", persona: "겁이 많다" }, progress: { ...defaultProgress(), statBonus: { power: 99, tech: 0, speed: 0, mind: 0 } } });
    expect(bot.stats.power).toBe(STAT_CAP);
  });
  it("전적이 progress를 따른다", () => {
    const bot = buildMyBot({ bot: { name: "뭉치", persona: "겁이 많다" }, progress: { ...defaultProgress(), record: { w: 3, l: 1 } } });
    expect(bot.record).toEqual({ w: 3, l: 1 });
  });
});
