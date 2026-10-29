# Changelog

## 1.1.0

- Split into modules (`config`, `tools`, `client`); added offline smoke test and docs generator.
- New options: `CONTABO_GROUPS`, `CONTABO_EXCLUDE_AUDITS`, `CONTABO_EXCLUDE_TOOLS`, `CONTABO_COMPACT`, `CONTABO_TIMEOUT_MS`, `CONTABO_MAX_RETRIES`, `CONTABO_MAX_RESPONSE_CHARS`.
- Request timeouts, one-time token refresh on `401`, retry with backoff on `429` and (GET only) `502-504`, response truncation.
- Errors include the `x-request-id`; clear message when credentials are missing.
- Instance action tools renamed to `instance_start`, `instance_stop`, `instance_restart`, `instance_shutdown`, `instance_rescue`, `instance_reset_password`.
- Tool annotations (`title`, `idempotentHint`) and `--help`.
- Example configs for Claude Desktop/Code, Cursor, VS Code, Windsurf, Cline, Codex, Gemini CLI, Zed, OpenCode.
- Expanded documentation in `docs/`.

## 1.0.0

- Initial release: 158 tools generated from the Contabo OpenAPI spec, MIT license.
