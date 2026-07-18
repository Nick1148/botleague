import { describe, it, expect } from "vitest";
import { simulate } from "../src/sim.js";
import { createBot } from "../src/bot.js";

const A = () => createBot("돌진맨", "일단 부딪히고 생각한다");     // 저돌
const C = () => createBot("여우", "몰래 뒤에서 치는 게 특기다");    // 교활
const G = () => createBot("거북", "계산이 서기 전엔 안 움직인다. 겁이 많다"); // 신중

describe("simulate 기본 계약", () => {
  it("같은 입력은 같은 결과 (결정론 — 리플레이의 기반)", () => {
    expect(simulate([A(), C()], 123)).toEqual(simulate([A(), C()], 123));
  });
  it("무승부 없음 — winnerIndex는 0 또는 1", () => {
    for (let s = 0; s < 50; s++) expect([0, 1]).toContain(simulate([A(), G()], s).winnerIndex);
  });
  it("이벤트 로그가 있고 start로 시작해 end로 끝난다", () => {
    const r = simulate([A(), C()], 7);
    expect(r.events[0].type).toBe("start");
    expect(r.events.at(-1).type).toBe("end");
    expect(r.events.length).toBeGreaterThan(10);
  });
  it("모든 이벤트에 hp 스냅샷이 있다", () => {
    const r = simulate([A(), C()], 7);
    for (const e of r.events) { expect(e.hp).toHaveLength(2); }
  });
});

describe("상성 순환 (§6.3) — 몬테카를로", () => {
  // 부드러운 상성: 우위 쪽 승률 52%~75% 밴드 (§6.3 "55:45 수준")
  function winRate(mkA, mkB, n = 400) {
    let w = 0;
    for (let s = 0; s < n; s++) if (simulate([mkA(), mkB()], s).winnerIndex === 0) w++;
    return w / n;
  }
  it("교활이 저돌에 우위", () => {
    const r = winRate(C, A); expect(r).toBeGreaterThan(0.52); expect(r).toBeLessThan(0.75);
  });
  it("신중이 교활에 우위", () => {
    const r = winRate(G, C); expect(r).toBeGreaterThan(0.52); expect(r).toBeLessThan(0.75);
  });
  it("저돌이 신중에 우위", () => {
    const r = winRate(A, G); expect(r).toBeGreaterThan(0.52); expect(r).toBeLessThan(0.75);
  });
});
