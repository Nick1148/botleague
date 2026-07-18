import { drawBot } from "./renderer.js";
import { casterLine } from "./caster.js";

// 이벤트 타임라인을 시간축으로 재생하는 관전 화면 (§19.4-③, §19.5)
// playBattle(canvas, bots, result, onDone) → { skip() }
const EVENT_GAP = 550;        // 이벤트 간 기본 간격(ms) — 경기 체감 길이 튜닝 노브
const HIT_STOP = 80, CRIT_STOP = 150;

export function playBattle(canvas, bots, result, onDone) {
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = W / devicePixelRatio, h = H / devicePixelRatio;

  const names = bots.map((b) => b.name);
  let idx = 0, nextAt = performance.now() + 800, freezeUntil = 0;
  let shake = 0, caption = casterLine(result.events[0], names) ?? "";
  let hp = [...result.events[0].hp];
  const maxHp = [...result.events[0].hp];
  const squash = [0, 0];
  let flash = 0, done = false, skipped = false;

  function step(e) { // 이벤트 1개를 화면 효과로 번역
    hp = [...e.hp];
    const line = casterLine(e, names); if (line) caption = line;
    if (e.type === "hit" || e.type === "feint_hit" || e.type === "guard") { freezeUntil = performance.now() + HIT_STOP; shake = 5; squash[1 - e.actor] = 1; }
    if (e.type === "crit" || e.type === "special") { freezeUntil = performance.now() + CRIT_STOP; shake = 11; squash[1 - e.actor] = 1; flash = 1; }
    if (e.type === "trigger") { caption = `『${e.label}』`; flash = 1; freezeUntil = performance.now() + 400; }
    if (e.type === "end") { done = true; setTimeout(() => { if (!skipped) onDone(result); }, 1200); }
  }

  function frame(t) {
    if (skipped) return;
    if (t > nextAt && t > freezeUntil && idx < result.events.length) { step(result.events[idx++]); nextAt = t + EVENT_GAP; }
    // --- 그리기 ---
    ctx.clearRect(0, 0, w, h);
    // 링 + 스포트라이트 (AI 배경은 Slice 2에서 교체)
    ctx.fillStyle = "#171522"; ctx.fillRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h * 0.55, 40, w / 2, h * 0.55, w * 0.75);
    grad.addColorStop(0, "rgba(255,232,181,0.16)"); grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#232033";
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, w * 0.42, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();

    const ox = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const oy = shake ? (Math.random() - 0.5) * shake : 0;
    shake = Math.max(0, shake - 0.6);
    for (const i of [0, 1]) {
      squash[i] = Math.max(0, squash[i] - 0.08);
      drawBot(ctx, bots[i], {
        x: w * (i === 0 ? 0.3 : 0.7) + ox, y: h * 0.56 + oy, size: w * 0.24,
        state: done ? (result.winnerIndex === i ? "win" : "lose") : "battle",
        t, squash: squash[i], flip: i === 1,
      });
    }
    // HP 바 (네온)
    for (const i of [0, 1]) {
      const bw = w * 0.34, bx = i === 0 ? w * 0.08 : w * 0.58, by = h * 0.09;
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(bx, by, bw, 12);
      ctx.fillStyle = i === 0 ? "#4DE3FF" : "#FF4D9D";
      ctx.fillRect(bx, by, bw * Math.max(0, hp[i] / maxHp[i]), 12);
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Pretendard, sans-serif";
      ctx.textAlign = i === 0 ? "left" : "right";
      ctx.fillText(names[i], i === 0 ? bx : bx + bw, by - 8);
    }
    // 캐스터 자막바 (크림 카드 — §19.2)
    const cy = h * 0.82;
    ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#2B2622"; ctx.lineWidth = 3;
    roundRectPath(ctx, w * 0.05, cy, w * 0.9, h * 0.1, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2B2622"; ctx.font = "bold 16px Pretendard, sans-serif"; ctx.textAlign = "left";
    wrapText(ctx, `🎙 ${caption}`, w * 0.09, cy + h * 0.04, w * 0.82, 22);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, w, h); flash -= 0.1; }
    if (!done || flash > 0 || idx < result.events.length) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { skip() { skipped = true; onDone(result); } };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "", yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lineH; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
