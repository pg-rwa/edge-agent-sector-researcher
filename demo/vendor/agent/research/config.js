export function feedConfigFromEnv(env = typeof process !== "undefined" ? process.env : {}, cookie) {
    const baseUrl = env.EDGE_PLATFORM_URL;
    if (!baseUrl)
        return undefined;
    return { baseUrl, cookie: cookie ?? env.EDGE_SESSION_COOKIE };
}
