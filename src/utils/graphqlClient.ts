import { GraphQLClient } from "graphql-request";
import { Buffer } from "buffer";
import config from "../config/env.js";

// Create a singleton GraphQL client
const graphqlClient = new GraphQLClient(config.TURBOT_GRAPHQL_ENDPOINT, {
  headers: {
    authorization: "Basic " + Buffer.from(`${config.TURBOT_ACCESS_KEY_ID}:${config.TURBOT_SECRET_ACCESS_KEY}`).toString("base64"),
  },
});

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}) {
  try {
    const data = await graphqlClient.request(query, variables);
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    console.error("Error executing GraphQL query:", error);
    return `Error executing GraphQL query: ${error.message || error}`;
  }
}

// Helper function to execute GraphQL mutations
export async function executeMutation(mutation: string, variables = {}) {
  try {
    const data = await graphqlClient.request(mutation, variables);
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Error executing mutation:", error);
    throw error;
  }
}

export default graphqlClient;