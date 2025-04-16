import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatJsonToolResponse, errorResponse, formatGraphQLError } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface PolicyType {
  uri: string;
  title: string;
  description: string | null;
  icon: string;
  modUri: string;
  defaultTemplate: string | null;
  defaultTemplateInput: string | null;
  readOnly: boolean;
  resolvedSchema: string | null;
  secret: boolean;
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
}

interface QueryResponse {
  policyType: PolicyType;
}

type ShowPolicyTypeInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_policy_type_show",
  description: "Show detailed information about a specific policy type.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID or URI of the policy type to show (e.g. '320152411455166' or 'tmod:@turbot/azure-cisv2-0#/policy/types/s01')"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: ShowPolicyTypeInput) => {
    logger.info("Starting show_guardrails_policy_type tool execution");
    try {
      const query = `
        query ShowPolicyType($id: ID!) {
          policyType(id: $id) {
            uri
            title
            description
            icon
            modUri
            defaultTemplate
            defaultTemplateInput
            readOnly
            resolvedSchema
            secret
            targets
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
          }
        }
      `;

      logger.debug("Executing GraphQL query with ID:", id);
      const result = JSON.parse(await executeQuery(query, { id })) as QueryResponse;
      logger.info("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const policyType = result.policyType;
      const transformedResult = {
        id: policyType.turbot.id,
        uri: policyType.uri,
        title: policyType.title,
        description: policyType.description,
        icon: policyType.icon,
        modUri: policyType.modUri,
        defaultTemplate: policyType.defaultTemplate,
        defaultTemplateInput: policyType.defaultTemplateInput,
        readOnly: policyType.readOnly,
        resolvedSchema: policyType.resolvedSchema,
        secret: policyType.secret,
        trunkTitle: policyType.trunk?.title || null,
        category: {
          uri: policyType.category.uri,
          title: policyType.category.trunk?.title || null
        },
        targets: policyType.targets
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in show_guardrails_policy_type:", error);
      return errorResponse(formatGraphQLError(error, id));
    }
  }
}; 