import { describe, it, expect } from "vitest";
import { generateMoveName } from "../src/moves.js";
import { parsePersona } from "../src/persona.js";

describe("generateMoveName", () => {
  const axesOf = (text) => parsePersona(text).axes;

  it("같은 입력은 같은 이름 (결정론)", () => {
    const axes = axesOf("겁이 많지만 돈이 걸리면 목숨을 건다");
    expect(generateMoveName("뭉치", "겁이 많지만 돈이 걸리면 목숨을 건다", axes))
      .toBe(generateMoveName("뭉치", "겁이 많지만 돈이 걸리면 목숨을 건다", axes));
  });

  it("성격 키워드가 이름에 반영된다 (돈 → 골드)", () => {
    const text = "돈만 주면 뭐든 한다";
    expect(generateMoveName("돈벌레", text, axesOf(text))).toContain("골드");
  });

  it("낮잠 키워드 → 낮잠 반영", () => {
    const text = "싸움 전에 꼭 낮잠을 잔다";
    expect(generateMoveName("잠꾸러기", text, axesOf(text))).toContain("낮잠");
  });

  it("비어있지 않고 3어절 이하로 짧다", () => {
    const text = "바나나를 사랑함";
    const name = generateMoveName("바나나", text, axesOf(text));
    expect(name.length).toBeGreaterThan(2);
    expect(name.split(" ").length).toBeLessThanOrEqual(3);
  });

  it("다른 봇은 대개 다른 필살기", () => {
    const names = new Set(
      ["가", "나", "다", "라", "마", "바", "사", "아"].map((n) => {
        const text = n + "답게 산다";
        return generateMoveName(n, text, axesOf(text));
      })
    );
    expect(names.size).toBeGreaterThan(4);
  });
});
