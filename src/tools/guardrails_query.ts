import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { parse, OperationDefinitionNode } from "graphql";

type QueryToolInput = {
  query: string;
  variables?: Record<string, any>;
};

interface Tool {
  name: string;
  description: string;
  schema: Record<string, z.ZodType>;
  handler: (input: QueryToolInput) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }>;
}

export const tool: Tool = {
  name: "guardrails_query",
  description: "Executes a GraphQL query to retrieve data.",
  schema: {
    query: z.string().describe("GraphQL query string to execute"),
    variables: z.record(z.any()).optional().describe("Optional variables for the query")
  },
  handler: async ({ query, variables = {} }: QueryToolInput) => {
    try {
      // Parse and validate the query
      const document = parse(query);
      const operations = document.definitions.filter(
        (def): def is OperationDefinitionNode => def.kind === "OperationDefinition"
      );

      // Basic validation
      if (operations.length === 0) {
        return errorResponse("Query must contain at least one operation");
      }

      const operation = operations[0];
      
      // Validate operation type
      if (operation.operation !== "query") {
        return errorResponse(`Invalid operation type: ${operation.operation}. Only queries are allowed in the query tool.`);
      }

      // Validate query
      if (!query.trim()) {
        return errorResponse("Query cannot be empty");
      }

      // Check for mutation attempts
      if (query.toLowerCase().includes("mutation")) {
        return errorResponse("Mutations are not allowed. Use the appropriate mutation tool instead.");
      }

      // If we get here, it's a valid query
      const result = await executeQuery(query, variables);
      logger.debug("Query executed successfully");
      return formatToolResponse(result);
    } catch (error: any) {
      logger.error("Error executing query:", error);
      return errorResponse(error.message);
    }
  }
}; 