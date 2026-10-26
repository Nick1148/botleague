import { createBot } from "./bot.js";
import { drawBot } from "./renderer.js";
import { simulate } from "./sim.js";
import { playBattle } from "./battleView.js";
import { pickInterview } from "./dialogue.js";
import { renderCard, saveCard } from "./interviewCard.js";
import { hashString, mulberry32 } from "./rng.js";
import { accrueTraining, nextTrainSince, TRAIN_CAP } from "./training.js";
import { TIERS, refreshTickets, applyResult, pickOpponent } from "./league.js";
import { loadState, saveState, defaultProgress, buildMyBot, pushHistory, randomUUID, bankCareer, STAT_CAP } from "./state.js";
import { applyBehavior, touchStreak, dominantMirror, effectiveAxes } from "./mirror.js";
import { dominantStyle } from "./parts.js";
import { fromSnapshot } from "./snapshot.js";
import { upsertMyBot, fetchOpponent, insertMatch, fetchMatch, fetchRanking } from "./net.js";
import { readSignals, signalMood } from "./signals.js";
import { decayPet, feed, play, rest as petRest, condition, canAct, CARE } from "./pet.js";
import { checkEvolve, stageForWins, STAGE_NAMES } from "./evolve.js";
import { startCareer, train, rest as careerRest, recreate, recordBenchmark, isBenchmarkTurn, MAX_TURNS, BENCHMARK_TURNS } from "./career.js";
import { STYLE_LABEL, getSkill, rollSkillReward } from "./skills.js";
import { pickEvent, applyChoice } from "./events.js";
import { kstDateStr } from "./time.js";
import { validateBotInput, isMatchId, cleanStatBonus, cleanMirrorAxes } from "./validate.js";

const $ = (sel) => document.querySelector(sel);
const EXAMPLES = [
  "겁이 많지만 돈이 걸리면 목숨을 건다", "칭찬받으면 강해진다",
  "싸움 전에 꼭 낮잠을 잔다", "이기는 것보다 멋있는 게 중요하다",
  "화나면 아무것도 안 보인다", "끝까지 포기 안 하는 잡초",
];
const STAT_LABEL = { power: "근력", tech: "기술", speed: "반응", mind: "멘탈" };
const STAGE_ICON = ["🥚", "🐣", "✨"];
const CARE_META = {
  fullness: { label: "포만", color: "#FFC93C" },
  energy: { label: "기운", color: "#4DE3FF" },
  affection: { label: "애정", color: "#FF6B57" },
};
let cachedSignals = null; // 배터리 포함 신호 캐시 (async)
const BUBBLES = {
  brave: ["오늘 상대 누구냐. 빨리.", "몸이 근질거린다.", "훈련? 실전이 훈련이다."],
  caution: ["오늘 승률을 계산해 봤다. 나쁘지 않다.", "서두르지 마라. 나는 준비 중이다.", "관측 완료. 출전 가능."],
  cunning: ["오늘은 어떤 함정을 팔까.", "심판 매수는 농담이다. 아마도.", "상대 데이터, 이미 훔쳐봤다."],
  grit: ["오늘도 버틴다.", "어제보다 1만큼 강해졌다.", "훈련 수확 잊지 마라. 내 노력이다."],
};

let state = null;      // { bot:{name,persona}, progress, net:{deviceId,ownerSecret} }
let currentBattle = null;
let pendingTrain = 0;
let homeLoop = null;
let wasSkipped = false;
let replaying = false;
let lastMatchId = null; // 방금 경기의 서버 매치 ID (공유 링크용)
let shareFailed = false; // 매치 업로드 실패 → 공유 버튼에 표시
let battleBusy = false; // 출전 버튼 연타로 출전권이 두 장 빠지거나 경기가 겹치던 문제 방지
let prevSeen = 0;       // 이번 세션 직전 방문 시각 (복귀 갭 계산 기준 — 방문하면 lastSeen 이 즉시 갱신되므로 따로 보관)
let careTimer = null;   // 돌봄 쿨다운 표시 갱신 타이머

// 미러 상태 말풍선 (§8.4 — 봇이 주인의 습관을 언급한다)
const MIRROR_BUBBLES = {
  "calm-1": "주인이 맨날 스킵하니까 나도 성격이 급해지고 있다.",
  "calm1": "주인 따라 차분해지는 중이다. 나쁘지 않다.",
  "brave1": "주인이 겁없이 내보내더라. 나도 닮아간다.",
  "grit1": "주인이 매일 오니까 나도 끈질겨졌다.",
  "grit-1": "주인이 효율파라서 나도 계산적으로 변하는 중이다.",
  "brave-1": "요즘 좀 신중해졌다. 주인 영향이다.",
};
const MIRROR_NOTE = {
  "calm-1": "성향 변화: 다혈질 ↑ (주인의 스킵 습관)",
  "calm1": "성향 변화: 침착 ↑ (경기를 끝까지 보는 주인)",
  "brave1": "성향 변화: 저돌 ↑ (겁없는 출전)",
  "grit1": "성향 변화: 근성 ↑ (꾸준한 출석)",
  "grit-1": "성향 변화: 효율 ↑ (몰아서 수확하는 주인)",
  "brave-1": "성향 변화: 신중 ↑",
};

// 출전권 리셋·출석·기록 날짜는 한국 시간 기준 (기기 시간대가 달라도 하루 경계가 같도록)
const todayStr = () => kstDateStr();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadStateAfterCreate(name, persona) {
  return {
    bot: { name, persona },
    progress: { ...defaultProgress(), lastSeen: Date.now(), trainSince: Date.now(), ticketDate: todayStr() },
    net: { deviceId: randomUUID(), ownerSecret: randomUUID() },
  };
}

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  const withTabs = $(id).classList.contains("with-tabs");
  $("#tabbar").hidden = !withTabs;
  if (id !== "#screen-home" && careTimer) { clearInterval(careTimer); careTimer = null; }
}

function switchTab(tab) {
  document.querySelectorAll("#tabbar .tab").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (tab === "home") enterHome();
  if (tab === "league") { renderLeague(); show("#screen-league"); }
  if (tab === "history") { renderHistory(); show("#screen-history"); }
}
document.querySelectorAll("#tabbar .tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

/* ---------- 홈 (§19.4-①) ---------- */

// 캐시 신호(또는 시간대 폴백)로 기분 계산
function moodNow() {
  const now = Date.now();
  const gap = prevSeen ? Math.max(0, (now - prevSeen) / 3600000) : 0;
  const s = cachedSignals ?? { hour: new Date(now).getHours(), batteryLevel: null, charging: null };
  return signalMood({ hour: s.hour, returnGapHours: gap, batteryLevel: s.batteryLevel, charging: s.charging });
}

function enterHome() {
  const p = state.progress;
  const now = Date.now();
  refreshTickets(p, todayStr());
  touchStreak(p.mirror, todayStr());
  decayPet(p.pet, now - (p.pet.lastDecay || now)); // 자연 감소 (§8.5)
  p.pet.lastDecay = now;
  if (!p.trainSince || p.trainSince > now) p.trainSince = now; // 시계 역행 보정
  pendingTrain = accrueTraining(p.trainSince, now);
  p.lastSeen = now; // 방문 기록 (복귀 갭은 세션 시작 시 prevSeen 으로 보관)
  saveState(state);

  // 배터리 포함 신호 비동기 갱신 → 완료되면 기분/컨디션 다시 그림
  readSignals(prevSeen, now).then((s) => { cachedSignals = s; if ($("#screen-home").classList.contains("active")) paintMood(); });

  const bot = buildMyBot(state);
  p.stage = Math.max(p.stage ?? 0, stageForWins(p.record.w));
  $("#home-tier").textContent = `${TIERS[p.tier]} · ${p.points}점`;
  $("#home-record").textContent = `${p.record.w}승 ${p.record.l}패`;

  paintMood();
  paintCare();
  if (careTimer) clearInterval(careTimer);
  careTimer = setInterval(paintCare, 30000); // 쿨다운이 끝나면 버튼이 다시 켜지도록 주기 갱신

  // 성향 변화 1줄 (더보기 안)
  const dm = dominantMirror(p.mirror.axes);
  const mnote = $("#mirror-note");
  mnote.hidden = !dm;
  if (dm) mnote.textContent = MIRROR_NOTE[dm.axis + dm.dir] ?? "";

  const harvest = $("#btn-harvest");
  harvest.hidden = pendingTrain <= 0;
  harvest.textContent = `🏋️ 훈련 수확 +${pendingTrain} (${STAT_LABEL[p.trainingStat]})`;

  const row = $("#train-row");
  row.innerHTML = "";
  for (const k of Object.keys(STAT_LABEL)) {
    const chip = document.createElement("button");
    chip.className = "train-chip" + (p.trainingStat === k ? " active" : "");
    chip.setAttribute("aria-pressed", String(p.trainingStat === k));
    chip.textContent = `${STAT_LABEL[k]} 훈련`;
    chip.onclick = () => { p.trainingStat = k; saveState(state); enterHome(); };
    row.appendChild(chip);
  }

  const statsEl = $("#home-stats");
  statsEl.innerHTML = "";
  for (const k of Object.keys(STAT_LABEL)) {
    const rowEl = document.createElement("div");
    rowEl.className = "stat-row";
    rowEl.innerHTML = `<span>${STAT_LABEL[k]}</span><div class="stat-bar"><i style="width:${(bot.stats[k] / STAT_CAP) * 100}%"></i></div><span>${bot.stats[k]}</span>`;
    statsEl.appendChild(rowEl);
  }

  const fight = $("#btn-fight");
  fight.textContent = p.tickets > 0 ? `▶ 리그 출전 (${p.tickets}/5)` : "출전권 소진 — 내일 다시!";
  fight.disabled = p.tickets <= 0 || battleBusy;

  // 스타일 뱃지 + 배포된 스킬 (§7)
  const style = STYLE_LABEL[dominantStyle(bot.axes)];
  $("#home-stage").textContent = `${STAGE_ICON[p.stage]} v${p.stage} · ${style.tag}${style.name}`;
  renderSkillChips($("#home-skills"), p.skills);
  $("#home-canvas").setAttribute("aria-label", `내 봇 ${state.bot.name} — ${style.name}, ${STAGE_NAMES[p.stage]} 단계`);

  if (homeLoop) cancelAnimationFrame(homeLoop);
  const ctx = $("#home-canvas").getContext("2d");
  (function loop(t) {
    ctx.clearRect(0, 0, 360, 300);
    drawBot(ctx, bot, { x: 180, y: 165, size: 200, state: "idle", t, stage: p.stage });
    if ($("#screen-home").classList.contains("active")) homeLoop = requestAnimationFrame(loop);
  })(performance.now());

  show("#screen-home");
}

// 기분 말풍선 + 오늘 컨디션 요약 (폰 신호가 여기서 드러남 — §8.5/§21)
function paintMood() {
  const p = state.progress;
  const mood = moodNow();
  const c = condition(p.pet, mood);
  $("#home-bubble").textContent = mood.label;
  const netMod = c.atk + c.initiative;
  const face = netMod > 5 ? "💪 최상" : netMod < -5 ? "🥴 저조" : "😐 보통";
  $("#condition-line").textContent = `오늘 컨디션: ${face}` + (c.reasons.length ? ` · ${c.reasons[0].replace(/^[^ ]+ /, "")}` : "");
}

// 돌봄 스탯 바 + 돌보기 버튼 상태
function paintCare() {
  const p = state.progress;
  const el = $("#care-stats");
  el.innerHTML = "";
  for (const k of ["fullness", "energy", "affection"]) {
    const v = Math.round(p.pet[k]);
    const meta = CARE_META[k];
    const rowEl = document.createElement("div");
    rowEl.className = "care-stat";
    rowEl.innerHTML = `<span aria-hidden="true">${meta.label[0]}</span><div class="cbar" role="meter" aria-label="${meta.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><i style="width:${v}%;background:${meta.color}"></i></div><span>${v}</span>`;
    el.appendChild(rowEl);
  }
  const now = Date.now();
  document.querySelectorAll(".care-btn").forEach((btn) => {
    const act = btn.dataset.care;
    const ok = canAct(p.pet, act, now);
    btn.disabled = !ok;
    const cd = btn.querySelector(".cd") || (() => { const s = document.createElement("span"); s.className = "cd"; btn.appendChild(s); return s; })();
    if (ok) cd.textContent = "";
    else {
      const mins = Math.max(1, Math.ceil((CARE[act].cooldownMs - (now - p.pet.last[act])) / 60000));
      // 61분이 "2시간"으로 보이던 반올림 오류 수정 → "1시간 1분"
      cd.textContent = mins >= 60 ? `${Math.floor(mins / 60)}시간${mins % 60 ? ` ${mins % 60}분` : ""}` : `${mins}분`;
    }
  });
}

document.querySelectorAll(".care-btn").forEach((btn) => btn.addEventListener("click", () => {
  const p = state.progress; const act = btn.dataset.care; const now = Date.now();
  if (!canAct(p.pet, act, now)) return;
  ({ feed, play, rest: petRest })[act](p.pet, now);
  saveState(state); // (이전엔 lastSeen 을 갱신해 쌓여 있던 방치 훈련 점수가 사라졌음)
  paintCare(); paintMood();
}));

$("#btn-harvest").addEventListener("click", () => {
  const p = state.progress;
  if (pendingTrain <= 0) return;
  const now = Date.now();
  p.statBonus[p.trainingStat] = Math.min(STAT_CAP, p.statBonus[p.trainingStat] + pendingTrain);
  // 수확 습관 → 미러 (§8.4): 캡 꽉 채움 = 효율파, 부지런한 수확 = 근성
  applyBehavior(p.mirror, pendingTrain >= TRAIN_CAP ? "harvestFull" : "harvestDiligent", todayStr());
  p.trainSince = nextTrainSince(p.trainSince, now); // 30분 미만 자투리 진행분은 보존
  pendingTrain = 0;
  saveState(state);
  upsertMyBot(state); // 성장 반영 동기화
  enterHome();
});

/* ---------- 생성 (§5) ---------- */

$("#btn-dice").addEventListener("click", () => {
  $("#in-persona").value = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  $("#create-err").hidden = true;
});
$("#btn-create").addEventListener("click", () => {
  const v = validateBotInput($("#in-name").value, $("#in-persona").value);
  const err = $("#create-err");
  err.textContent = v.error;
  err.hidden = v.ok;
  if (!v.ok) { (v.name ? $("#in-persona") : $("#in-name")).focus(); return; }
  const { name, persona } = v;
  $("#in-name").value = name; $("#in-persona").value = persona;
  state = loadStateAfterCreate(name, persona);
  prevSeen = 0;
  if (!saveState(state)) { err.hidden = false; err.textContent = "브라우저 저장소를 쓸 수 없어 이번 접속에서만 진행돼 (사생활 보호 모드?)"; }
  upsertMyBot(state); // 리그 명단 등록 (실패 무해 — 다음 접속 때 재시도)
  const myBot = buildMyBot(state);
  const ctx = $("#birth-canvas").getContext("2d");
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, 360, 360);
    drawBot(ctx, myBot, { x: 180, y: 190, size: 220, state: "idle", t: t - t0 });
    if ($("#birth").offsetParent !== null) requestAnimationFrame(loop);
  })(t0);
  const styleName = { brave: "저돌형", caution: "신중형", cunning: "교활형", grit: "근성형" }[myBot.parts.style];
  $("#birth-canvas").setAttribute("aria-label", `새로 태어난 봇 ${myBot.name}`);
  $("#birth-desc").textContent =
    `${styleName} · 필살기 「${myBot.moveName}」` + (myBot.trigger ? ` · 특성 「${myBot.trigger.label}」` : "");
  $("#birth").hidden = false;
  $("#btn-debut").scrollIntoView({ behavior: "smooth" });
});

// 엔터로 다음 칸/생성 (모바일 키보드 '완료' 포함)
$("#in-name").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("#in-persona").focus(); } });
$("#in-persona").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("#btn-create").click(); } });

// 데뷔 = AI 부트캠프 시즌 시작 (§22)
$("#btn-debut").addEventListener("click", () => startSeason());

/* ---------- AI 부트캠프 커리어 (§22) ---------- */

function fightStyleOf(bot) { return dominantStyle(bot.axes); }

// 프리뷰 봇 = 베이스 + 훈련보너스 + 진행 중 커리어 획득분 + 스킬
function careerBot() {
  const bot = buildMyBot(state);
  const c = state.progress.career;
  if (c) {
    for (const k of Object.keys(bot.stats)) bot.stats[k] = Math.min(STAT_CAP, bot.stats[k] + (c.statGain[k] ?? 0));
    bot.skills = [...(state.progress.skills ?? []), ...c.acquiredSkills];
  }
  return bot;
}

function startSeason() {
  const p = state.progress;
  if (p.career && !p.career.done) return enterBootcamp(); // 이미 진행 중
  p.career = startCareer();
  p.careerSeen = [];
  saveState(state);
  $("#birth").hidden = true;
  enterBootcamp();
}

let bcLoop = null;
function enterBootcamp() {
  const p = state.progress, c = p.career;
  if (!c) return switchTab("home");
  if (c.done) return enterDeploy();
  const bot = careerBot();
  const style = STYLE_LABEL[fightStyleOf(bot)];
  $("#bc-version").textContent = `v${p.stage} ${STAGE_NAMES[p.stage]}`;
  $("#bc-style").textContent = `${style.tag} ${style.name}`;
  $("#bc-heat").style.width = `${c.heat}%`;
  $("#bc-heat").parentElement.setAttribute("aria-valuenow", String(Math.round(c.heat)));
  $("#bc-motiv").textContent = "●".repeat(c.motivation) + "○".repeat(5 - c.motivation);
  $("#bc-motiv").setAttribute("aria-label", `동기 ${c.motivation}/5`);
  $("#bc-track").setAttribute("aria-label", `${MAX_TURNS}턴 중 ${Math.min(c.turn, MAX_TURNS)}턴째`);

  // 진행 트랙
  const track = $("#bc-track"); track.innerHTML = "";
  for (let t = 1; t <= MAX_TURNS; t++) {
    const n = document.createElement("div");
    n.className = "node" + (t < c.turn ? " done" : "") + (t === c.turn ? " now" : "") + (BENCHMARK_TURNS.includes(t) ? " bench" : "");
    track.appendChild(n);
  }

  // 스탯 바 (베이스+획득)
  const statsEl = $("#bc-stats"); statsEl.innerHTML = "";
  for (const k of Object.keys(STAT_LABEL)) {
    const row = document.createElement("div"); row.className = "stat-row";
    row.innerHTML = `<span>${STAT_LABEL[k]}</span><div class="stat-bar"><i style="width:${(bot.stats[k] / STAT_CAP) * 100}%"></i></div><span>${bot.stats[k]}</span>`;
    statsEl.appendChild(row);
  }
  renderSkillChips($("#bc-skills"), bot.skills);

  // 액션 영역
  const act = $("#bc-actions"); act.innerHTML = "";
  if (isBenchmarkTurn(c)) {
    const idx = BENCHMARK_TURNS.indexOf(c.turn) + 1;
    const b = mkBtn(`⚔ 평가전 ${idx}/${BENCHMARK_TURNS.length} 도전`, "btn btn-primary full", doBenchmark);
    act.appendChild(b);
  } else {
    for (const k of Object.keys(STAT_LABEL)) act.appendChild(mkBtn(`${STAT_LABEL[k]} 훈련`, "btn train", () => doTrain(k)));
    act.appendChild(mkBtn("🧊 쿨다운", "btn", doCoolDown));
    act.appendChild(mkBtn("🎈 기분전환", "btn", doRecreate));
  }

  if (bcLoop) cancelAnimationFrame(bcLoop);
  const ctx = $("#bc-canvas").getContext("2d");
  (function loop(t) {
    ctx.clearRect(0, 0, 300, 200);
    drawBot(ctx, bot, { x: 150, y: 110, size: 150, state: "idle", t, stage: p.stage });
    if ($("#screen-bootcamp").classList.contains("active")) bcLoop = requestAnimationFrame(loop);
  })(performance.now());
  show("#screen-bootcamp");
}

function mkBtn(label, cls, onClick) {
  const b = document.createElement("button"); b.className = cls; b.textContent = label; b.onclick = onClick; return b;
}
function renderSkillChips(el, ids) {
  el.innerHTML = "";
  if (!ids || !ids.length) { el.innerHTML = '<span class="skill-chip empty">스킬 없음</span>'; return; }
  for (const id of ids) { const s = getSkill(id); if (!s) continue; const c = document.createElement("span"); c.className = "skill-chip"; c.textContent = s.name; el.appendChild(c); }
}

function doTrain(stat) {
  const r = train(state.progress.career, stat);
  saveState(state);
  $("#bc-msg").textContent = r.failed ? `⚠ 오버피팅! ${STAT_LABEL[stat]} 학습 실패…` : `${STAT_LABEL[stat]} +${r.gain} 학습`;
  afterTurn();
}
function doCoolDown() { careerRest(state.progress.career); saveState(state); $("#bc-msg").textContent = "🧊 쿨다운 — 발열 내려감"; afterTurn(); }
function doRecreate() { recreate(state.progress.career); saveState(state); $("#bc-msg").textContent = "🎈 기분전환 — 동기 올라감"; afterTurn(); }

function afterTurn() {
  const c = state.progress.career;
  if (c.done) return enterDeploy();
  if (!isBenchmarkTurn(c) && Math.random() < 0.33) return showEvent();
  enterBootcamp();
}

function showEvent() {
  const p = state.progress;
  const ev = pickEvent(mulberry32(hashString("ev" + Date.now())), p.careerSeen ?? []);
  (p.careerSeen ??= []).push(ev.id);
  $("#ev-text").textContent = ev.text;
  const box = $("#ev-choices"); box.innerHTML = "";
  for (const ch of ev.choices) {
    box.appendChild(mkBtn(ch.label, "btn", () => {
      const res = applyChoice(p.career, ch);
      let msg = res.msg;
      if (res.skillReward) {
        const sk = rollSkillReward(fightStyleOf(careerBot()), p.career.acquiredSkills, mulberry32(hashString("sk" + Date.now())));
        if (sk) { p.career.acquiredSkills.push(sk.id); msg += ` 「${sk.name}」 습득!`; }
      }
      saveState(state);
      $("#bc-msg").textContent = msg;
      enterBootcamp();
    }));
  }
  show("#screen-event");
}

function doBenchmark() {
  const c = state.progress.career;
  const me = careerBot();
  const oppTier = Math.min(4, Math.floor((c.turn / MAX_TURNS) * 4) + 1);
  const opp = pickOpponent(oppTier, mulberry32(hashString(`bench|${me.name}|${c.turn}`)));
  const cond = { atk: (c.motivation - 3) * 2, def: 0, initiative: (c.motivation - 3) * 2, reasons: [`동기 ${c.motivation}/5`] };
  const seed = hashString(`${me.name}|bench|${c.turn}|${Date.now()}`);
  const result = simulate([me, opp], seed, [cond, null]);
  const idx = BENCHMARK_TURNS.indexOf(c.turn) + 1;
  const intro = { moodLabel: `평가전 ${idx}/${BENCHMARK_TURNS.length} — 상대 ${opp.name}`, reasons: cond.reasons };
  replaying = false; wasSkipped = false;
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [me, opp], result, (res) => {
    if (state.progress.career !== c) return; // 이미 처리된 경기
    const won = res.winnerIndex === 0;
    recordBenchmark(c, won);
    saveState(state);
    $("#bc-msg").textContent = won ? "✅ 평가전 통과!" : "❌ 평가전 아쉽게 실패…";
    if (c.done) enterDeploy(); else enterBootcamp();
  }, { intro, stage: state.progress.stage, onCaption });
}

// 전투 자막 → 스크린리더 라이브 영역 (캔버스는 보조기기에 읽히지 않음)
function onCaption(text) { const el = $("#battle-live"); if (el) el.textContent = text; }

function enterDeploy() {
  const p = state.progress, c = p.career;
  const grade = c.grade, gains = { ...c.statGain }, gotSkills = [...c.acquiredSkills];
  bankCareer(p, c); // p.career = null
  if (grade && "SAB".includes(grade)) p.stage = Math.min(2, p.stage + 1); // 좋은 등급 → 버전업
  saveState(state); upsertMyBot(state);
  const bot = buildMyBot(state);
  const total = Object.values(gains).reduce((a, b) => a + b, 0);
  $("#deploy-grade").textContent = `등급 ${grade}`;
  $("#deploy-summary").textContent = `스탯 +${total} · 스킬 ${gotSkills.length}개 · v${p.stage} ${STAGE_NAMES[p.stage]}`;
  renderSkillChips($("#deploy-skills"), p.skills);
  const ctx = $("#deploy-canvas").getContext("2d");
  const t0 = performance.now();
  (function loop(t) {
    ctx.clearRect(0, 0, 300, 220);
    drawBot(ctx, bot, { x: 150, y: 120, size: 150, state: "win", t: t - t0, stage: p.stage });
    if ($("#screen-deploy").classList.contains("active")) requestAnimationFrame(loop);
  })(t0);
  show("#screen-deploy");
}
$("#btn-to-league").addEventListener("click", () => switchTab("home"));
$("#btn-season").addEventListener("click", () => startSeason());

/* ---------- 전투 ---------- */

async function startBattle({ free = false, opponent = null } = {}) {
  if (battleBusy) return;
  battleBusy = true;
  try { await runLeagueBattle({ free, opponent }); }
  finally { battleBusy = false; }
}

async function runLeagueBattle({ free, opponent }) {
  const p = state.progress;
  $("#btn-fight").disabled = true;
  $("#btn-again").disabled = true;
  if (!free) {
    refreshTickets(p, todayStr());
    if (p.tickets <= 0) return;
    p.tickets -= 1;
    if (p.tickets === 0) applyBehavior(p.mirror, "allTicketsSpent", todayStr()); // 겁없는 소진 → 저돌 (§8.4)
  }
  wasSkipped = false;
  replaying = false;
  // 상대: 온라인 우선 → 실패 시 로컬 NPC 폴백 (§9.1, 콜드스타트 §16)
  let opp, oppSnap;
  if (opponent) {
    opp = opponent;
    oppSnap = { name: opp.name, persona: opp.personaText, statBonus: {}, mirrorAxes: {} };
  } else {
    const row = await fetchOpponent(p.tier, state.net.deviceId);
    if (row?.name && typeof row.name === "string") {
      opp = fromSnapshot(row); // 다른 유저 데이터 → fromSnapshot 이 값 정리
      oppSnap = { name: opp.name, persona: opp.personaText, statBonus: cleanStatBonus(row.stat_bonus), mirrorAxes: cleanMirrorAxes(row.mirror_axes), skills: [...opp.skills] };
    } else {
      const boost = p.tier * 4;
      opp = pickOpponent(p.tier, mulberry32(hashString(`opp|${Date.now()}`)));
      oppSnap = { name: opp.name, persona: opp.personaText, statBonus: { power: boost, tech: boost, speed: boost, mind: boost }, mirrorAxes: {} };
    }
  }
  const me = buildMyBot(state);
  const statBonusBefore = { ...p.statBonus }, mirrorBefore = { ...p.mirror.axes }; // 경기 당시 값 (스킵 습관이 반영되기 전)
  // 오늘 컨디션(돌봄+기분) → 전투 반영 (§8.5). 이것이 "준비의 공개".
  const mood = moodNow();
  const cond = condition(p.pet, mood);
  const seed = hashString(`${me.name}|${opp.name}|${Date.now()}`);
  const result = simulate([me, opp], seed, [cond, null]);
  saveState(state);
  show("#screen-battle");
  const intro = { moodLabel: mood.label, reasons: cond.reasons };
  currentBattle = playBattle($("#battle-canvas"), [me, opp], result,
    (res) => finishLeagueMatch(opp, oppSnap, seed, res, cond, me, statBonusBefore, mirrorBefore), { intro, stage: p.stage, onCaption });
}
$("#btn-skip").addEventListener("click", () => {
  if (!currentBattle || currentBattle.finished) return; // 연타 시 습관·전적 중복 반영 방지
  if (!replaying) { // 리플레이 스킵은 습관으로 안 친다
    wasSkipped = true;
    applyBehavior(state.progress.mirror, "skip", todayStr());
    saveState(state);
  }
  currentBattle?.skip();
});
$("#btn-fight").addEventListener("click", () => startBattle());

function finishLeagueMatch(opp, oppSnap, seed, result, cond, me, statBonusBefore, mirrorBefore) {
  const p = state.progress;
  const won = result.winnerIndex === 0;
  const prevWins = p.record.w;
  p.record[won ? "w" : "l"]++;
  const summary = applyResult(p, won);
  if (!wasSkipped) applyBehavior(p.mirror, "watch", todayStr()); // 끝까지 관전 → 침착 (§8.4)
  // 진화 판정 (§8.5) — 커리어 배포로 이미 더 높은 단계면 강등하지 않는다
  let evolvedTo = checkEvolve(prevWins, p.record.w);
  if (evolvedTo != null && evolvedTo <= (p.stage ?? 0)) evolvedTo = null;
  if (evolvedTo != null) p.stage = evolvedTo;
  const condSnap = cond ? { atk: cond.atk, def: cond.def, initiative: cond.initiative } : null;
  pushHistory(p, {
    seed, won, date: todayStr(),
    // 리플레이가 실제 경기와 같으려면 전투에 쓰인 스탯·성향·스킬·컨디션을 경기 전 값으로 남겨야 한다
    me: { name: me.name, persona: me.personaText, statBonus: { ...statBonusBefore }, mirrorAxes: { ...mirrorBefore }, skills: [...(me.skills ?? [])], cond: condSnap },
    opp: { ...oppSnap, boost: opp.stats.power - createBot(opp.name, opp.personaText).stats.power },
  });
  saveState(state);
  lastMatchId = null;
  shareFailed = false;
  const snapA = { name: me.name, persona: me.personaText, statBonus: { ...statBonusBefore }, mirrorAxes: { ...mirrorBefore }, skills: [...(me.skills ?? [])], cond: condSnap };
  insertMatch(seed, snapA, oppSnap, result.winnerIndex).then((id) => {
    if (isMatchId(id)) lastMatchId = id;
    else shareFailed = true; // 오프라인/서버 오류 — "업로드 중…"에 영원히 멈춰 있던 문제
    updateShareBtn();
  });
  upsertMyBot(state);
  // 진화했으면 연출 먼저, 아니면 바로 인터뷰
  if (evolvedTo != null) playEvolve(buildMyBot(state), evolvedTo, () => showInterview(opp, result, summary, `m${seed}`));
  else showInterview(opp, result, summary, `m${seed}`);
}

// 진화 연출 — 성장의 공유 순간 (§8.5)
function playEvolve(bot, newStage, onDone) {
  const canvas = $("#battle-canvas");
  const ctx = canvas.getContext("2d");
  const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = W / devicePixelRatio, h = H / devicePixelRatio;
  show("#screen-battle");
  const t0 = performance.now();
  (function loop(t) {
    const e = Math.min(1, (t - t0) / 2600);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#171522"; ctx.fillRect(0, 0, w, h);
    // 빛 폭발
    const flash = e < 0.5 ? e * 2 : 1;
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * (0.3 + flash * 0.6));
    g.addColorStop(0, `rgba(255,232,181,${0.5 * (1 - Math.abs(e - 0.5) * 2) + 0.2})`);
    g.addColorStop(1, "rgba(255,232,181,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const shownStage = e < 0.5 ? newStage - 1 : newStage; // 중간에 바뀜
    drawBot(ctx, bot, { x: w / 2, y: h * 0.45, size: w * 0.32, state: "win", t, stage: Math.max(0, shownStage) });
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(w * 0.09)}px Pretendard, sans-serif`;
    if (e > 0.55) ctx.fillText("진화!", w / 2, h * 0.72);
    ctx.font = `bold ${Math.round(w * 0.055)}px Pretendard, sans-serif`;
    if (e > 0.62) ctx.fillText(`${bot.name} → ${STAGE_NAMES[newStage]}`, w / 2, h * 0.78);
    if (e < 1) requestAnimationFrame(loop);
    else setTimeout(onDone, 700);
  })(t0);
}

function shareUrl() {
  return `${location.origin}${location.pathname}?watch=${lastMatchId}`;
}
function updateShareBtn() {
  const btn = $("#btn-share");
  btn.disabled = !lastMatchId;
  btn.textContent = lastMatchId ? "🔗 공유" : shareFailed ? "공유 불가" : "준비 중…";
  btn.title = shareFailed ? "서버에 연결할 수 없어 공유 링크를 만들지 못했어" : "";
}
$("#btn-share").addEventListener("click", async () => {
  if (!lastMatchId) return;
  const url = shareUrl();
  const text = `${state.bot.name}의 경기를 관전해봐! 성격 한 줄이 진짜로 싸운다`;
  if (navigator.share) {
    try { await navigator.share({ title: "AI 파이트 리그", text, url }); return; }
    catch (e) { if (e?.name === "AbortError") return; /* 사용자가 취소 → 아무것도 안 함, 그 외 오류는 폴백 */ }
  }
  try { await navigator.clipboard.writeText(url); alert("관전 링크가 복사됐어! 붙여넣어서 공유해봐."); }
  catch { prompt("이 링크를 복사해서 공유해봐:", url); }
});

/* ---------- 인터뷰 ---------- */

async function showInterview(opp, result, summary, matchKey) {
  const won = result.winnerIndex === 0;
  const me = buildMyBot(state);
  const line = pickInterview(me, { won, comeback: result.comeback }, matchKey);
  updateShareBtn();
  try { await document.fonts.load('68px "Nanum Pen Script"'); } catch { /* 오프라인 폴백 */ }
  const card = renderCard(me, { won, line, opponentName: opp.name });
  const view = $("#card-canvas");
  view.setAttribute("aria-label", `${won ? "승자" : "패자"} 인터뷰 카드: ${me.name} vs ${opp.name} — "${line}"`);
  view.width = card.width; view.height = card.height;
  view.getContext("2d").drawImage(card, 0, 0);
  $("#btn-save").onclick = () => saveCard(card, `${me.name}-interview.png`);
  const note = $("#promo-note");
  if (summary?.promoted) { note.hidden = false; note.textContent = `🎉 ${TIERS[state.progress.tier]} 승급!`; }
  else if (summary?.demoted) { note.hidden = false; note.textContent = `…${TIERS[state.progress.tier]}(으)로 강등`; }
  else note.hidden = true;
  $("#btn-again").disabled = false;
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
  renderGlobalRanking();
}

// 글로벌 랭킹 (§9.2 — 온라인) — 실패 시 안내만
async function renderGlobalRanking() {
  const list = $("#global-rank");
  list.innerHTML = '<li class="muted">불러오는 중…</li>';
  list.setAttribute("aria-busy", "true");
  const data = await fetchRanking(50, state.net.deviceId);
  list.setAttribute("aria-busy", "false");
  if (!Array.isArray(data?.top)) { list.innerHTML = '<li class="muted">지금은 랭킹을 불러올 수 없어 (오프라인)</li>'; return; }
  list.innerHTML = "";
  if (!data.top.length) list.innerHTML = '<li class="muted">아직 랭킹에 오른 봇이 없어. 첫 번째가 되어보자!</li>';
  data.top.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "rank-item" + (r.me ? " me" : "");
    li.innerHTML = `<span class="rk">${i + 1}</span><span class="nm">${r.me ? "🤖 " : ""}${esc(r.name)}${r.is_npc ? " <small>(NPC)</small>" : ""}</span>` +
      `<span>${TIERS[r.tier]?.replace(" 리그", "") ?? ""}</span><span class="pt">${Number(r.points) || 0}점</span>`;
    list.appendChild(li);
  });
  if (data.my_rank && !data.top.some((r) => r.me)) {
    const li = document.createElement("li");
    li.className = "rank-item me";
    li.innerHTML = `<span class="rk">${Number(data.my_rank) || "-"}</span><span class="nm">🤖 ${esc(state.bot.name)} (나)</span><span class="pt">${state.progress.points}점</span>`;
    list.appendChild(li);
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
    // 상대 이름은 다른 유저가 정한 값 → 반드시 이스케이프 (저장형 XSS 차단)
    li.innerHTML = `<span class="${h.won ? "res-w" : "res-l"}">${h.won ? "승" : "패"}</span>` +
      `<span class="who">vs ${esc(h.opp?.name)}</span><span class="muted">${esc(h.date)}</span>`;
    const btn = document.createElement("button");
    btn.className = "btn-replay";
    btn.textContent = "▶ 다시보기";
    btn.setAttribute("aria-label", `${h.opp?.name ?? "상대"}전 ${h.won ? "승리" : "패배"} 경기 다시보기`);
    btn.onclick = () => playReplay(h);
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function playReplay(h) {
  // 당시 스냅샷 재구성 → 같은 시드 + 당시 컨디션 → 완전히 같은 경기 (§7 결정론)
  replaying = true;
  const me = createBot(h.me.name, h.me.persona);
  for (const k of Object.keys(me.stats)) me.stats[k] = Math.min(STAT_CAP, me.stats[k] + (h.me.statBonus?.[k] ?? 0));
  me.axes = effectiveAxes(me.axes, h.me.mirrorAxes ?? {}); // 당시 미러 성향까지 복원
  me.skills = [...(h.me.skills ?? [])]; // 당시 스킬 (없으면 구버전 기록 — 스킬 없이 재생)
  let opp;
  if (h.opp.statBonus) opp = fromSnapshot(h.opp); // 신버전 기록: 상대 스냅샷 그대로 (온라인 상대의 스탯별 보너스까지 정확)
  else { // 구버전 기록: power 차이를 전 스탯에 적용하던 근사치
    opp = createBot(h.opp.name, h.opp.persona);
    for (const k of Object.keys(opp.stats)) opp.stats[k] += h.opp.boost ?? 0;
  }
  const result = simulate([me, opp], h.seed, [h.me.cond ?? null, null]);
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [me, opp], result, () => { renderHistory(); show("#screen-history"); }, { onCaption, stage: state.progress.stage });
}

/* ---------- 관전 모드 (§11.1 공유→유입 퍼널) ---------- */

async function bootWatch(matchId) {
  history.replaceState(null, "", location.pathname); // 파라미터 제거 (새로고침 시 일반 부팅)
  if (!isMatchId(matchId)) { normalBoot(); return; } // 형식이 틀린 링크는 서버에 보내지 않는다
  const m = await fetchMatch(matchId);
  if (!m?.snap_a || !m?.snap_b || !Number.isFinite(Number(m.seed))) { normalBoot(); return; }
  let a, b, result;
  try {
    a = fromSnapshot(m.snap_a);
    b = fromSnapshot(m.snap_b);
    // 실제 경기와 같은 결과가 나오도록 내 쪽 컨디션까지 재현 (구버전 매치는 cond 없음)
    const c = m.snap_a.cond;
    const condA = c && typeof c === "object" ? { atk: Number(c.atk) || 0, def: Number(c.def) || 0, initiative: Number(c.initiative) || 0 } : null;
    result = simulate([a, b], Number(m.seed), [condA, null]);
  } catch { normalBoot(); return; }
  replaying = true;
  show("#screen-battle");
  currentBattle = playBattle($("#battle-canvas"), [a, b], result, () => {
    // 관전 종료 → CTA: 신규면 생성(60초 퍼널), 기존 유저면 홈
    if (state) { switchTab("home"); }
    else {
      $(".eyebrow").textContent = "방금 경기 봤지? 이번엔 네 차례다 — 60초면 된다";
      show("#screen-create");
    }
  }, { onCaption });
}

/* ---------- 부팅 ---------- */

function normalBoot() {
  if (!state) return show("#screen-create");
  if (state.progress.career) return enterBootcamp(); // 진행 중 시즌 이어서 (끝났는데 배포 전이면 배포 화면으로)
  switchTab("home");
}

state = loadState();
prevSeen = state?.progress.lastSeen ?? 0;
if (state) upsertMyBot(state); // 접속 시 내 봇 서버 동기화 (실패 무해)
const watchId = new URLSearchParams(location.search).get("watch");
if (watchId) bootWatch(watchId);
else normalBoot();
