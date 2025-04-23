import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { parse, OperationDefinitionNode, GraphQLError, Source } from "graphql";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
      // Validate query
      if (!query.trim()) {
        logger.warn("Empty query received");
        return errorResponse("Query cannot be empty");
      }

      // Check for mutation attempts
      if (query.toLowerCase().includes("mutation")) {
        logger.warn("Mutation attempt blocked");
        return errorResponse("Mutations are not allowed. Use the appropriate mutation tool instead.");
      }

      // Parse and validate the query
      let document;
      try {
        document = parse(query);
      } catch (parseError) {
        if (parseError instanceof GraphQLError) {
          let errorMessage = parseError.message;
          const locations = parseError.locations;
          
          // Add location information if available
          if (locations && locations.length > 0) {
            const location = locations[0];
            errorMessage += `\nLocation: line ${location.line}, column ${location.column}`;
          }

          // Add source information if available
          const source = parseError.source;
          if (source instanceof Source) {
            const lines = source.body.split('\n');
            const errorLine = locations?.[0]?.line ?? 0;
            
            // Show the error line and a few lines of context
            const contextStart = Math.max(0, errorLine - 2);
            const contextEnd = Math.min(lines.length, errorLine + 2);
            
            errorMessage += '\n\nQuery context:';
            for (let i = contextStart; i < contextEnd; i++) {
              const lineNum = i + 1;
              const prefix = lineNum === errorLine ? '> ' : '  ';
              errorMessage += `\n${prefix}${lineNum}: ${lines[i]}`;
            }
          }

          logger.warn({ error: errorMessage }, "GraphQL parse error");
          return errorResponse(errorMessage);
        }
        throw parseError; // Re-throw if not a GraphQLError
      }

      const operations = document.definitions.filter(
        (def): def is OperationDefinitionNode => def.kind === "OperationDefinition"
      );

      // Basic validation
      if (operations.length === 0) {
        logger.warn("No operations found in query");
        return errorResponse("Query must contain at least one operation");
      }

      const operation = operations[0];
      
      // Validate operation type
      if (operation.operation !== "query") {
        logger.warn({ operationType: operation.operation }, "Invalid operation type");
        return errorResponse(`Invalid operation type: ${operation.operation}. Only queries are allowed in the query tool.`);
      }

      // If we get here, it's a valid query
      const result = await executeQuery(query, variables || {}) as GraphQLResult;
      
      if (result.errors?.length) {
        // Log each GraphQL error with its details
        result.errors.forEach(error => {
          logger.error({ 
            error: error.message,
            path: error.path,
            locations: error.locations
          }, "GraphQL execution error");
        });
        return formatJsonToolResponse(result, true);
      }

      logger.info("Query executed successfully");
      return formatJsonToolResponse(result);
    } catch (error: any) {
      logger.error({ 
        error: error.message,
        stack: error.stack
      }, "Unexpected error executing query");
      return errorResponse(error.message);
    }
  }
}; 