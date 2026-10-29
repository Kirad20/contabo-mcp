# Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Agent shows no Contabo tools | Config path or JSON invalid; command path not absolute; restart the agent. Run `node /abs/path/src/index.js --help` in a terminal to confirm Node and the path work. Check MCP logs for `[contabo-mcp] N tools loaded`. |
| `Cannot find package '@modelcontextprotocol/sdk'` | Run `npm install` inside the repo. |
| `SyntaxError` / unexpected token on start | Node is too old. Use Node 18.17+ (`node -v`). On Windows GUI apps may use a different Node than your shell; set `command` to the full path of `node.exe`. |
| `Missing environment variables: ...` | The agent did not pass `env`. Some clients need the `env` block inside the server entry, not at top level. |
| `Authentication failed (HTTP 401)` | Wrong client id/secret/user/password. The *API password* is the one set in Account → Security & Access → API, not your login password. Special characters are fine (the value is sent form-encoded) but must be copied exactly. |
| `Authentication failed (HTTP 400/403)` | API access not enabled, or account locked; check the Control Panel. |
| `HTTP 401` on a call | The token was refreshed once automatically; if it persists the credentials lost access. |
| `HTTP 403` | The API user's role lacks the permission for that resource. |
| `HTTP 404` | Wrong id (instance ids are numeric), or resource in another account. |
| `HTTP 422` / `400` with validation text | Body does not match the schema; compare with the tool's `body` definition. Many fields are enums and case-sensitive. |
| `HTTP 429` | Rate limit. Reads are retried with backoff (`CONTABO_MAX_RETRIES`). Slow down bulk loops. |
| Output ends with `[truncated ...]` | Response exceeded `CONTABO_MAX_RESPONSE_CHARS`; request a smaller `size`, another `page`, or add filters. |
| `AbortError` / timeout | Raise `CONTABO_TIMEOUT_MS`; check network/proxy. |
| Model struggles or ignores tools | Too many tools. Use `CONTABO_GROUPS`, `CONTABO_EXCLUDE_AUDITS`, `CONTABO_COMPACT`. Some clients cap the number of tools per server. |
| Behind a proxy | Node's built-in `fetch` ignores `HTTPS_PROXY` by default. On Node 24+ set `NODE_USE_ENV_PROXY=1`; otherwise use a transparent proxy or run via a tool such as `proxychains`. |

## Collecting debug info

- Run the server by hand with `node src/index.js` and watch stderr.
- Use the MCP Inspector: `npx @modelcontextprotocol/inspector node src/index.js`.
- Every failed call returns the `x-request-id` it used; give it to Contabo support.

## Windows notes

- Use `C:/path/to/src/index.js` or escaped backslashes in JSON.
- If `node` is not on the PATH of GUI apps, set `"command": "C:/Program Files/nodejs/node.exe"`.
