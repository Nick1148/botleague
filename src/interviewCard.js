import { drawBot } from "./renderer.js";
import { botPalette } from "./parts.js";

// 9:16 인터뷰 카드 — 화면이자 저장 이미지 그 자체 (§19.4-④, §11.1)
export function renderCard(bot, { won, line, opponentName }) {
  const pal = botPalette(bot);
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFF6E9"; ctx.fillRect(0, 0, 1080, 1920);
  // 은은한 도트 패턴 (§19.2)
  ctx.fillStyle = "rgba(43,38,34,0.05)";
  for (let py = 40; py < 1920; py += 44) {
    for (let px = 20 + (py % 88 ? 22 : 0); px < 1080; px += 44) {
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 상단 리본
  ctx.fillStyle = won ? "#FF6B57" : "#A78BFA";
  ctx.fillRect(0, 0, 1080, 140);
  ctx.fillStyle = "#fff"; ctx.font = "bold 64px Pretendard, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(won ? "승자 인터뷰" : "패자 인터뷰", 540, 95);

  // 봇 클로즈업 + 스티커 흰 테두리 (§19.2)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 30;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(540, 640, 330, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawBot(ctx, bot, { x: 540, y: 660, size: 480, state: "interview", t: 0 });

  // 이름 + 상대
  ctx.fillStyle = "#2B2622"; ctx.font = "bold 72px Pretendard, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(bot.name, 540, 1120);
  ctx.font = "500 40px Pretendard, sans-serif"; ctx.fillStyle = "rgba(43,38,34,0.6)";
  ctx.fillText(`vs ${opponentName} · ${won ? "WIN" : "LOSE"}`, 540, 1185);

  // 인터뷰 대사 (큰따옴표 카드 — 손글씨 폰트 §19.7-⑥)
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#33302B"; ctx.lineWidth = 6;
  roundRect(ctx, 90, 1270, 900, 420, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pal.accent;
  ctx.font = "bold 130px Georgia, serif"; ctx.textAlign = "left";
  ctx.fillText("“", 130, 1400);
  ctx.fillStyle = "#33302B"; ctx.font = '68px "Nanum Pen Script", Pretendard, sans-serif';
  wrap(ctx, line, 540, 1445, 800, 82, "center");

  // 워터마크 (§11.1)
  ctx.fillStyle = "rgba(43,38,34,0.45)"; ctx.font = "bold 36px Pretendard, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("AI 파이트 리그 — 성격 한 줄이 싸운다", 540, 1840);
  return canvas;
}

export function saveCard(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function wrap(ctx, text, x, y, maxW, lineH, align) {
  ctx.textAlign = align;
  const words = text.split(" ");
  let line = "", yy = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lineH; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
