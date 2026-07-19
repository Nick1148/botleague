import { describe, it, expect } from "vitest";
import { toSnapshot, fromSnapshot } from "../src/snapshot.js";
import { buildMyBot, defaultProgress } from "../src/state.js";

const mkState = () => {
  const p = defaultProgress();
  p.statBonus = { power: 7, tech: 0, speed: 3, mind: 0 };
  p.mirror.axes = { brave: 4, calm: -6, grit: 2 };
  return { bot: { name: "뭉치", persona: "겁이 많지만 돈이 걸리면 목숨을 건다" }, progress: p };
};

describe("snapshot 왕복 (관전 링크 무결성의 핵심)", () => {
  it("toSnapshot→fromSnapshot 결과가 buildMyBot과 동일한 전투 봇", () => {
    const state = mkState();
    const rebuilt = fromSnapshot(toSnapshot(state));
    const direct = buildMyBot(state);
    expect(rebuilt.stats).toEqual(direct.stats);
    expect(rebuilt.axes).toEqual(direct.axes);
    expect(rebuilt.parts).toEqual(direct.parts);
    expect(rebuilt.moveName).toBe(direct.moveName);
  });
  it("서버 snake_case 행도 처리한다", () => {
    const bot = fromSnapshot({ name: "잡초맨", persona: "밟혀도 끝까지 다시 일어난다", stat_bonus: { power: 8 }, mirror_axes: { grit: 5 } });
    expect(bot.name).toBe("잡초맨");
    expect(bot.stats.power).toBeGreaterThan(10);
  });
  it("스탯 캡 40 적용", () => {
    const bot = fromSnapshot({ name: "치터", persona: "겁이 많다", statBonus: { power: 999 } });
    expect(bot.stats.power).toBe(40);
  });
  it("빈 보정 필드도 안전", () => {
    const bot = fromSnapshot({ name: "미니멀", persona: "조용히 이긴다" });
    expect(bot.parts).toBeTruthy();
  });
});
