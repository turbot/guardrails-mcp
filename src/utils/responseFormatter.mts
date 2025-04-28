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

/**
 * Format a common GraphQL error into a user-friendly message
 * @param error The error to format
 * @param id The ID that was used in the query
 * @returns Formatted error message
 */
export function formatGraphQLError(error: unknown, id: string): string {
  if (error instanceof Error) {
    if (error.message.includes('Not Found')) {
      return `'${id}' not found. Please verify the value is correct and try again.`;
    } else if (error.message.includes('Invalid input')) {
      return `'${id}' has an invalid format. Please provide a valid ID or URI.`;
    }
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * Format a GraphQL result, logging and surfacing errors if present.
 * @param result The GraphQL result object (with optional errors array)
 * @param logger The logger to use for error logging
 * @returns Formatted response object, with isError=true if errors are present
 */
export function formatGraphQLResultWithErrors(result: any, logger: any) {
  if (result.errors?.length) {
    result.errors.forEach((error: any) => {
      logger.error({
        error: error.message,
        path: error.path,
        locations: error.locations
      }, "GraphQL execution error");
    });
    return formatJsonToolResponse(result, true);
  }
  return formatJsonToolResponse(result);
} 