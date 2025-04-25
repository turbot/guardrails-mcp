import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { addFiltersWithDefaultLimit } from '../utils/filterUtils.js';
import { JSONSchemaType } from 'ajv';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
    items: ControlType[];
  };
}

type ListControlTypesInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_control_type_list",
  description: "Discover, search and filter control types in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- title: "key expired"
- scoped in hierarchy: "controlType:'tmod:@turbot/aws-ec2#/resource/types/ec2'"
- multiple filters: "bucket limit:5"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListControlTypesInput) => {
    logger.info("Starting list_guardrails_control_types tool execution");
    try {
      // Build array of filters
      const filters: string[] = [];
      addFiltersWithDefaultLimit(filters, filter);

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
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.controlTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        description: item.description
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_control_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing control types: ${errorMessage}`);
    }
  }
}; 