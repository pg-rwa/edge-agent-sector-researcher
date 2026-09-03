/**
 * Auth gate for the crew chat. Borrows the portal session: asks the Edge
 * platform whether the visitor has a valid `edge_session` cookie (shared
 * across *.edge.polytrade.app). No session → a gate screen with a sign-in
 * link back to the portal; the chat never boots unauthenticated.
 *
 * Demo escape hatch: on localhost only (where no *.edge.polytrade.app
 * cookie can exist), a clearly-labeled "demo session" button lets the UI be
 * explored. On a real edge.polytrade.app deployment that button never
 * renders — the portal session is the only way in.
 */
import { fetchEdgeSession } from "./vendor/agent/session.js";

const PLATFORM_URL = "https://edge.polytrade.app";

const gate = document.getElementById("gate");
const appEl = document.querySelector(".app");
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

function showGate() {
  gate.style.display = "grid";
  appEl.style.visibility = "hidden";
  if (isLocal) document.getElementById("gate-demo").style.display = "inline-block";
}

function unlock(session) {
  gate.style.display = "none";
  appEl.style.visibility = "visible";
  document.getElementById("topbar-user").textContent = session.email;
  window.EDGE_SESSION = session; // the app's seam for session-scoped wiring
  document.dispatchEvent(new CustomEvent("edge:session", { detail: session }));
}

document.getElementById("gate-demo").onclick = () =>
  unlock({ userId: "usr_demo", email: "demo@edge.local" });

const session = await fetchEdgeSession(PLATFORM_URL);
if (session) unlock(session);
else showGate();
