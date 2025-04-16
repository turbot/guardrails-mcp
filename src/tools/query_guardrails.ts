import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";
import { parse, OperationDefinitionNode } from "graphql";

type QueryToolInput = {
  query: string;
  variables?: Record<string, any>;
};

export const tool = {
  name: "query_guardrails",
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
        return {
          isError: true,
          content: [{ type: "text" as const, text: "Query must contain at least one operation" }]
        };
      }

      const operation = operations[0];
      
      // Validate operation type
      if (operation.operation !== "query") {
        return {
          isError: true,
          content: [{ 
            type: "text" as const, 
            text: `Invalid operation type: ${operation.operation}. Only queries are allowed in the query tool.` 
          }]
        };
      }

      // If we get here, it's a valid query
      const result = await executeQuery(query, variables);
      return {
        content: [
          {
            type: "text" as const,
            text: result
          }
        ]
      };

    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }
  }
}; 