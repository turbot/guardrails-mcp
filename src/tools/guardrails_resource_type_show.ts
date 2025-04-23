import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
    parentId: string;
  };
  category: {
    trunk: {
      title: string;
    } | null;
    uri: string;
  };
}

interface QueryResponse {
  resourceType: ResourceType;
}

type ShowResourceTypeInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_resource_type_show",
  description: "Show detailed information about a specific resource type.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID or URI of the resource type to show (e.g. '320152411455166' or 'tmod:@turbot/aws-acm#/resource/types/certificate')"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: ShowResourceTypeInput) => {
    logger.info("Starting show_guardrails_resource_type tool execution");
    try {
      const query = `
        query ShowResourceType($id: ID!) {
          resourceType(id: $id) {
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
              parentId
            }
            category {
              trunk {
                title
              }
              uri
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with ID:", id);
      const result = JSON.parse(await executeQuery(query, { id })) as QueryResponse;
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const resourceType = result.resourceType;
      const transformedResult = {
        id: resourceType.turbot.id,
        parentId: resourceType.turbot.parentId,
        uri: resourceType.uri,
        title: resourceType.title,
        description: resourceType.description,
        icon: resourceType.icon,
        modUri: resourceType.modUri,
        trunkTitle: resourceType.trunk?.title || null,
        category: {
          uri: resourceType.category.uri,
          title: resourceType.category.trunk?.title || null
        }
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_resource_type:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 