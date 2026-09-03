/**
 * Session seam — this agent borrows auth from the main Edge portal. The
 * portal owns sign-in (magic link → `edge_session` HttpOnly cookie, shared
 * across *.edge.polytrade.app via SESSION_COOKIE_DOMAIN); this agent only
 * ever ASKS "is there a valid session?" and gates on the answer.
 *
 * The cookie is HttpOnly, so client JS never reads it — the check goes
 * through the platform's session endpoint with credentials included:
 *
 *   GET {baseUrl}/api/auth/session
 *   200 → { userId, email }
 *   401 → { error: "unauthorized" }
 *
 * Fail-closed everywhere: network errors, CORS blocks, malformed bodies all
 * resolve to `null` (no session) — never to access. In production the
 * agent's server must ALSO gate server-side (this seam is the UX layer,
 * mirroring the platform spec: "server-side is the real gate; UI is UX").
 */
export async function fetchEdgeSession(baseUrl, fetchImpl = fetch) {
    try {
        const res = await fetchImpl(`${baseUrl}/api/auth/session`, {
            credentials: "include",
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            return null;
        const body = (await res.json().catch(() => null));
        if (body && typeof body.userId === "string" && typeof body.email === "string") {
            return { userId: body.userId, email: body.email };
        }
        return null;
    }
    catch {
        return null;
    }
}
