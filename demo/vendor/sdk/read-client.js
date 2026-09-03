/**
 * SDK read client — how a separately-deployed agent's server calls the
 * platform Read/AI Capability API. It forwards the user's session cookie
 * (shared parent-domain SSO) and identifies the calling agent via the
 * `X-Edge-Agent` header, then parses the typed response. A `429`/`502`/`403`
 * is surfaced as a typed `{ ok: false, status, error, resetAt? }` result so
 * the agent can render an honest "limit reached"/"source unavailable" state.
 */
async function post(path, cfg, body) {
    const doFetch = cfg.fetchImpl ?? fetch;
    try {
        const res = await doFetch(`${cfg.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Edge-Agent": cfg.agentId,
                ...(cfg.cookie ? { Cookie: cfg.cookie } : {}),
            },
            body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({})));
        if (res.ok)
            return { ok: true, items: json.items ?? [] };
        return { ok: false, status: res.status, error: json.error ?? "request_failed", resetAt: json.resetAt };
    }
    catch {
        return { ok: false, status: 0, error: "network_error" };
    }
}
export function fetchNews(cfg, q) {
    return post("/api/read/news", cfg, q);
}
export function fetchFilings(cfg, q) {
    return post("/api/read/filings", cfg, q);
}
export function fetchMacro(cfg, q) {
    return post("/api/read/macro", cfg, q);
}
