import { describe, it, expect } from "vitest";
import { simulate } from "../src/sim.js";
import { createBot } from "../src/bot.js";

const mk = () => [createBot("뭉치", "일단 부딪힌다"), createBot("두부", "정정당당")];

describe("sim 컨디션 인자 (§8.5) — 하위호환·결정론·효과", () => {
  it("컨디션 없으면 기존 결과와 동일 (계약 유지)", () => {
    const [a, b] = mk();
    const noArg = simulate([a, b], 42);
    const undef = simulate([a, b], 42, undefined);
    expect(undef).toEqual(noArg);
  });
  it("같은 컨디션+시드는 같은 결과 (리플레이 결정론)", () => {
    const conds = [{ atk: 10, def: 5, initiative: 8 }, null];
    expect(simulate(mk(), 7, conds)).toEqual(simulate(mk(), 7, conds));
  });
  it("강한 컨디션은 승률을 유의미하게 올린다", () => {
    let base = 0, buffed = 0;
    for (let s = 0; s < 300; s++) {
      if (simulate(mk(), s).winnerIndex === 0) base++;
      if (simulate(mk(), s, [{ atk: 14, def: 8, initiative: 20 }, null]).winnerIndex === 0) buffed++;
    }
    expect(buffed).toBeGreaterThan(base);
  });
});
