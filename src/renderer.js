import { botPalette } from "./parts.js";
import { mulberry32, hashString } from "./rng.js";

// v0.4 손그림 렌더러 (§19.7) — 지터(보일링) 라인 + 절제된 표정 + stub 팔다리
// drawBot(ctx, bot, opts)
// opts: { x, y, size, state:"idle"|"battle"|"win"|"lose"|"interview", t(ms), squash(0..1), flip, glow }

const INK = "#33302B";
const BOIL_MS = 170; // 보일링 라인 리듬 — 낮을수록 부글거림

export function drawBot(ctx, bot, opts) {
  const { x, y, size, state = "idle", t = 0, squash = 0, flip = false, glow = null } = opts;
  const pal = botPalette(bot);
  const r = size / 2;
  const seedBase = hashString(bot.name + "|" + bot.personaText);
  const boil = seedBase + Math.floor(t / BOIL_MS); // 프레임 지터 시드 (결정론: 이름+시간)

  // 호흡·포즈
  const breathe = state === "battle" ? 0 : Math.sin(t / 520) * 0.035;
  const loseSag = state === "lose" ? 0.12 : 0;
  const winHop = state === "win" ? Math.abs(Math.sin(t / 240)) * r * 0.16 : 0;
  const sx = 1 + breathe + squash * 0.28 + loseSag * 0.6;
  const sy = 1 - breathe - squash * 0.28 - loseSag;

  // 바닥 그림자
  ctx.save();
  ctx.translate(x, y + r * 0.98);
  ctx.fillStyle = "rgba(51,48,43,0.10)";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72 * sx, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y - winHop);
  if (flip) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2.5, size * 0.032);
  ctx.strokeStyle = INK;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.18; }

  // 팔다리(뒤) → 몸 → 얼굴 → 액세서리 순
  drawLegs(ctx, bot, r, boil);
  drawArms(ctx, bot, r, state, t, boil, pal);
  drawBody(ctx, bot, r, pal, boil, t);
  ctx.shadowBlur = 0;
  drawFace(ctx, bot, r, state, t, boil);
  drawMark(ctx, bot, r, state, boil);
  drawAccessory(ctx, bot, r, pal, boil);
  ctx.restore();
}

/* ---------- 손그림 라인 유틸 ---------- */

// 점 배열에 시드 지터를 주고 부드러운 닫힌 곡선으로 그린다
function wobblyPath(ctx, pts, seed, amp) {
  const rand = mulberry32(seed >>> 0);
  const q = pts.map(([px, py]) => [px + (rand() - 0.5) * amp, py + (rand() - 0.5) * amp]);
  ctx.beginPath();
  const n = q.length;
  ctx.moveTo((q[0][0] + q[n - 1][0]) / 2, (q[0][1] + q[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const [cx, cy] = q[i];
    const [nx, ny] = q[(i + 1) % n];
    ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  ctx.closePath();
}

function wobblyStroke(ctx, x1, y1, x2, y2, seed, amp) {
  const rand = mulberry32(seed >>> 0);
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * amp * 2;
  const my = (y1 + y2) / 2 + (rand() - 0.5) * amp * 2;
  ctx.beginPath();
  ctx.moveTo(x1 + (rand() - 0.5) * amp, y1 + (rand() - 0.5) * amp);
  ctx.quadraticCurveTo(mx, my, x2 + (rand() - 0.5) * amp, y2 + (rand() - 0.5) * amp);
  ctx.stroke();
}

/* ---------- 몸 ---------- */

// 몸형별 외곽선 점 배열 (§19.3 — 8종)
function bodyOutline(kind, r, t) {
  const pts = [];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2; // 12시부터
    let rx = r, ry = r * 0.92, px, py;
    switch (kind) {
      case "round": break;
      case "egg": rx = r * 0.88; ry = r; break;
      case "mochi": rx = r * 1.06; ry = r * 0.78; break;
      case "bean": rx = r * 0.95; ry = r * 0.9; break;
      case "drop": rx = r * 0.92; ry = r * 0.95; break;
      case "cube": rx = r * 0.97; ry = r * 0.9; break;
      case "jelly": rx = r; ry = r * 0.88; break;
      case "ghost": rx = r * 0.92; ry = r * 0.95; break;
    }
    px = Math.cos(a) * rx;
    py = Math.sin(a) * ry;
    if (kind === "egg" && py < 0) px *= 0.82;                       // 위가 좁은 달걀
    if (kind === "drop" && py < -ry * 0.3) px *= 1 - (-py / ry - 0.3) * 0.9; // 위가 뾰족
    if (kind === "bean") px += Math.cos(a * 2) * r * 0.06;          // 콩 허리
    if (kind === "cube") { // 둥근 사각 근사
      const k = 1.6;
      px = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 1 / k) * rx;
      py = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 1 / k) * ry;
    }
    if (kind === "jelly" && py > ry * 0.35) py = ry * 0.35 + Math.sin(a * 3 + t / 260) * r * 0.05; // 바닥 출렁
    if (kind === "ghost" && py > ry * 0.4) py = ry * 0.4 + Math.abs(Math.sin(a * 4)) * r * 0.14;   // 물결 밑단
    pts.push([px, py]);
  }
  return pts;
}

function drawBody(ctx, bot, r, pal, boil, t) {
  const pts = bodyOutline(bot.parts.body, r, t);
  wobblyPath(ctx, pts, boil, r * 0.045);
  ctx.fillStyle = pal.body;
  ctx.fill();
  ctx.stroke();
  // 은은한 1톤 음영 (아래쪽)
  ctx.save();
  wobblyPath(ctx, pts, boil, r * 0.045);
  ctx.clip();
  ctx.fillStyle = pal.shade;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.75, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  // 광택 점
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.42, r * 0.1, r * 0.065, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- 팔다리 (§19.7-④ stub) ---------- */

function drawArms(ctx, bot, r, state, t, boil, pal) {
  const noLimb = bot.parts.body === "ghost" || bot.parts.body === "drop";
  if (noLimb) return;
  ctx.save();
  ctx.fillStyle = pal.body;
  const sway = Math.sin(t / 480) * r * 0.04;
  const arm = (side, ax, ay) => {
    ctx.save();
    ctx.translate(side * ax, ay);
    wobblyPath(ctx, circlePts(r * 0.14), boil + side * 7, r * 0.03);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  if (state === "win") { arm(-1, r * 0.82, -r * 0.55); arm(1, r * 0.82, -r * 0.55); }        // 만세
  else if (state === "battle") { arm(-1, r * 0.7, -r * 0.15); arm(1, r * 0.95, -r * 0.3); }  // 주먹 앞으로
  else if (state === "lose") { arm(-1, r * 0.8, r * 0.35); arm(1, r * 0.8, r * 0.35); }      // 축 처짐
  else { arm(-1, r * 0.85, r * 0.1 + sway); arm(1, r * 0.85, r * 0.1 - sway); }              // 평상
  ctx.restore();
}

function drawLegs(ctx, bot, r, boil) {
  const noLimb = bot.parts.body === "ghost" || bot.parts.body === "drop" || bot.parts.body === "jelly";
  if (noLimb) return;
  ctx.save();
  ctx.fillStyle = INK;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.38, r * 0.88);
    wobblyPath(ctx, ellipsePts(r * 0.13, r * 0.09), boil + side * 3, r * 0.02);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function circlePts(rad) { return ellipsePts(rad, rad); }
function ellipsePts(rx, ry) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return pts;
}

/* ---------- 얼굴 (§19.7-② 절제된 표정) ---------- */

function drawFace(ctx, bot, r, state, t, boil) {
  const ex = r * 0.4, ey = -r * 0.02;
  let eye = bot.parts.eye, mouth = bot.parts.mouth;
  if (state === "win") { eye = "star"; mouth = "open"; }
  if (state === "lose") { eye = bot.axes.grit >= 20 ? "teary" : "cross"; mouth = "wavy"; }
  if (state === "interview") { mouth = bot.parts.mouth === "smirk" ? "smirk" : "pout"; }
  // 눈 깜빡임 (표정 눈이 아닐 때만)
  const phase = hashString(bot.name) % 3000;
  if (state !== "win" && state !== "lose" && (t + phase) % 3400 < 110) eye = "line";

  ctx.fillStyle = INK; ctx.strokeStyle = INK;
  for (const side of [-1, 1]) drawEye(ctx, eye, side * ex, ey, r, boil + side);
  drawMouth(ctx, mouth, 0, ey + r * 0.3, r, boil);
}

function drawEye(ctx, kind, x, y, r, seed) {
  const e = r * 0.09; // 기준 눈 크기 (점눈 문법 — 작게)
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, r * 0.055);
  ctx.beginPath();
  switch (kind) {
    case "tiny": ctx.arc(0, 0, e * 0.55, 0, Math.PI * 2); ctx.fill(); break;
    case "dot": ctx.arc(0, 0, e * 0.85, 0, Math.PI * 2); ctx.fill(); break;
    case "half": // 멍한 반눈: 꺼풀 라인 + 반쯤 가린 동공
      ctx.arc(0, e * 0.25, e * 0.7, 0, Math.PI); ctx.fill();
      wobblyStroke(ctx, -e, -e * 0.1, e, -e * 0.1, seed, e * 0.2);
      break;
    case "chill": wobblyStroke(ctx, -e, e * 0.15, e, -e * 0.05, seed, e * 0.15); break; // 무심
    case "line": wobblyStroke(ctx, -e * 0.9, 0, e * 0.9, 0, seed, e * 0.2); break;
    case "sleepy": ctx.arc(0, -e * 0.2, e, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); break;
    case "crescent": ctx.arc(0, 0, e, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); break; // 반달 (웃는 눈)
    case "sharp": wobblyStroke(ctx, -e, e * 0.5, e, -e * 0.5, seed, e * 0.15); break;
    case "scared":
      ctx.fillStyle = "#fff"; ctx.arc(0, 0, e * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(e * 0.2, e * 0.15, e * 0.4, 0, Math.PI * 2); ctx.fill();
      break;
    case "teary": // 눈물그렁 (§19.7-③)
      ctx.arc(0, 0, e * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,190,255,0.8)";
      ctx.beginPath(); ctx.ellipse(0, e * 0.95, e * 0.65, e * 0.4, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-e * 0.25, -e * 0.25, e * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * e * 1.15, Math.sin(a) * e * 1.15);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a2) * e * 0.5, Math.sin(a2) * e * 0.5);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    case "cross":
      wobblyStroke(ctx, -e * 0.8, -e * 0.8, e * 0.8, e * 0.8, seed, e * 0.15);
      wobblyStroke(ctx, e * 0.8, -e * 0.8, -e * 0.8, e * 0.8, seed + 1, e * 0.15);
      break;
  }
  ctx.restore();
}

function drawMouth(ctx, kind, x, y, r, seed) {
  const w = r * 0.16; // 작은 입 (절제)
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  switch (kind) {
    case "smile": ctx.arc(0, -w * 0.25, w, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); break;
    case "tight": wobblyStroke(ctx, -w * 0.5, 0, w * 0.5, 0, seed, w * 0.15); break;
    case "smirk": ctx.moveTo(-w * 0.6, 0); ctx.quadraticCurveTo(w * 0.2, w * 0.4, w * 0.75, -w * 0.3); ctx.stroke(); break;
    case "open": ctx.fillStyle = INK; ctx.ellipse(0, 0, w * 0.5, w * 0.6, 0, 0, Math.PI * 2); ctx.fill(); break;
    case "wavy":
      ctx.moveTo(-w * 0.7, 0);
      ctx.quadraticCurveTo(-w * 0.35, w * 0.45, 0, 0);
      ctx.quadraticCurveTo(w * 0.35, -w * 0.45, w * 0.7, 0);
      ctx.stroke(); break;
    case "fang":
      ctx.arc(0, -w * 0.25, w, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(w * 0.2, w * 0.28); ctx.lineTo(w * 0.42, w * 0.28); ctx.lineTo(w * 0.31, w * 0.6); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    case "pout": // 뚱한 입 (ㅅ 뒤집힘)
      ctx.moveTo(-w * 0.5, w * 0.15); ctx.quadraticCurveTo(0, -w * 0.35, w * 0.5, w * 0.15); ctx.stroke(); break;
    case "dotm": ctx.fillStyle = INK; ctx.arc(0, 0, w * 0.18, 0, Math.PI * 2); ctx.fill(); break;
    case "triangle":
      ctx.fillStyle = INK;
      ctx.moveTo(-w * 0.4, -w * 0.1); ctx.lineTo(w * 0.4, -w * 0.1); ctx.lineTo(0, w * 0.5); ctx.closePath(); ctx.fill();
      break;
    case "omega": // ω입
      ctx.arc(-w * 0.3, 0, w * 0.3, Math.PI, 0, true);
      ctx.arc(w * 0.3, 0, w * 0.3, Math.PI, 0, true);
      ctx.stroke(); break;
  }
  ctx.restore();
}

/* ---------- 무늬·볼 ---------- */

function drawMark(ctx, bot, r, state, boil) {
  const kind = state === "battle" && bot.axes.calm <= -30 ? "blush" : bot.parts.mark;
  const ex = r * 0.4;
  ctx.save();
  switch (kind) {
    case "blush":
      ctx.fillStyle = "rgba(255,120,110,0.42)";
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * ex * 1.35, r * 0.18, r * 0.11, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case "sweat":
      ctx.fillStyle = "rgba(120,190,255,0.85)"; ctx.strokeStyle = "rgba(80,140,210,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.62, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.74, -r * 0.28, r * 0.62, -r * 0.22);
      ctx.quadraticCurveTo(r * 0.5, -r * 0.28, r * 0.62, -r * 0.5);
      ctx.fill();
      break;
    case "tearline":
      ctx.strokeStyle = "rgba(120,190,255,0.7)"; ctx.lineWidth = Math.max(1.5, r * 0.03);
      for (const s of [-1, 1]) wobblyStroke(ctx, s * ex, r * 0.12, s * ex, r * 0.3, boil + s, r * 0.02);
      break;
    case "starpatch":
      ctx.fillStyle = "rgba(51,48,43,0.55)";
      drawTinyStar(ctx, -r * 0.55, r * 0.3, r * 0.08);
      break;
    case "bandage": {
      ctx.save(); ctx.translate(r * 0.5, -r * 0.45); ctx.rotate(-0.5);
      ctx.fillStyle = "#F7E8C9"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.025);
      ctx.fillRect(-r * 0.16, -r * 0.06, r * 0.32, r * 0.12);
      ctx.strokeRect(-r * 0.16, -r * 0.06, r * 0.32, r * 0.12);
      ctx.restore(); break;
    }
    case "lightning":
      ctx.strokeStyle = "rgba(51,48,43,0.6)"; ctx.lineWidth = Math.max(1.5, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(-r * 0.58, -r * 0.35); ctx.lineTo(-r * 0.48, -r * 0.18); ctx.lineTo(-r * 0.58, -r * 0.16); ctx.lineTo(-r * 0.46, 0);
      ctx.stroke(); break;
    case "oil":
      ctx.fillStyle = "rgba(51,48,43,0.18)";
      ctx.beginPath(); ctx.ellipse(r * 0.45, r * 0.4, r * 0.12, r * 0.07, 0.4, 0, Math.PI * 2); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawTinyStar(ctx, x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a2) * s * 0.45, y + Math.sin(a2) * s * 0.45);
  }
  ctx.closePath(); ctx.fill();
}

/* ---------- 액세서리 ---------- */

function drawAccessory(ctx, bot, r, pal, boil) {
  const kind = bot.parts.accessory;
  if (!kind || kind === "none") return;
  const topY = bot.parts.body === "mochi" ? -r * 0.72 : -r * 0.9;
  ctx.save();
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.strokeStyle = INK;
  switch (kind) {
    case "ribbon":
      ctx.fillStyle = pal.accent;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.06, topY);
        ctx.lineTo(s * r * 0.3, topY - r * 0.16);
        ctx.lineTo(s * r * 0.3, topY + r * 0.12);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(0, topY, r * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case "antenna":
      wobblyStroke(ctx, 0, topY, 0, topY - r * 0.28, boil, r * 0.02);
      ctx.fillStyle = pal.neon;
      ctx.beginPath(); ctx.arc(0, topY - r * 0.32, r * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case "horn":
      ctx.fillStyle = "#F7E8C9";
      ctx.beginPath();
      ctx.moveTo(-r * 0.08, topY + r * 0.04); ctx.lineTo(r * 0.08, topY + r * 0.04); ctx.lineTo(0, topY - r * 0.24);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case "ears":
      ctx.fillStyle = pal.body;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.arc(s * r * 0.45, topY + r * 0.05, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      break;
    case "headband":
      ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(3, r * 0.08);
      ctx.beginPath(); ctx.arc(0, topY + r * 0.34, r * 0.72, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      break;
    case "sprout":
      ctx.strokeStyle = "#5BA85B";
      wobblyStroke(ctx, 0, topY, r * 0.04, topY - r * 0.2, boil, r * 0.02);
      ctx.fillStyle = "#7CC47C";
      ctx.beginPath(); ctx.ellipse(r * 0.12, topY - r * 0.24, r * 0.11, r * 0.055, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.06, topY - r * 0.26, r * 0.1, r * 0.05, 0.6, 0, Math.PI * 2); ctx.fill();
      break;
    case "cap":
      ctx.fillStyle = pal.accent;
      ctx.beginPath(); ctx.arc(0, topY + r * 0.06, r * 0.32, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.3, topY + r * 0.06, r * 0.2, r * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
  }
  ctx.restore();
}
