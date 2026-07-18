import { describe, it, expect } from "vitest";
import { casterLine } from "../src/caster.js";
import { pickInterview } from "../src/dialogue.js";
import { createBot } from "../src/bot.js";

describe("casterLine", () => {
  it("hit 이벤트에 봇 이름이 들어간 자막을 만든다", () => {
    const line = casterLine({ type: "hit", actor: 0, dmg: 12, hp: [100, 88] }, ["뭉치", "두부킹"]);
    expect(line).toContain("뭉치");
  });
  it("모르는 타입은 null (자막 없음)", () => {
    expect(casterLine({ type: "round_start", actor: -1, hp: [1, 1] }, ["a", "b"])).toBeNull();
  });
});

describe("pickInterview", () => {
  const bot = createBot("여우", "몰래 뒤에서 치는 게 특기다");
  it("승리/패배에 맞는 비어있지 않은 대사", () => {
    expect(pickInterview(bot, { won: true, comeback: false }, "m1").length).toBeGreaterThan(3);
    expect(pickInterview(bot, { won: false, comeback: false }, "m1").length).toBeGreaterThan(3);
  });
  it("같은 경기는 같은 대사 (결정론), 다른 경기는 대개 다른 대사", () => {
    expect(pickInterview(bot, { won: true, comeback: false }, "m1"))
      .toBe(pickInterview(bot, { won: true, comeback: false }, "m1"));
    const lines = new Set(["a","b","c","d","e"].map((m) => pickInterview(bot, { won: true, comeback: false }, m)));
    expect(lines.size).toBeGreaterThan(1);
  });
});
