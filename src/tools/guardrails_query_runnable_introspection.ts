import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from '../services/logger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

type QueryRunnableIntrospectionParams = {
  runnableTypeUri: string;
  section?: "queryType" | "types" | "type" | null;
  typeName?: string | null;
};

// Query to get the root query type and available types
const ROOT_SCHEMA_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType {
        name
        fields {
          name
          description
          type {
            name
            kind
          }
        }
      }
      types {
        name
        kind
        description
      }
    }
  }
`;

// Query to get detailed information about a specific type
const TYPE_DETAILS_QUERY = `
  query TypeQuery($typeName: String!) {
    __type(name: $typeName) {
      name
      kind
      description
      fields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
        args {
          name
          description
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
          defaultValue
        }
      }
      inputFields {
        name
        description
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
        defaultValue
      }
      enumValues {
        name
        description
      }
    }
  }
`;

export const tool: Tool = {
  name: "guardrails_query_runnable_introspection",
  description: "Explore a runnable type's GraphQL schema in stages. Start with 'queryType' to see available fields, use 'types' to list all types, then use 'type' with a specific typeName to get detailed type information.",
  inputSchema: {
    type: "object",
    properties: {
      runnableTypeUri: {
        type: "string",
        description: "The URI of the runnable type (policy or control type)"
      },
      section: {
        type: "string",
        description: "Start with 'queryType' to see available fields, then use 'types' to list all types, finally use 'type' to inspect a specific type",
        enum: ["queryType", "types", "type"]
      },
      typeName: {
        type: "string",
        description: "Required when section is 'type': the name of a type discovered from the 'types' section"
      }
    },
    required: ["runnableTypeUri"],
    additionalProperties: false
  },
  handler: async ({ runnableTypeUri, section = "queryType", typeName }: QueryRunnableIntrospectionParams) => {
    try {
      // Construct the endpoint with query parameters
      const endpoint = `/api/v5/graphql?runnableTypeUri=${encodeURIComponent(runnableTypeUri)}`;

      if (section === "type" && !typeName) {
        logger.error("Missing required typeName parameter for type section");
        return errorResponse("typeName is required when section is 'type'. First use section: 'types' to discover available type names.");
      }

      const query = section === "type" ? TYPE_DETAILS_QUERY : ROOT_SCHEMA_QUERY;
      const variables = section === "type" ? { typeName } : {};

      const result = await executeQuery(query, variables, endpoint);
      // Parse the JSON string returned by executeQuery
      const data = JSON.parse(result);

      // Filter the response based on the requested section
      let filteredData;
      let guidance = "";
      if (section === "queryType") {
        filteredData = data.__schema.queryType;
        guidance = "These are the available fields at the root of the schema. To explore a type in detail, first use section: 'types' to list all types.";
      } else if (section === "types") {
        filteredData = data.__schema.types;
        guidance = "These are all available types in the schema. To explore a specific type, use section: 'type' with typeName set to one of these type names.";
      } else {
        filteredData = data.__type;
        guidance = "This is the detailed information for the requested type.";
      }

      return {
        content: [
          {
            type: "text" as const,
            text: guidance
          },
          {
            type: "text" as const,
            text: formatJsonToolResponse(filteredData).content[0].text
          }
        ]
      };
    } catch (error: any) {
      logger.error(`Error executing introspection query: ${error.message}`);
      return errorResponse(error.message);
    }
  }
};