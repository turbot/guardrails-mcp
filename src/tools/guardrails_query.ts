import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLResultWithErrors } from '../utils/responseFormatter.mjs';
import { parse, OperationDefinitionNode, GraphQLError, Source } from "graphql";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { validateReadOnlyGraphQLQuery } from "../utils/graphqlValidation.js";

type QueryToolInput = {
  query: string;
  variables?: Record<string, any> | null;
};

interface GraphQLResult {
  data?: any;
  errors?: Array<{
    message: string;
    path?: Array<string | number>;
    locations?: Array<{ line: number; column: number }>;
  }>;
}

export const tool: Tool = {
  name: "guardrails_query",
  description: "Run any read-only GraphQL query in Turbot Guardrails. Use for custom queries not covered by other tools.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Read-only GraphQL query to execute."
      },
      variables: {
        type: "object",
        description: `Optional variables for the query.

If using a filter variable, here are some examples:
- title: "my server"
- exact resource type: "resourceTypeId:tmod:@turbot/aws-ec2#/resource/types/instance"
- resource type: "resourceType:s3"
- tags: "tags:env=dev"
- creation time: "createTimestamp:>T-7d"
- last modified: "timestamp:>T-15m"
- field match: "$.Versioning.Status:Enabled"
- field comparison: "$.Size:<=30"
- IP within CIDR: "$.IpAddress:192.168.1.0/24"
- scoped in hierarchy: "resource:'arn:aws:::111122223333'"
- multiple filters: "my server tags:env=dev"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`,
      }
    },
    required: ["query"],
    additionalProperties: false
  },
  handler: async ({ query, variables = {} }: QueryToolInput) => {
    logger.debug({ query, variables }, "Starting GraphQL query execution");

    try {
      // Validate query using shared utility
      const validation = validateReadOnlyGraphQLQuery(query);
      if (!validation.valid) {
        logger.warn({ error: validation.error }, "GraphQL query validation failed");
        return errorResponse(validation.error);
      }

      // If we get here, it's a valid query
      const result = await executeQuery(query, variables || {}) as GraphQLResult;
      return formatGraphQLResultWithErrors(result, logger);
    } catch (error: any) {
      logger.error({ 
        error: error.message,
        stack: error.stack
      }, "Unexpected error executing query");
      return errorResponse(error.message);
    }
  }
}; 