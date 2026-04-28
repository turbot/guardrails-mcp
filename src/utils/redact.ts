// Redacts known-secret values from arbitrary strings. Used as a defensive
// last-line filter before any error message can reach the MCP client (which
// forwards to the AI assistant and may persist in chat history). The upstream
// Guardrails API has been observed to echo the access key value back in 401
// error bodies; this guards against that and any future similar leaks.
//
// Uses split/join (literal substring replacement) rather than regex, so values
// containing regex special characters are handled correctly without escaping.
export function redactStrings(input: string, secrets: readonly string[]): string {
  if (!input) return input;
  let result = input;
  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      result = result.split(secret).join("[REDACTED]");
    }
  }
  return result;
}
