import { STYLE_COLORS } from "./parts.js";

const INK = "#2B2622";

// drawBot(ctx, bot, opts) — 모든 화면이 이 함수 하나로 봇을 그린다
// opts: { x, y, size, state:"idle"|"battle"|"win"|"lose"|"interview", t(ms), squash(0..1), flip }
export function drawBot(ctx, bot, opts) {
  const { x, y, size, state = "idle", t = 0, squash = 0, flip = false } = opts;
  const col = STYLE_COLORS[bot.parts.style];
  // idle 호흡: 사인파 스쿼시 (§19.5 — 귀여움의 80%)
  const breathe = state === "idle" || state === "interview" ? Math.sin(t / 480) * 0.04 : 0;
  const sx = 1 + breathe + squash * 0.25;
  const sy = 1 - breathe - squash * 0.25;

  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  ctx.lineWidth = Math.max(3, size * 0.045);
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";

  drawBody(ctx, bot.parts.body, size, col.body, t);
  drawFace(ctx, bot, size, state, t);
  ctx.restore();
}

function drawBody(ctx, body, s, fill, t) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  const r = s / 2;
  if (body === "round") {
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
  } else if (body === "jelly") {
    const w = Math.sin(t / 260) * s * 0.02; // 출렁임
    ctx.moveTo(-r, r * 0.5);
    ctx.bezierCurveTo(-r * 1.05, -r * 0.8 + w, r * 1.05, -r * 0.8 - w, r, r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.75, -r, r * 0.5);
  } else if (body === "cube") {
    roundRect(ctx, -r * 0.9, -r * 0.85, r * 1.8, r * 1.7, s * 0.18);
  } else { // ghost — 아래가 물결
    ctx.arc(0, -r * 0.15, r * 0.85, Math.PI, 0);
    const base = r * 0.75;
    for (let i = 0; i < 4; i++) {
      const x0 = r * 0.85 - (i + 0.5) * (r * 1.7 / 4);
      ctx.quadraticCurveTo(x0 + r * 0.21, base + (i % 2 ? -1 : 1) * r * 0.12, x0 - r * 0.21, base);
    }
    ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  // 하이라이트 점 (스티커 광택)
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.13, r * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
}

function drawFace(ctx, bot, s, state, t) {
  const r = s / 2;
  const ex = r * 0.34, ey = -r * 0.12, er = r * 0.1; // 눈 간격·높이·크기 — 귀여움 튜닝 1순위
  // 상태 오버라이드 (§19.3 표정 상태머신)
  let eye = bot.parts.eye, mouth = bot.parts.mouth;
  if (state === "win") { eye = "star"; mouth = "open"; }
  if (state === "lose") { eye = "cross"; mouth = "wavy"; }
  if (state === "interview") { mouth = bot.parts.mouth === "smirk" ? "smirk" : "tight"; }

  ctx.fillStyle = INK; ctx.strokeStyle = INK;
  for (const side of [-1, 1]) drawEye(ctx, eye, side * ex, ey, er, t);
  drawMouth(ctx, mouth, 0, ey + r * 0.3, r * 0.22);
  if (bot.parts.mark === "blush") {
    ctx.fillStyle = "rgba(255,107,87,0.45)";
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(side * ex * 1.5, ey + r * 0.22, er * 1.1, er * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}

function drawEye(ctx, kind, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(2.5, r * 0.5); ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "dot") { ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === "scared") { // 큰 흰자 + 작은 동공 (겁)
    ctx.fillStyle = "#fff"; ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2B2622"; ctx.beginPath(); ctx.arc(r * 0.2, r * 0.1, r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  else if (kind === "crescent") { ctx.arc(0, 0, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); } // 반달(교활)
  else if (kind === "sharp") { ctx.moveTo(-r, r * 0.5); ctx.lineTo(r, -r * 0.5); ctx.stroke(); }
  else if (kind === "sleepy") { ctx.arc(0, -r * 0.2, r, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
  else if (kind === "line") { ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); }
  else if (kind === "cross") { ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(r, -r); ctx.lineTo(-r, r); ctx.stroke(); }
  else if (kind === "star") {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * r * 0.5, Math.sin(a2) * r * 0.5);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawMouth(ctx, kind, x, y, w) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(2.5, w * 0.28); ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "smile") { ctx.arc(0, -w * 0.2, w, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  else if (kind === "tight") { ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0); ctx.stroke(); }
  else if (kind === "smirk") { ctx.moveTo(-w * 0.6, 0); ctx.quadraticCurveTo(w * 0.2, w * 0.35, w * 0.7, -w * 0.3); ctx.stroke(); }
  else if (kind === "open") { ctx.fillStyle = "#2B2622"; ctx.ellipse(0, 0, w * 0.5, w * 0.62, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === "wavy") { ctx.moveTo(-w * 0.7, 0); ctx.quadraticCurveTo(-w * 0.35, w * 0.4, 0, 0); ctx.quadraticCurveTo(w * 0.35, -w * 0.4, w * 0.7, 0); ctx.stroke(); }
  else if (kind === "fang") { ctx.arc(0, -w * 0.2, w, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(w * 0.25, w * 0.28); ctx.lineTo(w * 0.45, w * 0.28); ctx.lineTo(w * 0.35, w * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
