import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { addFiltersWithDefaultLimit } from '../utils/filterUtils.js';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface Control {
  state: string;
  reason: string | null;
  turbot: {
    id: string;
    stateChangeTimestamp: string;
  };
  type: {
    uri: string;
    trunk: {
      title: string;
    };
  };
  resource: {
    trunk: {
      title: string;
    } | null;
    turbot: {
      id: string;
    };
  };
}

interface QueryResponse {
  controls: {
    items: Control[];
  };
}

type ListControlsInput = {
  filter?: string | null;
};

/*
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
- last modified: "timestamp:>T-15m"
- scoped in hierarchy: "resource:'arn:aws:::111122223333'"
- multiple filters: "my server tags:env=dev"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
*/

export const tool: Tool = {
  name: "guardrails_control_list",
  description: "Discover, search and filter controls in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- state: "state:alarm,error", "state:muted"
- exact control type: "controlTypeId:tmod:@turbot/aws-s3#/control/types/bucketEncryption"
- control type: "controlType:s3"
- resource: "resourceId:176097085664591"
- exact resource type: "resourceTypeId:tmod:@turbot/aws-s3#/resource/types/bucket"
- resource type: "resourceType:bucket"
- creation time: "createTimestamp:>T-7d"
- last modified: "timestamp:>T-15m"
- scoped in hierarchy: "resource:'arn:aws:::111122223333'"
- multiple filters: "state:alarm resourceType:s3"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListControlsInput) => {
    logger.info("Starting list_guardrails_controls tool execution");
    try {
      // Build array of filters
      const filters: string[] = [];
      addFiltersWithDefaultLimit(filters, filter);

      const query = `
        query ListControls($filters: [String!]!) {
          controls(filter: $filters) {
            items {
              state
              reason
              turbot {
                id
                stateChangeTimestamp
              }
              type {
                uri
                trunk {
                  title
                }
              }
              resource {
                trunk {
                  title
                }
                turbot {
                  id
                }
              }
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with filters:", filters);
      const result = JSON.parse(await executeQuery(query, { filters })) as QueryResponse;
      logger.debug("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.controls.items.map(item => ({
        id: item.turbot.id,
        state: item.state,
        reason: item.reason,
        stateChangeTimestamp: item.turbot.stateChangeTimestamp,
        type: {
          uri: item.type.uri,
          title: item.type.trunk.title
        },
        resource: {
          id: item.resource.turbot.id,
          title: item.resource.trunk?.title || null
        }
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_controls:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing controls: ${errorMessage}`);
    }
  }
}; 