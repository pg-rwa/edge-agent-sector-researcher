import { test } from "node:test";
import assert from "node:assert/strict";
import { ResearchMaster, NOT_ADVICE } from "./master.js";

test("refuses a general researcher and guides to a beat", () => {
  const m = new ResearchMaster();
  const r = m.handle("can you be my general researcher?");
  assert.match(r.text, /refuse/i);
  assert.match(r.text, /geography/i);
  assert.ok(m.crew().length === 0);
});

test("geography-only gets a generalist warning with no sector depth", () => {
  const m = new ResearchMaster();
  const r = m.handle("India");
  assert.match(r.text, /general knowledge/i);
  assert.match(r.text, /no specific sector\/domain depth/i);
  // declining the generalist routes back to picking a sector
  const r2 = m.handle("no");
  assert.match(r2.text, /which sector/i);
  assert.ok(m.crew().length === 0);
});

test("accepting a geography generalist spins one up, flagged as generalist", () => {
  const m = new ResearchMaster();
  m.handle("Latin America");
  m.handle("keep it general");
  assert.equal(m.crew().length, 1);
  const j = m.crew()[0];
  assert.equal(j.scope, "geography-generalist");
  assert.equal(j.sector, null);
  assert.match(j.knowledgeNote, /no specific sector\/domain depth/i);
});

test("sector-only asks for a geography first", () => {
  const m = new ResearchMaster();
  const r = m.handle("fintech");
  assert.match(r.text, /which geography/i);
  assert.ok(m.crew().length === 0);
});

test("full intake spins up a crisp sector specialist with a disclaimer", () => {
  const m = new ResearchMaster();
  const r1 = m.handle("fintech in India");
  assert.match(r1.text, /1\/3/);
  m.handle("payments and neobanks");
  m.handle("months");
  const r4 = m.handle("weekly deep-dive");
  assert.match(r4.text, /is live/i);
  assert.ok(r4.text.includes(NOT_ADVICE));
  assert.equal(m.crew().length, 1);
  const j = m.crew()[0];
  assert.equal(j.scope, "sector-specialist");
  assert.equal(j.geography, "India");
  assert.equal(j.sector, "Fintech");
  assert.deepEqual(j.focus, ["payments", "neobanks"]);
  assert.equal(j.horizon, "months");
  assert.equal(j.cadence, "weekly deep-dive");
});

test("unparseable message gets a friendly nudge, not a junior", () => {
  const m = new ResearchMaster();
  const r = m.handle("hello there");
  assert.match(r.text, /couldn't spot/i);
  assert.ok(m.crew().length === 0);
});

test('"Latin America" matches LatAm, not the US via "america"', () => {
  const m = new ResearchMaster();
  m.handle("Latin America");
  m.handle("keep it general");
  assert.equal(m.crew()[0].geography, "Latin America");
});
test("every substantive reply carries the not-advice framing", () => {
  const m = new ResearchMaster();
  assert.ok(m.greeting().text.includes(NOT_ADVICE));
  m.handle("energy in MENA");
  m.handle("solar");
  m.handle("years");
  const done = m.handle("daily brief");
  assert.ok(done.text.includes(NOT_ADVICE));
});
