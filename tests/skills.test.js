import { describe, it, expect } from "vitest";
import { STYLE_LABEL, SKILL_POOL, skillsForStyle, rollSkillReward, getSkill } from "../src/skills.js";
import { mulberry32 } from "../src/rng.js";

describe("STYLE_LABEL — 4대 파이팅 스타일", () => {
  it("brave/caution/cunning/grit 모두 이름·태그", () => {
    for (const k of ["brave", "caution", "cunning", "grit"]) {
      expect(STYLE_LABEL[k].name.length).toBeGreaterThan(1);
      expect(STYLE_LABEL[k].tag).toBeTruthy();
    }
  });
});

describe("스킬 풀", () => {
  it("모든 스킬은 id·name·fireAt·effect", () => {
    for (const s of SKILL_POOL) {
      expect(s.id).toBeTruthy(); expect(s.name).toBeTruthy();
      expect(["start", "streak", "lowhp"]).toContain(s.fireAt);
      expect(typeof s.effect).toBe("object");
    }
  });
  it("skillsForStyle은 해당 스타일 + 공용을 준다", () => {
    const braveSkills = skillsForStyle("brave");
    expect(braveSkills.length).toBeGreaterThan(0);
    expect(braveSkills.every((s) => s.style === "brave" || s.style === "any")).toBe(true);
  });
  it("getSkill(id)로 조회", () => {
    expect(getSkill(SKILL_POOL[0].id).name).toBe(SKILL_POOL[0].name);
  });
});

describe("rollSkillReward — 미보유 중 1개", () => {
  it("이미 가진 건 안 준다", () => {
    const style = "brave";
    const all = skillsForStyle(style).map((s) => s.id);
    const owned = all.slice(0, all.length - 1);
    const reward = rollSkillReward(style, owned, mulberry32(1));
    expect(owned).not.toContain(reward.id);
  });
  it("다 가졌으면 null", () => {
    const style = "grit";
    const all = skillsForStyle(style).map((s) => s.id);
    expect(rollSkillReward(style, all, mulberry32(1))).toBeNull();
  });
});
