import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import { JSONSchemaType } from 'ajv';

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

type ShowControlTypeInput = {
  id: string;
};

interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchemaType<ShowControlTypeInput>;
  handler: (input: ShowControlTypeInput) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }>;
}

export const tool: Tool = {
  name: "guardrails_control_type_show",
  description: "Show detailed information about a specific control type.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID or URI of the control type to show (e.g. '320152411455166' or 'tmod:@turbot/azure-cisv2-0#/control/types/s01')",
        minLength: 1
      }
    },
    required: ["id"],
    additionalProperties: false
  } as JSONSchemaType<ShowControlTypeInput>,
  handler: async ({ id }: ShowControlTypeInput) => {
    logger.info("Starting show_guardrails_control_type tool execution");
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
            category {
              trunk {
                title
              }
              uri
            }
            targets
            actionTypes {
              items {
                uri
              }
            }
          }
        }
      `;

      logger.debug("Executing GraphQL query with ID:", id);
      const result = JSON.parse(await executeQuery(query, { id })) as QueryResponse;
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const controlType = result.controlType;
      const transformedResult = {
        id: controlType.turbot.id,
        uri: controlType.uri,
        title: controlType.title,
        description: controlType.description,
        icon: controlType.icon,
        modUri: controlType.modUri,
        trunkTitle: controlType.trunk?.title || null,
        category: {
          uri: controlType.category.uri,
          title: controlType.category.trunk?.title || null
        },
        targets: controlType.targets,
        actionTypes: controlType.actionTypes.items.map(item => item.uri)
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_control_type:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 