const flag = (v) => /^(1|true|yes)$/i.test(v || "");
const list = (v) =>
  (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function loadConfig(env = process.env) {
  return {
    apiBase: env.CONTABO_API_URL || "https://api.contabo.com",
    authUrl: env.CONTABO_AUTH_URL || "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token",
    credentials: {
      clientId: env.CONTABO_CLIENT_ID,
      clientSecret: env.CONTABO_CLIENT_SECRET,
      apiUser: env.CONTABO_API_USER,
      apiPassword: env.CONTABO_API_PASSWORD,
    },
    readOnly: flag(env.CONTABO_READ_ONLY),
    excludeAudits: flag(env.CONTABO_EXCLUDE_AUDITS),
    groups: list(env.CONTABO_GROUPS),
    exclude: list(env.CONTABO_EXCLUDE_TOOLS),
    compact: flag(env.CONTABO_COMPACT),
    timeoutMs: Number(env.CONTABO_TIMEOUT_MS) || 30_000,
    maxResponseChars: Number(env.CONTABO_MAX_RESPONSE_CHARS) || 100_000,
    maxRetries: Number(env.CONTABO_MAX_RETRIES ?? 2),
  };
}

export function missingCredentials(c) {
  const map = {
    CONTABO_CLIENT_ID: c.clientId,
    CONTABO_CLIENT_SECRET: c.clientSecret,
    CONTABO_API_USER: c.apiUser,
    CONTABO_API_PASSWORD: c.apiPassword,
  };
  return Object.keys(map).filter((k) => !map[k]);
}
