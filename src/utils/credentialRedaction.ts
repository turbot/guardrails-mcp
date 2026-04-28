import config from "../config/env.js";
import { redactStrings } from "./redact.js";

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
