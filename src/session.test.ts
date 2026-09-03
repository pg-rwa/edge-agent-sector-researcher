import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchEdgeSession } from "./session.js";

test("fetchEdgeSession returns the session on a 200 with a valid body", async () => {
  const f = (async () => ({
    ok: true,
    json: async () => ({ userId: "usr_1", email: "a@b.c" }),
  })) as unknown as typeof fetch;
  assert.deepEqual(await fetchEdgeSession("https://edge.example", f), { userId: "usr_1", email: "a@b.c" });
});

test("fetchEdgeSession fails closed on 401, bad bodies, and network errors", async () => {
  const unauthorized = (async () => ({ ok: false, status: 401, json: async () => ({ error: "unauthorized" }) })) as unknown as typeof fetch;
  assert.equal(await fetchEdgeSession("https://edge.example", unauthorized), null);

  const malformed = (async () => ({ ok: true, json: async () => ({ nope: true }) })) as unknown as typeof fetch;
  assert.equal(await fetchEdgeSession("https://edge.example", malformed), null);

  const down = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
  assert.equal(await fetchEdgeSession("https://edge.example", down), null);
});
