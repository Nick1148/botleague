import { describe, it, expect } from "vitest";
import { mulberry32, hashString } from "../src/rng.js";

describe("mulberry32", () => {
  it("같은 시드는 같은 수열을 낸다", () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it("다른 시드는 다른 수열을 낸다", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("0 이상 1 미만을 반환한다", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
});

describe("hashString", () => {
  it("같은 문자열은 같은 해시, 다른 문자열은 다른 해시", () => {
    expect(hashString("겁쟁이")).toBe(hashString("겁쟁이"));
    expect(hashString("겁쟁이")).not.toBe(hashString("용감이"));
  });
});
