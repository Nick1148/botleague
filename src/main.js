import { createBot } from "./bot.js";
import { drawBot } from "./renderer.js";
import { simulate } from "./sim.js";
import { playBattle } from "./battleView.js";
import { pickInterview } from "./dialogue.js";
import { renderCard, saveCard } from "./interviewCard.js";
import { randomNpc } from "./npc.js";
import { hashString } from "./rng.js";

const $ = (sel) => document.querySelector(sel);
const EXAMPLES = [
  "겁이 많지만 돈이 걸리면 목숨을 건다", "칭찬받으면 강해진다",
  "싸움 전에 꼭 낮잠을 잔다", "이기는 것보다 멋있는 게 중요하다",
  "화나면 아무것도 안 보인다", "끝까지 포기 안 하는 잡초",
];

let myBot = null, currentBattle = null, matchNo = 0;

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

// --- 생성 화면 ---
$("#btn-dice").addEventListener("click", () => {
  $("#in-persona").value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
});
$("#btn-create").addEventListener("click", () => {
  const name = $("#in-name").value.trim();
  const persona = $("#in-persona").value.trim();
  if (!name || !persona) return alert("이름과 성격을 입력해줘!");
  myBot = createBot(name, persona);
  localStorage.setItem("botleague.myBot", JSON.stringify({ name, persona }));
  // 탄생 연출: 봇 + 성향 한 줄 (§5-3)
  const ctx = $("#birth-canvas").getContext("2d");
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, 360, 360);
    drawBot(ctx, myBot, { x: 180, y: 190, size: 220, state: "idle", t: t - t0 });
    if ($("#birth").offsetParent !== null) requestAnimationFrame(loop);
  })(t0);
  const styleName = { brave: "저돌형", caution: "신중형", cunning: "교활형", grit: "근성형" }[myBot.parts.style];
  $("#birth-desc").textContent = myBot.trigger
    ? `${styleName} · 특성: 「${myBot.trigger.label}」`
    : `${styleName} 파이터`;
  $("#birth").hidden = false;
  $("#btn-debut").scrollIntoView({ behavior: "smooth" });
});

// --- 전투 ---
$("#btn-debut").addEventListener("click", startBattle);
function startBattle() {
  if (!myBot) return;
  const npc = randomNpc();
  matchNo++;
  const seed = hashString(`${myBot.name}|${npc.name}|${matchNo}|${Date.now() >> 16}`);
  const result = simulate([myBot, npc], seed);
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [myBot, npc], result, (res) => showInterview(npc, res));
}
$("#btn-skip").addEventListener("click", () => currentBattle?.skip());

// --- 인터뷰 ---
async function showInterview(npc, result) {
  const won = result.winnerIndex === 0;
  myBot.record[won ? "w" : "l"]++;
  const line = pickInterview(myBot, { won, comeback: result.comeback }, `m${matchNo}`);
  // 손글씨 폰트가 로드된 뒤 카드를 그린다 (실패해도 폴백 폰트로 진행)
  try { await document.fonts.load('68px "Nanum Pen Script"'); } catch { /* 오프라인 폴백 */ }
  const card = renderCard(myBot, { won, line, opponentName: npc.name });
  const view = $("#card-canvas");
  view.width = card.width; view.height = card.height;
  view.getContext("2d").drawImage(card, 0, 0);
  $("#btn-save").onclick = () => saveCard(card, `${myBot.name}-interview.png`);
  show("#screen-interview");
}
$("#btn-again").addEventListener("click", startBattle);
$("#btn-new").addEventListener("click", () => { $("#birth").hidden = true; show("#screen-create"); });

// 재방문: 저장된 봇 복원
const saved = localStorage.getItem("botleague.myBot");
if (saved) {
  try {
    const { name, persona } = JSON.parse(saved);
    $("#in-name").value = name; $("#in-persona").value = persona;
  } catch { /* 손상된 저장값은 무시 */ }
}
