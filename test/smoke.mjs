// Spawns the server over stdio and checks the tool list for several configurations.
// Usage: node test/smoke.mjs   (no Contabo credentials needed)
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const entry = new URL("../src/index.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function run(env, extraMessages = []) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [entry], { env: { PATH: process.env.PATH, ...env } });
    const msgs = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "1" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      ...extraMessages,
    ];
    let out = "";
    const want = 2 + extraMessages.filter((m) => m.id).length;
    p.stdout.on("data", (d) => {
      out += d;
      if (out.endsWith("\n") && out.trim().split("\n").length >= want) {
        p.kill();
        resolve(out.trim().split("\n").map((l) => JSON.parse(l)));
      }
    });
    p.on("error", reject);
    setTimeout(() => reject(new Error("timeout")), 15000);
    for (const m of msgs) p.stdin.write(JSON.stringify(m) + "\n");
  });
}

const count = async (env) => (await run(env)).find((r) => r.id === 2).result.tools;

const all = await count({});
assert.equal(all.length, 158, "all operations exposed");
assert.equal(new Set(all.map((t) => t.name)).size, all.length, "unique tool names");
assert.ok(all.every((t) => t.name.length <= 64), "names <= 64 chars");

const ro = await count({ CONTABO_READ_ONLY: "1" });
assert.ok(ro.length < all.length && ro.every((t) => t.annotations.readOnlyHint), "read-only filter");

const noAudit = await count({ CONTABO_EXCLUDE_AUDITS: "1" });
assert.ok(noAudit.length < all.length && !noAudit.some((t) => /audit/i.test(t.name)), "audit filter");

const dns = await count({ CONTABO_GROUPS: "dns" });
assert.ok(dns.length > 0 && dns.every((t) => /dns/i.test(t.description)), "group filter");

const compact = await count({ CONTABO_COMPACT: "1" });
assert.ok(JSON.stringify(compact).length < JSON.stringify(all).length * 0.6, "compact is much smaller");

// Without credentials a call must fail cleanly rather than crash.
const res = await run({}, [{ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "retrieve_tag_list", arguments: {} } }]);
const call = res.find((r) => r.id === 3).result;
assert.equal(call.isError, true);
assert.match(call.content[0].text, /Missing environment variables/);

console.log(`ok: all=${all.length} readOnly=${ro.length} noAudits=${noAudit.length} dns=${dns.length}`);
