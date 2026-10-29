# Development

## Layout

```
src/
  index.js       MCP server (stdio), request handlers, --help
  config.js      env var parsing
  tools.js       builds tool definitions from the OpenAPI spec (filters, naming, schema inlining)
  client.js      OAuth2 token cache + HTTP calls (timeouts, 401 refresh, retries, truncation)
  openapi.json   Contabo OpenAPI 3.0.3 spec (bundled)
test/smoke.mjs   offline end-to-end test over stdio
scripts/gen-docs.mjs   regenerates docs/TOOLS.md
examples/        per-agent config files
```

## Commands

```bash
npm install
npm test        # spawns the server, checks counts for all/read-only/no-audits/group/compact, and a no-credentials call
npm run docs    # regenerate docs/TOOLS.md
npm start       # run the server (stdio)
```

## How tools are built

For each `path × method` in the spec, `tools.js`:

1. Names the tool from `operationId` (snake_case; a few bare verbs are renamed via `RENAMES`).
2. Collects path and query params (plus optional `x-trace-id`) as top-level properties; `x-request-id` is added automatically at call time.
3. Inlines `$ref`s in the JSON body schema (depth limit 6, cycle-safe) into a `body` property.
4. Applies filters (`readOnly`, `excludeAudits`, `groups`, `exclude`) and `compact`.
5. Sets annotations from the HTTP method.

`client.js` fills path params (URL-encoded), serialises query arrays as comma-separated lists, and sends the JSON body.

## Updating the OpenAPI spec

Contabo does not publish a standalone spec URL; the docs page at https://api.contabo.com embeds it. To refresh:

1. Download the page HTML and extract the JSON object containing `"openapi":"3.0.3"` (the Redoc state).
2. Save it to `src/openapi.json`.
3. Run `npm test` (adjust the expected count in `test/smoke.mjs` if operations were added or removed) and `npm run docs`.

## Adding behaviour

- New env option: add to `config.js`, use it in `tools.js` or `client.js`, document in `docs/CONFIGURATION.md` and `--help` in `index.js`.
- Writing to stdout from the server breaks the protocol; use `console.error` for logs.
- Keep retries limited to idempotent reads or `429` (the request was not processed).

## Releasing

Bump `version` in `package.json` and in `src/index.js`, update `CHANGELOG.md`, run `npm test && npm run docs`, tag `vX.Y.Z`.
