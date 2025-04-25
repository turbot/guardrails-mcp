import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { addFiltersWithDefaultLimit } from '../utils/filterUtils.js';
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
  policySettings: {
    items: PolicySetting[];
  };
}

type ListPolicySettingsInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_policy_setting_list",
  description: "Discover, search and filter policy settings in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- value: "value:'Check: Enabled'", "value:prod-*"
- exact policy type: "policyTypeId:tmod:@turbot/aws-s3#/policy/types/bucketEncryption"
- policy type: "policyType:encryption"
- resource: "resourceId:176097085664591"
- state (ok, error, invalid, tbd): "state:error"
- exact resource type: "resourceTypeId:tmod:@turbot/aws-s3#/resource/types/bucket"
- resource type: "resourceType:bucket"
- resources with tags: "tags:department=/^sales$/i", "tags:env=prod"
- creation time: "createTimestamp:>T-7d"
- exceptions: "is:exception"
- expiring soon: "validToTimestamp:<T+7d,>now sort:validToTimestamp"
- scoped in hierarchy: "resource:'arn:aws:::111122223333'"
- multiple filters: "value:true resourceType:bucket"
- sort: "sort:precedence" or "sort:-precedence" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListPolicySettingsInput) => {
    logger.info("Starting list_guardrails_policy_settings tool execution");
    try {
      // Build array of filters
      const filters: string[] = [];
      addFiltersWithDefaultLimit(filters, filter);

      const query = `
        query ListPolicySettings($filters: [String!]!) {
          policySettings(filter: $filters) {
            items {
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
      const transformedResult = result.policySettings.items.map(item => ({
        id: item.turbot.id,
        default: item.default,
        enforce: item.enforce,
        exception: item.exception,
        input: item.input,
        isCalculated: item.isCalculated,
        note: item.note,
        orphan: item.orphan,
        precedence: item.precedence,
        template: item.template,
        templateInput: item.templateInput,
        validFromTimestamp: item.validFromTimestamp,
        validToTimestamp: item.validToTimestamp,
        value: item.value,
        valueSource: item.valueSource,
        createTimestamp: item.turbot.createTimestamp,
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
      logger.error("Error in list_guardrails_policy_settings:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing policy settings: ${errorMessage}`);
    }
  }
}; 