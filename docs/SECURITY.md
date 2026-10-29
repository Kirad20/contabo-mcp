# Security

## What this server can do

With full credentials the agent can do anything the Contabo API allows: create and bill resources, delete instances and snapshots, reinstall servers (wiping disks), reset passwords, change DNS and manage users. Treat the credentials as account-level access.

## Recommendations

1. **Default to `CONTABO_READ_ONLY=1`.** Enable writes only for sessions where you need them.
2. **Reduce the surface:** use `CONTABO_GROUPS`, `CONTABO_EXCLUDE_TOOLS` (exact names, no wildcards, e.g. `reinstall_instance,cancel_instance,delete_dns_zone`) and `CONTABO_EXCLUDE_AUDITS`.
3. **Keep human approval on** for non-read tools in your agent. Tools carry `readOnlyHint` (GET) and `destructiveHint` (DELETE only) annotations; POST actions such as `reinstall_instance`, `cancel_instance` or `rollback_snapshot` are not flagged destructive, so require approval for every non-read tool. Only auto-approve read tools.
4. **Use a dedicated Contabo user** for the API where possible, with a role limited to what you need (see the Users/Roles tools and the Control Panel).
5. **Never commit credentials.** Config files with real values belong outside git. `examples/` contain placeholders only.
6. **Rotate** the API password and client secret if they were ever pasted into a chat, log or repository. Use `generate_client_secret` or the Control Panel.

## How credentials are handled

- Read from environment variables at process start; never written to disk or logged by this server.
- Sent only to `CONTABO_AUTH_URL` (Contabo's identity provider) to obtain a token; the token is kept in memory and sent only to `CONTABO_API_URL`.
- Errors shown to the agent omit the credentials; auth failures only report the HTTP status.
- Diagnostics are written to stderr, never stdout (stdout is the protocol channel).
- If you override `CONTABO_API_URL` / `CONTABO_AUTH_URL`, make sure they are trusted: credentials and tokens go there.

## Prompt-injection note

API responses can contain text controlled by others (instance display names, tag names, DNS records, user-set descriptions). An agent reading them could be manipulated into issuing further calls. Mitigations: read-only mode, approval for writes, and not auto-approving destructive tools.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository (Security → Advisories), or an issue without exploit details asking for a contact channel.
