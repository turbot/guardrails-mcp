import { formatJson } from './jsonFormatter.mjs';

interface ToolResponse {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

/**
 * Format a response with content array wrapper
 * @param text The text to wrap in a content array
 * @param isError Whether this is an error response
 * @returns Formatted response object
 */
export function formatToolResponse(text: string, isError = false): ToolResponse {
  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ],
    ...(isError && { isError })
  };
}

/**
 * Format an error response with content array wrapper
 * @param errorMessage The error message to wrap
 * @returns Formatted error response object
 */
export function errorResponse(errorMessage: string): ToolResponse {
  return formatToolResponse(errorMessage, true);
}

/**
 * Format a JSON response with content array wrapper
 * @param data The data to stringify and wrap in a content array
 * @param isError Whether this is an error response
 * @returns Formatted response object
 */
export function formatJsonToolResponse(data: unknown, isError = false): ToolResponse {
  return formatToolResponse(formatJson(data), isError);
} 