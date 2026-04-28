import config from "../config/env.js";
import { redactStrings } from "./redact.js";

// Returns a user-facing warning string if the endpoint would transmit
// credentials over a non-secure channel, or null otherwise. Pure function so
// it can be tested directly without booting the server. Uses URL.protocol
// rather than string prefix matching, so uppercase schemes (HTTPS://) are
// correctly recognised. Returns null on unparseable URLs because the GraphQL
// client will produce a clearer error than we can; don't double-warn.
export function insecureEndpointWarning(endpoint: string): string | null {
  let protocol: string;
  try {
    protocol = new URL(endpoint).protocol;
  } catch {
    return null;
  }
  if (protocol === "https:") {
    return null;
  }
  return `Endpoint does not use HTTPS — credentials will be transmitted in plaintext: ${endpoint}`;
}

const { TURBOT_ACCESS_KEY_ID, TURBOT_SECRET_ACCESS_KEY } = config;

// Values that must never leak through any user-visible output. Includes the
// base64 auth header form so we're covered even if a future upstream/library
// echoes request headers in an error. Frozen so it can't be mutated by other
// modules. Empty strings are filtered defensively in case credentials were
// resolved as empty (which validation should prevent, but defence-in-depth).
const CREDENTIAL_SECRETS: readonly string[] = Object.freeze(
  [
    TURBOT_ACCESS_KEY_ID,
    TURBOT_SECRET_ACCESS_KEY,
    btoa(`${TURBOT_ACCESS_KEY_ID}:${TURBOT_SECRET_ACCESS_KEY}`),
  ].filter((s): s is string => Boolean(s)),
);

// Single shared redactor used everywhere user-visible strings (error messages,
// formatted GraphQL errors) leave the server. Centralised so all leak paths
// converge on the same secret list — adding a new redaction target updates
// every call site automatically.
export function redactCredentials(input: string): string {
  return redactStrings(input, CREDENTIAL_SECRETS);
}
