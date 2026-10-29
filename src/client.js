import { randomUUID } from "node:crypto";
import { missingCredentials } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ContaboClient {
  constructor(cfg) {
    this.cfg = cfg;
    this.token = null;
    this.tokenExp = 0;
  }

  async getToken(force = false) {
    if (!force && this.token && Date.now() < this.tokenExp - 30_000) return this.token;
    const c = this.cfg.credentials;
    const missing = missingCredentials(c);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(", ")}. See docs/CONFIGURATION.md.`);
    }
    const res = await fetch(this.cfg.authUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: c.clientId,
        client_secret: c.clientSecret,
        username: c.apiUser,
        password: c.apiPassword,
      }),
      signal: AbortSignal.timeout(this.cfg.timeoutMs),
    });
    if (!res.ok) throw new Error(`Authentication failed (HTTP ${res.status}). Check your API credentials.`);
    const j = await res.json();
    this.token = j.access_token;
    this.tokenExp = Date.now() + (j.expires_in || 300) * 1000;
    return this.token;
  }

  /** Execute a tool definition from tools.js with user-supplied arguments. */
  async call(tool, args) {
    let path = tool.path;
    const query = new URLSearchParams();
    const extra = {};
    for (const p of tool.params) {
      const v = args[p.name];
      if (v === undefined || v === null) continue;
      if (p.in === "path") path = path.replace(`{${p.name}}`, encodeURIComponent(String(v)));
      else if (p.in === "query") query.set(p.name, Array.isArray(v) ? v.join(",") : String(v));
      else extra[p.name] = String(v);
    }
    const unresolved = path.match(/\{(\w+)\}/);
    if (unresolved) throw new Error(`Missing required path parameter: ${unresolved[1]}`);

    const body = tool.hasBody && args.body !== undefined ? JSON.stringify(args.body) : undefined;
    const qs = query.toString();
    const url = this.cfg.apiBase + path + (qs ? "?" + qs : "");
    // Same request id across retries so Contabo support can correlate them.
    const requestId = randomUUID();

    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      const headers = {
        ...extra,
        authorization: `Bearer ${await this.getToken()}`,
        "x-request-id": requestId,
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
      };
      const res = await fetch(url, {
        method: tool.method.toUpperCase(),
        headers,
        body,
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        await this.getToken(true);
        continue;
      }
      const transient = res.status === 429 || (res.status >= 502 && res.status <= 504);
      // Only retry idempotent reads, or rate limits (request was not processed).
      if (transient && (tool.method === "get" || res.status === 429) && attempt < this.cfg.maxRetries) {
        const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** attempt;
        await sleep(Math.min(wait, 10_000));
        continue;
      }
      let text = await res.text();
      if (text.length > this.cfg.maxResponseChars) {
        const dropped = text.length - this.cfg.maxResponseChars;
        text =
          text.slice(0, this.cfg.maxResponseChars) +
          `\n...[truncated ${dropped} chars; use page/size/filters to narrow the result]`;
      }
      return { ok: res.ok, status: res.status, requestId, text };
    }
  }
}
