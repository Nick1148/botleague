import { describe, it, expect } from "vitest";
import { EVENT_POOL, pickEvent, applyChoice } from "../src/events.js";
import { startCareer } from "../src/career.js";
import { mulberry32 } from "../src/rng.js";

describe("EVENT_POOL", () => {
  it("각 이벤트는 텍스트와 2개 이상 선택지", () => {
    for (const e of EVENT_POOL) {
      expect(e.text.length).toBeGreaterThan(2);
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      for (const ch of e.choices) { expect(ch.label).toBeTruthy(); expect(ch.outcome).toBeTruthy(); }
    }
  });
});

describe("pickEvent — 안 본 이벤트 우선", () => {
  it("이미 본 건 피한다(남아있으면)", () => {
    const seen = EVENT_POOL.slice(0, EVENT_POOL.length - 1).map((e) => e.id);
    const e = pickEvent(mulberry32(1), seen);
    expect(seen).not.toContain(e.id);
  });
  it("다 봤으면 그냥 하나 준다(null 아님)", () => {
    const all = EVENT_POOL.map((e) => e.id);
    expect(pickEvent(mulberry32(1), all)).toBeTruthy();
  });
});

describe("applyChoice — 커리어에 결과 반영", () => {
  it("스탯 결과가 반영된다", () => {
    const c = startCareer();
    const choice = { label: "x", outcome: { stat: { tech: 8 }, msg: "" } };
    applyChoice(c, choice);
    expect(c.statGain.tech).toBe(8);
  });
  it("동기/발열 결과 반영 + 클램프", () => {
    const c = startCareer(); c.motivation = 5; c.heat = 5;
    applyChoice(c, { outcome: { motivation: 2, heat: -30, msg: "" } });
    expect(c.motivation).toBe(5);   // 상한
    expect(c.heat).toBe(0);         // 하한
  });
  it("skillReward 플래그를 결과로 알린다", () => {
    const c = startCareer();
    const res = applyChoice(c, { outcome: { skillReward: true, msg: "" } });
    expect(res.skillReward).toBe(true);
  });
});
