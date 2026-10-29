#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, missingCredentials } from "./config.js";
import { buildTools, groupNames } from "./tools.js";
import { ContaboClient } from "./client.js";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`contabo-mcp - MCP server for the Contabo API (stdio)

Required env: CONTABO_CLIENT_ID CONTABO_CLIENT_SECRET CONTABO_API_USER CONTABO_API_PASSWORD
Optional env: CONTABO_READ_ONLY CONTABO_EXCLUDE_AUDITS CONTABO_GROUPS CONTABO_EXCLUDE_TOOLS
              CONTABO_COMPACT CONTABO_TIMEOUT_MS CONTABO_MAX_RESPONSE_CHARS CONTABO_MAX_RETRIES
Groups: ${groupNames().join(", ")}
Docs: https://github.com/Kirad20/contabo-mcp`);
  process.exit(0);
}

const cfg = loadConfig();
const tools = buildTools(cfg);
const client = new ContaboClient(cfg);

// stdout is the MCP channel; all diagnostics go to stderr.
const missing = missingCredentials(cfg.credentials);
if (missing.length) {
  console.error(`[contabo-mcp] warning: missing env vars: ${missing.join(", ")} (tools will fail until set)`);
}
console.error(`[contabo-mcp] ${tools.size} tools loaded${cfg.readOnly ? " (read-only)" : ""}`);

const server = new Server({ name: "contabo-mcp", version: "1.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...tools.values()].map((t) => t.def) }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.get(req.params.name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `Unknown tool ${req.params.name}` }] };
  try {
    const r = await client.call(tool, req.params.arguments || {});
    const text = r.ok
      ? r.text || `OK (HTTP ${r.status})`
      : `HTTP ${r.status} (x-request-id ${r.requestId}): ${r.text}`;
    return { isError: !r.ok, content: [{ type: "text", text }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: String(e?.message || e) }] };
  }
});

await server.connect(new StdioServerTransport());
