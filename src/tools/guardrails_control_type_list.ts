import { executeQuery } from "../utils/graphqlClient.js";
import { z } from "zod";
import { logger } from '../services/logger.js';

interface ControlType {
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
  controlTypes: {
    items: Array<ControlType>;
  };
}

type ListControlTypesInput = {
  filter?: string;
};

export const tool = {
  name: "guardrails_control_type_list",
  description: "List all available control types in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
  schema: {
    filter: z.string().optional().describe("Optional filter to apply (e.g. 'category:security' or 'title:/encryption/i')")
  },
  handler: async ({ filter }: ListControlTypesInput) => {
    logger.info("Starting guardrails_control_type_list tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        logger.debug(`Added user filter: ${filter}`);
      }

      const query = `
        query ListControlTypes($filters: [String!]!) {
          controlTypes(filter: $filters) {
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
      const transformedResult = result.controlTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        description: item.description
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
      logger.error("Error in guardrails_control_type_list:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing control types: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}; 