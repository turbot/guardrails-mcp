import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { addFiltersWithDefaultLimit } from '../utils/filterUtils.js';
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
  description: "Discover, search and filter resources in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- title: "my server"
- exact resource type: "resourceTypeId:tmod:@turbot/aws-ec2#/resource/types/instance"
- resource type: "resourceType:s3"
- tags: "tags:env=dev"
- creation time: "createTimestamp:>T-7d"
- last modified: "timestamp:>T-15m"
- field match: "$.Versioning.Status:Enabled"
- field comparison: "$.Size:<=30"
- IP within CIDR: "$.IpAddress:192.168.1.0/24"
- scoped in hierarchy: "resource:'arn:aws:::111122223333'"
- multiple filters: "my server tags:env=dev"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListResourcesInput) => {
    logger.info("Starting list_guardrails_resources tool execution");
    try {
      // Build array of filters
      const filters: string[] = [];
      addFiltersWithDefaultLimit(filters, filter);

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