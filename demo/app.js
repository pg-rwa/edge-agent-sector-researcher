import { ResearchMaster } from "/dist/master.js";
import { JuniorResearcher } from "/dist/junior.js";
import { MOCK_FEEDS } from "/demo/mock-feeds.js";

const master = new ResearchMaster();

/** view -> array of { who: "master"|"user", reply: {text, suggestions?} } */
const conversations = new Map([["master", []]]);
/** junior id -> { persona: JuniorResearcher, face: string, hasNew: boolean } */
const juniors = new Map();
let activeView = "master";
let birthing = false;

const chat = document.getElementById("chat");
const roster = document.getElementById("roster");
const rosterEmpty = document.getElementById("roster-empty");
const crewCount = document.getElementById("crew-count");
const masterCard = document.getElementById("master-card");
const topbarTitle = document.querySelector(".topbar-title");
const form = document.getElementById("composer");
const input = document.getElementById("input");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- markdown-lite ----------------------------------------------------------
function md(text) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

// --- chat rendering ---------------------------------------------------------
function msgEl(who, reply, view) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${who}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "🧑‍💼" : view === "master" ? "🧭" : juniors.get(view)?.face ?? "📡";

  const body = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = md(reply.text);
  body.appendChild(bubble);

  if (who !== "user" && reply.suggestions?.length) {
    const chips = document.createElement("div");
    chips.className = "chips";
    reply.suggestions.forEach((label, i) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = label;
      chip.style.animationDelay = `${i * 60}ms`;
      chip.onclick = () => send(label);
      chips.appendChild(chip);
    });
    body.appendChild(chips);
  }

  wrap.append(avatar, body);
  return wrap;
}

function renderConversation() {
  chat.innerHTML = "";
  for (const m of conversations.get(activeView) ?? []) {
    chat.appendChild(msgEl(m.who, m.reply, activeView));
  }
  chat.scrollTop = chat.scrollHeight;
  topbarTitle.innerHTML = `<span class="dot"></span> ${activeView === "master" ? "research-master" : juniors.get(activeView).persona.spec.displayName.toLowerCase().replaceAll(" ", "-")}`;
  input.placeholder =
    activeView === "master"
      ? 'Try "fintech in India" or "energy in MENA"…'
      : `Message ${juniors.get(activeView).persona.spec.codename}…`;
}

function push(view, who, reply) {
  conversations.get(view).push({ who, reply });
  if (view === activeView) {
    chat.appendChild(msgEl(who, reply, view));
    chat.scrollTop = chat.scrollHeight;
  }
}

function showTyping(view) {
  const wrap = document.createElement("div");
  wrap.className = "msg master typing";
  wrap.id = "typing";
  wrap.innerHTML = `<div class="avatar">${view === "master" ? "🧭" : juniors.get(view)?.face ?? "📡"}</div>` +
    `<div class="bubble"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>`;
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  document.getElementById("typing")?.remove();
}

// --- nav roster -------------------------------------------------------------
function renderRoster(newId) {
  const crew = master.crew();
  crewCount.textContent = String(crew.length);
  crewCount.classList.add("bump");
  setTimeout(() => crewCount.classList.remove("bump"), 350);
  rosterEmpty.style.display = crew.length ? "none" : "block";
  roster.querySelectorAll(".nav-card").forEach((el) => el.remove());

  for (const j of crew) {
    const entry = juniors.get(j.id);
    const card = document.createElement("div");
    card.className =
      "nav-card junior-card" + (j.id === activeView ? " active" : "");
    card.innerHTML =
      `<div class="nav-avatar">${entry.face}</div>` +
      `<div class="nav-info">` +
      `<div class="nav-name">${j.codename} ${entry.hasNew ? '<span class="new-dot" style="display:inline-block"></span>' : ""}</div>` +
      `<div class="nav-sub">${j.displayName}</div>` +
      `<span class="badge ${j.scope === "sector-specialist" ? "specialist" : "generalist"}">` +
      `${j.scope === "sector-specialist" ? "specialist" : "generalist"}</span>` +
      `</div>`;
    card.onclick = () => switchView(j.id);
    roster.appendChild(card);
    if (j.id === newId) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function switchView(view) {
  activeView = view;
  masterCard.classList.toggle("active", view === "master");
  const entry = juniors.get(view);
  if (entry) entry.hasNew = false;
  renderRoster();
  renderConversation();
  input.focus();
}
masterCard.onclick = () => switchView("master");

// --- birth sequence ---------------------------------------------------------
const SPECIALIST_KNOWLEDGE = ["key players", "regulation", "data sources", "live narrative"];
const GENERALIST_KNOWLEDGE = ["market context", "macro backdrop", "headlines"];

async function birthSequence(spec) {
  birthing = true;
  const entry = juniors.get(spec.id);
  const labels = [...spec.focus, ...(spec.sector ? SPECIALIST_KNOWLEDGE : GENERALIST_KNOWLEDGE)];

  const overlay = document.createElement("div");
  overlay.className = "birth-overlay";
  overlay.innerHTML =
    `<div class="birth-stage">` +
    `<div class="birth-ring"></div>` +
    `<div class="birth-blob incubating"><span class="birth-face">🥚</span></div>` +
    `<div class="birth-status">Incubating a new junior…<span class="sub">${spec.displayName}</span></div>` +
    `<div class="birth-progress"><div class="birth-progress-fill"></div></div>` +
    `</div>`;
  document.body.appendChild(overlay);

  const blob = overlay.querySelector(".birth-blob");
  const face = overlay.querySelector(".birth-face");
  const status = overlay.querySelector(".birth-status");
  const ring = overlay.querySelector(".birth-ring");
  const progress = overlay.querySelector(".birth-progress");
  const fill = overlay.querySelector(".birth-progress-fill");

  // 1. born
  await wait(1400);
  blob.classList.remove("incubating");
  blob.classList.add("hatching");
  face.textContent = entry.face;
  face.classList.add("pop");
  status.innerHTML = `🎉 <b>${spec.codename}</b> is born!`;
  await wait(1300);

  // 2. acquiring knowledge — labeled particles fly into the blob
  blob.classList.add("feeding");
  progress.classList.add("on");
  status.innerHTML = `Acquiring knowledge…<span class="sub">${spec.scope === "sector-specialist" ? "going deep on the beat" : "loading broad market context"}</span>`;
  const blobRect = () => blob.getBoundingClientRect();
  for (let i = 0; i < labels.length; i++) {
    const p = document.createElement("div");
    p.className = "knowledge-particle";
    p.textContent = labels[i];
    const fromLeft = i % 2 === 0;
    p.style.left = fromLeft ? "-140px" : "calc(100vw + 20px)";
    p.style.top = `${15 + Math.random() * 70}vh`;
    document.body.appendChild(p);
    const target = blobRect();
    const pr = p.getBoundingClientRect();
    p.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate(${target.left + target.width / 2 - pr.left - pr.width / 2}px, ${target.top + target.height / 2 - pr.top}px) scale(0.2)`,
          opacity: 0.6,
        },
      ],
      { duration: 650, easing: "cubic-bezier(0.3, 0, 0.6, 1)", fill: "forwards" },
    );
    setTimeout(() => p.remove(), 700);
    fill.style.width = `${Math.round(((i + 1) / labels.length) * 100)}%`;
    await wait(420);
  }
  await wait(300);

  // 3. ready
  blob.classList.remove("feeding");
  blob.classList.add("ready");
  ring.classList.add("burst");
  status.innerHTML = `✅ <b>${spec.codename}</b> is ready!`;
  await wait(1300);

  // 4. fly to the nav, then land as a roster card
  const sidebar = document.querySelector(".sidebar");
  const dest = sidebar.getBoundingClientRect();
  const from = blobRect();
  const flight = blob.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate(${dest.left + dest.width / 2 - (from.left + from.width / 2)}px, ${dest.top + 120 - (from.top + from.height / 2)}px) scale(0.18)`,
        opacity: 0.9,
      },
    ],
    { duration: 700, easing: "cubic-bezier(0.5, 0, 0.4, 1)", fill: "forwards" },
  );
  await flight.finished;
  overlay.classList.add("leaving");
  await wait(400);
  overlay.remove();

  entry.hasNew = true;
  renderRoster(spec.id);
  confetti();
  birthing = false;
}

// --- confetti ---------------------------------------------------------------
function confetti() {
  const colors = ["#8f6bff", "#43d98a", "#ffc442", "#ff6b9e", "#4fc3f7"];
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti";
    bit.style.left = `${Math.random() * 100}vw`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    bit.style.animationDelay = `${Math.random() * 0.4}s`;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 3600);
  }
}

// --- conversation loop ------------------------------------------------------
async function send(text) {
  if (birthing) return;
  push(activeView, "user", { text });
  const before = new Set(master.crew().map((j) => j.id));

  showTyping(activeView);
  const [reply] = await Promise.all([
    activeView === "master"
      ? Promise.resolve(master.handle(text))
      : juniors.get(activeView).persona.handle(text),
    wait(650), // minimum visible typing time
  ]);
  hideTyping();
  push(activeView, "master", reply);

  // did the master spin anyone up?
  for (const spec of master.crew()) {
    if (before.has(spec.id)) continue;
    const persona = new JuniorResearcher(spec, undefined, MOCK_FEEDS);
    juniors.set(spec.id, { persona, face: persona.face, hasNew: false });
    conversations.set(spec.id, []);
    conversations.get(spec.id).push({ who: "master", reply: persona.greeting() });
    await birthSequence(spec);
  }
  if (master.crew().length === before.size) renderRoster();
}

form.onsubmit = (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || birthing) return;
  input.value = "";
  send(text);
};

conversations.get("master").push({ who: "master", reply: master.greeting() });
renderConversation();
input.focus();
