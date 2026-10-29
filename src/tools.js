import { readFileSync } from "node:fs";

export const spec = JSON.parse(readFileSync(new URL("./openapi.json", import.meta.url), "utf8"));

const METHODS = ["get", "post", "put", "patch", "delete"];
const SKIP_KEYS = new Set(["example", "examples", "xml", "externalDocs", "deprecated", "readOnly"]);
const COMPACT_SKIP_KEYS = new Set(["pattern", "format", "minLength", "maxLength", "minimum", "maximum", "default", "title"]);
const cut =(s, n) => (s.length > n ? s.slice(0, n - 3) + "..." : s);

/** Inline $refs (with cycle/depth guard) and drop noise so schemas stay small. */
function deref(node, opts, depth = 0, seen = []) {
  if (Array.isArray(node)) return node.map((n) => deref(n, opts, depth, seen));
  if (!node || typeof node !== "object") return node;
  if (node.$ref) {
    const name = node.$ref.split("/").pop();
    if (seen.includes(name) || depth > 6) return { type: "object", description: `(${name})` };
    return deref(spec.components.schemas[name], opts, depth + 1, [...seen, name]);
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (SKIP_KEYS.has(k) || (opts.compact && COMPACT_SKIP_KEYS.has(k))) continue;
    if (k === "description" && typeof v === "string") {
      if (!opts.compact) out[k] = cut(v, 300);
    } else out[k] = deref(v, opts, depth, seen);
  }
  return out;
}

// Contabo's operationIds for instance actions are bare verbs ("start", "stop"); make them self-explanatory.
const RENAMES = {
  start: "instance_start",
  restart: "instance_restart",
  stop: "instance_stop",
  shutdown: "instance_shutdown",
  rescue: "instance_rescue",
  resetPasswordAction: "instance_reset_password",
};

export const toolName = (operationId) =>
  (RENAMES[operationId] || operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()).slice(0, 64);

const groupOf = (() => {
  const m = new Map([["Vip Audits", "Network Management"]]);
  for (const g of spec["x-tagGroups"] || []) for (const t of g.tags) m.set(t, g.name);
  return (tags) => m.get(tags?.[0]) || tags?.[0] || "Other";
})();

/** Names of the available groups (e.g. "Compute instances", "DNS"). */
export const groupNames = () => (spec["x-tagGroups"] || []).map((g) => g.name);

export function buildTools(cfg) {
  const tools = new Map();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (!METHODS.includes(method) || !op.operationId) continue;
      const name = toolName(op.operationId);
      const group = groupOf(op.tags);
      const isAudit = (op.tags || []).some((t) => /audits$/i.test(t));

      if (cfg.readOnly && method !== "get") continue;
      if (cfg.excludeAudits && isAudit) continue;
      if (cfg.groups.length && !cfg.groups.includes(group.toLowerCase())) continue;
      if (cfg.exclude.includes(name)) continue;

      const params = [...(item.parameters || []), ...(op.parameters || [])].filter(
        (p) => p.in === "path" || p.in === "query" || (p.in === "header" && p.name === "x-trace-id"),
      );
      const properties = {};
      const required = [];
      for (const p of params) {
        const schema = deref(p.schema || { type: "string" }, cfg);
        properties[p.name] = cfg.compact || !p.description ? schema : { ...schema, description: cut(p.description, 300) };
        if (p.required && p.in !== "header") required.push(p.name);
      }
      const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
      if (bodySchema) {
        properties.body = { ...deref(bodySchema, cfg), description: "JSON request body" };
        if (op.requestBody.required) required.push("body");
      }

      const summary = (op.summary || op.operationId).trim();
      const description = cfg.compact
        ? `${summary} [${method.toUpperCase()} ${path}]`
        : `${summary} [${method.toUpperCase()} ${path}]${op.description ? "\n" + cut(op.description, 500) : ""}`;

      tools.set(name, {
        def: {
          name,
          description,
          inputSchema: { type: "object", properties, ...(required.length ? { required } : {}) },
          annotations: {
            title: summary,
            readOnlyHint: method === "get",
            destructiveHint: method === "delete",
            idempotentHint: method === "get" || method === "put" || method === "delete",
            openWorldHint: true,
          },
        },
        method,
        path,
        params,
        hasBody: !!bodySchema,
        group,
        tags: op.tags || [],
        operationId: op.operationId,
        summary,
      });
    }
  }
  return tools;
}
