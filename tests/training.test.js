import { describe, it, expect } from "vitest";
import { accrueTraining, TRAIN_INTERVAL_MIN, TRAIN_CAP } from "../src/training.js";

const MIN = 60 * 1000;

describe("accrueTraining (§8.2 방치 훈련)", () => {
  it("30분당 1점", () => {
    expect(accrueTraining(0, 30 * MIN)).toBe(1);
    expect(accrueTraining(0, 89 * MIN)).toBe(2);
    expect(accrueTraining(0, 90 * MIN)).toBe(3);
  });
  it("8시간에서 캡 (16점)", () => {
    expect(accrueTraining(0, 8 * 60 * MIN)).toBe(TRAIN_CAP);
    expect(accrueTraining(0, 48 * 60 * MIN)).toBe(TRAIN_CAP);
  });
  it("30분 미만·음수는 0", () => {
    expect(accrueTraining(0, 29 * MIN)).toBe(0);
    expect(accrueTraining(100 * MIN, 50 * MIN)).toBe(0);
  });
  it("상수 계약", () => {
    expect(TRAIN_INTERVAL_MIN).toBe(30);
    expect(TRAIN_CAP).toBe(16);
  });
});
