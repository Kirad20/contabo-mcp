# Usage

## How tools map to the API

- Each tool is one API operation. Names are the operationId in snake_case: `retrieveInstancesList` → `retrieve_instances_list`. The bare instance actions are prefixed: `instance_start`, `instance_stop`, `instance_restart`, `instance_shutdown`, `instance_rescue`, `instance_reset_password`.
- **Path and query parameters** are top-level arguments (`instanceId`, `page`, `size`, `name`...).
- **Request payloads** go in a single `body` object, matching the schema shown in the tool.
- `x-request-id` is generated per call (and reused across retries); `x-trace-id` is an optional argument to group related calls.
- Verbs: `retrieve_*` read, `create_*` add, `update_*` change, `delete_*`/`cancel_*` remove, plus actions such as `rollback_snapshot` or `assign_ip`.

## Reading results

Successful calls return the raw JSON from Contabo (`{"_pagination": {...}, "data": [...]}` for lists). Failures are returned as tool errors: `HTTP <status> (x-request-id <uuid>): <body>`. Quote the request id when contacting Contabo support.

### Pagination and filtering

List tools accept `page` (1-based), `size`, `orderBy` (e.g. `name:ASC`) and resource-specific filters. Responses over `CONTABO_MAX_RESPONSE_CHARS` are truncated; narrow with `size`, `page` and filters rather than raising the limit.

## Example workflows

**Inventory**
> "List all my instances, group them by region, and flag any that are stopped."

Uses `retrieve_instances_list` (paged).

**Snapshot before a risky change**
> "Snapshot instance 12345 as `pre-upgrade`, then show me the snapshot list."

Uses `create_snapshot` then `retrieve_snapshot_list`. Rollback later with `rollback_snapshot`.

**Firewall audit**
> "Which instances have no firewall? Create a firewall that allows only 22 and 443 and assign it to them."

Uses `retrieve_instances_list`, `retrieve_firewall_list`, `create_firewall`, `assign_instance_firewall`.

**DNS change**
> "Add an A record `app` → 203.0.113.10 in zone example.com with TTL 300."

Uses `retrieve_dns_zones_list` then `create_dns_zone_record`.

**Rescue a broken server**
> "Boot instance 12345 into rescue mode with this SSH key."

Uses `instance_rescue`, `instance_restart` afterwards.

**Cost/trouble check**
> "Run the available checks on instance 12345 and summarize failures."

Uses the Troubleshooting group (`list_ext_checks`, `start_ext_check`, ...).

## Tips for agents

1. Retrieve before you modify: list/get the resource, confirm ids, then act.
2. Destructive tools (`delete_*` carry `destructiveHint`; `cancel_*`, `reinstall_instance` and `rollback_snapshot` are POSTs and are NOT flagged, though they also destroy data). Keep your client's approval prompts on for all non-read tools.
3. Creating or upgrading instances, storage or domains can change your bill. Ask the agent to state the product, region and price implications first.
4. Some operations are asynchronous (e.g. instance create/reinstall). Poll with `retrieve_instance` and check `status` rather than assuming completion.

## Calling a tool manually (for debugging)

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cli","version":"1"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"retrieve_instances_list","arguments":{"size":5}}}' \
 | CONTABO_CLIENT_ID=... CONTABO_CLIENT_SECRET=... CONTABO_API_USER=... CONTABO_API_PASSWORD=... node src/index.js
```

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) (`npx @modelcontextprotocol/inspector node src/index.js`) gives a UI for the same.
