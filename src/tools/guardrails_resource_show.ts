import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface Resource {
  data: Record<string, any>;
  metadata: Record<string, any>;
  trunk: {
    title: string;
  } | null;
  turbot: {
    akas: string[];
    id: string;
    tags: Record<string, string>;
    parentId: string;
    createTimestamp: string;
    updateTimestamp: string;
    versionId: string;
  };
  type: {
    uri: string;
  };
  attachedSmartFolders: {
    items: Array<{
      trunk: {
        title: string;
      } | null;
      turbot: {
        id: string;
      };
    }>;
  };
}

interface QueryResponse {
  resource: Resource;
}

type ShowResourceInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_resource_show",
  description: "Show detailed information about a specific resource.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID or AKA of the resource to show (e.g. '320152411455166' or 'arn:aws:::634653137938')"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: ShowResourceInput) => {
    logger.info("Starting show_guardrails_resource tool execution");
    try {
      const query = `
        query ShowResource($id: ID!) {
          resource(id: $id) {
            data
            metadata
            trunk {
              title
            }
            turbot {
              akas
              id
              tags
              parentId
              createTimestamp
              updateTimestamp
              versionId
            }
            type {
              uri
            }
            attachedSmartFolders {
              items {
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

      logger.debug("Executing GraphQL query with ID:", id);
      const result = JSON.parse(await executeQuery(query, { id })) as QueryResponse;
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const resource = result.resource;
      const transformedResult = {
        id: resource.turbot.id,
        parentId: resource.turbot.parentId,
        typeUri: resource.type.uri,
        trunkTitle: resource.trunk?.title || null,
        akas: resource.turbot.akas,
        tags: resource.turbot.tags,
        createTimestamp: resource.turbot.createTimestamp,
        updateTimestamp: resource.turbot.updateTimestamp,
        versionId: resource.turbot.versionId,
        data: resource.data,
        metadata: resource.metadata,
        attachedSmartFolders: resource.attachedSmartFolders.items.map(folder => ({
          id: folder.turbot.id,
          title: folder.trunk?.title || null
        }))
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_resource:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 