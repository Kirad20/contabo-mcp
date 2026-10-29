# contabo-mcp

MCP server exposing the whole Contabo API (158 operations, generated from its OpenAPI spec in `src/openapi.json`).
Tool names are the snake_case operationIds (e.g. `retrieve_instance_list`, `create_instance`, `delete_tag`).
Path/query params are top-level arguments; request payloads go in `body`.

## Env vars (from my.contabo.com -> API)
CONTABO_CLIENT_ID, CONTABO_CLIENT_SECRET, CONTABO_API_USER, CONTABO_API_PASSWORD
Optional: CONTABO_READ_ONLY=1 (only GET tools; also shrinks the tool list)

## Claude config
```json
{ "mcpServers": { "contabo": {
  "command": "node", "args": ["C:/projects/lab/contabomcp/src/index.js"],
  "env": { "CONTABO_CLIENT_ID": "...", "CONTABO_CLIENT_SECRET": "...",
           "CONTABO_API_USER": "...", "CONTABO_API_PASSWORD": "..." } } } }
```

## License

MIT, see [LICENSE](LICENSE).
