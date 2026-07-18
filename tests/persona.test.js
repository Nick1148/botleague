import { describe, it, expect } from "vitest";
import { parsePersona } from "../src/persona.js";

describe("parsePersona", () => {
  it("겁 키워드는 용맹을 음수로 만든다", () => {
    const { axes } = parsePersona("겁이 많지만 돈이 걸리면 목숨을 건다");
    expect(axes.brave).toBeLessThan(0);
  });
  it("돈 키워드는 상금 트리거를 등록한다", () => {
    const { trigger } = parsePersona("겁이 많지만 돈이 걸리면 목숨을 건다");
    expect(trigger?.id).toBe("prize");
  });
  it("화 키워드는 침착을 음수로 만든다", () => {
    const { axes } = parsePersona("화나면 아무것도 안 보인다");
    // 규칙 -40에 해시 변주 ±10이 더해지므로 경계는 -30
    expect(axes.calm).toBeLessThanOrEqual(-30);
  });
  it("같은 문장은 항상 같은 결과 (결정론)", () => {
    const a = parsePersona("이기는 것보다 멋있는 게 중요하다");
    const b = parsePersona("이기는 것보다 멋있는 게 중요하다");
    expect(a).toEqual(b);
  });
  it("무매칭 문장도 0이 아닌 개성을 가진다", () => {
    const { axes } = parsePersona("바나나를 사랑함");
    const sum = Math.abs(axes.brave) + Math.abs(axes.calm) + Math.abs(axes.honest) + Math.abs(axes.grit);
    expect(sum).toBeGreaterThan(0);
  });
  it("모든 축은 -100..100 범위", () => {
    const { axes } = parsePersona("화 화 화 분노 욱 빡침 화남");
    for (const v of Object.values(axes)) { expect(v).toBeGreaterThanOrEqual(-100); expect(v).toBeLessThanOrEqual(100); }
  });
});
