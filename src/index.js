#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const spec = JSON.parse(readFileSync(new URL("./openapi.json", import.meta.url), "utf8"));
const API_BASE = process.env.CONTABO_API_URL || "https://api.contabo.com";
const AUTH_URL =
  process.env.CONTABO_AUTH_URL || "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token";
const READ_ONLY = /^(1|true)$/i.test(process.env.CONTABO_READ_ONLY || "");

// ---- schema helpers -------------------------------------------------------
function deref(node, depth = 0, seen = []) {
  if (Array.isArray(node)) return node.map((n) => deref(n, depth, seen));
  if (!node || typeof node !== "object") return node;
  if (node.$ref) {
    const name = node.$ref.split("/").pop();
    if (seen.includes(name) || depth > 6) return { type: "object", description: `(${name})` };
    return deref(spec.components.schemas[name], depth + 1, [...seen, name]);
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (["example", "examples", "xml", "externalDocs", "deprecated", "readOnly"].includes(k)) continue;
    if (k === "description" && typeof v === "string") out[k] = v.length > 300 ? v.slice(0, 297) + "..." : v;
    else out[k] = deref(v, depth, seen);
  }
  return out;
}

// ---- build tools from the spec -------------------------------------------
const tools = new Map();
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().slice(0, 64);

for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    if (READ_ONLY && method !== "get") continue;
    const params = [...(item.parameters || []), ...(op.parameters || [])].filter(
      (p) => p.in === "path" || p.in === "query" || (p.in === "header" && p.name === "x-trace-id"),
    );
    const properties = {};
    const required = [];
    for (const p of params) {
      properties[p.name] = { ...deref(p.schema || { type: "string" }), description: (p.description || "").slice(0, 300) };
      if (p.required && p.in !== "header") required.push(p.name);
    }
    const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
    if (bodySchema) {
      properties.body = deref(bodySchema);
      if (op.requestBody.required) required.push("body");
    }
    const name = snake(op.operationId);
    tools.set(name, {
      def: {
        name,
        description: `${(op.summary || op.operationId).trim()} [${method.toUpperCase()} ${path}]${
          op.description ? "\n" + op.description.slice(0, 500) : ""
        }`,
        inputSchema: { type: "object", properties, ...(required.length ? { required } : {}) },
        annotations: {
          readOnlyHint: method === "get",
          destructiveHint: method === "delete",
          openWorldHint: true,
        },
      },
      method,
      path,
      params,
      hasBody: !!bodySchema,
    });
  }
}

// ---- auth -----------------------------------------------------------------
let token = null;
let tokenExp = 0;
async function getToken() {
  if (token && Date.now() < tokenExp - 30_000) return token;
  const need = ["CONTABO_CLIENT_ID", "CONTABO_CLIENT_SECRET", "CONTABO_API_USER", "CONTABO_API_PASSWORD"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: process.env.CONTABO_CLIENT_ID,
      client_secret: process.env.CONTABO_CLIENT_SECRET,
      username: process.env.CONTABO_API_USER,
      password: process.env.CONTABO_API_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Auth failed (${res.status}): ${await res.text()}`);
  const j = await res.json();
  token = j.access_token;
  tokenExp = Date.now() + (j.expires_in || 300) * 1000;
  return token;
}

// ---- request --------------------------------------------------------------
async function call(tool, args) {
  let path = tool.path;
  const url = new URLSearchParams();
  const headers = {
    authorization: `Bearer ${await getToken()}`,
    "x-request-id": randomUUID(),
    accept: "application/json",
  };
  for (const p of tool.params) {
    const v = args[p.name];
    if (v === undefined || v === null) continue;
    if (p.in === "path") path = path.replace(`{${p.name}}`, encodeURIComponent(String(v)));
    else if (p.in === "query") url.set(p.name, String(v));
    else headers[p.name] = String(v);
  }
  let body;
  if (tool.hasBody && args.body !== undefined) {
    body = JSON.stringify(args.body);
    headers["content-type"] = "application/json";
  }
  const qs = url.toString();
  const res = await fetch(API_BASE + path + (qs ? "?" + qs : ""), { method: tool.method.toUpperCase(), headers, body });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// ---- server ---------------------------------------------------------------
const server = new Server({ name: "contabo-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...tools.values()].map((t) => t.def) }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.get(req.params.name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `Unknown tool ${req.params.name}` }] };
  try {
    const r = await call(tool, req.params.arguments || {});
    return {
      isError: !r.ok,
      content: [{ type: "text", text: r.ok ? r.text || `OK (${r.status})` : `HTTP ${r.status}: ${r.text}` }],
    };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: String(e.message || e) }] };
  }
});

await server.connect(new StdioServerTransport());
