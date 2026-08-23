import { test } from "node:test";
import assert from "node:assert/strict";
import { ResearchMaster, NOT_ADVICE } from "./master.js";
import { JuniorResearcher } from "./junior.js";

function spinJunior(focus = "payments, NVDA"): JuniorResearcher {
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle(focus);
  m.handle("months");
  m.handle("weekly deep-dive");
  return new JuniorResearcher(m.crew()[0], {
    getXyzPerps: async () => ({
      NVDA: { midPx: 180, markPx: 180.1, oraclePx: 180.05, fundingHourly: 0.00001, maxLeverage: 5 },
    }),
  });
}

test("junior greets on-beat with face and disclaimer", () => {
  const j = spinJunior();
  const g = j.greeting();
  assert.match(g.text, /Falcon/);
  assert.ok(g.text.includes(NOT_ADVICE));
  assert.equal(j.face, "🦊"); // junior-001
});

test("junior answers tracking and status playfully, always disclaimed", async () => {
  const j = spinJunior();
  const t = await j.handle("what are you tracking?");
  assert.match(t.text, /India/);
  assert.match(t.text, /Fintech/);
  assert.ok(t.text.includes(NOT_ADVICE));
  const s = await j.handle("status report");
  assert.ok(s.text.includes(NOT_ADVICE));
});

test("junior fallback rotates and stays on-beat", async () => {
  const j = spinJunior();
  const r1 = await j.handle("blorp");
  const r2 = await j.handle("blorp again");
  assert.notEqual(r1.text, r2.text);
  assert.match(r1.text, /India Fintech/);
});

test("deep dive pulls a live read for verified tickers only", async () => {
  const j = spinJunior("payments, NVDA, SCAMTOKEN");
  const r = await j.handle("deep dive");
  assert.match(r.text, /NVDA/);
  assert.match(r.text, /oracle \$180\.05/);
  assert.match(r.text, /funding/);
  assert.doesNotMatch(r.text, /SCAMTOKEN \(.*\)/); // never quoted as a market
  assert.match(r.text, /Research agenda/);
  assert.match(r.text, /🟢 live now/);
  assert.match(r.text, /needs platform feed/);
  assert.ok(r.text.includes(NOT_ADVICE));
});

test("deep dive without tickers names the verified registry honestly", async () => {
  const j = spinJunior("payments and neobanks");
  const r = await j.handle("deep dive");
  assert.match(r.text, /no verified tickers/i);
  assert.match(r.text, /impersonator/i);
});

test("deep dive reports an unreachable feed instead of faking numbers", async () => {
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle("NVDA");
  m.handle("months");
  m.handle("daily brief");
  const j = new JuniorResearcher(m.crew()[0], {
    getXyzPerps: async () => {
      throw new Error("network down");
    },
  });
  const r = await j.handle("deep dive");
  assert.match(r.text, /unreachable/i);
  assert.match(r.text, /won't fake numbers/i);
});

test("source report states availability of every source", async () => {
  const j = spinJunior();
  const r = await j.handle("what sources do you have?");
  assert.match(r.text, /🟢 live/);
  assert.match(r.text, /needs an API key/);
  assert.match(r.text, /needs a platform feed/);
});
