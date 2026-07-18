import { drawBot } from "./renderer.js";
import { botPalette } from "./parts.js";
import { casterLine } from "./caster.js";

// 이벤트 타임라인 재생 관전 화면 (§19.4-③, §19.5) — v0.4 리치 연출
// playBattle(canvas, bots, result, onDone) → { skip() }
const EVENT_GAP = 550;
const HIT_STOP = 80, CRIT_STOP = 150;

export function playBattle(canvas, bots, result, onDone) {
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = W / devicePixelRatio, h = H / devicePixelRatio;

  const names = bots.map((b) => b.name);
  const pals = bots.map((b) => botPalette(b));
  let idx = 0, nextAt = performance.now() + 800, freezeUntil = 0;
  let shake = 0, caption = casterLine(result.events[0], names) ?? "";
  let hp = [...result.events[0].hp];
  const maxHp = [...result.events[0].hp];
  const squash = [0, 0];
  const glowUntil = [0, 0];
  let flash = 0, zoom = 1, zoomTarget = 1, done = false, skipped = false;
  let cutIn = null; // { text, color, until } — 필살기/트리거 컷인
  const particles = [];

  const botPos = (i) => ({ x: w * (i === 0 ? 0.3 : 0.7), y: h * 0.56 });

  function burst(i, kind, color, n) {
    const { x, y } = botPos(i);
    for (let k = 0; k < n; k++) {
      particles.push({
        x, y: y - h * 0.02, kind, color,
        vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1,
        life: 1, spin: Math.random() * Math.PI,
      });
    }
  }
  function confetti() {
    for (let k = 0; k < 70; k++) {
      particles.push({
        x: Math.random() * w, y: -10, kind: "confetti",
        color: ["#4DE3FF", "#FF4D9D", "#FFC93C", "#7CC47C", "#C3B1FA"][k % 5],
        vx: (Math.random() - 0.5) * 1.6, vy: 1.5 + Math.random() * 2.2,
        life: 1.6, spin: Math.random() * Math.PI,
      });
    }
  }

  function step(e) {
    hp = [...e.hp];
    const line = casterLine(e, names);
    if (line) caption = line;
    const now = performance.now();
    if (e.type === "hit" || e.type === "feint_hit" || e.type === "guard") {
      freezeUntil = now + HIT_STOP; shake = 5; squash[1 - e.actor] = 1;
      burst(1 - e.actor, "dust", "rgba(255,255,255,0.7)", 5);
    }
    if (e.type === "crit") {
      freezeUntil = now + CRIT_STOP; shake = 11; squash[1 - e.actor] = 1; flash = 1;
      burst(1 - e.actor, "star", "#FFC93C", 9);
    }
    if (e.type === "special") {
      freezeUntil = now + 600; shake = 13; squash[1 - e.actor] = 1; flash = 1;
      glowUntil[e.actor] = now + 900;
      cutIn = { text: e.label ?? "필살기!", color: pals[e.actor].neon, until: now + 900 };
      burst(1 - e.actor, "star", pals[e.actor].neon, 14);
    }
    if (e.type === "trigger") {
      freezeUntil = now + 500; flash = 1;
      glowUntil[e.actor] = now + 900;
      cutIn = { text: `『${e.label}』`, color: "#FFFFFF", until: now + 1000 };
    }
    if (e.type === "round_end" && (hp[0] <= 0 || hp[1] <= 0)) { zoomTarget = 1.14; setTimeout(() => (zoomTarget = 1), 700); } // KO 줌
    if (e.type === "end") {
      done = true; zoomTarget = 1.1; confetti();
      setTimeout(() => { if (!skipped) onDone(result); }, 1700);
    }
  }

  function drawStadium(t) {
    // 배경 — 코드 리치 (AI 이미지로 교체 가능 레이어, §20.1)
    ctx.fillStyle = "#171522"; ctx.fillRect(0, 0, w, h);
    // 네온 간판
    ctx.save();
    ctx.font = `bold ${Math.round(w * 0.075)}px Pretendard, sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#4DE3FF"; ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(77,227,255,0.9)";
    ctx.fillText("BOT LEAGUE", w / 2, h * 0.2);
    ctx.shadowColor = "#FF4D9D"; ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(255,77,157,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.215); ctx.lineTo(w * 0.7, h * 0.215); ctx.stroke();
    ctx.restore();
    // 관중 실루엣 2겹 + 응원봉
    for (const [rowY, size, alpha] of [[h * 0.33, w * 0.045, 0.5], [h * 0.38, w * 0.055, 0.75]]) {
      for (let i = 0; i < 14; i++) {
        const cx = (i + 0.5) * (w / 14) + Math.sin(i * 7.3) * 4;
        const bob = Math.sin(t / 300 + i * 1.7) * 3;
        ctx.fillStyle = `rgba(10,9,18,${alpha})`;
        ctx.beginPath(); ctx.arc(cx, rowY + bob, size, 0, Math.PI * 2); ctx.fill();
        if (i % 3 === 0) { // 응원봉 불빛
          const glow = i % 2 ? "#4DE3FF" : "#FF4D9D";
          ctx.fillStyle = glow;
          ctx.globalAlpha = 0.5 + Math.sin(t / 200 + i) * 0.3;
          ctx.beginPath(); ctx.arc(cx + size * 0.7, rowY + bob - size, 3, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    // 스포트라이트 빔 2개
    for (const side of [0, 1]) {
      const sx = side === 0 ? w * 0.12 : w * 0.88;
      const { x: tx } = botPos(side);
      const g = ctx.createLinearGradient(sx, 0, tx, h * 0.6);
      g.addColorStop(0, "rgba(255,232,181,0.22)"); g.addColorStop(1, "rgba(255,232,181,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - 8, 0); ctx.lineTo(sx + 8, 0);
      ctx.lineTo(tx + w * 0.16, h * 0.66); ctx.lineTo(tx - w * 0.16, h * 0.66);
      ctx.closePath(); ctx.fill();
    }
    // 링 바닥
    ctx.fillStyle = "#232033";
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, w * 0.42, h * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(77,227,255,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, w * 0.36, h * 0.075, 0, 0, Math.PI * 2); ctx.stroke();
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.spin += 0.1;
      if (p.kind !== "confetti") p.vy += 0.18;
      p.life -= p.kind === "confetti" ? 0.008 : 0.03;
      if (p.life <= 0 || p.y > h + 20) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      if (p.kind === "star") {
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
          ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.lineTo(Math.cos(a + Math.PI / 5) * 2.6, Math.sin(a + Math.PI / 5) * 2.6);
        }
        ctx.closePath(); ctx.fill();
      } else if (p.kind === "confetti") {
        ctx.fillRect(-4, -2.5, 8, 5);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function frame(t) {
    if (skipped) return;
    if (t > nextAt && t > freezeUntil && idx < result.events.length) {
      step(result.events[idx++]);
      nextAt = t + EVENT_GAP;
    }
    zoom += (zoomTarget - zoom) * 0.08;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom); ctx.translate(-w / 2, -h / 2);

    drawStadium(t);

    const ox = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const oy = shake ? (Math.random() - 0.5) * shake : 0;
    shake = Math.max(0, shake - 0.6);
    const now = performance.now();
    for (const i of [0, 1]) {
      squash[i] = Math.max(0, squash[i] - 0.08);
      const { x, y } = botPos(i);
      drawBot(ctx, bots[i], {
        x: x + ox, y: y + oy, size: w * 0.24,
        state: done ? (result.winnerIndex === i ? "win" : "lose") : "battle",
        t, squash: squash[i], flip: i === 1,
        glow: now < glowUntil[i] ? pals[i].neon : null,
      });
    }
    drawParticles();

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
    // 캐스터 자막바
    const cy = h * 0.82;
    ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#33302B"; ctx.lineWidth = 3;
    roundRectPath(ctx, w * 0.05, cy, w * 0.9, h * 0.1, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#33302B"; ctx.font = "bold 16px Pretendard, sans-serif"; ctx.textAlign = "left";
    wrapText(ctx, `🎙 ${caption}`, w * 0.09, cy + h * 0.04, w * 0.82, 22);

    // 컷인 (필살기 이름 / 트리거 성격 문장)
    if (cutIn && now < cutIn.until) {
      ctx.fillStyle = "rgba(10,9,18,0.55)"; ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.textAlign = "center";
      ctx.shadowColor = cutIn.color; ctx.shadowBlur = 24;
      ctx.fillStyle = cutIn.color;
      ctx.font = `bold ${Math.round(w * 0.085)}px Pretendard, sans-serif`;
      wrapText(ctx, cutIn.text, w / 2, h * 0.46, w * 0.85, w * 0.1, "center");
      ctx.restore();
    } else if (cutIn && now >= cutIn.until) cutIn = null;

    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.35})`; ctx.fillRect(0, 0, w, h); flash -= 0.1; }
    ctx.restore();

    if (!done || flash > 0 || particles.length > 0 || idx < result.events.length || Math.abs(zoom - 1) > 0.005) {
      requestAnimationFrame(frame);
    }
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

function wrapText(ctx, text, x, y, maxW, lineH, align) {
  if (align) ctx.textAlign = align;
  const words = text.split(" ");
  let line = "", yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lineH; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
