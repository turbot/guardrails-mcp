import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface PolicyType {
  uri: string;
  description: string | null;
  trunk: {
    title: string;
  } | null;
  turbot: {
    id: string;
  };
}

interface QueryResponse {
  policyTypes: {
    items: PolicyType[];
  };
}

type ListPolicyTypesInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_policy_type_list",
  description: "List all available policy types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Optional filter to apply (e.g. 'category:security' or 'title:/encryption/i')"
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListPolicyTypesInput) => {
    logger.info("Starting list_guardrails_policy_types tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        logger.debug(`Added user filter: ${filter}`);
      }

      const query = `
        query ListPolicyTypes($filters: [String!]!) {
          policyTypes(filter: $filters) {
            items {
              uri
              description
              trunk {
                title
              }
              turbot {
                id
              }
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with filters:", filters);
      const result = JSON.parse(await executeQuery(query, { filters })) as QueryResponse;
      logger.debug("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.policyTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        description: item.description
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_policy_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing policy types: ${errorMessage}`);
    }
  }
}; 