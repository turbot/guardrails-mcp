import { GraphQLClient } from "graphql-request";
import config from "../config/env.js";
import { parse, OperationDefinitionNode, OperationTypeNode } from "graphql";

// Create a singleton GraphQL client
const graphqlClient = new GraphQLClient(config.TURBOT_GRAPHQL_ENDPOINT, {
  headers: {
    authorization: "Basic " + btoa(`${config.TURBOT_ACCESS_KEY_ID}:${config.TURBOT_SECRET_ACCESS_KEY}`),
  },
});

// Validate that the operation is a query
function validateQueryOperation(queryString: string): boolean {
  try {
    const document = parse(queryString);
    const operations = document.definitions.filter(
      (def): def is OperationDefinitionNode => def.kind === "OperationDefinition"
    );

    // Ensure there's exactly one operation
    if (operations.length !== 1) {
      throw new Error("Query must contain exactly one operation");
    }

    // Check if it's a query operation
    if (operations[0].operation !== OperationTypeNode.QUERY) {
      throw new Error("Only query operations are allowed");
    }

    return true;
  } catch (error: any) {
    throw new Error(`Invalid query: ${error.message}`);
  }
}

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}) {
  try {
    // Validate that this is a query operation
    validateQueryOperation(query);

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