import { describe, it, expect } from "vitest";
import {
  startCareer, train, rest, recreate, recordBenchmark, isBenchmarkTurn,
  failChance, motivationMult, computeGrade, MAX_TURNS, BENCHMARK_TURNS, HEAT_PER_TRAIN,
} from "../src/career.js";

describe("startCareer", () => {
  it("1턴, 발열 0, 동기 3에서 시작", () => {
    const c = startCareer();
    expect(c.turn).toBe(1);
    expect(c.heat).toBe(0);
    expect(c.motivation).toBe(3);
    expect(c.done).toBe(false);
    expect(c.statGain).toEqual({ power: 0, tech: 0, speed: 0, mind: 0 });
  });
});

describe("failChance (발열 = 오버피팅 리스크)", () => {
  it("발열 낮으면 실패율 0, 높을수록 상승", () => {
    expect(failChance(0)).toBe(0);
    expect(failChance(30)).toBe(0);
    expect(failChance(100)).toBeGreaterThan(failChance(60));
    expect(failChance(60)).toBeGreaterThan(0);
  });
  it("실패율은 0~0.6 범위", () => {
    for (const h of [0, 40, 70, 100]) {
      expect(failChance(h)).toBeGreaterThanOrEqual(0);
      expect(failChance(h)).toBeLessThanOrEqual(0.6);
    }
  });
});

describe("train — 성공/실패 롤 + 발열·턴", () => {
  it("성공 시(rand=0.99) 스탯↑ 발열↑ 턴↑", () => {
    const c = startCareer();
    const r = train(c, "power", () => 0.99); // 실패율보다 큰 롤 → 성공
    expect(r.failed).toBe(false);
    expect(c.statGain.power).toBeGreaterThan(0);
    expect(c.heat).toBe(HEAT_PER_TRAIN);
    expect(c.turn).toBe(2);
  });
  it("발열 높을 때 실패(rand=0) → 스탯 손실·동기↓", () => {
    const c = startCareer(); c.heat = 90; c.statGain.power = 10; c.motivation = 4;
    const r = train(c, "power", () => 0);
    expect(r.failed).toBe(true);
    expect(c.statGain.power).toBeLessThan(10);
    expect(c.motivation).toBe(3);
  });
  it("동기 높으면 획득량이 크다", () => {
    const hi = startCareer(); hi.motivation = 5;
    const lo = startCareer(); lo.motivation = 1;
    train(hi, "tech", () => 0.99);
    train(lo, "tech", () => 0.99);
    expect(hi.statGain.tech).toBeGreaterThan(lo.statGain.tech);
  });
});

describe("rest / recreate", () => {
  it("rest는 발열을 낮추고 턴을 쓴다", () => {
    const c = startCareer(); c.heat = 80;
    rest(c);
    expect(c.heat).toBeLessThan(80);
    expect(c.turn).toBe(2);
  });
  it("recreate는 동기를 올린다(최대 5)", () => {
    const c = startCareer(); c.motivation = 5;
    recreate(c);
    expect(c.motivation).toBe(5);
    expect(c.turn).toBe(2);
  });
});

describe("평가전 스케줄 + 졸업", () => {
  it("BENCHMARK_TURNS에서만 평가전", () => {
    const c = startCareer();
    for (const t of [1, MAX_TURNS]) { c.turn = t; }
    c.turn = BENCHMARK_TURNS[0];
    expect(isBenchmarkTurn(c)).toBe(true);
    c.turn = BENCHMARK_TURNS[0] + 1;
    expect(isBenchmarkTurn(c)).toBe(false);
  });
  it("마지막 턴 통과 후 done + 등급 부여", () => {
    const c = startCareer(); c.turn = MAX_TURNS;
    recordBenchmark(c, true);
    expect(c.turn).toBeGreaterThan(MAX_TURNS);
    expect(c.done).toBe(true);
    expect(c.grade).toBeTruthy();
  });
});

describe("computeGrade", () => {
  it("전 평가전 통과 + 높은 스탯 = 높은 등급", () => {
    const s = computeGrade(3, 3, 120);
    const f = computeGrade(0, 3, 20);
    expect("SABCD".indexOf(s)).toBeLessThan("SABCD".indexOf(f)); // S가 앞
  });
});
