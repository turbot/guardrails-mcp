import { executeQuery } from "../utils/graphqlClient.js";
import { z } from "zod";

interface ResourceType {
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
}

interface QueryResponse {
  resourceTypes: {
    items: Array<ResourceType>;
  };
}

type ListResourceTypesInput = {
  filter?: string;
};

export const tool = {
  name: "guardrails_resource_type_list",
  description: "List all available resource types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
  schema: {
    filter: z.string().optional().describe("Optional filter to apply (e.g. 'category:storage' or 'title:/bucket/i')")
  },
  handler: async ({ filter }: ListResourceTypesInput) => {
    console.error("Starting list_guardrails_resource_types tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        console.error(`Added user filter: ${filter}`);
      }

      const query = `
        query ListResourceTypes($filters: [String!]!) {
          resourceTypes(filter: $filters) {
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
      const transformedResult = result.resourceTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        title: item.title,
        description: item.description,
        icon: item.icon,
        modUri: item.modUri,
        category: {
          uri: item.category.uri,
          trunkTitle: item.category.trunk?.title || null
        }
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(transformedResult, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("Error in list_guardrails_resource_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing resource types: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}; 