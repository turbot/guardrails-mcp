import { logger } from '../services/pinoLogger.js';

/**
 * Adds filters to an array, including a default limit if none is specified
 * @param filters Existing array of filters to append to
 * @param userFilter Optional user-provided filter string
 * @param defaultLimit Default limit to use if no limit is specified (default: 5000)
 */
export function addFiltersWithDefaultLimit(filters: string[], userFilter?: string | null, defaultLimit = 5000): void {
  if (userFilter) {
    filters.push(userFilter);
  }

  if (!userFilter || !/\blimit:\d+\b/.test(userFilter)) {
    filters.push(`limit:${defaultLimit}`);
  }
} 