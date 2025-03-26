import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeQuery } from "../utils/graphqlClient.js";
import { z } from "zod";

interface ControlType {
  uri: string;
  title: string;
  description: string | null;
  icon: string;
  modUri: string;
  trunk: {
    title: string;
  } | null;
  turbot: {
    id: string;
  };
  category: {
    trunk: {
      title: string;
    } | null;
    uri: string;
  };
  targets: string[];
  actionTypes: {
    items: Array<{
      uri: string;
    }>;
  };
}

interface QueryResponse {
  controlTypes: {
    items: Array<ControlType>;
  };
}

export function registerListControlTypesTool(server: McpServer) {
  server.tool(
    "list_guardrails_control_types",
    "List all available control types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
    {
      filter: z.string().optional().describe("Optional filter to apply (e.g. 'category:security' or 'title:/encryption/i')")
    },
    async ({ filter }) => {
      console.error("Starting list_guardrails_control_types tool execution");
      try {
        // Build array of filters
        const filters = ["limit:5000"];
        
        // If a filter is provided, add it to the filters array
        if (filter) {
          filters.push(filter);
          console.error(`Added user filter: ${filter}`);
        }

        const query = `
          query ListControlTypes($filters: [String!]!) {
            controlTypes(filter: $filters) {
              items {
                uri
                title
                description
                icon
                modUri
                trunk {
                  title
                }
                turbot {
                  id
                }
                targets
                actionTypes(filter: "limit:5000") {
                  items {
                    uri
                  }
                }
                category {
                    trunk {
                    title
                  }
                  uri
                }
              }
            }
          }
        `;

        console.error("Executing GraphQL query with filters:", filters);
        const result = JSON.parse(await executeQuery(query, { filters })) as QueryResponse;
        console.error("Query executed successfully");

        // Transform the response to flatten and reorganize fields
        const transformedResult = result.controlTypes.items.map(item => ({
          id: item.turbot.id,
          trunkTitle: item.trunk?.title || null,
          uri: item.uri,
          title: item.title,
          description: item.description,
          icon: item.icon,
          modUri: item.modUri,
          targets: item.targets,
          actionTypes: item.actionTypes.items.map(at => at.uri),
          category: {
            uri: item.category.uri,
            trunkTitle: item.category.trunk?.title || null
          }
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(transformedResult, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("Error in list_guardrails_control_types:", error);
        const errorMessage = error instanceof Error ? 
          `${error.name}: ${error.message}` : 
          String(error);
        
        return {
          content: [
            {
              type: "text",
              text: `Error listing control types: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
} 