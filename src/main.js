import { createBot } from "./bot.js";
import { drawBot } from "./renderer.js";
import { simulate } from "./sim.js";
import { playBattle } from "./battleView.js";
import { pickInterview } from "./dialogue.js";
import { renderCard, saveCard } from "./interviewCard.js";
import { randomNpc } from "./npc.js";
import { hashString, mulberry32 } from "./rng.js";
import { accrueTraining } from "./training.js";
import { TIERS, refreshTickets, applyResult, pickOpponent } from "./league.js";
import { loadState, saveState, defaultProgress, buildMyBot, pushHistory, STAT_CAP } from "./state.js";
import { dominantStyle } from "./parts.js";

const $ = (sel) => document.querySelector(sel);
const EXAMPLES = [
  "겁이 많지만 돈이 걸리면 목숨을 건다", "칭찬받으면 강해진다",
  "싸움 전에 꼭 낮잠을 잔다", "이기는 것보다 멋있는 게 중요하다",
  "화나면 아무것도 안 보인다", "끝까지 포기 안 하는 잡초",
];
const STAT_LABEL = { power: "근력", tech: "기술", speed: "반응", mind: "멘탈" };
const BUBBLES = {
  brave: ["오늘 상대 누구냐. 빨리.", "몸이 근질거린다.", "훈련? 실전이 훈련이다."],
  caution: ["오늘 승률을 계산해 봤다. 나쁘지 않다.", "서두르지 마라. 나는 준비 중이다.", "관측 완료. 출전 가능."],
  cunning: ["오늘은 어떤 함정을 팔까.", "심판 매수는 농담이다. 아마도.", "상대 데이터, 이미 훔쳐봤다."],
  grit: ["오늘도 버틴다.", "어제보다 1만큼 강해졌다.", "훈련 수확 잊지 마라. 내 노력이다."],
};

let state = null;      // { bot:{name,persona}, progress }
let currentBattle = null;
let pendingTrain = 0;
let homeLoop = null;

const todayStr = () => new Date().toLocaleDateString("sv"); // YYYY-MM-DD (로컬)

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  const withTabs = $(id).classList.contains("with-tabs");
  $("#tabbar").hidden = !withTabs;
}

function switchTab(tab) {
  document.querySelectorAll("#tabbar .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "home") enterHome();
  if (tab === "league") { renderLeague(); show("#screen-league"); }
  if (tab === "history") { renderHistory(); show("#screen-history"); }
}
document.querySelectorAll("#tabbar .tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

/* ---------- 홈 (§19.4-①) ---------- */

function enterHome() {
  const p = state.progress;
  refreshTickets(p, todayStr());
  pendingTrain = accrueTraining(p.lastSeen || Date.now(), Date.now());
  saveState(state);

  const bot = buildMyBot(state);
  $("#home-tier").textContent = `${TIERS[p.tier]} · ${p.points}점`;
  $("#home-record").textContent = `${p.record.w}승 ${p.record.l}패`;

  // 말풍선 (성격 톤)
  const pool = BUBBLES[dominantStyle(bot.axes)];
  $("#home-bubble").textContent = pool[Math.floor(Date.now() / 6000) % pool.length];

  // 수확 버튼
  const harvest = $("#btn-harvest");
  harvest.hidden = pendingTrain <= 0;
  harvest.textContent = `🏋️ 훈련 수확 +${pendingTrain} (${STAT_LABEL[p.trainingStat]})`;

  // 훈련 종목 칩
  const row = $("#train-row");
  row.innerHTML = "";
  for (const k of Object.keys(STAT_LABEL)) {
    const chip = document.createElement("button");
    chip.className = "train-chip" + (p.trainingStat === k ? " active" : "");
    chip.textContent = `${STAT_LABEL[k]} 훈련`;
    chip.onclick = () => { p.trainingStat = k; saveState(state); enterHome(); };
    row.appendChild(chip);
  }

  // 스탯 바
  const statsEl = $("#home-stats");
  statsEl.innerHTML = "";
  for (const k of Object.keys(STAT_LABEL)) {
    const rowEl = document.createElement("div");
    rowEl.className = "stat-row";
    rowEl.innerHTML = `<span>${STAT_LABEL[k]}</span><div class="stat-bar"><i style="width:${(bot.stats[k] / STAT_CAP) * 100}%"></i></div><span>${bot.stats[k]}</span>`;
    statsEl.appendChild(rowEl);
  }

  // 출전 버튼
  const fight = $("#btn-fight");
  fight.textContent = p.tickets > 0 ? `▶ 리그 출전 (${p.tickets}/5)` : "출전권 소진 — 내일 다시!";
  fight.disabled = p.tickets <= 0;

  // 봇 idle 루프
  if (homeLoop) cancelAnimationFrame(homeLoop);
  const ctx = $("#home-canvas").getContext("2d");
  (function loop(t) {
    ctx.clearRect(0, 0, 360, 320);
    drawBot(ctx, bot, { x: 180, y: 170, size: 210, state: "idle", t });
    if ($("#screen-home").classList.contains("active")) homeLoop = requestAnimationFrame(loop);
  })(performance.now());

  show("#screen-home");
}

$("#btn-harvest").addEventListener("click", () => {
  const p = state.progress;
  p.statBonus[p.trainingStat] += pendingTrain;
  p.lastSeen = Date.now();
  pendingTrain = 0;
  saveState(state);
  enterHome();
});

/* ---------- 생성 (§5) ---------- */

$("#btn-dice").addEventListener("click", () => {
  $("#in-persona").value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
});
$("#btn-create").addEventListener("click", () => {
  const name = $("#in-name").value.trim();
  const persona = $("#in-persona").value.trim();
  if (!name || !persona) return alert("이름과 성격을 입력해줘!");
  state = { bot: { name, persona }, progress: { ...defaultProgress(), lastSeen: Date.now(), ticketDate: todayStr() } };
  saveState(state);
  const myBot = buildMyBot(state);
  const ctx = $("#birth-canvas").getContext("2d");
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, 360, 360);
    drawBot(ctx, myBot, { x: 180, y: 190, size: 220, state: "idle", t: t - t0 });
    if ($("#birth").offsetParent !== null) requestAnimationFrame(loop);
  })(t0);
  const styleName = { brave: "저돌형", caution: "신중형", cunning: "교활형", grit: "근성형" }[myBot.parts.style];
  $("#birth-desc").textContent =
    `${styleName} · 필살기 「${myBot.moveName}」` + (myBot.trigger ? ` · 특성 「${myBot.trigger.label}」` : "");
  $("#birth").hidden = false;
  $("#btn-debut").scrollIntoView({ behavior: "smooth" });
});

// 데뷔전: 출전권 무료, 리그 포인트는 반영
$("#btn-debut").addEventListener("click", () => startBattle({ free: true, opponent: randomNpc() }));

/* ---------- 전투 ---------- */

function startBattle({ free = false, opponent = null } = {}) {
  const p = state.progress;
  if (!free) {
    refreshTickets(p, todayStr());
    if (p.tickets <= 0) return;
    p.tickets -= 1;
  }
  const opp = opponent ?? pickOpponent(p.tier, mulberry32(hashString(`opp|${Date.now()}`)));
  const me = buildMyBot(state);
  const seed = hashString(`${me.name}|${opp.name}|${Date.now()}`);
  const result = simulate([me, opp], seed);
  saveState(state);
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [me, opp], result, (res) => finishLeagueMatch(opp, seed, res));
}
$("#btn-skip").addEventListener("click", () => currentBattle?.skip());
$("#btn-fight").addEventListener("click", () => startBattle());

function finishLeagueMatch(opp, seed, result) {
  const p = state.progress;
  const won = result.winnerIndex === 0;
  p.record[won ? "w" : "l"]++;
  const summary = applyResult(p, won);
  pushHistory(p, {
    seed, won, date: todayStr(),
    me: { name: state.bot.name, persona: state.bot.persona, statBonus: { ...p.statBonus } },
    opp: { name: opp.name, persona: opp.personaText, boost: opp.stats.power - createBot(opp.name, opp.personaText).stats.power },
  });
  saveState(state);
  showInterview(opp, result, summary, `m${seed}`);
}

/* ---------- 인터뷰 ---------- */

async function showInterview(opp, result, summary, matchKey) {
  const won = result.winnerIndex === 0;
  const me = buildMyBot(state);
  const line = pickInterview(me, { won, comeback: result.comeback }, matchKey);
  try { await document.fonts.load('68px "Nanum Pen Script"'); } catch { /* 오프라인 폴백 */ }
  const card = renderCard(me, { won, line, opponentName: opp.name });
  const view = $("#card-canvas");
  view.width = card.width; view.height = card.height;
  view.getContext("2d").drawImage(card, 0, 0);
  $("#btn-save").onclick = () => saveCard(card, `${me.name}-interview.png`);
  const note = $("#promo-note");
  if (summary?.promoted) { note.hidden = false; note.textContent = `🎉 ${TIERS[state.progress.tier]} 승급!`; }
  else if (summary?.demoted) { note.hidden = false; note.textContent = `…${TIERS[state.progress.tier]}(으)로 강등`; }
  else note.hidden = true;
  show("#screen-interview");
}
$("#btn-again").addEventListener("click", () => {
  if (state.progress.tickets <= 0) { enterHome(); return; }
  startBattle();
});
$("#btn-home").addEventListener("click", () => switchTab("home"));

/* ---------- 리그 탭 (§19.4-⑤) ---------- */

function renderLeague() {
  const p = state.progress;
  const el = $("#ladder");
  el.innerHTML = "";
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const row = document.createElement("div");
    row.className = "ladder-row" + (i === p.tier ? " mine" : "");
    const mine = i === p.tier;
    const note = mine
      ? (i === TIERS.length - 1 ? `${p.points}점 누적 중` : `승급까지 ${Math.max(0, 100 - p.points)}점`)
      : "";
    row.innerHTML = `<span class="t-name">${mine ? "🤖 " : ""}${TIERS[i]}</span>` +
      (mine ? `<div class="ladder-progress"><i style="width:${Math.min(100, p.points)}%"></i></div><span class="ladder-note">${note}</span>` : "");
    el.appendChild(row);
  }
}

/* ---------- 기록 탭 (§19.4-⑥, 리플레이 = 시드+스냅샷 재실행) ---------- */

function renderHistory() {
  const p = state.progress;
  const list = $("#history-list");
  list.innerHTML = "";
  $("#history-empty").hidden = p.history.length > 0;
  for (const h of p.history) {
    const li = document.createElement("li");
    li.className = "hist-item";
    li.innerHTML = `<span class="${h.won ? "res-w" : "res-l"}">${h.won ? "승" : "패"}</span>` +
      `<span class="who">vs ${h.opp.name}</span><span class="muted">${h.date}</span>`;
    const btn = document.createElement("button");
    btn.className = "btn-replay";
    btn.textContent = "▶ 다시보기";
    btn.onclick = () => playReplay(h);
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function playReplay(h) {
  // 당시 스냅샷 재구성 → 같은 시드 → 완전히 같은 경기 (§7 결정론)
  const me = createBot(h.me.name, h.me.persona);
  for (const k of Object.keys(me.stats)) me.stats[k] = Math.min(STAT_CAP, me.stats[k] + (h.me.statBonus[k] ?? 0));
  const opp = createBot(h.opp.name, h.opp.persona);
  for (const k of Object.keys(opp.stats)) opp.stats[k] += h.opp.boost;
  const result = simulate([me, opp], h.seed);
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [me, opp], result, () => { renderHistory(); show("#screen-history"); });
}

/* ---------- 부팅 ---------- */

state = loadState();
if (state) {
  switchTab("home");
} else {
  show("#screen-create");
}
