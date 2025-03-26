import { GraphQLClient } from "graphql-request";
import config from "../config/env.js";

// Create a singleton GraphQL client
const graphqlClient = new GraphQLClient(config.TURBOT_GRAPHQL_ENDPOINT, {
  headers: {
    authorization: "Basic " + btoa(`${config.TURBOT_ACCESS_KEY_ID}:${config.TURBOT_SECRET_ACCESS_KEY}`),
  },
});

/**
 * Format GraphQL error response into a clear message
 */
function formatGraphQLError(error: any): string {
  if (error.response?.errors?.[0]) {
    return error.response.errors[0].message;
  }
  return error.message || String(error);
}

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}) {
  try {
    const data = await graphqlClient.request(query, variables);
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

// Helper function to execute GraphQL mutations
export async function executeMutation(mutation: string, variables = {}) {
  try {
    const data = await graphqlClient.request(mutation, variables);
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

export default graphqlClient;