import { describe, it, expect } from "vitest";
import { kstDateStr } from "../src/time.js";

describe("kstDateStr (한국 시간 하루 경계)", () => {
  it("UTC 14:59 는 KST 23:59 — 같은 날", () => {
    expect(kstDateStr(Date.UTC(2026, 9, 26, 14, 59))).toBe("2026-10-26");
  });
  it("UTC 15:00 은 KST 다음날 00:00 — 출전권 리셋 경계", () => {
    expect(kstDateStr(Date.UTC(2026, 9, 26, 15, 0))).toBe("2026-10-27");
  });
  it("연말 경계", () => {
    expect(kstDateStr(Date.UTC(2026, 11, 31, 15, 0))).toBe("2027-01-01");
  });
});
