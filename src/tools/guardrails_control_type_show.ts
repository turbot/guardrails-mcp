import { executeQuery } from "../utils/graphqlClient.js";
import { z } from "zod";
import { logger } from '../services/logger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';

interface ControlType {
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
  category: {
    trunk: {
      title: string;
    } | null;
    uri: string;
  };
  targets: string[];
  actionTypes: {
    items: Array<{
      uri: string;
    }>;
  };
}

interface QueryResponse {
  controlType: ControlType;
}

interface ShowControlTypeInput {
  uri: string;
}

export const tool = {
  name: "guardrails_control_type_show",
  description: "Show detailed information about a specific control type by its URI.",
  schema: {
    uri: z.string().describe("The URI of the control type to show details for")
  },
  handler: async ({ uri }: ShowControlTypeInput) => {
    logger.info("Starting guardrails_control_type_show tool execution");
    try {
      const query = `
        query ShowControlType($id: ID!) {
          controlType(id: $id) {
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
            actionTypes(filter: "limit:5000") {
              items {
                uri
              }
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

      logger.debug("Executing GraphQL query for control type:", uri);
      const result = JSON.parse(await executeQuery(query, { id: uri })) as QueryResponse;
      logger.debug("Query executed successfully");

      if (!result.controlType) {
        return errorResponse(`No control type found with URI: ${uri}`);
      }

      // Transform the response to flatten and reorganize fields
      const item = result.controlType;
      const transformedResult = {
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        title: item.title,
        description: item.description,
        icon: item.icon,
        modUri: item.modUri,
        category: {
          uri: item.category.uri,
          trunkTitle: item.category.trunk?.title || null
        },
        targets: item.targets,
        actionTypes: item.actionTypes.items.map(action => action.uri)
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error: any) {
      logger.error("Error in guardrails_control_type_show:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error showing control type: ${errorMessage}`);
    }
  }
}; 