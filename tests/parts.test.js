import { describe, it, expect } from "vitest";
import { dominantStyle, pickParts, BODIES, EYES, MOUTHS, MARKS } from "../src/parts.js";
import { createBot } from "../src/bot.js";
import { mulberry32 } from "../src/rng.js";

describe("dominantStyle", () => {
  it("교활 축이 강하면 cunning", () => {
    expect(dominantStyle({ brave: 30, calm: 0, honest: -50, grit: 0 })).toBe("cunning");
  });
  it("용맹 음수면 caution", () => {
    expect(dominantStyle({ brave: -40, calm: 0, honest: 0, grit: 0 })).toBe("caution");
  });
});

describe("pickParts", () => {
  it("유효한 파츠만 고른다", () => {
    const p = pickParts({ brave: 10, calm: 10, honest: 10, grit: 10 }, mulberry32(1));
    expect(BODIES).toContain(p.body); expect(EYES).toContain(p.eye);
    expect(MOUTHS).toContain(p.mouth); expect(MARKS).toContain(p.mark);
  });
  it("겁쟁이(-40 이하)는 scared 눈", () => {
    const p = pickParts({ brave: -60, calm: 0, honest: 0, grit: 0 }, mulberry32(1));
    expect(p.eye).toBe("scared");
  });
  it("다혈질(calm -30 이하)은 blush 무늬", () => {
    const p = pickParts({ brave: 0, calm: -50, honest: 0, grit: 0 }, mulberry32(1));
    expect(p.mark).toBe("blush");
  });
});

describe("createBot", () => {
  it("같은 입력은 같은 봇 (결정론)", () => {
    expect(createBot("뭉치", "겁이 많다")).toEqual(createBot("뭉치", "겁이 많다"));
  });
  it("스탯은 10~14 범위에서 시작한다", () => {
    const b = createBot("뭉치", "겁이 많다");
    for (const v of Object.values(b.stats)) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(14); }
  });
});
