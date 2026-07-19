import { describe, it, expect } from "vitest";
import { TIERS, DAILY_TICKETS, refreshTickets, applyResult, pickOpponent } from "../src/league.js";
import { mulberry32 } from "../src/rng.js";

const prog = (over = {}) => ({ tier: 0, points: 0, tickets: 5, ticketDate: "2026-07-19", ...over });

describe("리그 상수 (§9.1)", () => {
  it("티어 5개, 두부에서 챔피언까지", () => {
    expect(TIERS).toHaveLength(5);
    expect(TIERS[0]).toContain("두부");
    expect(TIERS[4]).toContain("챔피언");
  });
});

describe("applyResult 포인트/승강 (§9.1)", () => {
  it("승 +20 / 패 -10 (하한 0)", () => {
    const p = prog({ points: 30 });
    applyResult(p, true); expect(p.points).toBe(50);
    applyResult(p, false); expect(p.points).toBe(40);
    const q = prog({ points: 5 });
    applyResult(q, false); expect(q.points).toBe(0);
  });
  it("100점 도달 시 승급, 잔여 20", () => {
    const p = prog({ points: 90 });
    const r = applyResult(p, true);
    expect(p.tier).toBe(1); expect(p.points).toBe(20); expect(r.promoted).toBe(true);
  });
  it("0점에서 패배 시 강등, 60점 복귀 — 두부는 강등 없음", () => {
    const p = prog({ tier: 2, points: 0 });
    const r = applyResult(p, false);
    expect(p.tier).toBe(1); expect(p.points).toBe(60); expect(r.demoted).toBe(true);
    const q = prog({ tier: 0, points: 0 });
    applyResult(q, false);
    expect(q.tier).toBe(0); expect(q.points).toBe(0);
  });
  it("챔피언은 승급 없이 포인트 누적", () => {
    const p = prog({ tier: 4, points: 95 });
    applyResult(p, true);
    expect(p.tier).toBe(4); expect(p.points).toBe(115);
  });
});

describe("refreshTickets 출전권 (§4)", () => {
  it("날짜가 바뀌면 5장으로 리셋", () => {
    const p = prog({ tickets: 0, ticketDate: "2026-07-18" });
    refreshTickets(p, "2026-07-19");
    expect(p.tickets).toBe(DAILY_TICKETS);
    expect(p.ticketDate).toBe("2026-07-19");
  });
  it("같은 날은 유지", () => {
    const p = prog({ tickets: 2 });
    refreshTickets(p, "2026-07-19");
    expect(p.tickets).toBe(2);
  });
});

describe("pickOpponent (§9.1 매칭 + 티어 보정)", () => {
  it("티어만큼 스탯 보정 (+tier×4)", () => {
    const low = pickOpponent(0, mulberry32(1));
    const high = pickOpponent(4, mulberry32(1)); // 같은 시드 → 같은 NPC
    expect(high.name).toBe(low.name);
    expect(high.stats.power).toBe(low.stats.power + 16);
  });
  it("봇 계약 필드를 갖춘다", () => {
    const o = pickOpponent(1, mulberry32(7));
    expect(o.name).toBeTruthy();
    expect(o.personaText).toBeTruthy();
    expect(o.parts).toBeTruthy();
    expect(o.moveName).toBeTruthy();
  });
});
