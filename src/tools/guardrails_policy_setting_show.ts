import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface PolicySetting {
  default: any;
  enforce: boolean;
  exception: boolean;
  input: any;
  isCalculated: boolean;
  note: string | null;
  orphan: boolean;
  precedence: number;
  template: string | null;
  templateInput: string | null;
  validFromTimestamp: string | null;
  validToTimestamp: string | null;
  value: any;
  valueSource: string;
  turbot: {
    id: string;
    createTimestamp: string;
    updateTimestamp: string;
  };
  type: {
    uri: string;
    trunk: {
      title: string;
    };
  };
  resource: {
    data: Record<string, any>;
    metadata: Record<string, any>;
    trunk: {
      title: string;
    } | null;
    turbot: {
      id: string;
      akas: string[];
      tags: Record<string, string>;
    };
    type: {
      uri: string;
    };
  };
}

interface QueryResponse {
  policySetting: PolicySetting;
}

type ShowPolicySettingInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_policy_setting_show",
  description: "Show detailed information about a specific policy setting.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID of the policy setting to show (e.g. '320152411455166')"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: ShowPolicySettingInput) => {
    logger.info("Starting show_guardrails_policy_setting tool execution");
    try {
      const query = `
        query ShowPolicySetting($id: ID!) {
          policySetting(id: $id) {
            default
            enforce
            exception
            input
            isCalculated
            note
            orphan
            precedence
            template
            templateInput
            validFromTimestamp
            validToTimestamp
            value
            valueSource
            turbot {
              id
              createTimestamp
              updateTimestamp
            }
            type {
              uri
              trunk {
                title
              }
            }
            resource {
              data
              metadata
              trunk {
                title
              }
              turbot {
                id
                akas
                tags
              }
              type {
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
      const policySetting = result.policySetting;
      const transformedResult = {
        id: policySetting.turbot.id,
        default: policySetting.default,
        enforce: policySetting.enforce,
        exception: policySetting.exception,
        input: policySetting.input,
        isCalculated: policySetting.isCalculated,
        note: policySetting.note,
        orphan: policySetting.orphan,
        precedence: policySetting.precedence,
        template: policySetting.template,
        templateInput: policySetting.templateInput,
        validFromTimestamp: policySetting.validFromTimestamp,
        validToTimestamp: policySetting.validToTimestamp,
        value: policySetting.value,
        valueSource: policySetting.valueSource,
        type: {
          uri: policySetting.type.uri,
          title: policySetting.type.trunk.title
        },
        turbot: {
          createTimestamp: policySetting.turbot.createTimestamp,
          updateTimestamp: policySetting.turbot.updateTimestamp
        },
        resource: {
          id: policySetting.resource.turbot.id,
          title: policySetting.resource.trunk?.title || null,
          typeUri: policySetting.resource.type.uri,
          akas: policySetting.resource.turbot.akas,
          tags: policySetting.resource.turbot.tags,
          data: policySetting.resource.data,
          metadata: policySetting.resource.metadata
        }
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_policy_setting:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 