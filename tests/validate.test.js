import { describe, it, expect } from "vitest";
import { cleanText, validateBotInput, isMatchId, cleanStatBonus, cleanMirrorAxes } from "../src/validate.js";

describe("입력 검증", () => {
  it("공백만 있는 이름은 거부", () => {
    expect(validateBotInput("   ", "용감하다").ok).toBe(false);
    expect(validateBotInput("뭉치", " \n ").error).toMatch(/성격/);
  });
  it("제어문자·제로폭·양방향 문자 제거 + 공백 정리", () => {
    expect(cleanText("뭉​치‮", 10)).toBe("뭉치");
    expect(cleanText("  겁이   많다 ", 60)).toBe("겁이 많다");
  });
  it("코드포인트 기준 길이 제한 (이모지 반쪽 깨짐 없음)", () => {
    expect([...cleanText("😀".repeat(12), 10)].length).toBe(10);
  });
  it("정상 입력 통과", () => {
    expect(validateBotInput(" 뭉치 ", "겁이 많지만 돈이 걸리면 목숨을 건다")).toMatchObject({ ok: true, name: "뭉치" });
  });
});

describe("관전 링크 ID", () => {
  it("uuid만 허용", () => {
    expect(isMatchId("3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab")).toBe(true);
    expect(isMatchId("1 or 1=1")).toBe(false);
    expect(isMatchId(null)).toBe(false);
  });
});

describe("외부 스냅샷 값 정리", () => {
  it("숫자 아님·음수·캡 초과 정리", () => {
    expect(cleanStatBonus({ power: "9", tech: -5, speed: 999, mind: NaN })).toEqual({ power: 0, tech: 0, speed: 40, mind: 0 });
    expect(cleanMirrorAxes({ brave: 100, calm: -100, grit: 3 })).toEqual({ brave: 15, calm: -15, grit: 3 });
    expect(cleanStatBonus(null)).toEqual({ power: 0, tech: 0, speed: 0, mind: 0 });
  });
});
