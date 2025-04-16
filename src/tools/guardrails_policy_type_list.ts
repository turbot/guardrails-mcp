import { executeQuery } from "../utils/graphqlClient.js";
import { z } from "zod";

interface PolicyType {
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
  targets: string[];
}

interface QueryResponse {
  policyTypes: {
    items: Array<PolicyType>;
  };
}

type ListPolicyTypesInput = {
  filter?: string;
};

export const tool = {
  name: "guardrails_policy_type_list",
  description: "List all available policy types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
  schema: {
    filter: z.string().optional().describe("Optional filter to apply (e.g. 'category:security' or 'title:/encryption/i')")
  },
  handler: async ({ filter }: ListPolicyTypesInput) => {
    console.error("Starting list_guardrails_policy_types tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        console.error(`Added user filter: ${filter}`);
      }

      const query = `
        query ListPolicyTypes($filters: [String!]!) {
          policyTypes(filter: $filters) {
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
            }
          }
        }
      `;

      console.error("Executing GraphQL query with filters:", filters);
      const result = JSON.parse(await executeQuery(query, { filters })) as QueryResponse;
      console.error("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.policyTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        title: item.title,
        description: item.description,
        icon: item.icon,
        modUri: item.modUri,
        targets: item.targets
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
      console.error("Error in list_guardrails_policy_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing policy types: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}; 