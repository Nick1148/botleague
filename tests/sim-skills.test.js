import { describe, it, expect } from "vitest";
import { simulate } from "../src/sim.js";
import { createBot } from "../src/bot.js";

const mk = (skills) => { const b = createBot("뭉치", "일단 부딪힌다"); if (skills) b.skills = skills; return b; };

describe("sim 스킬 (§7) — 하위호환·결정론·발동", () => {
  it("스킬 없으면 기존과 동일 (계약 유지)", () => {
    const withEmpty = simulate([mk(), createBot("두부", "정정당당")], 42);
    const plain = simulate([createBot("뭉치", "일단 부딪힌다"), createBot("두부", "정정당당")], 42);
    expect(withEmpty).toEqual(plain);
  });
  it("같은 스킬+시드는 같은 결과 (리플레이 결정론)", () => {
    const a = () => [mk(["overclock", "lastboot"]), createBot("두부", "정정당당")];
    expect(simulate(a(), 7)).toEqual(simulate(a(), 7));
  });
  it("스킬 발동 시 skill 이벤트가 남는다", () => {
    const r = simulate([mk(["overclock"]), createBot("두부", "정정당당")], 7);
    expect(r.events.some((e) => e.type === "skill" && e.label === "오버클럭")).toBe(true);
  });
  it("강한 스킬은 승률을 올린다", () => {
    let base = 0, buffed = 0;
    for (let s = 0; s < 250; s++) {
      if (simulate([createBot("뭉치", "일단 부딪힌다"), createBot("두부", "정정당당")], s).winnerIndex === 0) base++;
      if (simulate([mk(["overclock", "lastboot", "cache"]), createBot("두부", "정정당당")], s).winnerIndex === 0) buffed++;
    }
    expect(buffed).toBeGreaterThan(base);
  });
});
