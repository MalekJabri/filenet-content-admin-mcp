import "dotenv/config";
const FILENET_URL = process.env.FILENET_URL;
const FILENET_USERNAME = process.env.FILENET_USERNAME;
const FILENET_PASSWORD = process.env.FILENET_PASSWORD;
// REST base URL for Content Services APIs (e.g. https://your-server/content-services).
// Defaults to deriving from FILENET_URL by stripping the trailing GraphQL path.
const FILENET_BASE_URL = process.env.FILENET_BASE_URL ??
    (FILENET_URL ? FILENET_URL.replace(/\/content-services-graphql.*$/, "/content-services") : undefined);
const TIMEOUT_MS = 60_000;
if (!FILENET_URL || !FILENET_USERNAME || !FILENET_PASSWORD) {
    throw new Error("Missing required environment variables: FILENET_URL, FILENET_USERNAME, FILENET_PASSWORD");
}
export async function executeGraphQL(query, variables) {
    const credentials = Buffer.from(`${FILENET_USERNAME}:${FILENET_PASSWORD}`).toString("base64");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
        response = await fetch(FILENET_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${credentials}`,
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
        });
    }
    finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`);
    }
    const payload = (await response.json());
    if (payload.errors && payload.errors.length > 0) {
        const messages = payload.errors.map((e) => e.message).join("; ");
        throw new Error(`GraphQL error: ${messages}`);
    }
    return payload.data;
}
/**
 * Execute a REST call against the Content Services API.
 *
 * @param method   HTTP method (GET, POST, PUT, DELETE)
 * @param path     Path relative to FILENET_BASE_URL (must start with '/')
 * @param body     Optional JSON body (ignored for GET/DELETE)
 * @param params   Optional URL query parameters
 */
export async function executeREST(method, path, body, params) {
    if (!FILENET_BASE_URL) {
        throw new Error("Cannot determine REST base URL. Set FILENET_BASE_URL or ensure FILENET_URL contains '/content-services-graphql'.");
    }
    const credentials = Buffer.from(`${FILENET_USERNAME}:${FILENET_PASSWORD}`).toString("base64");
    let url = `${FILENET_BASE_URL}${path}`;
    if (params && Object.keys(params).length > 0) {
        url += "?" + new URLSearchParams(params).toString();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
        response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Basic ${credentials}`,
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
    }
    finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
    }
    // 204 No Content (e.g. DELETE) — return empty object
    if (response.status === 204) {
        return {};
    }
    return response.json();
}
