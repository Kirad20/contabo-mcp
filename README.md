# contabo-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An [MCP](https://modelcontextprotocol.io) server that gives AI agents the **entire Contabo API**: VPS/VDS instances, snapshots, images, object storage, private networks, firewalls, DNS, domains, secrets, users, tags and troubleshooting. It is generated from Contabo's official OpenAPI spec, so every one of the **158 operations** is available as a tool.

- One tool per API operation, with typed JSON-schema inputs and `readOnly` / `destructive` annotations
- OAuth2 handled for you: token fetched, cached, refreshed on expiry and on `401`
- Safety switches: read-only mode, tool groups, exclusion list
- Resilient: timeouts, retry with backoff on `429`/`5xx` for reads, response size cap
- Works with Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, Cline, Codex, Gemini CLI, Zed, OpenCode and any stdio MCP client

## Quick start

Requires Node.js 18.17+ and Contabo API credentials (my.contabo.com → *Account → Security & Access → API*: Client ID, Client Secret, API user, API password).

```bash
git clone https://github.com/Kirad20/contabo-mcp
cd contabo-mcp
npm install
npm test        # offline smoke test, no credentials needed
```

Then register the server in your agent. Example for Claude Code:

```bash
claude mcp add contabo \
  -e CONTABO_CLIENT_ID=... -e CONTABO_CLIENT_SECRET=... \
  -e CONTABO_API_USER=... -e CONTABO_API_PASSWORD=... \
  -e CONTABO_READ_ONLY=1 \
  -- node /absolute/path/to/contabo-mcp/src/index.js
```

Ready-made configs for every supported agent are in [`examples/`](examples) and explained in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

> **Start read-only.** `CONTABO_READ_ONLY=1` exposes only the 72 GET tools. Remove it only when you want the agent to create, change or delete resources (which can cost money or destroy data).

## Try it

Once connected, ask your agent things like:

- "List my Contabo instances and their status."
- "Which of my VPS have no firewall assigned?"
- "Create a snapshot of instance 12345 called `before-upgrade`."
- "Add an A record for `app.example.com` pointing to my instance IP."

More in [docs/USAGE.md](docs/USAGE.md).

## Configuration at a glance

| Variable | Purpose |
|---|---|
| `CONTABO_CLIENT_ID`, `CONTABO_CLIENT_SECRET`, `CONTABO_API_USER`, `CONTABO_API_PASSWORD` | **Required.** API credentials |
| `CONTABO_READ_ONLY=1` | Only GET tools |
| `CONTABO_GROUPS=dns,firewalls` | Only these tool groups |
| `CONTABO_EXCLUDE_AUDITS=1` | Drop the 17 audit-log tools |
| `CONTABO_EXCLUDE_TOOLS=delete_tag,...` | Drop specific tools |
| `CONTABO_COMPACT=1` | Shorter schemas (~45% fewer tokens) |
| `CONTABO_TIMEOUT_MS`, `CONTABO_MAX_RETRIES`, `CONTABO_MAX_RESPONSE_CHARS` | Network behaviour |

Full list and details: [docs/CONFIGURATION.md](docs/CONFIGURATION.md). The complete tool list is in [docs/TOOLS.md](docs/TOOLS.md).

## Why filter tools?

All 158 tools together weigh ~165 KB of schema, which is a lot of context for the model. Pick the groups you need (`CONTABO_GROUPS`), enable `CONTABO_COMPACT`, or both. For example `CONTABO_GROUPS="compute instances" CONTABO_COMPACT=1` loads 25 small tools.

## Documentation

| Doc | Contents |
|---|---|
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Credentials, every env var, setup per agent |
| [USAGE.md](docs/USAGE.md) | Calling conventions, pagination, example workflows |
| [TOOLS.md](docs/TOOLS.md) | All 158 tools by group |
| [SECURITY.md](docs/SECURITY.md) | Credential handling, least privilege, risks |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common errors and fixes |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Architecture, updating the spec, tests |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

## Disclaimer

Unofficial community project, not affiliated with Contabo GmbH. You are responsible for any resources created, changed or deleted through your credentials.

## License

MIT, see [LICENSE](LICENSE).
