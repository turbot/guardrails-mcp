import { GraphQLClient } from "graphql-request";
import config from "../config/env.js";
import { formatJson } from './jsonFormatter.mjs';

const { TURBOT_GRAPHQL_ENDPOINT, TURBOT_ACCESS_KEY_ID, TURBOT_SECRET_ACCESS_KEY } = config;

// Create a base URL from the endpoint
const baseUrl = new URL(TURBOT_GRAPHQL_ENDPOINT);

// Helper function to create a GraphQL client with the appropriate endpoint
function createGraphQLClient(customEndpoint?: string) {
  // If a custom endpoint is provided, add it as query parameters
  const url = new URL(baseUrl.toString());
  if (customEndpoint) {
    // Parse the custom endpoint as a URL to extract query parameters
    const customUrl = new URL(customEndpoint, baseUrl);
    // Copy over all query parameters
    customUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  return new GraphQLClient(url.toString(), {
    headers: {
      authorization: "Basic " + btoa(`${TURBOT_ACCESS_KEY_ID}:${TURBOT_SECRET_ACCESS_KEY}`),
    },
  });
}

// Helper function to format GraphQL errors
function formatGraphQLError(error: any): string {
  if (error.response?.errors) {
    return error.response.errors.map((e: any) => {
      let message = e.message;
      
      // Add location information if available
      if (e.locations?.length > 0) {
        const location = e.locations[0];
        message += ` (line ${location.line}, column ${location.column})`;
      }

      // Add path information if available
      if (e.path?.length > 0) {
        message += ` at path: ${e.path.join('.')}`;
      }

      // Add extensions information if available
      if (e.extensions) {
        if (e.extensions.code) {
          message += `\nError code: ${e.extensions.code}`;
        }
        if (e.extensions.classification) {
          message += `\nClassification: ${e.extensions.classification}`;
        }
      }

      return message;
    }).join("\n");
  }
  return error.message || String(error);
}

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}, customEndpoint?: string) {
  try {
    const graphqlClient = createGraphQLClient(customEndpoint);
    const data = await graphqlClient.request(query, variables);
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

// Helper function to execute GraphQL mutations
export async function executeMutation(mutation: string, variables = {}) {
  try {
    const graphqlClient = createGraphQLClient();
    const data = await graphqlClient.request(mutation, variables);
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

export default createGraphQLClient();