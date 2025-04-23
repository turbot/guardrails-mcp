import { executeMutation } from "../utils/graphqlClient.js";
import { logger } from '../services/pinoLogger.js';
import { formatJsonToolResponse, errorResponse } from '../utils/responseFormatter.mjs';
import { formatJson } from '../utils/jsonFormatter.mjs';
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

interface RunControlResponse {
  runControl: {
    state: string;
    turbot: {
      id: string;
    };
    control: {
      type: {
        uri: string;
        trunk: {
          title: string;
        };
      };
      mute: string | null;
      primaryState: string;
      state: string;
      reason: string | null;
      details: string | null;
      turbot: {
        id: string;
        timestamp: string;
        stateChangeTimestamp: string;
        nextTickTimestamp: string;
      };
    };
    resource: {
      trunk: {
        title: string;
      };
      turbot: {
        id: string;
      };
      akas: string[];
    };
  };
}

type RunControlInput = {
  id: string;
};

export const tool: Tool = {
  name: "guardrails_control_run",
  description: "Run a Turbot Guardrails control by its ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID of the control to run"
      }
    },
    required: ["id"],
    additionalProperties: false
  },
  handler: async ({ id }: RunControlInput) => {
    logger.info("Starting run_guardrails_control tool execution");
    try {
      const mutation = `
        mutation RunControl($input: RunControlInput!) {
          runControl(input: $input) {
            state
            turbot {
              id
            }
            control {
              type {
                uri
                trunk {
                  title
                }
              }
              mute
              primaryState
              state
              reason
              details
              turbot {
                id
                timestamp
                stateChangeTimestamp
                nextTickTimestamp
              }
            }
            resource {
              trunk {
                title
              }
              turbot {
                id
              }
              akas
            }
          }
        }
      `;

      const variables = {
        input: {
          id: id
        }
      };

      logger.debug("Executing GraphQL mutation with variables:", variables);
      const rawResult = await executeMutation(mutation, variables);
      logger.debug("Raw result:", rawResult);
      const result = JSON.parse(rawResult) as RunControlResponse;
      logger.debug("Parsed result:", result);

      if (!result?.runControl) {
        logger.error(`Invalid response structure: ${formatJson(result)}`);
        return errorResponse(`Invalid response structure: ${formatJson(result)}`);
      }

      const runControl = result.runControl;

      // Transform the response to flatten the structure
      const transformedResult = {
        process: {
          id: runControl.turbot.id,
          state: runControl.state
        },
        control: {
          id: runControl.control.turbot.id,
          type: {
            uri: runControl.control.type.uri,
            title: runControl.control.type.trunk.title
          },
          mute: runControl.control.mute,
          primaryState: runControl.control.primaryState,
          state: runControl.control.state,
          reason: runControl.control.reason,
          details: runControl.control.details,
          turbot: {
            timestamp: runControl.control.turbot.timestamp,
            stateChangeTimestamp: runControl.control.turbot.stateChangeTimestamp,
            nextTickTimestamp: runControl.control.turbot.nextTickTimestamp
          }
        },
        resource: {
          id: runControl.resource.turbot.id,
          title: runControl.resource.trunk.title,
          akas: runControl.resource.akas
        }
      };

      return formatJsonToolResponse(transformedResult);
    } catch (error) {
      logger.error("Error in run_guardrails_control:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific error patterns and provide friendly messages
      if (errorMessage.includes('Not Found')) {
        return errorResponse(`Control '${id}' not found. Please verify the control ID is correct and try again.`);
      }
      
      // For other errors, provide a more generic but still friendly message
      return errorResponse(`Unable to run control: ${errorMessage}`);
    }
  }
}; 