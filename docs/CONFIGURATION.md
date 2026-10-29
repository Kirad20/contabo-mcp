# Configuration

## 1. Get API credentials

In the Contabo Customer Control Panel (my.contabo.com) open **Account → Security & Access → API** and note:

| Panel field | Environment variable |
|---|---|
| Client ID | `CONTABO_CLIENT_ID` |
| Client Secret | `CONTABO_CLIENT_SECRET` |
| API User (your account email) | `CONTABO_API_USER` |
| API Password (set in the same screen) | `CONTABO_API_PASSWORD` |

The server exchanges them for a short-lived OAuth2 token (password grant) and refreshes it automatically.

## 2. Environment variables

| Variable | Default | Description |
|---|---|---|
| `CONTABO_CLIENT_ID` | – | Required |
| `CONTABO_CLIENT_SECRET` | – | Required |
| `CONTABO_API_USER` | – | Required |
| `CONTABO_API_PASSWORD` | – | Required |
| `CONTABO_READ_ONLY` | off | `1`/`true`: expose only GET tools (72 of 158) |
| `CONTABO_GROUPS` | all | Comma-separated group names, case-insensitive. Groups: `compute instances`, `compute images`, `object storages`, `private networks`, `tags`, `users`, `secrets`, `network management`, `domains`, `dns`, `firewalls`, `troubleshooting` |
| `CONTABO_EXCLUDE_AUDITS` | off | Drop audit-log tools (17) |
| `CONTABO_EXCLUDE_TOOLS` | – | Comma-separated tool names to drop, e.g. `delete_tag,cancel_instance` |
| `CONTABO_COMPACT` | off | Strip descriptions and validation keywords from schemas; ~45% smaller tool list |
| `CONTABO_TIMEOUT_MS` | `30000` | Per-request timeout |
| `CONTABO_MAX_RETRIES` | `2` | Retries for `429`, and for `502/503/504` on GET only |
| `CONTABO_MAX_RESPONSE_CHARS` | `100000` | Responses longer than this are truncated with a hint |
| `CONTABO_API_URL` | `https://api.contabo.com` | Override API base |
| `CONTABO_AUTH_URL` | Contabo Keycloak token URL | Override auth endpoint |

Filters combine: `CONTABO_READ_ONLY=1 CONTABO_GROUPS=dns,firewalls` loads only the GET tools of those two groups. Run `node src/index.js --help` to print the option list and group names.

### Recommended profiles

| Goal | Settings |
|---|---|
| Safe exploration | `CONTABO_READ_ONLY=1` |
| Server admin | `CONTABO_GROUPS=compute instances,compute images,firewalls,tags` + `CONTABO_EXCLUDE_AUDITS=1` |
| DNS only | `CONTABO_GROUPS=dns,domains` |
| Small-context models | add `CONTABO_COMPACT=1` |

## 3. Register the server in your agent

The server speaks MCP over **stdio**: the agent launches `node /absolute/path/to/contabo-mcp/src/index.js` and passes credentials through `env`. Replace `/ABSOLUTE/PATH/TO/contabo-mcp` with your clone (on Windows use forward slashes or doubled backslashes: `C:/projects/contabo-mcp/src/index.js`). Files for each agent are in [`../examples`](../examples). Restart the agent after editing its config.

### Claude Code

CLI (recommended):

```bash
claude mcp add contabo --scope user \
  -e CONTABO_CLIENT_ID=... -e CONTABO_CLIENT_SECRET=... \
  -e CONTABO_API_USER=... -e CONTABO_API_PASSWORD=... \
  -e CONTABO_READ_ONLY=1 \
  -- node /absolute/path/to/contabo-mcp/src/index.js
```

Or a project `.mcp.json` ([example](../examples/claude-code.mcp.json)); use `${VAR}` expansion rather than committing secrets. Check with `claude mcp list`.

### Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config; on Windows `%APPDATA%\Claude\`, on macOS `~/Library/Application Support/Claude/`). Example: [claude-desktop.json](../examples/claude-desktop.json).

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project). Example: [cursor.mcp.json](../examples/cursor.mcp.json).

### VS Code (GitHub Copilot agent mode)

`.vscode/mcp.json` or the user profile's MCP file. Uses `servers` (not `mcpServers`) and prompts for secrets via `inputs`, so nothing sensitive sits in the file. Example: [vscode.mcp.json](../examples/vscode.mcp.json).

### Windsurf

`~/.codeium/windsurf/mcp_config.json`. Example: [windsurf.json](../examples/windsurf.json).

### Cline

Cline → MCP Servers → Configure → `cline_mcp_settings.json`. Example: [cline.json](../examples/cline.json). You can add `"autoApprove": ["retrieve_instances_list"]` to skip prompts for read tools only.

### Codex CLI

Append to `~/.codex/config.toml`: [codex-config.toml](../examples/codex-config.toml).

### Gemini CLI

`~/.gemini/settings.json` (or `.gemini/settings.json` per project). Example: [gemini-settings.json](../examples/gemini-settings.json).

### Zed

`settings.json` under `context_servers`. Example: [zed-settings.json](../examples/zed-settings.json). Zed's schema has changed between versions; if it rejects the entry, check the current Zed MCP docs.

### OpenCode

`opencode.json` under `mcp`, with `command` as an array and `environment` for variables. Example: [opencode.json](../examples/opencode.json).

### Any other MCP client

Use a stdio server with `command: node`, `args: ["/abs/path/src/index.js"]` and the env vars above. Agents also differ slightly in key names; where unsure, copy the structure of an existing stdio server in that agent's config.

## 4. Verify

```bash
npm test                         # offline: checks tool list and filters
node src/index.js --help         # prints options
```

In the agent, ask "list my Contabo instances". On startup the server logs `N tools loaded` to stderr, visible in the agent's MCP logs.

## Keeping secrets out of config files

Prefer, in order: the agent's secret prompt (VS Code `inputs`), `${ENV_VAR}` expansion from your shell profile (Claude Code), or an OS-level secret store that exports env vars before launching the agent. Never commit a config that contains real values; see [SECURITY.md](SECURITY.md).
