import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeQuery } from "../utils/graphqlClient.js";
import { parse, OperationDefinitionNode } from "graphql";

export function registerQueryTool(server: McpServer) {
  server.tool(
    "query_guardrails",
    "Executes a GraphQL query to retrieve data.",
    {
      query: z.string().describe("GraphQL query string to execute"),
      variables: z.record(z.any()).optional().describe("Optional variables for the query")
    },
    async ({ query, variables = {} }) => {
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
            content: [{ type: "text", text: "Query must contain at least one operation" }]
          };
        }

        const operation = operations[0];
        
        // Validate operation type
        if (operation.operation !== "query") {
          return {
            isError: true,
            content: [{ 
              type: "text", 
              text: `Invalid operation type: ${operation.operation}. Only queries are allowed in the query tool.` 
            }]
          };
        }

        // If we get here, it's a valid query
        const result = await executeQuery(query, variables);
        return {
          content: [
            {
              type: "text",
              text: result
            }
          ]
        };

      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error)
            }
          ]
        };
      }
    }
  );
} 