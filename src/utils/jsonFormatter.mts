/**
 * Format an object to a JSON string without indentation
 * @param data The data to stringify
 * @returns Compact JSON string
 */
export function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
}

/**
 * Format an object to a pretty-printed JSON string with indentation
 * @param data The data to stringify
 * @param indent Number of spaces for indentation (default: 2)
 * @returns Indented JSON string
 */
export function formatJsonPretty(data: unknown, indent = 2): string {
  try {
    return JSON.stringify(data, null, indent);
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message });
  }
} 