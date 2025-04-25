import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { addFiltersWithDefaultLimit } from '../utils/filterUtils.js';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface PolicyType {
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
  policyTypes: {
    items: PolicyType[];
  };
}

type ListPolicyTypesInput = {
  filter?: string | null;
};

export const tool: Tool = {
  name: "guardrails_policy_type_list",
  description: "Discover, search and filter policy types in Turbot Guardrails.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: `Search or filter query. For example:
- title: "aws encryption"
- scoped in hierarchy: "policyType:'tmod:@turbot/gcp-storage#/policy/types/bucketApproved'"
- multiple filters: "bucket limit:5"
- sort: "sort:title" or "sort:-title" (descending)
- limit: "limit:10" (default: 5000)`
      }
    },
    additionalProperties: false
  },
  handler: async ({ filter }: ListPolicyTypesInput) => {
    logger.info("Starting list_guardrails_policy_types tool execution");
    try {
      // Build array of filters
      const filters: string[] = [];
      addFiltersWithDefaultLimit(filters, filter);

      const query = `
        query ListPolicyTypes($filters: [String!]!) {
          policyTypes(filter: $filters) {
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
      logger.debug("Query executed successfully");

      // Transform the response to flatten and reorganize fields
      const transformedResult = result.policyTypes.items.map(item => ({
        id: item.turbot.id,
        trunkTitle: item.trunk?.title || null,
        uri: item.uri,
        description: item.description
      }));

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in list_guardrails_policy_types:", error);
      const errorMessage = error instanceof Error ? 
        `${error.name}: ${error.message}` : 
        String(error);
      
      return errorResponse(`Error listing policy types: ${errorMessage}`);
    }
  }
}; 

"query ExploreControlType($id: ID!, $trunkFilter: [String!]) {\n  controlType(id: $id) {\n    ...controlTypeFields\n    controlAlerts: controls(filter: \"state:alarm,invalid,error\") {\n      metadata {\n        stats {\n          total\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    turbot {\n      ...controlTypeMetadataFields\n      __typename\n    }\n    __typename\n  }\n  trunk: controlTypes(filter: $trunkFilter) {\n    items {\n      uri\n      turbot {\n        ...controlTypeMetadataFields\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment controlTypeFields on ControlType {\n  description\n  icon\n  uri\n  __typename\n}\n\nfragment controlTypeMetadataFields on TurbotControlTypeMetadata {\n  id\n  title\n  __typename\n}\n"
