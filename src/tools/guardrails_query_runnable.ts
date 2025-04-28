import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatToolResponse, errorResponse, formatGraphQLResultWithErrors } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { validateReadOnlyGraphQLQuery } from "../utils/graphqlValidation.js";

const runnableTypeUriDescription = `
Required. The URI of the runnable type (policy or control type) to query.

**Examples:**
- Policy type: tmod:@turbot/aws-s3#/policy/types/bucketEncryption
- Control type: tmod:@turbot/aws-ec2#/control/types/instanceLaunched
`.trim();

const resourceIdDescription = `
Required. The ID of the resource to provide context for the query.

**Examples:**
- Numeric ID: 320152411455166
- ARN: arn:aws:s3:::my-bucket
`.trim();

const queryDescription = `
Required. The GraphQL query to execute.

**Example:**
\`\`\`
{
  user {
    UserName: get(path: "UserName")
  }
  account {
    turbot {
      id
    }
  }
}
\`\`\`
`.trim();

const variablesDescription = `
Optional. Variables to pass into the GraphQL query.

**Example:**
\`\`\`
{
  "foo": "bar"
}
\`\`\`
`.trim();

type QueryRunnableParams = {
  runnableTypeUri: string;
  resourceId: string;
  query: string;
  variables?: Record<string, any> | null;
};

export const tool: Tool = {
  name: "guardrails_query_runnable",
  description: `
Execute a custom GraphQL query against a specific Guardrails runnable type (such
as a policy or control type) and resource. Used in development of policy settings
for testing and validation.

Implementation notes:
- Pass results to \`process_template\` for calculated policy development.
- Use \`guardrails_query_runnable_introspection\` to get GraphQL schema for the specific runnable type.
- Returns the result of the GraphQL query as JSON.
  `.trim(),
  inputSchema: {
    type: "object",
    properties: {
      runnableTypeUri: {
        type: "string",
        description: runnableTypeUriDescription
      },
      resourceId: {
        type: "string",
        description: resourceIdDescription
      },
      query: {
        type: "string",
        description: queryDescription
      },
      variables: {
        type: "object",
        description: variablesDescription
      }
    },
    required: ["runnableTypeUri", "resourceId", "query"],
    additionalProperties: false
  },
  handler: async ({ runnableTypeUri, resourceId, query, variables = {} }: QueryRunnableParams) => {
    try {
      // Validate query using shared utility
      const validation = validateReadOnlyGraphQLQuery(query);
      if (!validation.valid) {
        logger.warn({ error: validation.error }, "GraphQL query validation failed");
        return errorResponse(validation.error);
      }
      // Construct the endpoint with query parameters
      const endpoint = `/api/v5/graphql?runnableTypeUri=${encodeURIComponent(runnableTypeUri)}&resourceId=${encodeURIComponent(resourceId)}`;

      const result = await executeQuery(query, variables || {}, endpoint);
      logger.debug("Query executed successfully");
      return formatGraphQLResultWithErrors(result, logger);
    } catch (error: any) {
      logger.error("Error executing query:", error);
      return errorResponse(error.message);
    }
  }
}; 