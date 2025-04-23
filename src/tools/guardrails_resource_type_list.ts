import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface ResourceType {
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
  resourceTypes: {
    items: ResourceType[];
  };
}

type ListResourceTypesInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_resource_type_list",
  description: "Discover, search and filter resource types in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- title: "bucket"
- scoped in hierarchy: "resourceType:'tmod:@turbot/aws-ec2#/resource/types/ec2'"
- category: "resourceCategory:storage"
- multiple filters: "instance sort:-createTimestamp"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListResourceTypesInput) => {
    logger.info("Starting list_guardrails_resource_types tool execution");
    try {
      // Build array of filters
      const filters = ["limit:5000"];
      
      // If a filter is provided, add it to the filters array
      if (filter) {
        filters.push(filter);
        logger.debug(`Added user filter: ${filter}`);
      }

      const query = `
        query ListResourceTypes($filters: [String!]!) {
          resourceTypes(filter: $filters) {
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
      const transformedResult = result.resourceTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        description: item.description
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_resource_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing resource types: ${errorMessage}`);
    }
  }
}; 