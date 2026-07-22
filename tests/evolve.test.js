import { describe, it, expect } from "vitest";
import { stageForWins, checkEvolve, STAGE_NAMES, EVOLVE_AT } from "../src/evolve.js";

describe("stageForWins (§8.5 진화)", () => {
  it("승수 구간별 단계", () => {
    expect(stageForWins(0)).toBe(0);
    expect(stageForWins(EVOLVE_AT[1] - 1)).toBe(0);
    expect(stageForWins(EVOLVE_AT[1])).toBe(1);
    expect(stageForWins(EVOLVE_AT[2])).toBe(2);
    expect(stageForWins(9999)).toBe(2); // 최대 단계 고정
  });
  it("단계는 0~2, 이름 3개", () => {
    expect(STAGE_NAMES).toHaveLength(3);
  });
});

describe("checkEvolve — 임계 통과 시에만 진화", () => {
  it("경계를 넘으면 새 단계 반환", () => {
    expect(checkEvolve(EVOLVE_AT[1] - 1, EVOLVE_AT[1])).toBe(1);
    expect(checkEvolve(EVOLVE_AT[2] - 1, EVOLVE_AT[2])).toBe(2);
  });
  it("같은 단계 안에서는 null", () => {
    expect(checkEvolve(0, 1)).toBeNull();
    expect(checkEvolve(EVOLVE_AT[2] + 1, EVOLVE_AT[2] + 3)).toBeNull();
  });
  it("승수가 안 늘면 null", () => {
    expect(checkEvolve(5, 5)).toBeNull();
  });
});
