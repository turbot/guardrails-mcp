import type { ServerResult } from "@modelcontextprotocol/sdk/types.js";
import { executeQuery } from "../utils/graphqlClient.js";
import { logger } from "../services/pinoLogger.js";
import config from "../config/env.js";

// Define a function to handle status resource requests
export async function handleStatusResource(uri: string): Promise<ServerResult | null> {
  // Check if this is a status resource URI
  if (uri !== 'guardrails://status') {
    return null;
  }
  
  try {
    // Query for workspace version
    const query = `
      query AdminDashboardWorkspaceVersion {
        workspaceVersion: policyValue(resourceAka: "tmod:@turbot/turbot#/" uri: "tmod:@turbot/turbot#/policy/types/workspaceVersion") {
          value
        }
      }
    `;
    
    const versionResult = await executeQuery(query);
    const versionData = JSON.parse(versionResult);
    
    const response = {
      workspaceVersion: versionData.workspaceVersion?.value || 'unknown',
      guardrailsUrl: config.TURBOT_GRAPHQL_ENDPOINT || 'unknown'
    };

    return {
      contents: [{
        uri,
        text: JSON.stringify(response),
        mimeType: 'application/json'
      }]
    };
  } catch (error) {
    logger.error("Error in status resource:", error);
    return {
      contents: [{
        uri,
        text: error instanceof Error ? error.message : String(error),
        mimeType: 'text/plain'
      }],
      isError: true
    };
  }
} 