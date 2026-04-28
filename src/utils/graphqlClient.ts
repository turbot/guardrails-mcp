import { GraphQLClient } from "graphql-request";
import config from "../config/env.js";
import { redactStrings } from "./redact.js";

const { TURBOT_GRAPHQL_ENDPOINT, TURBOT_ACCESS_KEY_ID, TURBOT_SECRET_ACCESS_KEY } = config;

// Values that must never leak through error messages. Includes the base64
// auth header form so we're covered even if a future upstream/library version
// echoes request headers in errors. Frozen to prevent accidental mutation.
const CREDENTIAL_SECRETS: readonly string[] = Object.freeze([
  TURBOT_ACCESS_KEY_ID,
  TURBOT_SECRET_ACCESS_KEY,
  btoa(`${TURBOT_ACCESS_KEY_ID}:${TURBOT_SECRET_ACCESS_KEY}`),
]);

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

// Builds a user-facing error message from a GraphQL request failure, with a
// final redaction pass over credential values. Exported for unit testing —
// the redaction is the last line of defence against upstream services or
// libraries that may echo credentials in error payloads, so it must be
// directly verifiable.
export function formatGraphQLError(
  error: any,
  secrets: readonly string[] = CREDENTIAL_SECRETS,
): string {
  let message: string;
  if (error.response?.errors) {
    message = error.response.errors
      .map((e: any) => {
        let line = e.message;
        if (e.locations?.length > 0) {
          const location = e.locations[0];
          line += ` (line ${location.line}, column ${location.column})`;
        }
        if (e.path?.length > 0) {
          line += ` at path: ${e.path.join(".")}`;
        }
        if (e.extensions) {
          if (e.extensions.code) {
            line += `\nError code: ${e.extensions.code}`;
          }
          if (e.extensions.classification) {
            line += `\nClassification: ${e.extensions.classification}`;
          }
        }
        return line;
      })
      .join("\n");
  } else {
    message = error.message || String(error);
  }
  return redactStrings(message, secrets);
}

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables = {}, customEndpoint?: string) {
  try {
    const graphqlClient = createGraphQLClient(customEndpoint);
    const data = await graphqlClient.request(query, variables);
    return JSON.stringify(data);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

// Helper function to execute GraphQL mutations
export async function executeMutation(mutation: string, variables = {}) {
  try {
    const graphqlClient = createGraphQLClient();
    const data = await graphqlClient.request(mutation, variables);
    return JSON.stringify(data);
  } catch (error: any) {
    throw new Error(formatGraphQLError(error));
  }
}

export default createGraphQLClient();