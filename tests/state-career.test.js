import { describe, it, expect } from "vitest";
import { migrate, defaultProgress, bankCareer, buildMyBot, STAT_CAP } from "../src/state.js";
import { startCareer } from "../src/career.js";

const uuid = () => "00000000-0000-0000-0000-000000000000";

describe("migrate — 커리어/스킬 (Slice 5)", () => {
  it("신규 상태: career null, skills []", () => {
    const s = migrate({ v1Bot: { name: "뭉치", persona: "겁이 많다" }, v2: null }, uuid);
    expect(s.progress.career).toBeNull();
    expect(s.progress.skills).toEqual([]);
  });
  it("Slice 4 유저(career/skills 없음)에 보충", () => {
    const s = migrate({ v1Bot: null, v2: { bot: { name: "a", persona: "b" }, progress: { record: { w: 2, l: 0 } } } }, uuid);
    expect(s.progress.career).toBeNull();
    expect(Array.isArray(s.progress.skills)).toBe(true);
  });
});

describe("bankCareer — 졸업 시 은행 처리", () => {
  it("스탯 은행(캡) + 스킬 병합 + career 비움", () => {
    const p = defaultProgress();
    p.statBonus.power = 10;
    const c = startCareer();
    c.statGain = { power: 99, tech: 5, speed: 0, mind: 0 };
    c.acquiredSkills = ["overclock", "cache"];
    bankCareer(p, c);
    expect(p.statBonus.power).toBe(STAT_CAP);       // 10+99 캡 40
    expect(p.statBonus.tech).toBe(5);
    expect(p.skills).toEqual(["overclock", "cache"]);
    expect(p.career).toBeNull();
  });
  it("중복 스킬은 병합 안 함", () => {
    const p = defaultProgress(); p.skills = ["cache"];
    const c = startCareer(); c.acquiredSkills = ["cache", "overclock"];
    bankCareer(p, c);
    expect(p.skills).toEqual(["cache", "overclock"]);
  });
});

describe("buildMyBot — 배포 스킬 부착", () => {
  it("progress.skills가 봇에 실린다", () => {
    const p = defaultProgress(); p.skills = ["overclock"];
    const bot = buildMyBot({ bot: { name: "뭉치", persona: "겁이 많다" }, progress: p });
    expect(bot.skills).toEqual(["overclock"]);
  });
});
