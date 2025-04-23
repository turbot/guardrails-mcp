import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface Resource {
  trunk: {
    title: string;
  } | null;
  turbot: {
    id: string;
  };
  type: {
    uri: string;
  };
}

interface QueryResponse {
  resources: {
    items: Resource[];
  };
}

type ListResourcesInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_resource_list",
  description: "List all available resources in Turbot Guardrails. Optionally filter the results using any valid Guardrails filter syntax.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Optional filter to apply (e.g. 'resourceType:aws-ec2' or 'title:/database/i')"
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListResourcesInput) => {
    logger.info("Starting list_guardrails_resources tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        logger.debug(`Added user filter: ${filter}`);
      }

      const query = `
        query ListResources($filters: [String!]!) {
          resources(filter: $filters) {
            items {
              trunk {
                title
              }
              turbot {
                id
              }
              type {
                uri
              }
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with filters:", filters);
      const result = JSON.parse(await executeQuery(query, { filters })) as QueryResponse;
      logger.debug("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.resources.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        typeUri: item.type.uri
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_resources:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing resources: ${errorMessage}`);
    }
  }
}; 